import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma.service";
import { sessionInclude, toSessionUser } from "../../common/session-user";
import { AuditService } from "../audit/audit.service";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_PATH,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  withBasePath,
} from "../../common/auth.constants";
import { AuthUser } from "../../common/auth-user";

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;
  private readonly secureCookies: boolean;
  private readonly refreshCookiePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.accessSecret = config.get<string>("JWT_SECRET") ?? "dev-access-secret";
    this.refreshSecret =
      config.get<string>("JWT_REFRESH_SECRET") ?? "dev-refresh-secret";
    this.accessTtl = config.get<string>("ACCESS_TOKEN_TTL") ?? "8h";
    this.refreshTtl = config.get<string>("REFRESH_TOKEN_TTL") ?? "7d";
    this.refreshCookiePath = withBasePath(
      REFRESH_COOKIE_PATH,
      config.get<string>("COOKIE_BASE_PATH"),
    );
    // COOKIE_SECURE has to win over NODE_ENV: a LAN test server runs production
    // code over plain HTTP, and a Secure cookie would never be stored.
    const cookieSecure = config.get<string>("COOKIE_SECURE");
    this.secureCookies =
      cookieSecure === undefined
        ? config.get<string>("NODE_ENV") === "production"
        : cookieSecure === "true";
  }

  async login(email: string, password: string, response: Response) {
    const dbUser = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
      include: sessionInclude,
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException("Email or password is incorrect");
    }

    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Email or password is incorrect");
    }

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date() },
    });

    const user = toSessionUser(dbUser);
    await this.issueSession(response, {
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return user;
  }

  async refresh(refreshToken: string | undefined, response: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException("Your session has expired");
    }

    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: sessionInclude,
      });

      if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
        throw new UnauthorizedException("This account is no longer active");
      }

      const user = toSessionUser(dbUser);
      await this.issueSession(response, {
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Your session has expired");
    }
  }

  logout(response: Response) {
    response.clearCookie(ACCESS_COOKIE, { path: ACCESS_COOKIE_PATH });
    response.clearCookie(REFRESH_COOKIE, { path: this.refreshCookiePath });
    return { success: true };
  }

  me(user: AuthUser) {
    return user;
  }

  async changePassword(
    user: AuthUser,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
    });
    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException("This account is no longer active");
    }

    const valid = await bcrypt.compare(dto.currentPassword, dbUser.passwordHash);
    if (!valid) {
      throw new BadRequestException("Your current password is incorrect");
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("Choose a password different from your current one");
    }

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });

    await this.audit.record({
      actorId: user.id,
      action: "user.password_changed",
      entityType: "User",
      entityId: dbUser.id,
      summary: `Changed their own password`,
    });

    return { success: true };
  }

  private async issueSession(response: Response, payload: TokenPayload) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl as never,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtl as never,
    });

    response.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookies,
      path: ACCESS_COOKIE_PATH,
      maxAge: this.ttlToMs(this.accessTtl, 8 * 60 * 60 * 1000),
    });
    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookies,
      path: this.refreshCookiePath,
      maxAge: this.ttlToMs(this.refreshTtl, 7 * 24 * 60 * 60 * 1000),
    });
  }

  private ttlToMs(ttl: string, fallback: number) {
    const match = /^(\d+)\s*([smhd])$/.exec(ttl);
    if (!match) return fallback;
    const value = Number(match[1]);
    const unit = match[2];
    const factor =
      unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
    return value * factor;
  }
}
