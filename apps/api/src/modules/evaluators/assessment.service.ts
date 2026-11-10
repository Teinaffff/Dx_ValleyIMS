import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomInt } from "crypto";
import { hashAccessCode, matchesAccessCode, newAccessCode } from "../../common/access-code";
import type { AssessmentAttempt, EvaluatorApplicant, Prisma } from "@prisma/client";
import {
  ASSESSMENT_CONFIG_KEY,
  COMPETENCIES,
  COMPETENCY_META,
  DEFAULT_ASSESSMENT_CONFIG,
  EVALUATOR_STATUS_LABELS,
  PEER_EVALUATOR_STAGES,
  SPECIALIZATIONS,
  SPECIALIZATION_LABELS,
  type AssessmentConfig,
  type AttemptResult,
  type AttemptSession,
  type Competency,
  type EvaluatorInfo,
  type EvaluatorTokenStatus,
  type Specialization,
} from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
import type { ApplyEvaluatorDto } from "./evaluators.dto";

export interface StoredQuestion {
  id: string;
  competency: Competency;
  prompt: string;
  options: string[];
  correctIndex: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Network and clock slack before a late submission counts as expired.
const SUBMIT_GRACE_MS = 45_000;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function mergeConfig(raw: unknown): AssessmentConfig {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<AssessmentConfig>;
  return {
    ...DEFAULT_ASSESSMENT_CONFIG,
    ...value,
    weights: { ...DEFAULT_ASSESSMENT_CONFIG.weights, ...(value.weights ?? {}) },
  };
}

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async readConfig(): Promise<AssessmentConfig> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: ASSESSMENT_CONFIG_KEY },
    });
    return mergeConfig(row?.value);
  }

  async info(): Promise<EvaluatorInfo> {
    const [config, questionBankSize] = await Promise.all([
      this.readConfig(),
      this.prisma.assessmentQuestion.count({ where: { isActive: true } }),
    ]);
    return {
      config,
      competencies: COMPETENCIES.map((key) => ({
        key,
        label: COMPETENCY_META[key].label,
        summary: COMPETENCY_META[key].summary,
        weight: config.weights[key],
      })),
      specializations: SPECIALIZATIONS.map((key) => ({
        key,
        label: SPECIALIZATION_LABELS[key],
      })),
      stages: [...PEER_EVALUATOR_STAGES],
      questionBankSize,
    };
  }

  // ------------------------------------------------------------------ apply

  async apply(dto: ApplyEvaluatorDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.evaluatorApplicant.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(
        "This email has already applied. Use \"Continue with my access code\" to pick up where you left off.",
      );
    }

    const code = newAccessCode();
    const applicant = await this.prisma.evaluatorApplicant.create({
      data: {
        name: dto.name.trim(),
        email,
        jobTitle: dto.jobTitle?.trim() || null,
        department: dto.department?.trim() || null,
        motivation: dto.motivation?.trim() || null,
        tokenHash: hashAccessCode(code),
        events: { create: { action: "application.submitted" } },
      },
    });

    await this.audit.record({
      actorId: null,
      action: "evaluator.applied",
      entityType: "EvaluatorApplicant",
      entityId: applicant.id,
      summary: `${applicant.name} applied to become an evaluator`,
      metadata: { email },
    });

    // The access code is shown once. It is how the applicant resumes without
    // an account, so only its hash is stored.
    return { email, accessCode: code, status: await this.statusFor(applicant) };
  }

  // ------------------------------------------------------------ identification

  async authenticate(email: string | undefined, code: string | undefined) {
    if (!email || !code) {
      throw new UnauthorizedException("Enter your work email and access code.");
    }
    const applicant = await this.prisma.evaluatorApplicant.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!applicant || !matchesAccessCode(code, applicant.tokenHash)) {
      throw new UnauthorizedException("That email and access code don't match an application.");
    }
    return applicant;
  }

  async status(email?: string, code?: string) {
    const applicant = await this.authenticate(email, code);
    return this.statusFor(applicant);
  }

  async statusFor(applicant: EvaluatorApplicant): Promise<EvaluatorTokenStatus> {
    const config = await this.readConfig();
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { applicantId: applicant.id },
      orderBy: { startedAt: "asc" },
    });
    const live = await this.expireStale(attempts);
    const used = live.length;
    const inProgress = live.find((attempt) => attempt.status === "IN_PROGRESS") ?? null;
    const finished = live.filter((attempt) => attempt.status !== "IN_PROGRESS");
    const last = finished.at(-1) ?? null;

    let nextAttemptAt: Date | null = null;
    if (last) {
      const endedAt = last.submittedAt ?? last.expiresAt;
      nextAttemptAt = new Date(endedAt.getTime() + config.retakeAfterDays * DAY_MS);
    }
    const waiting = nextAttemptAt !== null && nextAttemptAt.getTime() > Date.now();

    const canStart =
      applicant.status === "CANDIDATE" &&
      !inProgress &&
      used < config.maxAttempts &&
      !waiting;

    return {
      applicantId: applicant.id,
      name: applicant.name,
      email: applicant.email,
      status: applicant.status,
      statusLabel: EVALUATOR_STATUS_LABELS[applicant.status],
      attemptsUsed: used,
      attemptsAllowed: config.maxAttempts,
      canStart,
      nextAttemptAt:
        applicant.status === "CANDIDATE" && used < config.maxAttempts && waiting
          ? nextAttemptAt!.toISOString()
          : null,
      inProgressAttemptId: inProgress?.id ?? null,
      lastResult: last ? this.resultOf(last, config) : null,
      specializations: applicant.specializations as Specialization[],
      validUntil: applicant.validUntil?.toISOString() ?? null,
    };
  }

  /** An attempt left open past its deadline counts as a used, failed attempt. */
  private async expireStale(attempts: AssessmentAttempt[]) {
    const now = Date.now();
    const result: AssessmentAttempt[] = [];
    for (const attempt of attempts) {
      if (
        attempt.status === "IN_PROGRESS" &&
        attempt.expiresAt.getTime() + SUBMIT_GRACE_MS < now
      ) {
        result.push(
          await this.prisma.assessmentAttempt.update({
            where: { id: attempt.id },
            data: { status: "EXPIRED", submittedAt: attempt.expiresAt, score: 0, passed: false },
          }),
        );
      } else {
        result.push(attempt);
      }
    }
    return result;
  }

  // ----------------------------------------------------------------- start

  async start(email?: string, code?: string): Promise<AttemptSession> {
    const applicant = await this.authenticate(email, code);
    const status = await this.statusFor(applicant);

    if (status.inProgressAttemptId) {
      return this.session(status.inProgressAttemptId, applicant.id);
    }
    if (applicant.status !== "CANDIDATE") {
      throw new BadRequestException(
        `You can't start the assessment while your status is "${status.statusLabel}".`,
      );
    }
    if (status.attemptsUsed >= status.attemptsAllowed) {
      throw new BadRequestException(
        "You've used all of your assessment attempts. Contact the innovation team if you think this is a mistake.",
      );
    }
    if (status.nextAttemptAt) {
      throw new BadRequestException(
        `You can retake the assessment from ${new Date(status.nextAttemptAt).toLocaleString("en-GB")}.`,
      );
    }

    const config = await this.readConfig();
    const previous = await this.prisma.assessmentAttempt.findMany({
      where: { applicantId: applicant.id },
      select: { questions: true },
    });
    const seen = new Set(
      previous.flatMap((attempt) =>
        ((attempt.questions as unknown as StoredQuestion[]) ?? []).map((q) => q.id),
      ),
    );

    const questions = await this.drawQuestions(config, seen);
    const now = new Date();
    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        applicantId: applicant.id,
        questions: questions as unknown as Prisma.InputJsonValue,
        startedAt: now,
        expiresAt: new Date(now.getTime() + config.durationMinutes * 60_000),
        status: "IN_PROGRESS",
      },
    });
    await this.prisma.evaluatorEvent.create({
      data: { applicantId: applicant.id, action: "assessment.started", metadata: { attemptId: attempt.id } },
    });
    return this.session(attempt.id, applicant.id);
  }

  /** Random, weight-balanced draw; unseen questions first, options shuffled. */
  private async drawQuestions(config: AssessmentConfig, seen: Set<string>): Promise<StoredQuestion[]> {
    const bank = await this.prisma.assessmentQuestion.findMany({ where: { isActive: true } });
    const total = config.questionCount;
    if (bank.length < total) {
      throw new BadRequestException(
        `The question bank isn't ready yet (${bank.length} of ${total} questions). Please try again later.`,
      );
    }

    // Largest-remainder split of `total` across competencies by weight.
    const weightSum = COMPETENCIES.reduce((sum, key) => sum + (config.weights[key] ?? 0), 0) || 1;
    const raw = COMPETENCIES.map((key) => ({
      key,
      exact: ((config.weights[key] ?? 0) / weightSum) * total,
    }));
    const counts = new Map<Competency, number>(raw.map((r) => [r.key, Math.floor(r.exact)]));
    let remaining = total - [...counts.values()].reduce((a, b) => a + b, 0);
    for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
      if (remaining <= 0) break;
      counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
      remaining -= 1;
    }

    const pools = new Map<Competency, typeof bank>();
    for (const key of COMPETENCIES) {
      const own = bank.filter((q) => q.competency === key);
      const fresh = shuffle(own.filter((q) => !seen.has(q.id)));
      const old = shuffle(own.filter((q) => seen.has(q.id)));
      pools.set(key, [...fresh, ...old]);
    }

    const picked: typeof bank = [];
    let shortfall = 0;
    for (const key of COMPETENCIES) {
      const want = counts.get(key) ?? 0;
      const pool = pools.get(key) ?? [];
      const take = pool.splice(0, want);
      picked.push(...take);
      shortfall += want - take.length;
    }
    // A thin competency is topped up from the rest so the test is always full.
    if (shortfall > 0) {
      const rest = shuffle(
        [...pools.values()].flat().filter((q) => !picked.some((p) => p.id === q.id)),
      );
      picked.push(...rest.slice(0, shortfall));
    }

    return shuffle(picked).map((question) => {
      const order = shuffle(question.options.map((_, index) => index));
      return {
        id: question.id,
        competency: question.competency as Competency,
        prompt: question.prompt,
        options: order.map((index) => question.options[index]),
        correctIndex: order.indexOf(question.correctIndex),
      };
    });
  }

  private async session(attemptId: string, applicantId: string): Promise<AttemptSession> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, applicantId },
    });
    if (!attempt) throw new NotFoundException("Assessment not found.");
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("This assessment has already been submitted.");
    }
    const config = await this.readConfig();
    const stored = attempt.questions as unknown as StoredQuestion[];
    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      durationMinutes: config.durationMinutes,
      questions: stored.map(({ id, prompt, options, competency }) => ({
        id,
        prompt,
        options,
        competency,
      })),
      answers: (attempt.answers as Record<string, number>) ?? {},
    };
  }

  async resume(attemptId: string, email?: string, code?: string) {
    const applicant = await this.authenticate(email, code);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, applicantId: applicant.id },
    });
    if (!attempt) throw new NotFoundException("Assessment not found.");
    if (attempt.status === "IN_PROGRESS" && attempt.expiresAt.getTime() + SUBMIT_GRACE_MS < Date.now()) {
      await this.expireStale([attempt]);
      throw new BadRequestException("Time ran out on this assessment.");
    }
    return this.session(attemptId, applicant.id);
  }

  async saveAnswers(
    attemptId: string,
    answers: Record<string, number>,
    email?: string,
    code?: string,
  ) {
    const applicant = await this.authenticate(email, code);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, applicantId: applicant.id, status: "IN_PROGRESS" },
    });
    if (!attempt) throw new NotFoundException("Assessment not found.");
    if (attempt.expiresAt.getTime() + SUBMIT_GRACE_MS < Date.now()) return { saved: false };
    await this.prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { answers: this.cleanAnswers(attempt, answers) as Prisma.InputJsonValue },
    });
    return { saved: true };
  }

  private cleanAnswers(attempt: AssessmentAttempt, answers: Record<string, number>) {
    const stored = attempt.questions as unknown as StoredQuestion[];
    const clean: Record<string, number> = {};
    for (const question of stored) {
      const value = answers?.[question.id];
      if (Number.isInteger(value) && value >= 0 && value < question.options.length) {
        clean[question.id] = value;
      }
    }
    return clean;
  }

  // ---------------------------------------------------------------- submit

  async submit(
    attemptId: string,
    answers: Record<string, number>,
    email?: string,
    code?: string,
  ): Promise<{ result: AttemptResult; status: EvaluatorTokenStatus }> {
    const applicant = await this.authenticate(email, code);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, applicantId: applicant.id },
    });
    if (!attempt) throw new NotFoundException("Assessment not found.");
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("This assessment has already been submitted.");
    }

    const config = await this.readConfig();
    const now = new Date();
    const late = now.getTime() > attempt.expiresAt.getTime() + SUBMIT_GRACE_MS;
    const clean = this.cleanAnswers(attempt, answers);
    const stored = attempt.questions as unknown as StoredQuestion[];

    // Per-competency tally, then a weighted overall score.
    const tally = new Map<Competency, { correct: number; total: number }>();
    for (const question of stored) {
      const row = tally.get(question.competency) ?? { correct: 0, total: 0 };
      row.total += 1;
      if (clean[question.id] === question.correctIndex) row.correct += 1;
      tally.set(question.competency, row);
    }
    const asked = [...tally.keys()];
    const weightSum = asked.reduce((sum, key) => sum + (config.weights[key] ?? 0), 0) || asked.length || 1;
    const breakdown = asked.map((key) => {
      const row = tally.get(key)!;
      return {
        competency: key,
        label: COMPETENCY_META[key].label,
        correct: row.correct,
        total: row.total,
        percent: Math.round((row.correct / row.total) * 1000) / 10,
        weight: config.weights[key],
      };
    });
    const weighted = late
      ? 0
      : breakdown.reduce(
          (sum, row) => sum + (row.percent * (config.weights[row.competency] || 1)) / (weightSum || 1),
          0,
        );
    const score = Math.round(weighted * 10) / 10;
    const passed = !late && score >= config.passScore;

    await this.prisma.$transaction(async (tx) => {
      await tx.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: late ? "EXPIRED" : "SUBMITTED",
          answers: clean as Prisma.InputJsonValue,
          submittedAt: now,
          score,
          passed,
          breakdown: breakdown as unknown as Prisma.InputJsonValue,
        },
      });
      if (passed && applicant.status === "CANDIDATE") {
        await tx.evaluatorApplicant.update({
          where: { id: applicant.id },
          data: { status: "QUALIFIED" },
        });
      }
      await tx.evaluatorEvent.create({
        data: {
          applicantId: applicant.id,
          action: late ? "assessment.expired" : passed ? "assessment.passed" : "assessment.failed",
          metadata: { attemptId: attempt.id, score },
        },
      });
    });

    if (passed) {
      await this.notifyAdmins(applicant, score);
      void this.mail.send({
        to: applicant.email,
        subject: "You passed the evaluator assessment",
        heading: "You passed.",
        body: `Hi ${applicant.name.split(" ")[0]},\n\nYou scored ${score}% on the evaluator assessment. That qualifies you for consideration.\n\nAn administrator now reviews your result and decides on your authorization. Passing does not grant approval rights by itself, and we'll email you when there's a decision.`,
        link: "/become-evaluator",
        linkLabel: "See your status",
      });
    }

    const fresh = await this.prisma.evaluatorApplicant.findUniqueOrThrow({ where: { id: applicant.id } });
    const updated = await this.prisma.assessmentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    return {
      result: this.resultOf(updated, config),
      status: await this.statusFor(fresh),
    };
  }

  private async notifyAdmins(applicant: EvaluatorApplicant, score: number) {
    const admins = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null, role: { code: "ADMIN" } },
      select: { id: true },
    });
    if (!admins.length) return;
    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "evaluator.qualified",
        title: `Evaluator qualified: ${applicant.name}`,
        body: `${applicant.name} passed the evaluator assessment with ${score}%. Review and authorize.`,
        link: "/admin/evaluators",
      })),
    });
  }

  private resultOf(attempt: AssessmentAttempt, config: AssessmentConfig): AttemptResult {
    return {
      attemptId: attempt.id,
      score: attempt.score ?? 0,
      passed: Boolean(attempt.passed),
      passScore: config.passScore,
      submittedAt: (attempt.submittedAt ?? attempt.expiresAt).toISOString(),
      expired: attempt.status === "EXPIRED",
      breakdown: ((attempt.breakdown as unknown as AttemptResult["breakdown"]) ?? []),
    };
  }
}
