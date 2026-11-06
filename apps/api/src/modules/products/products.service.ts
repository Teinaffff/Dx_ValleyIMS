import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProductHealth, ProductVisibility, LifecycleStage } from "@prisma/client";
import {
  LIFECYCLE_STAGES,
  LIFECYCLE_STAGE_KEYS,
  MilestoneDto,
  PERMISSIONS,
  PublicPortfolio,
  ProductDetail,
  ProductListItem,
  PublicProductDetail,
  PublicProductListItem,
  stageLabel,
} from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuthUser } from "../../common/auth-user";
import { AuditService } from "../audit/audit.service";
import {
  SetMilestoneStatusDto,
  CreateMilestoneDto,
  CreateProductDto,
  ListMilestonesDto,
  ListProductsDto,
  ReorderMilestonesDto,
  UpdateMilestoneDto,
  UpdateProductDto,
} from "./products.dto";
import { computeHealth, milestoneProgress } from "./product-health";

const userRef = { select: { id: true, name: true, email: true, avatarUrl: true } };

function clampWeight(weight: number | null | undefined): number {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return 100;
  return Math.min(100, Math.max(1, Math.round(weight)));
}

const productListInclude = {
  owner: { select: { id: true, name: true, avatarUrl: true } },
  team: { select: { id: true, name: true } },
  teams: { include: { team: { select: { id: true, name: true } } } },
  milestones: { orderBy: { sortOrder: "asc" as const } },
  gateRequests: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.ProductInclude;

const productDetailInclude = {
  owner: userRef,
  team: { select: { id: true, name: true, description: true } },
  teams: { include: { team: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  idea: { select: { id: true, title: true, status: true } },
  visibilityTeams: { select: { teamId: true } },
  milestones: {
    orderBy: [{ stage: "asc" as const }, { sortOrder: "asc" as const }],
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      completedBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  stageHistory: {
    orderBy: { createdAt: "asc" as const },
    include: { movedBy: { select: { id: true, name: true, avatarUrl: true } } },
  },
  gateRequests: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.ProductInclude;

const publicDetailInclude = {
  ...productDetailInclude,
  updates: {
    where: { isPublic: true },
    orderBy: { createdAt: "desc" as const },
    take: 6,
    select: { id: true, title: true, body: true, createdAt: true },
  },
  _count: { select: { followers: true } },
} satisfies Prisma.ProductInclude;

const milestoneInclude = {
  owner: { select: { id: true, name: true, avatarUrl: true } },
  completedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.MilestoneInclude;

type MilestoneWithPeople = Prisma.MilestoneGetPayload<{
  include: typeof milestoneInclude;
}>;

type ProductWithList = Prisma.ProductGetPayload<{ include: typeof productListInclude }>;
type ProductWithDetail = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;
type ProductWithPublicDetail = Prisma.ProductGetPayload<{
  include: typeof publicDetailInclude;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListProductsDto, user: AuthUser) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10));
    const filters: Prisma.ProductWhereInput = {};
    const scope = this.accessWhere(user);

    if (!query.includeArchived) filters.isArchived = false;
    if (query.stage) filters.stage = query.stage as never;
    if (query.ownerId) filters.ownerId = query.ownerId;
    if (query.teamId) filters.teams = { some: { teamId: query.teamId } };
    if (query.health) filters.health = query.health as ProductHealth;
    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { owner: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const where: Prisma.ProductWhereInput = { AND: [scope, filters] };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === "updated_asc"
        ? { updatedAt: "asc" }
        : query.sort === "name_asc"
          ? { name: "asc" }
          : query.sort === "created_desc"
            ? { createdAt: "desc" }
            : { updatedAt: "desc" };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productListInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((product) => this.mapList(product)),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async meta() {
    const [owners, teams] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          role: { code: { in: ["PRODUCT_OWNER", "ADMIN"] } },
        },
        select: { id: true, name: true, email: true, avatarUrl: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.team.findMany({
        where: { isArchived: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { owners, teams };
  }

  async getDetail(id: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertViewAccess(product.ownerId, user);
    return this.mapDetail(product);
  }

  async history(id: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertViewAccess(product.ownerId, user);
    const entries = await this.prisma.stageHistory.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
      include: { movedBy: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return entries.map((entry) => ({
      id: entry.id,
      fromStage: entry.fromStage,
      toStage: entry.toStage,
      movedBy: entry.movedBy,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  async create(dto: CreateProductDto, user: AuthUser) {
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    const owner = await this.prisma.user.findFirst({
      where: { id: dto.ownerId, isActive: true, deletedAt: null },
    });
    if (!owner) throw new BadRequestException("Choose an active product owner");

    const teamIds = dto.teamIds ?? [];
    if (teamIds.length) await this.assertTeams(teamIds, "development teams");
    if (dto.visibilityTeamIds?.length)
      await this.assertTeams(dto.visibilityTeamIds, "visibility teams");

    const customMilestones = (dto.customMilestones ?? []).map(
      (milestone, index) => ({
        stage: dto.stage as never,
        title: milestone.title.trim(),
        description: milestone.description?.trim() || null,
        isRequired: milestone.isRequired ?? true,
        weight: clampWeight(milestone.weight),
        sortOrder: index + 1,
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
      }),
    );

    const visibilityTeams =
      dto.visibility === "TEAMS"
        ? dto.visibilityTeamIds?.length
          ? dto.visibilityTeamIds
          : teamIds
        : [];

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          slug: await this.uniqueSlug(name),
          description: dto.description.trim(),
          ownerId: dto.ownerId,
          teamId: teamIds[0] ?? null,
          stage: dto.stage as never,
          health: "ON_TRACK",
          visibility: dto.visibility as ProductVisibility,
          businessArea: dto.businessArea?.trim() || null,
          targetUsers: dto.targetUsers?.trim() || null,
          expectedImpact: dto.expectedImpact?.trim() || null,
          launchTarget: dto.launchTarget ? new Date(dto.launchTarget) : null,
          createdById: user.id,
          stageHistory: {
            create: {
              fromStage: null,
              toStage: dto.stage as never,
              movedById: user.id,
              reason: "Product created",
            },
          },
          milestones: customMilestones.length
            ? { create: customMilestones }
            : undefined,
          teams: teamIds.length
            ? { create: teamIds.map((teamId) => ({ teamId })) }
            : undefined,
          visibilityTeams: visibilityTeams.length
            ? { create: visibilityTeams.map((teamId) => ({ teamId })) }
            : undefined,
        },
        include: productDetailInclude,
      });
      return created;
    });

    await this.audit.record({
      actorId: user.id,
      action: "product.created",
      entityType: "Product",
      entityId: product.id,
      summary: `Created product ${product.name}`,
      after: {
        name: product.name,
        stage: product.stage,
        owner: product.owner.name,
      },
      metadata: { productId: product.id, productName: product.name },
    });

    if (product.ownerId !== user.id) {
      await this.prisma.notification.create({
        data: {
          userId: product.ownerId,
          type: "product.assigned",
          title: `You now own ${product.name}`,
          body: `${user.name} created this product and assigned you as its owner.`,
          link: `/admin/products/${product.id}`,
        },
      });
    }

    return this.mapDetail(product);
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
    if (!existing) throw new NotFoundException("Product not found");
    this.assertManageAccess(existing.ownerId, user);

    if (dto.name && dto.name.trim() !== existing.name) {
      await this.assertNameAvailable(dto.name.trim(), id);
    }

    if (dto.ownerId && dto.ownerId !== existing.ownerId) {
      const owner = await this.prisma.user.findFirst({
        where: { id: dto.ownerId, isActive: true, deletedAt: null },
      });
      if (!owner) throw new BadRequestException("Choose an active product owner");
    }
    if (dto.teamIds !== undefined && dto.teamIds.length)
      await this.assertTeams(dto.teamIds, "development teams");
    if (dto.visibilityTeamIds?.length)
      await this.assertTeams(dto.visibilityTeamIds, "visibility teams");

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        ownerId: dto.ownerId,
        teamId:
          dto.teamIds === undefined ? undefined : (dto.teamIds[0] ?? null),
        teams: dto.teamIds
          ? {
              deleteMany: {},
              create: dto.teamIds.map((teamId) => ({ teamId })),
            }
          : undefined,
        visibility: dto.visibility as ProductVisibility | undefined,
        businessArea:
          dto.businessArea === undefined ? undefined : dto.businessArea?.trim() || null,
        targetUsers:
          dto.targetUsers === undefined ? undefined : dto.targetUsers?.trim() || null,
        expectedImpact:
          dto.expectedImpact === undefined
            ? undefined
            : dto.expectedImpact?.trim() || null,
        launchTarget:
          dto.launchTarget === undefined
            ? undefined
            : dto.launchTarget
              ? new Date(dto.launchTarget)
              : null,
        visibilityTeams: dto.visibilityTeamIds
          ? {
              deleteMany: {},
              create: dto.visibilityTeamIds.map((teamId) => ({ teamId })),
            }
          : undefined,
      },
      include: productDetailInclude,
    });

    await this.audit.record({
      actorId: user.id,
      action: "product.updated",
      entityType: "Product",
      entityId: id,
      summary: `Updated product ${product.name}`,
      before: {
        name: existing.name,
        description: existing.description,
        owner: existing.owner.name,
        visibility: existing.visibility,
      },
      after: {
        name: product.name,
        description: product.description,
        owner: product.owner.name,
        visibility: product.visibility,
      },
      metadata: { productId: id, productName: product.name },
    });

    if (product.ownerId !== existing.ownerId && product.ownerId !== user.id) {
      await this.prisma.notification.create({
        data: {
          userId: product.ownerId,
          type: "product.assigned",
          title: `You now own ${product.name}`,
          body: `${user.name} assigned you as the product owner.`,
          link: `/admin/products/${product.id}`,
        },
      });
    }

    return this.mapDetail(product);
  }

  async archive(id: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.product.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    await this.audit.record({
      actorId: user.id,
      action: "product.archived",
      entityType: "Product",
      entityId: id,
      summary: `Archived product ${product.name}`,
      metadata: { productId: id, productName: product.name },
    });

    return { success: true };
  }

  async restore(id: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.product.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    });

    await this.audit.record({
      actorId: user.id,
      action: "product.restored",
      entityType: "Product",
      entityId: id,
      summary: `Restored product ${product.name}`,
      metadata: { productId: id, productName: product.name },
    });

    return { success: true };
  }

  async listMilestones(id: string, query: ListMilestonesDto, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertViewAccess(product.ownerId, user);

    const milestones = await this.prisma.milestone.findMany({
      where: {
        productId: id,
        ...(query.stage ? { stage: query.stage as LifecycleStage } : {}),
      },
      orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
      include: milestoneInclude,
    });

    return milestones.map((milestone) => this.mapMilestone(milestone));
  }

  async createMilestone(id: string, dto: CreateMilestoneDto, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertManageAccess(product.ownerId, user);

    const stage = dto.stage as LifecycleStage;
    await this.assertMilestoneStage(id, product.stage, stage);
    if (dto.ownerId) await this.assertMilestoneOwner(dto.ownerId);

    const last = await this.prisma.milestone.aggregate({
      where: { productId: id, stage },
      _max: { sortOrder: true },
    });

    const milestone = await this.prisma.milestone.create({
      data: {
        productId: id,
        stage,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        isRequired: dto.isRequired ?? true,
        weight: clampWeight(dto.weight),
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        ownerId: dto.ownerId ?? null,
        evidenceLink: dto.evidenceLink?.trim() || null,
        targetValue: dto.targetValue ?? null,
        actualValue: dto.actualValue ?? null,
        unit: dto.unit?.trim() || null,
      },
      include: milestoneInclude,
    });

    await this.audit.record({
      actorId: user.id,
      action: "milestone.created",
      entityType: "Milestone",
      entityId: milestone.id,
      summary: `Added milestone ${milestone.title} to ${stageLabel(stage)} on ${product.name}`,
      after: {
        title: milestone.title,
        stage: milestone.stage,
        isRequired: milestone.isRequired,
        weight: milestone.weight,
      },
      metadata: { productId: product.id, productName: product.name },
    });

    return this.mapMilestone(milestone);
  }

  async updateMilestone(
    id: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
    user: AuthUser,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertManageAccess(product.ownerId, user);

    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, productId: id },
      include: milestoneInclude,
    });
    if (!milestone) throw new NotFoundException("Milestone not found");

    await this.assertMilestoneStage(id, product.stage, milestone.stage);
    if (dto.ownerId) await this.assertMilestoneOwner(dto.ownerId);

    const frozen =
      milestone.status === "COMPLETED" || milestone.status === "BLOCKED";
    if (
      frozen &&
      (dto.title !== undefined ||
        dto.weight !== undefined ||
        dto.isRequired !== undefined)
    ) {
      throw new BadRequestException(
        `A ${milestone.status.toLowerCase()} milestone is final — its title, weight and required flag can't be changed. Reopen it first if the product is still in this stage.`,
      );
    }

    const data: Prisma.MilestoneUncheckedUpdateInput = {
      title: dto.title?.trim(),
      description:
        dto.description === undefined
          ? undefined
          : dto.description?.trim() || null,
      isRequired: dto.isRequired,
      weight: dto.weight === undefined ? undefined : clampWeight(dto.weight),
      dueDate:
        dto.dueDate === undefined
          ? undefined
          : dto.dueDate
            ? new Date(dto.dueDate)
            : null,
      ownerId: dto.ownerId === undefined ? undefined : dto.ownerId,
      evidenceLink:
        dto.evidenceLink === undefined
          ? undefined
          : dto.evidenceLink?.trim() || null,
      targetValue: dto.targetValue === undefined ? undefined : dto.targetValue,
      actualValue: dto.actualValue === undefined ? undefined : dto.actualValue,
      unit: dto.unit === undefined ? undefined : dto.unit?.trim() || null,
    };

    // Recording a real actual value is objective evidence of work — auto-start it.
    if (
      milestone.status === "NOT_STARTED" &&
      dto.actualValue !== undefined &&
      dto.actualValue !== null &&
      dto.actualValue > 0
    ) {
      data.status = "IN_PROGRESS";
      data.startedAt = milestone.startedAt ?? new Date();
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestone.id },
      data,
      include: milestoneInclude,
    });

    await this.audit.record({
      actorId: user.id,
      action: "milestone.updated",
      entityType: "Milestone",
      entityId: milestone.id,
      summary: `Updated milestone ${milestone.title} on ${product.name}`,
      before: {
        title: milestone.title,
        description: milestone.description,
        isRequired: milestone.isRequired,
        weight: milestone.weight,
        dueDate: milestone.dueDate?.toISOString() ?? null,
        evidenceLink: milestone.evidenceLink,
      },
      after: {
        title: updated.title,
        description: updated.description,
        isRequired: updated.isRequired,
        weight: updated.weight,
        dueDate: updated.dueDate?.toISOString() ?? null,
        evidenceLink: updated.evidenceLink,
      },
      metadata: { productId: product.id, productName: product.name },
    });

    return this.mapMilestone(updated);
  }

  async setMilestoneStatus(
    id: string,
    milestoneId: string,
    dto: SetMilestoneStatusDto,
    user: AuthUser,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertManageAccess(product.ownerId, user);

    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, productId: id },
      include: milestoneInclude,
    });
    if (!milestone) throw new NotFoundException("Milestone not found");

    await this.assertMilestoneStage(id, product.stage, milestone.stage);

    if (milestone.status === "COMPLETED" || milestone.status === "BLOCKED") {
      throw new BadRequestException(
        `This milestone is ${milestone.status.toLowerCase()} and is final — its status can't be changed.`,
      );
    }

    const status = dto.status;
    const reason = dto.reason?.trim();

    let statusReason: string | null = null;
    if (status === "PARKED" || status === "BLOCKED") {
      if (!reason || reason.length < 2) {
        throw new BadRequestException(
          status === "PARKED"
            ? "Add a short note about what this milestone is waiting on."
            : "A reason is required to mark a milestone as blocked.",
        );
      }
      statusReason = reason;
    }

    const data: Prisma.MilestoneUncheckedUpdateInput = { status, statusReason };

    if (status === "COMPLETED") {
      data.completedAt = new Date();
      data.completedById = user.id;
      if (dto.evidenceLink !== undefined) {
        data.evidenceLink = dto.evidenceLink?.trim() || null;
      }
      if (dto.actualValue !== undefined) {
        data.actualValue = dto.actualValue;
      }
    } else {
      // Leaving the completed state clears any completion record.
      data.completedAt = null;
      data.completedById = null;
    }

    // Starting work stamps startedAt once; it stays as the "in progress since" marker.
    if (status === "IN_PROGRESS" && !milestone.startedAt) {
      data.startedAt = new Date();
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestone.id },
      data,
      include: milestoneInclude,
    });

    const label =
      status === "COMPLETED"
        ? "completed"
        : status === "PARKED"
          ? "parked"
          : status === "BLOCKED"
            ? "blocked"
            : "in progress";

    await this.audit.record({
      actorId: user.id,
      action: "milestone.status_changed",
      entityType: "Milestone",
      entityId: milestone.id,
      summary: `Marked milestone ${milestone.title} as ${label} on ${product.name}`,
      before: { status: milestone.status, statusReason: milestone.statusReason },
      after: { status: updated.status, statusReason: updated.statusReason },
      metadata: { productId: product.id, productName: product.name },
    });

    return this.mapMilestone(updated);
  }

  async reopenMilestone(id: string, milestoneId: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertManageAccess(product.ownerId, user);

    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, productId: id },
      include: milestoneInclude,
    });
    if (!milestone) throw new NotFoundException("Milestone not found");

    await this.assertMilestoneStage(id, product.stage, milestone.stage);

    if (milestone.status !== "PARKED") {
      throw new BadRequestException(
        "Only parked milestones can be reopened.",
      );
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: "NOT_STARTED",
        statusReason: null,
        completedAt: null,
        completedById: null,
        startedAt: null,
      },
      include: milestoneInclude,
    });

    await this.audit.record({
      actorId: user.id,
      action: "milestone.reopened",
      entityType: "Milestone",
      entityId: milestone.id,
      summary: `Reopened milestone ${milestone.title} on ${product.name}`,
      before: { status: milestone.status, statusReason: milestone.statusReason },
      after: { status: updated.status, statusReason: updated.statusReason },
      metadata: { productId: product.id, productName: product.name },
    });

    return this.mapMilestone(updated);
  }

  async deleteMilestone(id: string, milestoneId: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertManageAccess(product.ownerId, user);

    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, productId: id },
      include: milestoneInclude,
    });
    if (!milestone) throw new NotFoundException("Milestone not found");
    if (milestone.isStandard) {
      throw new BadRequestException(
        "Standard checklist items cannot be deleted. Reopen or edit them instead.",
      );
    }

    await this.assertMilestoneStage(id, product.stage, milestone.stage);

    await this.prisma.milestone.delete({ where: { id: milestone.id } });

    await this.audit.record({
      actorId: user.id,
      action: "milestone.deleted",
      entityType: "Milestone",
      entityId: milestone.id,
      summary: `Deleted milestone ${milestone.title} on ${product.name}`,
      before: {
        title: milestone.title,
        stage: milestone.stage,
        isRequired: milestone.isRequired,
      },
      metadata: { productId: product.id, productName: product.name },
    });

    return { id: milestone.id, deleted: true };
  }

  async reorderMilestones(id: string, dto: ReorderMilestonesDto, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, ownerId: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    this.assertManageAccess(product.ownerId, user);

    const stage = dto.stage as LifecycleStage;
    await this.assertMilestoneStage(id, product.stage, stage);

    const milestones = await this.prisma.milestone.findMany({
      where: { productId: id, stage },
      select: { id: true },
    });
    const existing = new Set(milestones.map((milestone) => milestone.id));
    const sameSet =
      dto.ids.length === existing.size &&
      dto.ids.every((milestoneId) => existing.has(milestoneId));
    if (!sameSet) {
      throw new BadRequestException(
        "The reorder list must contain every milestone in this stage exactly once.",
      );
    }

    await this.prisma.$transaction(
      dto.ids.map((milestoneId, index) =>
        this.prisma.milestone.update({
          where: { id: milestoneId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    await this.audit.record({
      actorId: user.id,
      action: "milestones.reordered",
      entityType: "Product",
      entityId: product.id,
      summary: `Reordered ${stageLabel(stage)} milestones on ${product.name}`,
      metadata: { productId: product.id, stage, ids: dto.ids },
    });

    return { success: true };
  }

  async remove(id: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, stage: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "product.deleted",
          entityType: "Product",
          entityId: id,
          summary: `Deleted product ${product.name}`,
          before: {
            name: product.name,
            slug: product.slug,
            stage: product.stage,
          },
          metadata: { productId: id, productName: product.name },
        },
      });
      await tx.notification.deleteMany({
        where: { link: `/admin/products/${id}` },
      });
      await tx.product.delete({ where: { id } });
    });

    return { success: true };
  }

  async publicPortfolio(): Promise<PublicPortfolio> {
    const products = await this.prisma.product.findMany({
      where: { isArchived: false, visibility: "EVERYONE" },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        team: { select: { id: true, name: true, description: true } },
        teams: { include: { team: { select: { id: true, name: true } } } },
        milestones: true,
        gateRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
        stageHistory: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items: PublicProductListItem[] = products.map((product) => {
      const listItem = this.mapList(product);
      const stageEntered = product.stageHistory[0]?.createdAt ?? product.createdAt;
      return {
        ...listItem,
        timeInStageDays: Math.max(
          0,
          Math.floor((Date.now() - stageEntered.getTime()) / 86_400_000),
        ),
      };
    });

    const teamIds = new Set(
      products.flatMap((product) => product.teams.map((entry) => entry.teamId)),
    );
    const stageIndex = (stage: string) =>
      LIFECYCLE_STAGES.findIndex((item) => item.key === stage);

    return {
      products: items,
      stages: LIFECYCLE_STAGES.map((stage) => ({
        stage: stage.key,
        label: stage.label,
        count: products.filter((product) => product.stage === stage.key).length,
        summary: stage.summary,
        accent: stage.accent,
      })),
      stats: {
        totalProducts: products.length,
        activeTeams: teamIds.size,
        inPilotOrBeyond: products.filter((product) => stageIndex(product.stage) >= 3)
          .length,
        monetized: products.filter((product) => product.stage === "MONETIZATION").length,
      },
    };
  }

  async publicProduct(slug: string): Promise<PublicProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: { slug, isArchived: false, visibility: "EVERYONE" },
      include: publicDetailInclude,
    });
    if (!product) throw new NotFoundException("Product not found");
    const detail = this.mapDetail(product);
    const stageEntered =
      product.stageHistory[product.stageHistory.length - 1]?.createdAt ??
      product.createdAt;
    return {
      ...detail,
      timeInStageDays: Math.max(
        0,
        Math.floor((Date.now() - stageEntered.getTime()) / 86_400_000),
      ),
      visibilityTeamIds: [],
      idea: null,
      createdBy: detail.createdBy
        ? {
            id: detail.createdBy.id,
            name: detail.createdBy.name,
            avatarUrl: detail.createdBy.avatarUrl,
          }
        : null,
      stageHistory: detail.stageHistory.map((entry) => ({ ...entry, reason: null })),
      updates: product.updates.map((update) => ({
        id: update.id,
        title: update.title,
        body: update.body,
        createdAt: update.createdAt.toISOString(),
      })),
      followerCount: product._count.followers,
      contactEmail: product.owner.email,
    };
  }

  private mapList(product: ProductWithList): ProductListItem {
    const latestGate = product.gateRequests[0]?.status;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      owner: {
        id: product.owner.id,
        name: product.owner.name,
        avatarUrl: product.owner.avatarUrl,
      },
      team: product.team
        ? { id: product.team.id, name: product.team.name }
        : null,
      teams: product.teams.map((entry) => ({
        id: entry.team.id,
        name: entry.team.name,
      })),
      stage: product.stage,
      health: computeHealth(product.stage, product.milestones, latestGate),
      visibility: product.visibility,
      businessArea: product.businessArea,
      isArchived: product.isArchived,
      milestoneProgress: milestoneProgress(product.milestones, product.stage),
      lastUpdated: product.updatedAt.toISOString(),
      createdAt: product.createdAt.toISOString(),
    };
  }

  private mapDetail(product: ProductWithDetail): ProductDetail {
    const summary = this.mapList(product);
    const lastHistory = product.stageHistory[product.stageHistory.length - 1];
    return {
      ...summary,
      targetUsers: product.targetUsers,
      expectedImpact: product.expectedImpact,
      launchTarget: product.launchTarget?.toISOString() ?? null,
      visibilityTeamIds: product.visibilityTeams.map((entry) => entry.teamId),
      createdBy: product.createdBy
        ? {
            id: product.createdBy.id,
            name: product.createdBy.name,
            avatarUrl: product.createdBy.avatarUrl,
          }
        : null,
      milestones: product.milestones.map((milestone) =>
        this.mapMilestone(milestone),
      ),
      stageHistory: product.stageHistory.map((entry) => ({
        id: entry.id,
        fromStage: entry.fromStage,
        toStage: entry.toStage,
        movedBy: entry.movedBy,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
      currentStageEnteredAt: lastHistory?.createdAt.toISOString() ?? null,
      latestGateStatus: product.gateRequests[0]?.status ?? null,
      idea: product.idea
        ? { id: product.idea.id, title: product.idea.title, status: product.idea.status }
        : null,
    };
  }

  private mapMilestone(milestone: MilestoneWithPeople): MilestoneDto {
    return {
      id: milestone.id,
      stage: milestone.stage,
      title: milestone.title,
      description: milestone.description,
      isRequired: milestone.isRequired,
      isStandard: milestone.isStandard,
      weight: milestone.weight,
      status: milestone.status,
      statusReason: milestone.statusReason,
      startedAt: milestone.startedAt?.toISOString() ?? null,
      owner: milestone.owner,
      dueDate: milestone.dueDate?.toISOString() ?? null,
      evidenceLink: milestone.evidenceLink,
      targetValue: milestone.targetValue,
      actualValue: milestone.actualValue,
      unit: milestone.unit,
      completedAt: milestone.completedAt?.toISOString() ?? null,
      completedBy: milestone.completedBy,
      sortOrder: milestone.sortOrder,
    };
  }

  private async assertMilestoneStage(
    productId: string,
    currentStage: LifecycleStage,
    targetStage: LifecycleStage,
  ) {
    const pending = await this.prisma.stageGateRequest.findFirst({
      where: { productId, status: "PENDING_APPROVAL" },
      select: { id: true },
    });
    if (pending) {
      throw new BadRequestException(
        "Milestones are locked while a stage-gate request is pending.",
      );
    }
    if (
      LIFECYCLE_STAGE_KEYS.indexOf(targetStage) <
      LIFECYCLE_STAGE_KEYS.indexOf(currentStage)
    ) {
      throw new BadRequestException(
        `${stageLabel(targetStage)} is complete — its milestones are read-only.`,
      );
    }
  }

  private async assertMilestoneOwner(ownerId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!owner) throw new BadRequestException("Choose an active milestone owner");
  }

  private accessWhere(user: AuthUser): Prisma.ProductWhereInput {
    if (
      user.role === "ADMIN" ||
      user.permissions.includes(PERMISSIONS.PRODUCT_VIEW_ALL)
    ) {
      return {};
    }
    if (user.permissions.includes(PERMISSIONS.PRODUCT_VIEW_OWN)) {
      return { ownerId: user.id };
    }
    throw new ForbiddenException("You do not have permission to view products");
  }

  private assertViewAccess(ownerId: string, user: AuthUser) {
    if (
      user.role === "ADMIN" ||
      user.permissions.includes(PERMISSIONS.PRODUCT_VIEW_ALL) ||
      (user.permissions.includes(PERMISSIONS.PRODUCT_VIEW_OWN) &&
        ownerId === user.id)
    ) {
      return;
    }
    throw new ForbiddenException("You do not have permission to view this product");
  }

  private assertManageAccess(ownerId: string, user: AuthUser) {
    if (user.role === "ADMIN") return;
    if (ownerId !== user.id) {
      throw new ForbiddenException("You can only edit products you own");
    }
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.product.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, name: true },
    });
    if (existing) {
      throw new BadRequestException("A product with that name already exists");
    }
  }

  private async assertTeams(teamIds: string[], label = "teams") {
    const count = await this.prisma.team.count({
      where: { id: { in: teamIds }, isArchived: false },
    });
    if (count !== teamIds.length) {
      throw new BadRequestException(`One or more ${label} were not found`);
    }
  }

  private async uniqueSlug(name: string) {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "product";
    let candidate = base;
    let suffix = 2;
    while (await this.prisma.product.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
