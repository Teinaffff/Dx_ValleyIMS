import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { PrismaService } from "../../common/prisma.service";

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain paragraphs; blank lines separate them. */
  body: string;
  heading?: string;
  /** Path inside the web app (e.g. /admin/approvals) or an absolute URL. */
  link?: string;
  linkLabel?: string;
}

const OUTBOX_INTERVAL_MS = 30_000;
const OUTBOX_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Sends email over SMTP. Nothing is sent, and nothing fails, until SMTP_HOST is
 * configured and the "email" notification channel is on in system settings.
 * In-app notifications are emailed by a small outbox sender so no call site
 * has to remember to send mail.
 */
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("Mail");
  private transporter: Transporter | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private channelCache: { value: boolean; at: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>("SMTP_HOST")?.trim();
    if (!host) {
      this.logger.log("SMTP_HOST is not set: email is off, in-app notifications still work.");
      return;
    }
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 587);
    const user = this.config.get<string>("SMTP_USER")?.trim();
    const pass = this.config.get<string>("SMTP_PASS");
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>("SMTP_SECURE") === "true" || port === 465,
      ...(user ? { auth: { user, pass } } : {}),
    });
    this.logger.log(`Email enabled via ${host}:${port}`);
    this.timer = setInterval(() => void this.flushOutbox(), OUTBOX_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  get configured() {
    return this.transporter !== null;
  }

  /** The admin switch in system settings (notifications.enabled.email). */
  private async channelOn() {
    const now = Date.now();
    if (this.channelCache && now - this.channelCache.at < 30_000) return this.channelCache.value;
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: "notifications.enabled" },
    });
    const value = (row?.value as { email?: boolean } | null)?.email !== false;
    this.channelCache = { value, at: now };
    return value;
  }

  private absolute(link?: string) {
    if (!link) return null;
    if (/^https?:\/\//i.test(link)) return link;
    const base =
      this.config.get<string>("APP_URL")?.trim() ||
      (this.config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000").split(",")[0].trim();
    return `${base.replace(/\/$/, "")}${link.startsWith("/") ? "" : "/"}${link}`;
  }

  /** Never throws. Returns true only if the message was handed to SMTP. */
  async send(message: MailMessage): Promise<boolean> {
    try {
      if (!this.transporter || !(await this.channelOn())) return false;
      const url = this.absolute(message.link);
      const paragraphs = message.body
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
      const text = [
        message.heading ?? message.subject,
        "",
        ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
        url ? `${message.linkLabel ?? "Open"}: ${url}` : "",
        "",
        "DxValley Innovation Management",
      ]
        .join("\n")
        .trim();
      const body = paragraphs
        .map(
          (paragraph) =>
            `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155">${escapeHtml(
              paragraph,
            ).replace(/\n/g, "<br>")}</p>`,
        )
        .join("");
      const button = url
        ? `<p style="margin:22px 0 0"><a href="${escapeHtml(
            url,
          )}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:11px 20px;border-radius:12px">${escapeHtml(
            message.linkLabel ?? "Open",
          )}</a></p>`
        : "";
      const html = `<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;padding:32px"><tr><td><p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64748b">DxValley Innovation Management</p><h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(
        message.heading ?? message.subject,
      )}</h1>${body}${button}</td></tr></table><p style="margin:14px 0 0;font-size:11px;color:#94a3b8">You are receiving this because of activity in the DxValley IMS.</p></td></tr></table></body></html>`;
      await this.transporter.sendMail({
        from:
          this.config.get<string>("MAIL_FROM")?.trim() || "DxValley IMS <no-reply@dxvalley.dev>",
        to: message.to,
        subject: message.subject,
        text,
        html,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Could not send "${message.subject}" to ${message.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** Email in-app notifications created in the last day that haven't gone out. */
  async flushOutbox() {
    if (this.flushing || !this.transporter || !(await this.channelOn())) return;
    this.flushing = true;
    try {
      const rows = await this.prisma.notification.findMany({
        where: {
          emailedAt: null,
          emailAttempts: { lt: MAX_ATTEMPTS },
          createdAt: { gte: new Date(Date.now() - OUTBOX_WINDOW_MS) },
        },
        orderBy: { createdAt: "asc" },
        take: 25,
        include: { user: { select: { email: true, isActive: true, deletedAt: true } } },
      });
      for (const row of rows) {
        // Claim first so two API instances never send the same notification.
        const claim = await this.prisma.notification.updateMany({
          where: { id: row.id, emailedAt: null },
          data: { emailedAt: new Date() },
        });
        if (claim.count === 0) continue;
        if (!row.user.isActive || row.user.deletedAt) continue;
        const sent = await this.send({
          to: row.user.email,
          subject: row.title,
          body: row.body,
          link: row.link ?? undefined,
          linkLabel: "Open in IMS",
        });
        if (!sent) {
          await this.prisma.notification.update({
            where: { id: row.id },
            data: { emailedAt: null, emailAttempts: { increment: 1 } },
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Outbox run failed: ${(error as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }
}
