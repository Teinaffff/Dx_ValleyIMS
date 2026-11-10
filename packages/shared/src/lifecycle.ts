export const LIFECYCLE_STAGES = [
  {
    key: "IDEATION",
    label: "Ideation",
    order: 1,
    summary: "Shape the problem, validate the opportunity and define the concept.",
    accent: "#7DD3FC",
  },
  {
    key: "VALIDATION",
    label: "Validation",
    order: 2,
    summary: "Prove demand with research, user testing and a clear business case.",
    accent: "#38BDF8",
  },
  {
    key: "MVP",
    label: "MVP",
    order: 3,
    summary: "Build the smallest useful product and pass internal review.",
    accent: "#0EA5E9",
  },
  {
    key: "PILOT",
    label: "Pilot",
    order: 4,
    summary: "Run with a real cohort, measure outcomes and learn fast.",
    accent: "#0284C7",
  },
  {
    key: "SCALE",
    label: "Scale",
    order: 5,
    summary: "Harden operations and roll the product out across the bank.",
    accent: "#0369A1",
  },
  {
    key: "MONETIZATION",
    label: "Monetization",
    order: 6,
    summary: "Launch commercially and track sustainable return on investment.",
    accent: "#075985",
  },
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]["key"];

export const LIFECYCLE_STAGE_KEYS = LIFECYCLE_STAGES.map((stage) => stage.key);

export function stageLabel(stage: string): string {
  return LIFECYCLE_STAGES.find((item) => item.key === stage)?.label ?? stage;
}

export function stageOrder(stage: string): number {
  return LIFECYCLE_STAGES.find((item) => item.key === stage)?.order ?? 0;
}

export function nextStage(stage: string): LifecycleStage | null {
  const index = LIFECYCLE_STAGE_KEYS.indexOf(stage as LifecycleStage);
  return index >= 0 && index < LIFECYCLE_STAGE_KEYS.length - 1
    ? LIFECYCLE_STAGE_KEYS[index + 1]
    : null;
}

// Gates that move a product INTO Validation or MVP are the cheaper, earlier
// decisions; everything from Pilot onward commits real resources and needs a
// larger quorum. Thresholds come from the approval.policy config.
export function gateApprovalsNeeded(
  targetStage: string,
  earlyCount: number,
  lateCount: number,
): number {
  return stageOrder(targetStage) <= stageOrder("MVP") ? earlyCount : lateCount;
}

export const PRODUCT_HEALTH = ["ON_TRACK", "AT_RISK", "BLOCKED", "COMPLETED"] as const;
export type ProductHealth = (typeof PRODUCT_HEALTH)[number];

export const PRODUCT_VISIBILITY = ["EVERYONE", "TEAMS", "ADMINS_ONLY"] as const;
export type ProductVisibility = (typeof PRODUCT_VISIBILITY)[number];

export const MILESTONE_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PARKED",
  "BLOCKED",
  "COMPLETED",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const GATE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PARKED",
  "NEEDS_REVISION",
  "CANCELLED",
] as const;
export type GateStatus = (typeof GATE_STATUSES)[number];

export const GATE_DECISIONS = ["APPROVED", "REJECTED", "PARKED", "CHANGES_REQUESTED"] as const;
export type GateDecision = (typeof GATE_DECISIONS)[number];

export const IDEA_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_CLARIFICATION",
  "ACCEPTED",
  "REJECTED",
  "CONVERTED",
  "APPROVED",
  "DELETED",
  "PARKED",
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const PRODUCT_STATUSES = ["ACTIVE", "PARKED", "REJECTED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ROLE_CODES = [
  "ADMIN",
  "EVALUATOR",
  "PEER_EVALUATOR",
  "PRODUCT_OWNER",
  "DEVELOPER",
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: "System Administrator",
  EVALUATOR: "Innovation Evaluator",
  PEER_EVALUATOR: "Peer Evaluator",
  PRODUCT_OWNER: "Product Owner",
  DEVELOPER: "Developer",
};

export const HEALTH_LABELS: Record<ProductHealth, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
};

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NEEDS_REVISION: "Needs revision",
  CANCELLED: "Cancelled",
  UNDER_REVIEW: "Under review",
  NEEDS_CLARIFICATION: "Needs clarification",
  ACCEPTED: "Accepted",
  CONVERTED: "Converted to product",
  DELETED: "Deleted",
  CHANGES_REQUESTED: "Changes requested",
  PARKED: "Parked",
  ACTIVE: "Active",
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  BLOCKED: "Blocked",
  EVERYONE: "Everyone",
  TEAMS: "Specific teams",
  ADMINS_ONLY: "Administrators only",
};

export const VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  EVERYONE: "Everyone",
  TEAMS: "Specific teams",
  ADMINS_ONLY: "Administrators only",
};
