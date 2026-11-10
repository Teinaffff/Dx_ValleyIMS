import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LifecycleStage, Prisma } from "@prisma/client";
import {
  GateCheck,
  GatePolicy,
  GateRequestSummary,
  GateSubmissionState,
  gateApprovalsNeeded,
  nextStage,
  PERMISSIONS,
  stageLabel,
} from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../common/auth-user";
import { SubmitGateDto, GateDecisionDto } from "./gates.dto";

const gateInclude = {
  submittedBy: { select: { id: true, name: true, avatarUrl: true } },
  approvers: {
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { id: "asc" as const },
  },
} satisfies Prisma.StageGateRequestInclude;

type GateWithPeople = Prisma.StageGateRequestGetPayload<{
  include: typeof gateInclude;
}>;

const DEFAULT_POLICY: GatePolicy = {
  mode: "UNANIMOUS",
  approverCount: 1,
  earlyCount: 1,
  lateCount: 3,
  allowSelfApproval: false,
  rejectionRequiresReason: true,
};

@Injectable()
export class GatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async state(productId: string, user: AuthUser): Promise<GateSubmissionState> {
    const product = await this.loadProduct(productId);
    this.assertViewAccess(product.ownerId, user);

    const [policy, candidates, pendingRequest, latestRequest] = await Promise.all([
      this.readPolicy(),
      this.approverCandidates(),
      this.prisma.stageGateRequest.findFirst({
        where: { productId, status: "PENDING_APPROVAL" },
        include: gateInclude,
      }),
      this.prisma.stageGateRequest.findFirst({
        where: { productId },
        orderBy: { createdAt: "desc" },
        include: gateInclude,
      }),
    ]);

    const target = nextStage(product.stage);
    const checks = this.buildChecks(product, target, Boolean(pendingRequest));
    const needed = target
      ? gateApprovalsNeeded(target, policy.earlyCount, policy.lateCount)
      : 0;
    const eligibleApprovers = candidates
      .filter(
        (candidate) => policy.allowSelfApproval || candidate.id !== product.ownerId,
      )
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        avatarUrl: candidate.avatarUrl,
      }));

    return {
      nextStage: target,
      checks,
      canSubmit: checks.every((check) => check.met) && !pendingRequest,
      policy,
      eligibleApprovers,
      pendingRequest: pendingRequest ? this.mapSummary(pendingRequest) : null,
      latestRequest: latestRequest ? this.mapSummary(latestRequest) : null,
    };
  }

  async submit(productId: string, dto: SubmitGateDto, user: AuthUser) {
    const product = await this.loadProduct(productId);
    this.assertSubmitAccess(product.ownerId, user);

    const target = nextStage(product.stage);
    if (!target) {
      throw new BadRequestException(
        "Monetization is the final lifecycle stage — there is no next gate to submit.",
      );
    }

    const policy = await this.readPolicy();
    const pending = await this.prisma.stageGateRequest.findFirst({
      where: { productId, status: "PENDING_APPROVAL" },
      select: { id: true },
    });
    const checks = this.buildChecks(product, target, Boolean(pending));
    if (pending) {
      throw new BadRequestException(
        "A stage-gate request is already pending review for this product.",
      );
    }
    const failed = checks.filter((check) => !check.met);
    if (failed.length) {
      throw new BadRequestException(
        `This product is not ready for a stage gate: ${failed
          .map((check) => check.label)
          .join("; ")}.`,
      );
    }

    const candidates = await this.approverCandidates();
    const needed = gateApprovalsNeeded(target, policy.earlyCount, policy.lateCount);
    const eligible = candidates.filter(
      (candidate) =>
        policy.allowSelfApproval ||
        (candidate.id !== product.ownerId && candidate.id !== user.id),
    );
    if (eligible.length < needed) {
      throw new BadRequestException(
        `This gate needs ${needed} independent evaluator${
          needed === 1 ? "" : "s"
        }, but only ${eligible.length} eligible ${
          eligible.length === 1 ? "reviewer is" : "reviewers are"
        } available. Ask an administrator to grant gate.decide to more reviewers.`,
      );
    }
    // Every eligible evaluator and admin may decide; `needed` is only the
    // quorum. All of them are notified and listed on the request.
    const approvers = eligible;

    const effectivePolicy: GatePolicy = {
      ...policy,
      approverCount: needed,
    };
    const snapshot = this.buildSnapshot(product, target, policy, checks);

    const previous = await this.prisma.stageGateRequest.findFirst({
      where: { productId, fromStage: product.stage, toStage: target },
      orderBy: { createdAt: "desc" },
      select: { round: true },
    });

    let request: GateWithPeople;
    try {
      request = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.stageGateRequest.findFirst({
          where: { productId, status: "PENDING_APPROVAL" },
          select: { id: true },
        });
        if (existing) {
          throw new BadRequestException(
            "A stage-gate request is already pending review for this product.",
          );
        }

        const created = await tx.stageGateRequest.create({
          data: {
            productId,
            fromStage: product.stage,
            toStage: target,
            status: "PENDING_APPROVAL",
            submittedById: user.id,
            note: dto.note?.trim() || null,
            policy: effectivePolicy as unknown as Prisma.InputJsonValue,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            round: (previous?.round ?? 0) + 1,
            approvers: { create: approvers.map((approver) => ({ userId: approver.id })) },
          },
          include: gateInclude,
        });

        await tx.notification.createMany({
          data: approvers.map((approver) => ({
            userId: approver.id,
            type: "gate.review",
            title: `Stage gate review: ${product.name}`,
            body: `${product.owner.name} submitted ${stageLabel(
              product.stage,
            )} → ${stageLabel(target)} for your decision.`,
            link: "/admin/approvals",
          })),
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException(
          "A stage-gate request is already pending review for this product.",
        );
      }
      throw error;
    }

    await this.audit.record({
      actorId: user.id,
      action: "stage.submitted",
      entityType: "StageGateRequest",
      entityId: request.id,
      summary: `Submitted ${product.name} for ${stageLabel(target)} approval`,
      after: {
        fromStage: product.stage,
        toStage: target,
        status: request.status,
        round: request.round,
        approvers: approvers.map((approver) => approver.name),
      },
      metadata: {
        productId,
        productName: product.name,
        requestId: request.id,
      },
    });

    return this.mapSummary(request);
  }

  async decide(productId: string, dto: GateDecisionDto, user: AuthUser) {
    const product = await this.loadProduct(productId);
    const request = await this.prisma.stageGateRequest.findFirst({
      where: { productId, status: "PENDING_APPROVAL" },
      include: gateInclude,
    });
    if (!request) {
      throw new BadRequestException(
        "No stage-gate request is awaiting a decision for this product.",
      );
    }

    const target = nextStage(product.stage);
    if (request.fromStage !== product.stage || request.toStage !== target) {
      throw new ConflictException(
        "This stage-gate request no longer matches the product's current stage.",
      );
    }

    const policy = this.normalizePolicy(request.policy);
    const isAdmin = user.role === "ADMIN";
    const panelMember = request.approvers.find(
      (approver) => approver.userId === user.id,
    );

    // Administrators have full override: they may decide any pending gate,
    // including one they submitted, and their vote counts toward the quorum.
    // Any other evaluator holding gate.decide may also decide (the route is
    // permission-guarded); they are held to separation of duties only.
    if (!isAdmin) {
      if (
        !policy.allowSelfApproval &&
        (user.id === product.ownerId || user.id === request.submittedById)
      ) {
        throw new ForbiddenException(
          "You cannot decide on a stage gate you own or submitted.",
        );
      }
    }
    if (panelMember?.decision) {
      throw new ConflictException(
        "You've already recorded a decision for this stage gate.",
      );
    }

    const comment = dto.comment?.trim() || null;
    if (
      dto.decision === "REJECTED" &&
      policy.rejectionRequiresReason &&
      !comment
    ) {
      throw new BadRequestException("A rejection requires a written reason.");
    }

    const required = Math.max(1, policy.approverCount);
    const decidedAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await tx.stageGateApprover.upsert({
          where: {
            requestId_userId: { requestId: request.id, userId: user.id },
          },
          create: {
            requestId: request.id,
            userId: user.id,
            decision: dto.decision,
            comment,
            decidedAt,
          },
          update: { decision: dto.decision, comment, decidedAt },
        });

        await tx.stageGateDecision.create({
          data: {
            requestId: request.id,
            approverId: user.id,
            decision: dto.decision,
            comment,
          },
        });

        const approvals = await tx.stageGateApprover.count({
          where: { requestId: request.id, decision: "APPROVED" },
        });

        const isVeto = dto.decision === "REJECTED" || dto.decision === "PARKED";
        const reachedQuorum =
          dto.decision === "APPROVED" && approvals >= required;
        const finalizes = isVeto || reachedQuorum;

        if (finalizes) {
          await tx.stageGateRequest.update({
            where: { id: request.id },
            data: {
              status: dto.decision,
              decidedAt,
              resolutionNote: comment,
            },
          });
        }

        if (reachedQuorum) {
          await tx.product.update({
            where: { id: productId },
            data: { stage: request.toStage, status: "ACTIVE" },
          });
          await tx.stageHistory.create({
            data: {
              productId,
              fromStage: request.fromStage,
              toStage: request.toStage,
              movedById: user.id,
              reason: comment ?? "Stage gate approved",
              metadata: {
                requestId: request.id,
                gateStatus: "APPROVED",
                approvals,
                required,
              },
            },
          });
        } else if (dto.decision === "PARKED") {
          await tx.product.update({
            where: { id: productId },
            data: { status: "PARKED" },
          });
        }

        if (finalizes) {
          const recipients = new Set<string>([
            product.ownerId,
            request.submittedById,
            ...request.approvers.map((approver) => approver.userId),
          ]);
          recipients.delete(user.id);

          if (recipients.size) {
            const decisionLabel =
              dto.decision === "APPROVED"
                ? "approved"
                : dto.decision === "REJECTED"
                  ? "rejected"
                  : "parked";
            const body =
              dto.decision === "APPROVED"
                ? `${approvals}/${required} evaluators approved ${stageLabel(
                    request.fromStage,
                  )} → ${stageLabel(request.toStage)}. ${product.name} moved to ${stageLabel(
                    request.toStage,
                  )}.`
                : dto.decision === "REJECTED"
                  ? `${user.name} rejected ${stageLabel(
                      request.fromStage,
                    )} → ${stageLabel(request.toStage)}. ${product.name} stays in ${stageLabel(
                      request.fromStage,
                    )}.${comment ? ` Reason: ${comment}` : ""}`
                  : `${user.name} parked ${product.name} at the ${stageLabel(
                      request.fromStage,
                    )} → ${stageLabel(request.toStage)} gate.${
                      comment ? ` Note: ${comment}` : ""
                    }`;

            await tx.notification.createMany({
              data: [...recipients].map((userId) => ({
                userId,
                type: `gate.${decisionLabel}`,
                title: `Stage gate ${decisionLabel}: ${product.name}`,
                body,
                link: `/admin/products/${productId}`,
              })),
            });
          }
        } else {
          // Still below quorum: nudge the owner and the reviewers who haven't decided.
          const remaining = required - approvals;
          const undecided = request.approvers
            .filter(
              (approver) => !approver.decision && approver.userId !== user.id,
            )
            .map((approver) => approver.userId);
          const recipients = new Set<string>([
            product.ownerId,
            request.submittedById,
            ...undecided,
          ]);
          recipients.delete(user.id);

          if (recipients.size) {
            await tx.notification.createMany({
              data: [...recipients].map((userId) => ({
                userId,
                type: "gate.progress",
                title: `Gate progress: ${product.name}`,
                body: `${user.name} approved ${stageLabel(
                  request.fromStage,
                )} → ${stageLabel(request.toStage)}. ${approvals}/${required} done — ${remaining} more evaluator${
                  remaining === 1 ? "" : "s"
                } needed before ${product.name} moves on.`,
                link: `/admin/approvals`,
              })),
            });
          }
        }

        return tx.stageGateRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: gateInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const action =
      dto.decision === "APPROVED"
        ? updated.status === "APPROVED"
          ? "stage.approved"
          : "stage.approval_recorded"
        : dto.decision === "REJECTED"
          ? "stage.rejected"
          : "stage.parked";
    const auditSummary =
      dto.decision === "APPROVED"
        ? updated.status === "APPROVED"
          ? `Approved ${product.name} for ${stageLabel(request.toStage)} (${required}/${required} evaluators)`
          : `Recorded approval on ${product.name} gate (${stageLabel(
              request.fromStage,
            )} → ${stageLabel(request.toStage)})`
        : dto.decision === "REJECTED"
          ? `Rejected ${product.name} at the ${stageLabel(request.fromStage)} → ${stageLabel(request.toStage)} gate`
          : `Parked ${product.name} at the ${stageLabel(request.fromStage)} → ${stageLabel(request.toStage)} gate`;

    await this.audit.record({
      actorId: user.id,
      action,
      entityType: "StageGateRequest",
      entityId: request.id,
      summary: auditSummary,
      after: {
        status: updated.status,
        decision: dto.decision,
        fromStage: request.fromStage,
        toStage: request.toStage,
        productStage:
          dto.decision === "APPROVED" ? request.toStage : product.stage,
        productStatus: dto.decision === "PARKED" ? "PARKED" : product.status,
      },
      metadata: {
        productId,
        productName: product.name,
        requestId: request.id,
        comment,
      },
    });

    return this.mapSummary(updated);
  }

  private async loadProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        stage: true,
        status: true,
        health: true,
        isArchived: true,
        ownerId: true,
        owner: { select: { id: true, name: true, avatarUrl: true } },
        milestones: {
          orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            stage: true,
            title: true,
            description: true,
            isRequired: true,
            weight: true,
            status: true,
            statusReason: true,
            dueDate: true,
            evidenceLink: true,
            targetValue: true,
            actualValue: true,
            unit: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  private buildChecks(
    product: Awaited<ReturnType<GatesService["loadProduct"]>>,
    target: LifecycleStage | null,
    hasPending: boolean,
  ): GateCheck[] {
    const current = product.milestones.filter(
      (milestone) => milestone.stage === product.stage,
    );
    const required = current.filter((milestone) => milestone.isRequired);
    // A required milestone clears the gate when COMPLETED, or BLOCKED with a
    // reason (a documented dead-end). PARKED, NOT_STARTED and IN_PROGRESS hold it.
    const isSatisfied = (status: string) =>
      status === "COMPLETED" || status === "BLOCKED";
    const satisfiedRequired = required.filter((milestone) =>
      isSatisfied(milestone.status),
    );
    const parkedRequired = required.filter(
      (milestone) => milestone.status === "PARKED",
    );
    const blockedRequired = required.filter(
      (milestone) => milestone.status === "BLOCKED",
    );

    const checks: GateCheck[] = [
      {
        key: "status",
        label: "Product is active and not archived",
        met: !product.isArchived && product.status === "ACTIVE",
        detail: product.isArchived
          ? "Archived products cannot be submitted."
          : product.status !== "ACTIVE"
            ? `Product status is ${product.status}.`
            : null,
      },
      {
        key: "next-stage",
        label: "A next lifecycle stage exists",
        met: target !== null,
        detail: target
          ? `${stageLabel(product.stage)} → ${stageLabel(target)}`
          : "Monetization is the final stage.",
      },
      {
        key: "pending",
        label: "No stage-gate request is already pending",
        met: !hasPending,
        detail: hasPending ? "A request is awaiting decisions." : null,
      },
      {
        key: "health",
        label: "No blocking conditions",
        met: product.health !== "BLOCKED",
        detail:
          product.health === "BLOCKED"
            ? "Resolve blocking conditions before submitting."
            : null,
      },
      {
        key: "required",
        label: "All required milestones are completed or blocked",
        met: satisfiedRequired.length === required.length,
        detail: required.length
          ? [
              `${satisfiedRequired.length}/${required.length} required milestones resolved`,
              blockedRequired.length
                ? `${blockedRequired.length} blocked with a reason`
                : null,
              parkedRequired.length
                ? `Parked: ${parkedRequired.map((m) => m.title).join(", ")}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "No required milestones in this stage.",
      },
    ];

    return checks;
  }

  private buildSnapshot(
    product: Awaited<ReturnType<GatesService["loadProduct"]>>,
    target: LifecycleStage,
    policy: GatePolicy,
    checks: GateCheck[],
  ) {
    return {
      generatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        stage: product.stage,
        health: product.health,
        owner: product.owner,
      },
      transition: { fromStage: product.stage, toStage: target },
      policy,
      readiness: checks,
      milestones: product.milestones
        .filter((milestone) => milestone.stage === product.stage)
        .map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          isRequired: milestone.isRequired,
          weight: milestone.weight,
          status: milestone.status,
          statusReason: milestone.statusReason,
          dueDate: milestone.dueDate?.toISOString() ?? null,
          evidenceLink: milestone.evidenceLink,
          targetValue: milestone.targetValue,
          actualValue: milestone.actualValue,
          unit: milestone.unit,
        })),
    };
  }

  private async readPolicy(): Promise<GatePolicy> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "approval.policy" },
    });
    const raw = (setting?.value ?? {}) as Record<string, unknown>;
    const approverCount = Number(raw.approverCount);
    const earlyCount = Number(raw.earlyCount);
    const lateCount = Number(raw.lateCount);
    return {
      mode: raw.mode === "MAJORITY" ? "MAJORITY" : "UNANIMOUS",
      approverCount: Number.isFinite(approverCount)
        ? Math.min(10, Math.max(1, Math.trunc(approverCount)))
        : DEFAULT_POLICY.approverCount,
      earlyCount: Number.isFinite(earlyCount)
        ? Math.min(10, Math.max(1, Math.trunc(earlyCount)))
        : DEFAULT_POLICY.earlyCount,
      lateCount: Number.isFinite(lateCount)
        ? Math.min(10, Math.max(1, Math.trunc(lateCount)))
        : DEFAULT_POLICY.lateCount,
      allowSelfApproval: raw.allowSelfApproval === true,
      rejectionRequiresReason:
        typeof raw.rejectionRequiresReason === "boolean"
          ? raw.rejectionRequiresReason
          : DEFAULT_POLICY.rejectionRequiresReason,
    };
  }

  private async approverCandidates() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: {
          permissions: {
            some: { permission: { code: PERMISSIONS.GATE_DECIDE } },
          },
        },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  }

  private mapSummary(request: GateWithPeople): GateRequestSummary {
    const policy = this.normalizePolicy(request.policy);
    const approvalsNeeded = Math.max(1, policy.approverCount);
    const approvalsReceived = request.approvers.filter(
      (approver) => approver.decision === "APPROVED",
    ).length;
    return {
      id: request.id,
      status: request.status,
      fromStage: request.fromStage,
      toStage: request.toStage,
      submittedAt: request.submittedAt.toISOString(),
      submittedBy: request.submittedBy,
      note: request.note,
      round: request.round,
      approvalsNeeded,
      approvalsReceived,
      policy,
      approvers: request.approvers.map((approver) => ({
        id: approver.id,
        user: approver.user,
        decision: approver.decision,
        decidedAt: approver.decidedAt?.toISOString() ?? null,
        comment: approver.comment,
      })),
    };
  }

  private normalizePolicy(value: Prisma.JsonValue): GatePolicy {
    const raw = (value ?? {}) as Record<string, unknown>;
    const approverCount = Number(raw.approverCount);
    const earlyCount = Number(raw.earlyCount);
    const lateCount = Number(raw.lateCount);
    return {
      mode: raw.mode === "MAJORITY" ? "MAJORITY" : "UNANIMOUS",
      approverCount: Number.isFinite(approverCount)
        ? Math.max(1, Math.trunc(approverCount))
        : DEFAULT_POLICY.approverCount,
      earlyCount: Number.isFinite(earlyCount)
        ? Math.max(1, Math.trunc(earlyCount))
        : DEFAULT_POLICY.earlyCount,
      lateCount: Number.isFinite(lateCount)
        ? Math.max(1, Math.trunc(lateCount))
        : DEFAULT_POLICY.lateCount,
      allowSelfApproval: raw.allowSelfApproval === true,
      rejectionRequiresReason: raw.rejectionRequiresReason !== false,
    };
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

  private assertSubmitAccess(ownerId: string, user: AuthUser) {
    if (ownerId !== user.id) {
      throw new ForbiddenException(
        "Only the product owner can submit a stage gate for approval.",
      );
    }
  }
}
