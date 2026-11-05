import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateTeamDto, UpdateTeamDto } from "./teams.dto";

const teamInclude = {
  lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { isLead: "desc" as const },
  },
  _count: { select: { products: true } },
} satisfies Prisma.TeamInclude;

type TeamWithRelations = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const teams = await this.prisma.team.findMany({
      where: { isArchived: false },
      include: teamInclude,
      orderBy: { name: "asc" },
    });
    return teams.map((team) => this.mapTeam(team));
  }

  async create(dto: CreateTeamDto, actorId: string) {
    const existing = await this.prisma.team.findUnique({ where: { name: dto.name.trim() } });
    if (existing) throw new ConflictException("A team with that name already exists");

    const memberIds = this.uniqueMembers(dto.memberIds ?? [], dto.leadId);
    await this.assertUsersExist(memberIds);
    if (dto.leadId) await this.assertUsersExist([dto.leadId]);

    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        leadId: dto.leadId || null,
        members: memberIds.length
          ? {
              create: memberIds.map((userId) => ({
                userId,
                isLead: userId === dto.leadId,
              })),
            }
          : undefined,
      },
      include: teamInclude,
    });

    await this.audit.record({
      actorId,
      action: "team.created",
      entityType: "Team",
      entityId: team.id,
      summary: `Created team ${team.name}`,
    });

    return this.mapTeam(team);
  }

  async update(id: string, dto: UpdateTeamDto, actorId: string) {
    const existing = await this.prisma.team.findFirst({ where: { id, isArchived: false } });
    if (!existing) throw new NotFoundException("Team not found");

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.team.findUnique({ where: { name: dto.name.trim() } });
      if (duplicate) throw new ConflictException("A team with that name already exists");
    }

    if (dto.memberIds) await this.assertUsersExist(dto.memberIds);
    if (dto.leadId) await this.assertUsersExist([dto.leadId]);

    const memberIds = dto.memberIds
      ? this.uniqueMembers(dto.memberIds ?? [], dto.leadId)
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined ? undefined : dto.description?.trim() || null,
          leadId: dto.leadId === undefined ? undefined : dto.leadId || null,
          isArchived: dto.isArchived,
        },
      });

      if (memberIds) {
        await tx.userTeam.deleteMany({ where: { teamId: id } });
        if (memberIds.length) {
          await tx.userTeam.createMany({
            data: memberIds.map((userId) => ({
              teamId: id,
              userId,
              isLead: userId === dto.leadId,
            })),
          });
        }
      } else if (dto.leadId) {
        await tx.userTeam.updateMany({
          where: { teamId: id },
          data: { isLead: false },
        });
        await tx.userTeam.upsert({
          where: { userId_teamId: { userId: dto.leadId, teamId: id } },
          update: { isLead: true },
          create: { userId: dto.leadId, teamId: id, isLead: true },
        });
      }
    });

    const updated = await this.prisma.team.findUniqueOrThrow({
      where: { id },
      include: teamInclude,
    });

    await this.audit.record({
      actorId,
      action: "team.updated",
      entityType: "Team",
      entityId: id,
      summary: `Updated team ${updated.name}`,
    });

    return this.mapTeam(updated);
  }

  private uniqueMembers(memberIds: string[], leadId?: string | null) {
    return Array.from(new Set([...memberIds, ...(leadId ? [leadId] : [])]));
  }

  private async assertUsersExist(ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.user.count({
      where: { id: { in: ids }, deletedAt: null },
    });
    if (count !== ids.length) {
      throw new BadRequestException("One or more users were not found");
    }
  }

  private mapTeam(team: TeamWithRelations) {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      lead: team.lead,
      memberCount: team.members.length,
      productCount: team._count.products,
      members: team.members.map((membership) => membership.user),
      createdAt: team.createdAt.toISOString(),
    };
  }
}
