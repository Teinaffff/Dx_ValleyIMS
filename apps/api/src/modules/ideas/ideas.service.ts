import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IdeaStatus, Prisma, RoleCode } from "@prisma/client";
import { validateFiles } from "./attachments";
import { MailService } from "../mail/mail.service";
import { hashAccessCode, matchesAccessCode, newAccessCode } from "../../common/access-code";
import type { IdeaScoring, IdeaTrackResult } from "@ims/shared";
import type { AuthUser } from "../../common/auth-user";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ProductsService } from "../products/products.service";
import type { CreateProductDto } from "../products/products.dto";
import {
  CreatePublicIdeaDto,
  DeleteIdeaDto,
  ListIdeasDto,
  ParkIdeaDto,
  RejectIdeaDto,
  ScoreIdeaDto,
  TrackIdeaDto,
  UpdateIdeaStatusDto,
} from "./ideas.dto";

function excerpt(value: string, max = 130) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

const PENDING_STATUSES: IdeaStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_CLARIFICATION",
];
const APPROVED_STATUSES: IdeaStatus[] = ["APPROVED", "ACCEPTED", "CONVERTED"];
// Ideas that can still be approved or rejected. A parked idea is on hold, not
// decided, so it stays eligible.
const DECIDABLE_STATUSES: IdeaStatus[] = [...PENDING_STATUSES, "PARKED"];

const ideaInclude = {
  submittedBy: {
    select: { id: true, name: true, email: true, title: true },
  },
  approvedBy: { select: { id: true, name: true } },
  deletedBy: { select: { id: true, name: true } },
  statusChangedBy: { select: { id: true, name: true } },
  convertedProduct: { select: { id: true, name: true } },
  scores: {
    select: {
      impact: true,
      feasibility: true,
      strategicFit: true,
      comment: true,
      updatedAt: true,
      evaluatorId: true,
      evaluator: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" as const },
  },
  // Metadata only: the file bytes are streamed from their own endpoint.
  attachments: {
    select: { id: true, kind: true, fileName: true, mimeType: true, size: true },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.IdeaInclude;

type IdeaWithPeople = Prisma.IdeaGetPayload<{ include: typeof ideaInclude }>;

const round1 = (value: number) => Math.round(value * 10) / 10;

function buildScoring(scores: IdeaWithPeople["scores"], viewerId?: string): IdeaScoring {
  if (!scores.length) {
    return { average: null, count: 0, averages: null, mine: null, entries: [] };
  }
  const mean = (pick: (s: IdeaWithPeople["scores"][number]) => number) =>
    scores.reduce((sum, entry) => sum + pick(entry), 0) / scores.length;
  const mine = viewerId ? scores.find((entry) => entry.evaluatorId === viewerId) : undefined;
  return {
    average: round1((mean((s) => s.impact) + mean((s) => s.feasibility) + mean((s) => s.strategicFit)) / 3),
    count: scores.length,
    averages: {
      impact: round1(mean((s) => s.impact)),
      feasibility: round1(mean((s) => s.feasibility)),
      strategicFit: round1(mean((s) => s.strategicFit)),
    },
    mine: mine
      ? {
          impact: mine.impact,
          feasibility: mine.feasibility,
          strategicFit: mine.strategicFit,
          comment: mine.comment,
        }
      : null,
    entries: scores.map((entry) => ({
      evaluator: entry.evaluator,
      impact: entry.impact,
      feasibility: entry.feasibility,
      strategicFit: entry.strategicFit,
      comment: entry.comment,
      updatedAt: entry.updatedAt.toISOString(),
    })),
  };
}

function toInboxItem(idea: IdeaWithPeople, viewerId?: string) {
  const reviewer = idea.deletedBy ?? idea.statusChangedBy ?? idea.approvedBy;
  return {
    id: idea.id,
    reference: idea.id.slice(-8).toUpperCase(),
    title: idea.title,
    problem: idea.problem,
    solution: idea.solution,
    expectedImpact: idea.expectedImpact,
    status: idea.status,
    submitter: {
      name: idea.submitterName ?? idea.submittedBy?.name ?? "Anonymous",
      email: idea.submitterEmail ?? idea.submittedBy?.email ?? null,
      jobTitle: idea.submitterTitle ?? idea.submittedBy?.title ?? null,
      accountId: idea.submittedBy?.id ?? null,
    },
    attachments: idea.attachments,
    scoring: buildScoring(idea.scores, viewerId),
    reviewNote: idea.reviewNote,
    deleteReason: idea.deleteReason,
    reviewedBy: reviewer ? { id: reviewer.id, name: reviewer.name } : null,
    convertedProductId: idea.convertedProduct?.id ?? null,
    approvedAt: idea.approvedAt?.toISOString() ?? null,
    statusChangedAt: idea.statusChangedAt?.toISOString() ?? null,
    deletedAt: idea.deletedAt?.toISOString() ?? null,
    createdAt: idea.createdAt.toISOString(),
  };
}

@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly products: ProductsService,
    private readonly mail: MailService,
  ) {}

  /** Plain-language emails to the person who submitted; never throws. */
  private emailSubmitter(
    idea: { id: string; title: string; submitterName?: string | null; submitterEmail?: string | null; submittedBy?: { name: string; email: string } | null },
    kind: "received" | "approved" | "converted" | "closed" | "parked" | "reissued",
    accessCode?: string,
  ) {
    const to = idea.submitterEmail ?? idea.submittedBy?.email;
    if (!to) return;
    const name = (idea.submitterName ?? idea.submittedBy?.name ?? "").split(" ")[0] || "there";
    const reference = idea.id.slice(-8).toUpperCase();
    const copy = {
      received: {
        subject: `We received your idea: ${idea.title}`,
        heading: "Your idea is in.",
        body: `Hi ${name},\n\nThanks for sharing "${idea.title}". The innovation team will review it.\n\nYour reference is ${reference}${
          accessCode ? ` and your access code is ${accessCode}` : ""
        }. Keep ${accessCode ? "both" : "it"}: ${
          accessCode ? "you need them" : "you need it"
        } to see where your idea stands at any time.`,
        label: "Track your idea",
      },
      reissued: {
        subject: `Your new access code for: ${idea.title}`,
        heading: "Here's your new access code.",
        body: `Hi ${name},\n\nYou asked for a new access code for "${idea.title}" (reference ${reference}).\n\nYour new access code is ${accessCode}. The old code no longer works. If you didn't ask for this, you can ignore this email: nobody can see your idea's status without the code.`,
        label: "Track your idea",
      },
      approved: {
        subject: `Your idea was approved: ${idea.title}`,
        heading: "Good news: your idea was approved.",
        body: `Hi ${name},\n\nThe innovation team approved "${idea.title}". It may now be shaped into a product, and we'll tell you if it moves forward.\n\nReference ${reference}.`,
        label: "Track your idea",
      },
      converted: {
        subject: `Your idea became a product: ${idea.title}`,
        heading: "Your idea is now a product.",
        body: `Hi ${name},\n\n"${idea.title}" has been turned into a product in the DxValley portfolio. Thank you for starting it.\n\nReference ${reference}.`,
        label: "Track your idea",
      },
      parked: {
        subject: `Your idea is on hold: ${idea.title}`,
        heading: "Your idea is on hold.",
        body: `Hi ${name},\n\nThe innovation team likes "${idea.title}" but the timing isn't right to take it forward yet. It has been parked, not rejected, and the team will revisit it.\n\nReference ${reference}.`,
        label: "Track your idea",
      },
      closed: {
        subject: `An update on your idea: ${idea.title}`,
        heading: "An update on your idea.",
        body: `Hi ${name},\n\nThe innovation team reviewed "${idea.title}" and can't take it forward right now. Thank you for sharing it. Ideas like yours are how we find the next thing worth building, and you're welcome to submit another.\n\nReference ${reference}.`,
        label: "See details",
      },
    }[kind];
    void this.mail.send({
      to,
      subject: copy.subject,
      heading: copy.heading,
      body: copy.body,
      link: `/track-idea?ref=${reference}`,
      linkLabel: copy.label,
    });
  }

  async submitPublic(dto: CreatePublicIdeaDto, uploads: Express.Multer.File[] = []) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const title = dto.title.trim();
    const problem = dto.problem?.trim() ?? "";
    const solution = dto.solution?.trim() ?? "";
    const files = validateFiles(uploads);

    // Writing is only mandatory when nothing else explains the idea.
    if (!files.length) {
      if (problem.length < 20) {
        throw new BadRequestException(
          "Describe the problem in at least 20 characters, or attach a voice note, video, image or document.",
        );
      }
      if (solution.length < 20) {
        throw new BadRequestException(
          "Describe your proposed solution in at least 20 characters, or attach a voice note, video, image or document.",
        );
      }
    }

    const accessCode = newAccessCode();
    const idea = await this.prisma.idea.create({
      data: {
        trackingHash: hashAccessCode(accessCode),
        attachments: files.length
          ? {
              create: files.map((file) => ({
                kind: file.kind,
                fileName: file.fileName,
                mimeType: file.mimeType,
                size: file.size,
                data: new Uint8Array(file.data),
              })),
            }
          : undefined,
        title,
        problem,
        solution,
        expectedImpact: dto.expectedImpact?.trim() || null,
        status: "SUBMITTED",
        submitterName: name,
        submitterEmail: email,
        submitterTitle: dto.jobTitle?.trim() || null,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: { code: RoleCode.ADMIN },
      },
      select: { id: true },
    });

    if (admins.length) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "idea.submitted",
          title: `New idea: ${title}`,
          body: `${name} shared an idea. ${
            problem
              ? excerpt(problem)
              : `${files.length} attachment${files.length === 1 ? "" : "s"} included.`
          }`,
          link: "/admin/ideas",
        })),
      });
    }

    await this.audit.record({
      actorId: null,
      action: "idea.submitted",
      entityType: "Idea",
      entityId: idea.id,
      summary: `New anonymous idea submitted: ${title}`,
      metadata: { source: "public", submitterEmail: email, attachments: files.length },
    });

    this.emailSubmitter(
      { id: idea.id, title, submitterName: name, submitterEmail: email },
      "received",
      accessCode,
    );

    // The code is shown once (and emailed); only its hash is stored.
    return {
      id: idea.id,
      reference: idea.id.slice(-8).toUpperCase(),
      accessCode,
    };
  }

  // ------------------------------------------------------- submitter tracking

  /**
   * Public status lookup. The reference alone is never enough: the submitter's
   * email must match too, and only submitter-safe information is returned.
   */
  async track(dto: TrackIdeaDto): Promise<IdeaTrackResult> {
    const ref = dto.reference.trim().replace(/[^a-zA-Z0-9]/g, "");
    const notFound = new NotFoundException(
      "We couldn't find an idea with that reference and access code. Check both and try again.",
    );
    if (ref.length < 4) throw notFound;

    const candidates = await this.prisma.idea.findMany({
      where: { id: { endsWith: ref, mode: "insensitive" } },
      include: { _count: { select: { attachments: true } } },
      take: 5,
    });
    const email = dto.email?.trim().toLowerCase();
    // Ideas with an access code are opened only by that code. Older ideas,
    // submitted before codes existed, still fall back to the submitter's email.
    const idea = candidates.find((candidate) =>
      candidate.trackingHash
        ? matchesAccessCode(dto.accessCode, candidate.trackingHash)
        : Boolean(email) && candidate.submitterEmail?.toLowerCase() === email,
    );
    if (!idea) throw notFound;

    const base = {
      reference: idea.id.slice(-8).toUpperCase(),
      title: idea.title,
      submittedAt: idea.createdAt.toISOString(),
      attachmentCount: idea._count.attachments,
      clarification: null as string | null,
    };
    switch (idea.status) {
      case "APPROVED":
      case "ACCEPTED":
        return {
          ...base,
          stage: "APPROVED",
          headline: "Approved",
          message:
            "The innovation team approved your idea. It may now be shaped into a product, and you'll hear from us if it moves forward.",
          decidedAt: idea.approvedAt?.toISOString() ?? null,
        };
      case "CONVERTED":
        return {
          ...base,
          stage: "PRODUCT",
          headline: "Now a product",
          message: "Your idea has become a product in the DxValley portfolio. Thank you for starting it.",
          decidedAt: idea.approvedAt?.toISOString() ?? null,
        };
      case "REJECTED":
      case "DELETED":
        return {
          ...base,
          stage: "CLOSED",
          headline: "Reviewed and closed",
          message:
            "The innovation team reviewed your idea and can't take it forward right now. Thank you for sharing it. You're welcome to submit another.",
          decidedAt: (idea.deletedAt ?? idea.statusChangedAt ?? idea.updatedAt).toISOString(),
        };
      case "PARKED":
        return {
          ...base,
          stage: "PARKED",
          headline: "On hold",
          message:
            "The innovation team likes your idea but the timing isn't right to take it forward yet. It's parked, not rejected, and they'll revisit it.",
          decidedAt: idea.statusChangedAt?.toISOString() ?? null,
        };
      case "NEEDS_CLARIFICATION":
        return {
          ...base,
          stage: "NEEDS_INFO",
          headline: "We need a little more",
          message: "The innovation team has a question about your idea.",
          decidedAt: null,
          clarification: idea.clarificationNote ?? null,
        };
      case "UNDER_REVIEW":
        return {
          ...base,
          stage: "IN_REVIEW",
          headline: "Being reviewed",
          message: "The innovation team is reviewing your idea right now.",
          decidedAt: null,
        };
      default:
        return {
          ...base,
          stage: "RECEIVED",
          headline: "Received",
          message: "Your idea is in the queue. The innovation team reads every submission.",
          decidedAt: null,
        };
    }
  }

  /**
   * Lost access code: a new one is emailed to the address on the idea. The
   * answer is identical whether or not the details matched, so this can't be
   * used to find out which references or emails exist.
   */
  async reissueCode(reference: string, email: string) {
    if (!this.mail.configured) {
      throw new BadRequestException(
        "Email isn't set up here, so we can't send a new code. Please contact the innovation team.",
      );
    }
    const ref = reference.trim().replace(/[^a-zA-Z0-9]/g, "");
    if (ref.length >= 4) {
      const idea = await this.prisma.idea.findFirst({
        where: {
          id: { endsWith: ref, mode: "insensitive" },
          submitterEmail: { equals: email.trim(), mode: "insensitive" },
        },
      });
      if (idea) {
        const accessCode = newAccessCode();
        await this.prisma.idea.update({
          where: { id: idea.id },
          data: { trackingHash: hashAccessCode(accessCode) },
        });
        this.emailSubmitter(idea, "reissued", accessCode);
      }
    }
    return {
      message: "If those details match an idea, we've emailed a new access code to that address.",
    };
  }

  // ------------------------------------------------------------------ scoring

  async score(id: string, dto: ScoreIdeaDto, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (idea.status === "DELETED") {
      throw new BadRequestException("Restore this idea before scoring it.");
    }
    const data = {
      impact: dto.impact,
      feasibility: dto.feasibility,
      strategicFit: dto.strategicFit,
      comment: dto.comment?.trim() || null,
    };
    await this.prisma.ideaScore.upsert({
      where: { ideaId_evaluatorId: { ideaId: id, evaluatorId: actor.id } },
      create: { ideaId: id, evaluatorId: actor.id, ...data },
      update: data,
    });
    await this.audit.record({
      actorId: actor.id,
      action: "idea.scored",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} scored idea "${idea.title}"`,
      metadata: data,
    });
    const fresh = await this.prisma.idea.findUniqueOrThrow({ where: { id }, include: ideaInclude });
    return buildScoring(fresh.scores, actor.id);
  }

  async attachment(ideaId: string, attachmentId: string) {
    const file = await this.prisma.ideaAttachment.findFirst({
      where: { id: attachmentId, ideaId },
    });
    if (!file) throw new NotFoundException("Attachment not found.");
    return file;
  }

  async list(query: ListIdeasDto, viewerId?: string) {
    const q = query.q?.trim();
    const status = query.status ?? "all";
    const sort = query.sort ?? "newest";
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    const searchWhere: Prisma.IdeaWhereInput | undefined = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { submitterName: { contains: q, mode: "insensitive" } },
            { submitterEmail: { contains: q, mode: "insensitive" } },
            {
              submittedBy: {
                is: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
            { id: { endsWith: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const statusWhere: Prisma.IdeaWhereInput | undefined =
      status === "deleted"
        ? { status: "DELETED" }
        : status === "parked"
          ? { status: "PARKED" }
          : status === "rejected"
            ? { status: "REJECTED" }
            : status === "pending"
          ? { status: { in: PENDING_STATUSES } }
          : status === "approved"
            ? { status: { in: APPROVED_STATUSES } }
            : { status: { not: "DELETED" } };

    const where: Prisma.IdeaWhereInput = {
      ...(searchWhere ?? {}),
      ...(statusWhere ?? {}),
    };

    const [all, pending, approved, parked, rejected, deleted, total] =
      await this.prisma.$transaction([
        this.prisma.idea.count({ where: { status: { not: "DELETED" } } }),
        this.prisma.idea.count({ where: { status: { in: PENDING_STATUSES } } }),
        this.prisma.idea.count({ where: { status: { in: APPROVED_STATUSES } } }),
        this.prisma.idea.count({ where: { status: "PARKED" } }),
        this.prisma.idea.count({ where: { status: "REJECTED" } }),
        this.prisma.idea.count({ where: { status: "DELETED" } }),
        this.prisma.idea.count({ where }),
      ]);

    let ideas: IdeaWithPeople[];
    if (sort === "score") {
      // Ranking by the evaluators' average can't be done in SQL here, so rank
      // the matching ids in memory (unscored last, newest first on ties) and
      // load only the requested page.
      const ranked = await this.prisma.idea.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          scores: { select: { impact: true, feasibility: true, strategicFit: true } },
        },
      });
      const avg = (entry: (typeof ranked)[number]) =>
        entry.scores.length
          ? entry.scores.reduce((sum, s) => sum + s.impact + s.feasibility + s.strategicFit, 0) /
            (entry.scores.length * 3)
          : -1;
      ranked.sort((a, b) => avg(b) - avg(a) || b.createdAt.getTime() - a.createdAt.getTime());
      const ids = ranked.slice((page - 1) * pageSize, page * pageSize).map((entry) => entry.id);
      const pageRows = await this.prisma.idea.findMany({
        where: { id: { in: ids } },
        include: ideaInclude,
      });
      ideas = ids.flatMap((id) => pageRows.filter((row) => row.id === id));
    } else {
      ideas = await this.prisma.idea.findMany({
        where,
        orderBy: [{ createdAt: sort === "oldest" ? "asc" : "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: ideaInclude,
      });
    }

    return {
      items: ideas.map((idea) => toInboxItem(idea, viewerId)),
      counts: { all, pending, approved, parked, rejected, deleted },
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async updateStatus(id: string, dto: UpdateIdeaStatusDto, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (idea.status === "DELETED") {
      throw new BadRequestException("Restore this idea before changing its status.");
    }

    const note = dto.note?.trim() || null;

    if (dto.status === "APPROVED") {
      if (!DECIDABLE_STATUSES.includes(idea.status) && idea.status !== "APPROVED") {
        throw new BadRequestException(
          "Only ideas awaiting review can be approved.",
        );
      }
      if (idea.status === "APPROVED") {
        return { id: idea.id, status: idea.status };
      }

      const updated = await this.prisma.idea.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: actor.id,
          approvedAt: new Date(),
          statusChangedById: null,
          statusChangedAt: null,
          reviewNote: note,
        },
      });

      await this.audit.record({
        actorId: actor.id,
        action: "idea.approved",
        entityType: "Idea",
        entityId: id,
        summary: `${actor.name} approved idea "${idea.title}"`,
        before: { status: idea.status },
        after: { status: updated.status, approvedById: actor.id },
        metadata: { note },
      });

      this.emailSubmitter(idea, "approved");
      return { id: updated.id, status: updated.status };
    }

    if (idea.status !== "APPROVED") {
      throw new BadRequestException(
        "Only approved ideas can be returned to the pending queue.",
      );
    }

    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        approvedById: null,
        approvedAt: null,
        reviewNote: note,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      action: "idea.reopened",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} returned idea "${idea.title}" to review`,
      before: { status: idea.status },
      after: { status: updated.status },
      metadata: { note },
    });

    return { id: updated.id, status: updated.status };
  }

  async reject(id: string, dto: RejectIdeaDto, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (!DECIDABLE_STATUSES.includes(idea.status)) {
      throw new BadRequestException(
        idea.status === "REJECTED"
          ? "This idea is already rejected."
          : "Only ideas awaiting a decision can be rejected.",
      );
    }
    const reason = dto.reason.trim();
    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewNote: reason,
        statusChangedById: actor.id,
        statusChangedAt: new Date(),
        approvedById: null,
        approvedAt: null,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "idea.rejected",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} rejected idea "${idea.title}"`,
      before: { status: idea.status },
      after: { status: updated.status },
      metadata: { reason },
    });
    // The reason is internal; the submitter gets a neutral message.
    this.emailSubmitter(idea, "closed");
    return { id: updated.id, status: updated.status };
  }

  async park(id: string, dto: ParkIdeaDto, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (!PENDING_STATUSES.includes(idea.status)) {
      throw new BadRequestException(
        idea.status === "PARKED"
          ? "This idea is already parked."
          : "Only ideas awaiting review can be parked.",
      );
    }
    const note = dto.note?.trim() || null;
    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        status: "PARKED",
        reviewNote: note,
        statusChangedById: actor.id,
        statusChangedAt: new Date(),
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "idea.parked",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} parked idea "${idea.title}"`,
      before: { status: idea.status },
      after: { status: updated.status },
      metadata: { note },
    });
    this.emailSubmitter(idea, "parked");
    return { id: updated.id, status: updated.status };
  }

  /** Put a parked or rejected idea back in the review queue. */
  async reopen(id: string, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (idea.status !== "PARKED" && idea.status !== "REJECTED") {
      throw new BadRequestException("Only parked or rejected ideas can be moved back to review.");
    }
    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        reviewNote: null,
        statusChangedById: null,
        statusChangedAt: null,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "idea.reopened",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} moved ${idea.status === "PARKED" ? "parked" : "rejected"} idea "${idea.title}" back to review`,
      before: { status: idea.status },
      after: { status: updated.status },
    });
    return { id: updated.id, status: updated.status };
  }

  async softDelete(id: string, dto: DeleteIdeaDto, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (idea.status === "DELETED") {
      throw new BadRequestException("This idea is already deleted.");
    }

    const reason = dto.reason?.trim() || null;
    const deletedAt = new Date();
    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedById: actor.id,
        deletedAt,
        deleteReason: reason,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      action: "idea.deleted",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} deleted idea "${idea.title}"`,
      before: { status: idea.status },
      after: { status: updated.status, deletedById: actor.id },
      metadata: { reason },
    });

    this.emailSubmitter(idea, "closed");

    return { id: updated.id, status: updated.status };
  }

  async restore(id: string, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (idea.status !== "DELETED") {
      throw new BadRequestException("Only deleted ideas can be restored.");
    }

    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        approvedById: null,
        approvedAt: null,
        deletedById: null,
        deletedAt: null,
        deleteReason: null,
        statusChangedById: null,
        statusChangedAt: null,
        reviewNote: null,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      action: "idea.restored",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} restored idea "${idea.title}"`,
      before: { status: idea.status, deleteReason: idea.deleteReason },
      after: { status: updated.status },
    });

    return { id: updated.id, status: updated.status };
  }

  async convert(id: string, dto: CreateProductDto, actor: AuthUser) {
    const idea = await this.prisma.idea.findUnique({
      where: { id },
      include: { convertedProduct: { select: { id: true } } },
    });
    if (!idea) throw new NotFoundException("Idea not found.");
    if (idea.status === "DELETED") {
      throw new BadRequestException("Restore this idea before converting it.");
    }
    if (idea.convertedProduct || idea.status === "CONVERTED") {
      throw new ConflictException("This idea has already been turned into a product.");
    }
    if (idea.status !== "APPROVED" && idea.status !== "ACCEPTED") {
      throw new BadRequestException(
        "Only approved ideas can be turned into a product.",
      );
    }

    const product = await this.products.create(dto, actor);

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: product.id },
        data: { ideaId: id },
      }),
      this.prisma.idea.update({
        where: { id },
        data: { status: "CONVERTED" },
      }),
    ]);

    await this.audit.record({
      actorId: actor.id,
      action: "idea.converted",
      entityType: "Idea",
      entityId: id,
      summary: `${actor.name} turned idea "${idea.title}" into ${product.name}`,
      before: { status: idea.status },
      after: { status: "CONVERTED", productId: product.id },
      metadata: { productId: product.id, productName: product.name },
    });

    this.emailSubmitter(idea, "converted");

    if (idea.submittedById && idea.submittedById !== actor.id) {
      await this.prisma.notification.create({
        data: {
          userId: idea.submittedById,
          type: "idea.converted",
          title: `Your idea became a product: ${product.name}`,
          body: `${actor.name} turned "${idea.title}" into a product owned by ${product.owner.name}.`,
          link: `/admin/products/${product.id}`,
        },
      });
    }

    return product;
  }
}
