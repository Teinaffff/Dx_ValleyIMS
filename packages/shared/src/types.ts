import type {
  GateStatus,
  IdeaStatus,
  LifecycleStage,
  MilestoneStatus,
  ProductHealth,
  ProductVisibility,
  RoleCode,
} from "./lifecycle";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  avatarUrl: string | null;
  role: RoleCode;
  roleLabel: string;
  permissions: string[];
  teamIds: string[];
  isActive: boolean;
}

export interface UserRef {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface TeamRef {
  id: string;
  name: string;
  description?: string | null;
}

// Developers belong to the developer groups (AI, Platform, Payment, Integration).
// Every other role (product owner, evaluator, admin) belongs to the Products team.
export const PRODUCTS_TEAM_NAME = "Products";

export function isProductsTeam(name: string): boolean {
  return name.trim().toLowerCase() === PRODUCTS_TEAM_NAME.toLowerCase();
}

export function teamsForRole<T extends TeamRef>(teams: T[], role: RoleCode): T[] {
  if (role === "DEVELOPER") return teams.filter((team) => !isProductsTeam(team.name));
  return teams.filter((team) => isProductsTeam(team.name));
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  productCount: number;
  members: UserRef[];
  products: { id: string; name: string; slug: string; stage: string }[];
  createdAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: RoleCode;
  roleLabel: string;
  isActive: boolean;
  teams: TeamRef[];
  ownedProductCount: number;
  createdAt: string;
}

export interface MilestoneProgress {
  completed: number;
  total: number;
  requiredTotal: number;
  requiredCompleted: number;
  weightTotal: number;
  weightDone: number;
  percent: number;
}

export interface MilestoneDto {
  id: string;
  stage: LifecycleStage;
  title: string;
  description: string | null;
  isRequired: boolean;
  isStandard: boolean;
  weight: number;
  status: MilestoneStatus;
  statusReason: string | null;
  startedAt: string | null;
  owner: UserRef | null;
  dueDate: string | null;
  evidenceLink: string | null;
  targetValue: number | null;
  actualValue: number | null;
  unit: string | null;
  completedAt: string | null;
  completedBy: UserRef | null;
  sortOrder: number;
}

export interface StageHistoryDto {
  id: string;
  fromStage: LifecycleStage | null;
  toStage: LifecycleStage;
  movedBy: UserRef | null;
  reason: string | null;
  createdAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: UserRef;
  team: TeamRef | null;
  teams: TeamRef[];
  stage: LifecycleStage;
  health: ProductHealth;
  visibility: ProductVisibility;
  businessArea: string | null;
  isArchived: boolean;
  milestoneProgress: MilestoneProgress;
  lastUpdated: string;
  createdAt: string;
}

export interface ProductDetail extends ProductListItem {
  targetUsers: string | null;
  expectedImpact: string | null;
  launchTarget: string | null;
  visibilityTeamIds: string[];
  createdBy: UserRef | null;
  members: ProductMemberRef[];
  milestones: MilestoneDto[];
  stageHistory: StageHistoryDto[];
  currentStageEnteredAt: string | null;
  latestGateStatus: GateStatus | null;
  idea: { id: string; title: string; status: IdeaStatus } | null;
}

// A person on a product's delivery roster. Developers are recorded here and can
// own milestones, but they have no portal access of their own.
export interface ProductMemberRef {
  id: string;
  name: string;
  email: string;
  title: string | null;
  avatarUrl: string | null;
  role: RoleCode;
  roleLabel: string;
  teams: TeamRef[];
  addedAt: string;
  addedBy: { id: string; name: string } | null;
}

// A person who can still be added to a product's roster (active, not yet a member).
export interface RosterCandidate {
  id: string;
  name: string;
  email: string;
  title: string | null;
  avatarUrl: string | null;
  role: RoleCode;
  roleLabel: string;
  teams: TeamRef[];
}

// Bulk developer registration (CSV / Excel import).
export type ImportRowStatus = "new" | "duplicate" | "unknown_team" | "invalid";

export interface ImportPreviewRow {
  index: number;
  name: string;
  email: string;
  title: string | null;
  team: string | null;
  status: ImportRowStatus;
  reasons: string[];
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  counts: {
    total: number;
    new: number;
    duplicate: number;
    unknownTeam: number;
    invalid: number;
  };
  teams: TeamRef[];
  fileName: string;
  truncated: boolean;
}

export interface ImportCommitRow {
  name: string;
  email: string;
  title?: string | null;
  team?: string | null;
}

export interface ImportCommitResult {
  created: { name: string; email: string; team: string | null }[];
  skipped: { email: string; reason: string }[];
  counts: { created: number; skipped: number };
}

export interface ProductListResult {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ApprovalApprover {
  id: string;
  user: UserRef;
  decision: "APPROVED" | "REJECTED" | "PARKED" | "CHANGES_REQUESTED" | null;
  decidedAt: string | null;
  comment: string | null;
}

export interface ApprovalItem {
  id: string;
  status: GateStatus;
  product: {
    id: string;
    name: string;
    owner: UserRef;
  };
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  submittedAt: string;
  approvers: ApprovalApprover[];
  approvalsNeeded: number;
  approvalsReceived: number;
  approvalPolicy: string;
}

export interface GatePolicy {
  mode: "UNANIMOUS" | "MAJORITY";
  approverCount: number;
  earlyCount: number;
  lateCount: number;
  allowSelfApproval: boolean;
  rejectionRequiresReason: boolean;
}

export interface GateCheck {
  key: string;
  label: string;
  met: boolean;
  detail: string | null;
}

export interface GateRequestSummary {
  id: string;
  status: GateStatus;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  submittedAt: string;
  submittedBy: UserRef;
  note: string | null;
  round: number;
  approvers: ApprovalApprover[];
  approvalsNeeded: number;
  approvalsReceived: number;
  policy: GatePolicy;
}

export interface GateSubmissionState {
  nextStage: LifecycleStage | null;
  checks: GateCheck[];
  canSubmit: boolean;
  policy: GatePolicy;
  eligibleApprovers: UserRef[];
  pendingRequest: GateRequestSummary | null;
  latestRequest: GateRequestSummary | null;
}

export interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  helper: string;
  tone: "blue" | "navy" | "orange" | "amber" | "rose" | "violet";
}

export interface PipelineStageStat {
  stage: LifecycleStage;
  label: string;
  count: number;
  accent: string;
}

export interface DashboardData {
  kpis: Kpi[];
  pipeline: PipelineStageStat[];
  products: ProductListItem[];
  approvals: ApprovalItem[];
  activities: ActivityItem[];
}

export interface CategoryMeta {
  owners: UserRef[];
  teams: TeamRef[];
}

export interface PublicProductListItem extends ProductListItem {
  team: TeamRef | null;
  timeInStageDays: number;
}

export interface PublicProductDetail extends ProductDetail {
  timeInStageDays: number;
  updates: { id: string; title: string; body: string; createdAt: string }[];
  followerCount: number;
  contactEmail: string | null;
}

export interface PublicChallenge {
  id: string;
  title: string;
  slug: string;
  description: string;
  problemStatement: string;
  eligibility: string | null;
  evaluationCriteria: string | null;
  submissionRequirements: string | null;
  startDate: string;
  deadline: string;
  daysLeft: number;
  isOpen: boolean;
  submissionCount: number;
}

export interface PublicPortfolio {
  products: PublicProductListItem[];
  stages: { stage: LifecycleStage; label: string; count: number; summary: string; accent: string }[];
  stats: {
    totalProducts: number;
    activeTeams: number;
    inPilotOrBeyond: number;
    monetized: number;
  };
}

export type IdeaAttachmentKind = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";

export interface IdeaAttachmentRef {
  id: string;
  kind: IdeaAttachmentKind;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface IdeaInboxItem {
  id: string;
  reference: string;
  title: string;
  problem: string;
  solution: string;
  expectedImpact: string | null;
  attachments: IdeaAttachmentRef[];
  status: IdeaStatus;
  submitter: {
    name: string;
    email: string | null;
    jobTitle: string | null;
    accountId: string | null;
  };
  reviewNote: string | null;
  deleteReason: string | null;
  reviewedBy: UserRef | null;
  convertedProductId: string | null;
  approvedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface IdeaStatusCounts {
  all: number;
  pending: number;
  approved: number;
  deleted: number;
}

export interface IdeaInboxResult {
  items: IdeaInboxItem[];
  counts: IdeaStatusCounts;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unreadCount: number;
}

export type GlobalSearchGroup = "products" | "ideas" | "teams" | "people";

export interface GlobalSearchItem {
  id: string;
  label: string;
  detail: string | null;
  meta: string | null;
  href: string;
}

export interface GlobalSearchResults {
  query: string;
  total: number;
  groups: { group: GlobalSearchGroup; label: string; items: GlobalSearchItem[] }[];
}
