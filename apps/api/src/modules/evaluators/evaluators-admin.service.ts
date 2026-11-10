import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import {
  ASSESSMENT_CONFIG_KEY,
  COMPETENCIES,
  COMPETENCY_META,
  EVALUATOR_STATUS_LABELS,
  type Competency,
} from "@ims/shared";
import type { AuthUser } from "../../common/auth-user";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
import { AssessmentService, mergeConfig } from "./assessment.service";
import type {
  AssignProductsDto,
  AuthorizeDto,
  ConfigDto,
  ListApplicantsDto,
  ListQuestionsDto,
  QuestionDto,
  UpdateAuthorizationDto,
  UpdateQuestionDto,
} from "./evaluators.dto";

const REGISTRY_STATUSES = ["QUALIFIED", "AUTHORIZED", "SUSPENDED", "REVOKED"] as const;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function tempPassword() {
  // Readable, no look-alike characters; the admin hands it over once.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(14), (byte) => alphabet[byte % alphabet.length]).join("");
}

const applicantSelect = {
  id: true,
  name: true,
  email: true,
  jobTitle: true,
  department: true,
  motivation: true,
  status: true,
  specializations: true,
  stages: true,
  validUntil: true,
  decisionNote: true,
  decidedAt: true,
  userId: true,
  createdAt: true,
  decidedBy: { select: { id: true, name: true } },
  attempts: {
    orderBy: { startedAt: "desc" as const },
    select: { id: true, status: true, score: true, passed: true, startedAt: true, submittedAt: true },
  },
  _count: { select: { attempts: true } },
} satisfies Prisma.EvaluatorApplicantSelect;

type ApplicantRow = Prisma.EvaluatorApplicantGetPayload<{ select: typeof applicantSelect }>;

function toApplicant(row: ApplicantRow) {
  const finished = row.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS");
  const best = finished.reduce<number | null>(
    (top, attempt) => Math.max(top ?? 0, attempt.score ?? 0),
    null,
  );
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    jobTitle: row.jobTitle,
    department: row.department,
    motivation: row.motivation,
    status: row.status,
    statusLabel: EVALUATOR_STATUS_LABELS[row.status],
    specializations: row.specializations,
    stages: row.stages,
    validUntil: row.validUntil?.toISOString() ?? null,
    expired: row.validUntil ? row.validUntil.getTime() < Date.now() : false,
    decisionNote: row.decisionNote,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    hasAccount: Boolean(row.userId),
    attemptsUsed: row._count.attempts,
    bestScore: best,
    lastScore: finished[0]?.score ?? null,
    appliedAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class EvaluatorsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly assessment: AssessmentService,
    private readonly mail: MailService,
  ) {}

  private emailApplicant(
    applicant: { name: string; email: string },
    subject: string,
    heading: string,
    body: string,
    link: string,
    linkLabel: string,
  ) {
    void this.mail.send({
      to: applicant.email,
      subject,
      heading,
      body: `Hi ${applicant.name.split(" ")[0]},\n\n${body}`,
      link,
      linkLabel,
    });
  }

  // -------------------------------------------------------------- overview

  async overview() {
    const [byStatus, attempts, questions, expiring] = await Promise.all([
      this.prisma.evaluatorApplicant.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.assessmentAttempt.findMany({
        where: { status: { not: "IN_PROGRESS" } },
        select: { score: true, passed: true },
      }),
      this.prisma.assessmentQuestion.groupBy({
        by: ["competency", "isActive"],
        _count: { _all: true },
      }),
      this.prisma.evaluatorApplicant.count({
        where: {
          status: "AUTHORIZED",
          validUntil: { lte: new Date(Date.now() + MONTH_MS), gte: new Date() },
        },
      }),
    ]);
    const count = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;
    const scored = attempts.filter((attempt) => attempt.score !== null);
    const config = await this.assessment.readConfig();
    const bank = COMPETENCIES.map((key) => ({
      competency: key,
      label: COMPETENCY_META[key].label,
      active:
        questions.find((row) => row.competency === key && row.isActive)?._count._all ?? 0,
      inactive:
        questions.find((row) => row.competency === key && !row.isActive)?._count._all ?? 0,
    }));
    const activeTotal = bank.reduce((sum, row) => sum + row.active, 0);
    return {
      applicants: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      candidates: count("CANDIDATE"),
      qualified: count("QUALIFIED"),
      authorized: count("AUTHORIZED"),
      suspended: count("SUSPENDED"),
      revoked: count("REVOKED"),
      rejected: count("REJECTED"),
      attempts: attempts.length,
      passRate: attempts.length
        ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
        : null,
      averageScore: scored.length
        ? Math.round((scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length) * 10) / 10
        : null,
      expiringSoon: expiring,
      bank,
      bankReady: activeTotal >= config.questionCount,
      questionCount: config.questionCount,
      activeQuestions: activeTotal,
    };
  }

  // ------------------------------------------------------------ applicants

  async listApplicants(query: ListApplicantsDto) {
    const status = query.status ?? "all";
    const q = query.q?.trim();
    const where: Prisma.EvaluatorApplicantWhereInput = {
      ...(status === "registry"
        ? { status: { in: [...REGISTRY_STATUSES] } }
        : status !== "all"
          ? { status: status as never }
          : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { department: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.evaluatorApplicant.findMany({
      where,
      select: applicantSelect,
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    });
    return rows.map(toApplicant);
  }

  async applicant(id: string) {
    const row = await this.prisma.evaluatorApplicant.findUnique({
      where: { id },
      select: {
        ...applicantSelect,
        user: {
          select: {
            id: true,
            isActive: true,
            productEvaluations: {
              select: {
                product: { select: { id: true, name: true, stage: true } },
                createdAt: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            action: true,
            note: true,
            metadata: true,
            createdAt: true,
            actor: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException("Applicant not found.");
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { applicantId: id, status: { not: "IN_PROGRESS" } },
      orderBy: { startedAt: "desc" },
      select: { id: true, status: true, score: true, passed: true, breakdown: true, startedAt: true, submittedAt: true },
    });
    return {
      ...toApplicant(row),
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        passed: attempt.passed,
        breakdown: attempt.breakdown,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      })),
      accountActive: row.user?.isActive ?? null,
      assignedProducts: (row.user?.productEvaluations ?? []).map((entry) => ({
        ...entry.product,
        assignedAt: entry.createdAt.toISOString(),
      })),
      events: row.events.map((event) => ({
        id: event.id,
        action: event.action,
        note: event.note,
        metadata: event.metadata,
        actor: event.actor,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  private async load(id: string) {
    const applicant = await this.prisma.evaluatorApplicant.findUnique({ where: { id } });
    if (!applicant) throw new NotFoundException("Applicant not found.");
    return applicant;
  }

  private async record(
    applicantId: string,
    action: string,
    actor: AuthUser,
    summary: string,
    note?: string | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.evaluatorEvent.create({
      data: { applicantId, action, actorId: actor.id, note: note ?? null, metadata },
    });
    await this.audit.record({
      actorId: actor.id,
      action: `evaluator.${action}`,
      entityType: "EvaluatorApplicant",
      entityId: applicantId,
      summary,
      metadata,
    });
  }

  // --------------------------------------------------------- authorization

  async authorize(id: string, dto: AuthorizeDto, actor: AuthUser) {
    const applicant = await this.load(id);
    if (!["QUALIFIED", "SUSPENDED", "REVOKED"].includes(applicant.status)) {
      throw new BadRequestException(
        applicant.status === "AUTHORIZED"
          ? "This evaluator is already authorized."
          : "Only applicants who passed the assessment can be authorized.",
      );
    }

    const config = await this.assessment.readConfig();
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + config.authorizationMonths * MONTH_MS);
    if (validUntil.getTime() <= Date.now()) {
      throw new BadRequestException("The authorization end date must be in the future.");
    }

    const role = await this.prisma.role.findUnique({ where: { code: "PEER_EVALUATOR" } });
    if (!role) {
      throw new BadRequestException("The Peer Evaluator role is missing. Run the database seed.");
    }
    const existingUser = await this.prisma.user.findUnique({
      where: { email: applicant.email },
      include: { role: true },
    });
    if (existingUser && existingUser.role.code !== "PEER_EVALUATOR") {
      throw new ConflictException(
        `An account for ${applicant.email} already exists as ${existingUser.role.name}. Peer evaluator access needs its own account.`,
      );
    }

    let password: string | null = null;
    const userId = await this.prisma.$transaction(async (tx) => {
      let user = existingUser;
      if (!user) {
        password = tempPassword();
        user = await tx.user.create({
          data: {
            name: applicant.name,
            email: applicant.email,
            title: applicant.jobTitle,
            passwordHash: await bcrypt.hash(password, 10),
            roleId: role.id,
            isActive: true,
          },
          include: { role: true },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { isActive: true, deletedAt: null },
        });
      }
      await tx.evaluatorApplicant.update({
        where: { id },
        data: {
          status: "AUTHORIZED",
          specializations: dto.specializations,
          stages: dto.stages,
          validUntil,
          decisionNote: dto.note?.trim() || null,
          decidedById: actor.id,
          decidedAt: new Date(),
          userId: user.id,
        },
      });
      return user.id;
    });

    await this.record(
      id,
      "authorized",
      actor,
      `${actor.name} authorized ${applicant.name} as an evaluator`,
      dto.note,
      {
        specializations: dto.specializations,
        stages: dto.stages,
        validUntil: validUntil.toISOString(),
        accountCreated: password !== null,
      },
    );
    await this.prisma.notification.create({
      data: {
        userId,
        type: "evaluator.authorized",
        title: "You are now an authorized evaluator",
        body: "An administrator authorized you. You'll see the products assigned to you under Stage gate approvals.",
        link: "/admin/approvals",
      },
    });

    this.emailApplicant(
      applicant,
      "You're now an authorized evaluator",
      "You're authorized.",
      `An administrator authorized you as an evaluator${
        dto.specializations.length ? " for " + dto.specializations.length + " specialization(s)" : ""
      }. ${
        password
          ? "An account was created for you. The innovation team will hand you your temporary password separately; sign in with this email address and change it right away."
          : "Sign in with your existing evaluator account."
      }\n\nYou'll see the products assigned to you under Stage gate approvals. You can never evaluate a project you are part of.`,
      "/login",
      "Sign in",
    );

    return { applicant: await this.applicant(id), temporaryPassword: password };
  }

  async updateAuthorization(id: string, dto: UpdateAuthorizationDto, actor: AuthUser) {
    const applicant = await this.load(id);
    if (!["AUTHORIZED", "SUSPENDED"].includes(applicant.status)) {
      throw new BadRequestException("Only authorized evaluators can be edited.");
    }
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;
    if (validUntil && validUntil.getTime() <= Date.now()) {
      throw new BadRequestException("The authorization end date must be in the future.");
    }
    await this.prisma.evaluatorApplicant.update({
      where: { id },
      data: {
        specializations: dto.specializations,
        stages: dto.stages,
        validUntil,
      },
    });
    await this.record(id, "authorization.updated", actor, `${actor.name} updated ${applicant.name}'s authorization`, null, {
      specializations: dto.specializations ?? applicant.specializations,
      stages: dto.stages ?? applicant.stages,
      validUntil: (validUntil ?? applicant.validUntil)?.toISOString() ?? null,
    });
    return this.applicant(id);
  }

  async reject(id: string, note: string | undefined, actor: AuthUser) {
    const applicant = await this.load(id);
    if (!["CANDIDATE", "QUALIFIED"].includes(applicant.status)) {
      throw new BadRequestException("Only open applications can be rejected.");
    }
    await this.prisma.evaluatorApplicant.update({
      where: { id },
      data: { status: "REJECTED", decisionNote: note?.trim() || null, decidedById: actor.id, decidedAt: new Date() },
    });
    await this.record(id, "rejected", actor, `${actor.name} did not approve ${applicant.name}'s application`, note);
    this.emailApplicant(
      applicant,
      "An update on your evaluator application",
      "An update on your application.",
      `The innovation team did not approve your evaluator application this time.${
        note?.trim() ? "\n\nTheir note: " + note.trim() : ""
      }\n\nThank you for the effort. You're welcome to talk to the team about next steps.`,
      "/become-evaluator",
      "See your status",
    );
    return this.applicant(id);
  }

  async suspend(id: string, note: string | undefined, actor: AuthUser) {
    const applicant = await this.load(id);
    if (applicant.status !== "AUTHORIZED") {
      throw new BadRequestException("Only authorized evaluators can be suspended.");
    }
    await this.prisma.evaluatorApplicant.update({
      where: { id },
      data: { status: "SUSPENDED", decisionNote: note?.trim() || null, decidedById: actor.id, decidedAt: new Date() },
    });
    await this.record(id, "suspended", actor, `${actor.name} suspended ${applicant.name}'s evaluator authorization`, note);
    this.emailApplicant(
      applicant,
      "Your evaluator authorization is suspended",
      "Your authorization is suspended.",
      `Your evaluator authorization is paused for now, so you can't decide stage gates until it's reinstated.${
        note?.trim() ? "\n\nNote from the team: " + note.trim() : ""
      }`,
      "/become-evaluator",
      "See your status",
    );
    return this.applicant(id);
  }

  async reinstate(id: string, actor: AuthUser) {
    const applicant = await this.load(id);
    if (applicant.status !== "SUSPENDED") {
      throw new BadRequestException("Only suspended evaluators can be reinstated.");
    }
    if (applicant.validUntil && applicant.validUntil.getTime() <= Date.now()) {
      throw new BadRequestException("The authorization has expired. Set a new end date first.");
    }
    await this.prisma.evaluatorApplicant.update({
      where: { id },
      data: { status: "AUTHORIZED", decidedById: actor.id, decidedAt: new Date() },
    });
    await this.record(id, "reinstated", actor, `${actor.name} reinstated ${applicant.name}'s evaluator authorization`);
    return this.applicant(id);
  }

  async revoke(id: string, note: string | undefined, actor: AuthUser) {
    const applicant = await this.load(id);
    if (!["AUTHORIZED", "SUSPENDED"].includes(applicant.status)) {
      throw new BadRequestException("Only authorized or suspended evaluators can be revoked.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.evaluatorApplicant.update({
        where: { id },
        data: { status: "REVOKED", decisionNote: note?.trim() || null, decidedById: actor.id, decidedAt: new Date() },
      });
      if (applicant.userId) {
        await tx.productEvaluator.deleteMany({ where: { userId: applicant.userId } });
        await tx.user.update({ where: { id: applicant.userId }, data: { isActive: false } });
      }
    });
    await this.record(id, "revoked", actor, `${actor.name} revoked ${applicant.name}'s evaluator privileges`, note);
    this.emailApplicant(
      applicant,
      "Your evaluator privileges were withdrawn",
      "Your privileges were withdrawn.",
      `Your evaluator privileges have been withdrawn and your account is deactivated.${
        note?.trim() ? "\n\nNote from the team: " + note.trim() : ""
      }`,
      "/become-evaluator",
      "See your status",
    );
    return this.applicant(id);
  }

  // ----------------------------------------------------------- assignments

  async assignProducts(id: string, dto: AssignProductsDto, actor: AuthUser) {
    const applicant = await this.load(id);
    if (applicant.status !== "AUTHORIZED" || !applicant.userId) {
      throw new BadRequestException("Only authorized evaluators can be assigned to products.");
    }
    const userId = applicant.userId;
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      select: { id: true, name: true },
    });
    if (products.length !== dto.productIds.length) {
      throw new BadRequestException("One or more products were not found.");
    }
    const current = await this.prisma.productEvaluator.findMany({ where: { userId } });
    const before = new Set(current.map((entry) => entry.productId));
    const after = new Set(dto.productIds);
    const added = dto.productIds.filter((pid) => !before.has(pid));
    const removed = [...before].filter((pid) => !after.has(pid));

    await this.prisma.$transaction([
      this.prisma.productEvaluator.deleteMany({ where: { userId, productId: { in: removed } } }),
      this.prisma.productEvaluator.createMany({
        data: added.map((productId) => ({ productId, userId })),
        skipDuplicates: true,
      }),
    ]);
    if (added.length || removed.length) {
      await this.record(id, "products.assigned", actor, `${actor.name} updated ${applicant.name}'s product assignments`, null, {
        added,
        removed,
      });
      if (added.length) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: "evaluator.assigned",
            title: "You were assigned to evaluate a product",
            body: `${added.length} product${added.length === 1 ? "" : "s"} added to your evaluator workload.`,
            link: "/admin/approvals",
          },
        });
      }
    }
    return this.applicant(id);
  }

  // -------------------------------------------------------------- history

  async events(limit = 100) {
    const rows = await this.prisma.evaluatorEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 300),
      select: {
        id: true,
        action: true,
        note: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
        applicant: { select: { id: true, name: true, email: true } },
      },
    });
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  // ------------------------------------------------------------ question bank

  async listQuestions(query: ListQuestionsDto) {
    const q = query.q?.trim();
    const rows = await this.prisma.assessmentQuestion.findMany({
      where: {
        ...(query.competency && query.competency !== "all"
          ? { competency: query.competency as Competency }
          : {}),
        ...(query.state === "active"
          ? { isActive: true }
          : query.state === "inactive"
            ? { isActive: false }
            : {}),
        ...(q ? { prompt: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: [{ competency: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => ({
      ...row,
      competencyLabel: COMPETENCY_META[row.competency as Competency].label,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private checkQuestion(options: string[], correctIndex: number) {
    const cleaned = options.map((option) => option.trim());
    if (cleaned.some((option) => !option)) {
      throw new BadRequestException("Answer options can't be empty.");
    }
    if (new Set(cleaned.map((option) => option.toLowerCase())).size !== cleaned.length) {
      throw new BadRequestException("Answer options must be different from each other.");
    }
    if (correctIndex < 0 || correctIndex >= cleaned.length) {
      throw new BadRequestException("Choose which option is the correct answer.");
    }
    return cleaned;
  }

  async createQuestion(dto: QuestionDto, actor: AuthUser) {
    const options = this.checkQuestion(dto.options, dto.correctIndex);
    const row = await this.prisma.assessmentQuestion.create({
      data: {
        competency: dto.competency,
        prompt: dto.prompt.trim(),
        options,
        correctIndex: dto.correctIndex,
        explanation: dto.explanation?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "evaluator.question.created",
      entityType: "AssessmentQuestion",
      entityId: row.id,
      summary: `${actor.name} added an assessment question`,
    });
    return row;
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto, actor: AuthUser) {
    const existing = await this.prisma.assessmentQuestion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Question not found.");
    const options = dto.options
      ? this.checkQuestion(dto.options, dto.correctIndex ?? existing.correctIndex)
      : this.checkQuestion(existing.options, dto.correctIndex ?? existing.correctIndex);
    const row = await this.prisma.assessmentQuestion.update({
      where: { id },
      data: {
        competency: dto.competency,
        prompt: dto.prompt?.trim(),
        options,
        correctIndex: dto.correctIndex ?? existing.correctIndex,
        explanation: dto.explanation === undefined ? undefined : dto.explanation.trim() || null,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "evaluator.question.updated",
      entityType: "AssessmentQuestion",
      entityId: id,
      summary: `${actor.name} edited an assessment question`,
    });
    return row;
  }

  async deleteQuestion(id: string, actor: AuthUser) {
    const existing = await this.prisma.assessmentQuestion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Question not found.");
    // Past attempts keep their own snapshot of the question, so deleting is safe.
    await this.prisma.assessmentQuestion.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      action: "evaluator.question.deleted",
      entityType: "AssessmentQuestion",
      entityId: id,
      summary: `${actor.name} deleted an assessment question`,
    });
    return { id };
  }

  // ------------------------------------------------------------------ config

  config() {
    return this.assessment.readConfig();
  }

  async updateConfig(dto: ConfigDto, actor: AuthUser) {
    const weights = {} as Record<Competency, number>;
    for (const key of COMPETENCIES) {
      const value = Number(dto.weights?.[key]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new BadRequestException(`Set a weight between 0 and 100 for ${COMPETENCY_META[key].label}.`);
      }
      weights[key] = value;
    }
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (Math.round(total * 100) !== 10000) {
      throw new BadRequestException(`Weights must add up to 100% (currently ${total}%).`);
    }
    const value = mergeConfig({ ...dto, weights });
    await this.prisma.systemSetting.upsert({
      where: { key: ASSESSMENT_CONFIG_KEY },
      create: {
        key: ASSESSMENT_CONFIG_KEY,
        value: value as unknown as Prisma.InputJsonValue,
        description: "Evaluator qualification assessment configuration",
        updatedById: actor.id,
      },
      update: { value: value as unknown as Prisma.InputJsonValue, updatedById: actor.id },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "evaluator.config.updated",
      entityType: "SystemSetting",
      entityId: ASSESSMENT_CONFIG_KEY,
      summary: `${actor.name} updated the evaluator assessment settings`,
      after: value as unknown as Prisma.InputJsonValue,
    });
    return value;
  }
}
