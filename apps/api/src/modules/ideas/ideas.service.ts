import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IdeaStatus, Prisma, RoleCode } from "@prisma/client";
import type { AuthUser } from "../../common/auth-user";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ProductsService } from "../products/products.service";
import type { CreateProductDto } from "../products/products.dto";
import {
  CreatePublicIdeaDto,
  DeleteIdeaDto,
  ListIdeasDto,
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

const ideaInclude = {
  submittedBy: {
    select: { id: true, name: true, email: true, title: true },
  },
  approvedBy: { select: { id: true, name: true } },
  deletedBy: { select: { id: true, name: true } },
  convertedProduct: { select: { id: true, name: true } },
} satisfies Prisma.IdeaInclude;

type IdeaWithPeople = Prisma.IdeaGetPayload<{ include: typeof ideaInclude }>;

function toInboxItem(idea: IdeaWithPeople) {
  const reviewer = idea.deletedBy ?? idea.approvedBy;
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
    reviewNote: idea.reviewNote,
    deleteReason: idea.deleteReason,
    reviewedBy: reviewer ? { id: reviewer.id, name: reviewer.name } : null,
    convertedProductId: idea.convertedProduct?.id ?? null,
    approvedAt: idea.approvedAt?.toISOString() ?? null,
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
  ) {}

  async submitPublic(dto: CreatePublicIdeaDto) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const title = dto.title.trim();
    const problem = dto.problem.trim();
    const solution = dto.solution.trim();

    const idea = await this.prisma.idea.create({
      data: {
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
          body: `${name} shared an idea. ${excerpt(problem)}`,
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
      metadata: { source: "public", submitterEmail: email },
    });

    return {
      id: idea.id,
      reference: idea.id.slice(-8).toUpperCase(),
    };
  }

  async list(query: ListIdeasDto) {
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
        : status === "pending"
          ? { status: { in: PENDING_STATUSES } }
          : status === "approved"
            ? { status: { in: APPROVED_STATUSES } }
            : { status: { not: "DELETED" } };

    const where: Prisma.IdeaWhereInput = {
      ...(searchWhere ?? {}),
      ...(statusWhere ?? {}),
    };

    const [all, pending, approved, deleted, total, ideas] =
      await this.prisma.$transaction([
        this.prisma.idea.count({ where: { status: { not: "DELETED" } } }),
        this.prisma.idea.count({ where: { status: { in: PENDING_STATUSES } } }),
        this.prisma.idea.count({ where: { status: { in: APPROVED_STATUSES } } }),
        this.prisma.idea.count({ where: { status: "DELETED" } }),
        this.prisma.idea.count({ where }),
        this.prisma.idea.findMany({
          where,
          orderBy: [{ createdAt: sort === "oldest" ? "asc" : "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: ideaInclude,
        }),
      ]);

    return {
      items: ideas.map(toInboxItem),
      counts: { all, pending, approved, deleted },
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
      if (!PENDING_STATUSES.includes(idea.status) && idea.status !== "APPROVED") {
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
