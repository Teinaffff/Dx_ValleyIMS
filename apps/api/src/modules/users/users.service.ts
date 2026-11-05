import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RoleCode } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ROLE_LABELS } from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateUserDto, UpdateUserDto } from "./users.dto";

const userInclude = {
  role: true,
  teams: { include: { team: { select: { id: true, name: true } } } },
  _count: { select: { productsOwned: true } },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: userInclude,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return users.map((user) => this.mapUser(user));
  }

  async owners() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: { code: { in: [RoleCode.PRODUCT_OWNER, RoleCode.ADMIN] } },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A user with that email already exists");

    const role = await this.prisma.role.findUnique({ where: { code: dto.role } });
    if (!role) throw new BadRequestException("Choose a valid role");

    if (dto.teamIds?.length) {
      const teamCount = await this.prisma.team.count({
        where: { id: { in: dto.teamIds } },
      });
      if (teamCount !== dto.teamIds.length) {
        throw new BadRequestException("One or more teams were not found");
      }
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        title: dto.title?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 12),
        roleId: role.id,
        teams: dto.teamIds?.length
          ? { create: dto.teamIds.map((teamId) => ({ teamId })) }
          : undefined,
      },
      include: userInclude,
    });

    await this.audit.record({
      actorId,
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      summary: `Added ${user.name} as ${ROLE_LABELS[dto.role]}`,
      metadata: { email: user.email, role: dto.role },
    });

    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });
    if (!existing) throw new NotFoundException("User not found");

    if (dto.isActive === false && id === actor.id) {
      throw new BadRequestException("You cannot deactivate your own account");
    }

    if (dto.role && dto.role !== existing.role.code && id === actor.id) {
      throw new BadRequestException("You cannot change your own role");
    }

    const losesAdminAccess =
      existing.role.code === RoleCode.ADMIN &&
      existing.isActive &&
      ((dto.role !== undefined && dto.role !== RoleCode.ADMIN) ||
        dto.isActive === false);

    if (losesAdminAccess) {
      const remainingAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          deletedAt: null,
          isActive: true,
          role: { code: RoleCode.ADMIN },
        },
      });
      if (remainingAdmins === 0) {
        throw new BadRequestException("At least one active administrator must remain");
      }
    }

    let email: string | undefined;
    if (dto.email) {
      email = dto.email.toLowerCase().trim();
      const emailOwner = await this.prisma.user.findFirst({
        where: { email, id: { not: id } },
        select: { id: true },
      });
      if (emailOwner) {
        throw new ConflictException("A user with that email already exists");
      }
    }

    let roleId: string | undefined;
    if (dto.role) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.role } });
      if (!role) throw new BadRequestException("Choose a valid role");
      roleId = role.id;
    }

    if (dto.teamIds) {
      const teamCount = await this.prisma.team.count({ where: { id: { in: dto.teamIds } } });
      if (teamCount !== dto.teamIds.length) {
        throw new BadRequestException("One or more teams were not found");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          email,
          title: dto.title === undefined ? undefined : dto.title?.trim() || null,
          roleId,
          isActive: dto.isActive,
        },
      });

      if (dto.teamIds) {
        await tx.userTeam.deleteMany({ where: { userId: id } });
        if (dto.teamIds.length) {
          await tx.userTeam.createMany({
            data: dto.teamIds.map((teamId) => ({ userId: id, teamId })),
          });
        }
      }
    });

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: userInclude,
    });

    const statusChanged = existing.isActive !== updated.isActive;
    const action = statusChanged
      ? updated.isActive
        ? "user.activated"
        : "user.deactivated"
      : "user.updated";
    const summary = statusChanged
      ? `${updated.isActive ? "Activated" : "Deactivated"} ${updated.name}`
      : `Updated ${updated.name}`;

    await this.audit.record({
      actorId: actor.id,
      action,
      entityType: "User",
      entityId: id,
      summary,
      before: {
        name: existing.name,
        email: existing.email,
        role: existing.role.code,
        isActive: existing.isActive,
      },
      after: {
        name: updated.name,
        email: updated.email,
        role: updated.role.code,
        isActive: updated.isActive,
      },
    });

    return this.mapUser(updated);
  }

  async remove(id: string, actor: { id: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });
    if (!existing) throw new NotFoundException("User not found");

    if (id === actor.id) {
      throw new BadRequestException("You cannot delete your own account");
    }

    if (existing.role.code === RoleCode.ADMIN && existing.isActive) {
      const remainingAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          deletedAt: null,
          isActive: true,
          role: { code: RoleCode.ADMIN },
        },
      });
      if (remainingAdmins === 0) {
        throw new BadRequestException("At least one active administrator must remain");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await tx.team.updateMany({ where: { leadId: id }, data: { leadId: null } });
      await tx.userTeam.deleteMany({ where: { userId: id } });
    });

    await this.audit.record({
      actorId: actor.id,
      action: "user.deleted",
      entityType: "User",
      entityId: id,
      summary: `Deleted ${existing.name}`,
      before: {
        name: existing.name,
        email: existing.email,
        role: existing.role.code,
        isActive: existing.isActive,
      },
      metadata: { ownedProductCount: existing._count.productsOwned },
    });

    return { success: true };
  }

  private mapUser(user: UserWithRelations) {
    const role = user.role.code as RoleCode;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      role,
      roleLabel: ROLE_LABELS[role] ?? user.role.name,
      isActive: user.isActive,
      teams: user.teams.map((membership) => membership.team),
      ownedProductCount: user._count.productsOwned,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
