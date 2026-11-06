import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ActivityItem,
  ApprovalItem,
  DashboardData,
  Kpi,
  LIFECYCLE_STAGES,
  PERMISSIONS,
  PipelineStageStat,
  ProductListItem,
} from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuthUser } from "../../common/auth-user";
import { ProductsService } from "../products/products.service";
import { ListProductsDto } from "../products/products.dto";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async build(user: AuthUser): Promise<DashboardData> {
    const canViewAll =
      user.role === "ADMIN" ||
      user.permissions.includes(PERMISSIONS.PRODUCT_VIEW_ALL);
    const productScope: Prisma.ProductWhereInput = canViewAll
      ? {}
      : { ownerId: user.id };

    const pendingWhere: Prisma.StageGateRequestWhereInput = {
      status: "PENDING_APPROVAL",
      ...(user.role === "EVALUATOR"
        ? {}
        : user.role === "PRODUCT_OWNER"
          ? { product: { ownerId: user.id } }
          : {}),
    };

    const productBaseWhere: Prisma.ProductWhereInput = {
      AND: [productScope, { isArchived: false }],
    };

    const [
      totalIdeas,
      activeProducts,
      pilotOrBeyond,
      pipelineGroups,
      approvals,
      productPage,
      activities,
    ] = await Promise.all([
      this.prisma.idea.count({
        where: canViewAll ? {} : { submittedById: user.id },
      }),
      this.prisma.product.count({ where: productBaseWhere }),
      this.prisma.product.count({
        where: {
          AND: [productBaseWhere, { stage: { in: ["PILOT", "SCALE", "MONETIZATION"] } }],
        },
      }),
      this.prisma.product.groupBy({
        by: ["stage"],
        where: productBaseWhere,
        _count: { _all: true },
      }),
      this.prisma.stageGateRequest.findMany({
        where: pendingWhere,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              owner: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          approvers: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { submittedAt: "asc" },
        take: 6,
      }),
      this.productsService.list(
        { page: 1, pageSize: 7, sort: "updated_desc" } as ListProductsDto,
        user,
      ),
      this.recentActivity(user, canViewAll),
    ]);

    const pendingApprovals = await this.prisma.stageGateRequest.count({
      where: pendingWhere,
    });

    const pipeline: PipelineStageStat[] = LIFECYCLE_STAGES.map((stage) => ({
      stage: stage.key,
      label: stage.label,
      count:
        pipelineGroups.find((group) => group.stage === stage.key)?._count._all ?? 0,
      accent: stage.accent,
    }));

    const successRate = activeProducts
      ? Math.round((pilotOrBeyond / activeProducts) * 100)
      : 0;

    const kpis: Kpi[] = [
      {
        key: "active-products",
        label: "Active products",
        value: activeProducts,
        helper: "Live in the innovation portfolio",
        tone: "navy",
      },
      {
        key: "ideas",
        label: canViewAll ? "Total ideas" : "Ideas you submitted",
        value: totalIdeas,
        helper: canViewAll ? "Across the whole organisation" : "Ideas in the inbox",
        tone: "blue",
      },
      {
        key: "pending-approvals",
        label: "Pending approvals",
        value: pendingApprovals,
        helper: "Stage gates awaiting decisions",
        tone: "amber",
      },
      {
        key: "success-rate",
        label: "Reached Pilot or beyond",
        value: successRate,
        suffix: "%",
        helper: "Share of active products past the Pilot gate",
        tone: "rose",
      },
    ];

    return {
      kpis,
      pipeline,
      products: productPage.items as ProductListItem[],
      approvals: approvals.map((request): ApprovalItem => {
        const rawPolicy = (request.policy ?? {}) as Record<string, unknown>;
        const approvalsNeeded = Math.max(
          1,
          Number.isFinite(Number(rawPolicy.approverCount))
            ? Math.trunc(Number(rawPolicy.approverCount))
            : 1,
        );
        const approvalsReceived = request.approvers.filter(
          (approver) => approver.decision === "APPROVED",
        ).length;
        return {
          id: request.id,
          status: request.status,
          product: {
            id: request.product.id,
            name: request.product.name,
            owner: request.product.owner,
          },
          fromStage: request.fromStage,
          toStage: request.toStage,
          submittedAt: request.submittedAt.toISOString(),
          approvers: request.approvers.map((approver) => ({
            id: approver.id,
            user: approver.user,
            decision: approver.decision,
            decidedAt: approver.decidedAt?.toISOString() ?? null,
            comment: approver.comment,
          })),
          approvalsNeeded,
          approvalsReceived,
          approvalPolicy: `${approvalsReceived}/${approvalsNeeded} evaluator approvals`,
        };
      }),
      activities,
    };
  }

  private async recentActivity(
    user: AuthUser,
    canViewAll: boolean,
  ): Promise<ActivityItem[]> {
    let where: Prisma.AuditLogWhereInput = {};

    if (!canViewAll) {
      const owned = await this.prisma.product.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      where = {
        OR: [
          { actorId: user.id },
          { entityType: "Product", entityId: { in: owned.map((item) => item.id) } },
        ],
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { id: true, name: true } } },
    });

    return logs.map((log) => ({
      id: log.id,
      actorName: log.actor?.name ?? "System",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary ?? log.action.replace(/\./g, " "),
      createdAt: log.createdAt.toISOString(),
    }));
  }
}
