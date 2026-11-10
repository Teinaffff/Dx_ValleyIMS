import type {
  Competency,
  EvaluatorStatus,
  Specialization,
} from "@ims/shared";

export interface ApplicantRow {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  motivation: string | null;
  status: EvaluatorStatus;
  statusLabel: string;
  specializations: Specialization[];
  stages: string[];
  validUntil: string | null;
  expired: boolean;
  decisionNote: string | null;
  decidedBy: { id: string; name: string } | null;
  decidedAt: string | null;
  hasAccount: boolean;
  attemptsUsed: number;
  bestScore: number | null;
  lastScore: number | null;
  appliedAt: string;
}

export interface ApplicantDetail extends ApplicantRow {
  attempts: {
    id: string;
    status: string;
    score: number | null;
    passed: boolean | null;
    breakdown:
      | { competency: Competency; label: string; correct: number; total: number; percent: number }[]
      | null;
    startedAt: string;
    submittedAt: string | null;
  }[];
  accountActive: boolean | null;
  assignedProducts: { id: string; name: string; stage: string; assignedAt: string }[];
  events: EvaluatorEventRow[];
}

export interface EvaluatorEventRow {
  id: string;
  action: string;
  note: string | null;
  metadata: unknown;
  actor: { id: string; name: string } | null;
  createdAt: string;
}

export interface HistoryRow extends EvaluatorEventRow {
  applicant: { id: string; name: string; email: string };
}

export interface Overview {
  applicants: number;
  candidates: number;
  qualified: number;
  authorized: number;
  suspended: number;
  revoked: number;
  rejected: number;
  attempts: number;
  passRate: number | null;
  averageScore: number | null;
  expiringSoon: number;
  bank: { competency: Competency; label: string; active: number; inactive: number }[];
  bankReady: boolean;
  questionCount: number;
  activeQuestions: number;
}

export interface QuestionRow {
  id: string;
  competency: Competency;
  competencyLabel: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  isActive: boolean;
}

export const EVENT_LABELS: Record<string, string> = {
  "application.submitted": "Applied to become an evaluator",
  "assessment.started": "Started the assessment",
  "assessment.passed": "Passed the assessment",
  "assessment.failed": "Did not pass the assessment",
  "assessment.expired": "Ran out of time",
  authorized: "Authorized as an evaluator",
  "authorization.updated": "Authorization updated",
  rejected: "Application not approved",
  suspended: "Authorization suspended",
  reinstated: "Authorization reinstated",
  revoked: "Privileges revoked",
  "products.assigned": "Product assignments changed",
};

export const STATUS_TONE: Record<string, string> = {
  CANDIDATE: "bg-ink/[0.06] text-ink/65",
  QUALIFIED: "bg-warning/15 text-[#9A6206]",
  AUTHORIZED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  SUSPENDED: "bg-warning/15 text-[#9A6206]",
  REVOKED: "bg-danger/10 text-danger",
};
