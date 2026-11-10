// Competency-based evaluator qualification: constants shared by the API and web.

export const COMPETENCIES = [
  "INNOVATION_FUNDAMENTALS",
  "STRATEGIC_THINKING",
  "CRITICAL_THINKING",
  "RISK_MANAGEMENT",
  "EVALUATION_ETHICS",
  "PRODUCT_BUSINESS",
] as const;
export type Competency = (typeof COMPETENCIES)[number];

export const COMPETENCY_META: Record<
  Competency,
  { label: string; weight: number; summary: string }
> = {
  INNOVATION_FUNDAMENTALS: {
    label: "Innovation Management Fundamentals",
    weight: 15,
    summary: "Stage-gate thinking, experimentation and how innovation differs from routine delivery.",
  },
  STRATEGIC_THINKING: {
    label: "Strategic Thinking",
    weight: 20,
    summary: "Connecting an idea to the bank's goals, market position and long-term value.",
  },
  CRITICAL_THINKING: {
    label: "Critical Thinking and Decision-Making",
    weight: 20,
    summary: "Weighing evidence, spotting weak assumptions and deciding with incomplete information.",
  },
  RISK_MANAGEMENT: {
    label: "Risk Management",
    weight: 15,
    summary: "Identifying, sizing and mitigating technical, financial, regulatory and customer risk.",
  },
  EVALUATION_ETHICS: {
    label: "Evaluation Ethics and Impartiality",
    weight: 15,
    summary: "Conflicts of interest, objectivity, confidentiality and fair treatment of every project.",
  },
  PRODUCT_BUSINESS: {
    label: "Product and Business Understanding",
    weight: 15,
    summary: "Customer value, business models, unit economics and product-market fit.",
  },
};

export const SPECIALIZATIONS = [
  "INNOVATION_MANAGEMENT",
  "BUSINESS_STRATEGY",
  "TECHNOLOGY",
  "FINANCE",
  "RISK_COMPLIANCE",
  "CUSTOMER_EXPERIENCE",
] as const;
export type Specialization = (typeof SPECIALIZATIONS)[number];

export const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  INNOVATION_MANAGEMENT: "Innovation Management",
  BUSINESS_STRATEGY: "Business and Strategy",
  TECHNOLOGY: "Technology and Technical Feasibility",
  FINANCE: "Finance and Business Viability",
  RISK_COMPLIANCE: "Risk and Compliance",
  CUSTOMER_EXPERIENCE: "Customer Experience",
};

// Candidate -> Qualified -> Authorized are the three headline states; the rest
// describe what happened to an application or an authorization afterwards.
export const EVALUATOR_STATUSES = [
  "CANDIDATE",
  "QUALIFIED",
  "AUTHORIZED",
  "REJECTED",
  "SUSPENDED",
  "REVOKED",
] as const;
export type EvaluatorStatus = (typeof EVALUATOR_STATUSES)[number];

export const EVALUATOR_STATUS_LABELS: Record<EvaluatorStatus, string> = {
  CANDIDATE: "Evaluator Candidate",
  QUALIFIED: "Qualified Evaluator",
  AUTHORIZED: "Authorized Evaluator",
  REJECTED: "Not approved",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
};

// Peer evaluators may only decide the early gates (the product's current stage is
// before Pilot). From Pilot onward a gate commits real resources and needs a
// formal approver, so it is never delegated to a peer evaluator.
export const PEER_EVALUATOR_STAGES = ["IDEATION", "VALIDATION", "MVP"] as const;

export interface AssessmentConfig {
  questionCount: number;
  durationMinutes: number;
  passScore: number;
  maxAttempts: number;
  retakeAfterDays: number;
  /** Authorizations expire after this many months unless the admin sets a date. */
  authorizationMonths: number;
  weights: Record<Competency, number>;
}

export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  questionCount: 20,
  durationMinutes: 30,
  passScore: 80,
  maxAttempts: 2,
  retakeAfterDays: 2,
  authorizationMonths: 12,
  weights: {
    INNOVATION_FUNDAMENTALS: 15,
    STRATEGIC_THINKING: 20,
    CRITICAL_THINKING: 20,
    RISK_MANAGEMENT: 15,
    EVALUATION_ETHICS: 15,
    PRODUCT_BUSINESS: 15,
  },
};

export const ASSESSMENT_CONFIG_KEY = "evaluator.assessment";

export interface EvaluatorTokenStatus {
  applicantId: string;
  name: string;
  email: string;
  status: EvaluatorStatus;
  statusLabel: string;
  attemptsUsed: number;
  attemptsAllowed: number;
  canStart: boolean;
  nextAttemptAt: string | null;
  inProgressAttemptId: string | null;
  lastResult: AttemptResult | null;
  specializations: Specialization[];
  validUntil: string | null;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  passed: boolean;
  passScore: number;
  submittedAt: string;
  expired: boolean;
  breakdown: {
    competency: Competency;
    label: string;
    correct: number;
    total: number;
    percent: number;
    weight: number;
  }[];
}

export interface AssessmentQuestionPublic {
  id: string;
  prompt: string;
  options: string[];
  competency: Competency;
}

export interface AttemptSession {
  attemptId: string;
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
  questions: AssessmentQuestionPublic[];
  answers: Record<string, number>;
}

export interface EvaluatorInfo {
  config: AssessmentConfig;
  competencies: { key: Competency; label: string; summary: string; weight: number }[];
  specializations: { key: Specialization; label: string }[];
  stages: string[];
  questionBankSize: number;
}
