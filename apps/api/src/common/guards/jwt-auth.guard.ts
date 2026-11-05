import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ACCESS_COOKIE } from "../auth.constants";
import { sessionInclude, toSessionUser } from "../session-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const bearer = request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice(7)
      : undefined;
    const token = request.cookies?.[ACCESS_COOKIE] ?? bearer;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException("Sign in to continue");
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: sessionInclude,
      });

      if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
        if (isPublic) return true;
        throw new UnauthorizedException("This account is no longer active");
      }

      request.user = toSessionUser(dbUser);
      return true;
    } catch (error) {
      if (isPublic) return true;
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Your session has expired. Sign in again.");
    }
  }
}
