import * as React from "react";
import {
  HEALTH_LABELS,
  LIFECYCLE_STAGES,
  ProductHealth,
  STATUS_LABELS,
} from "@ims/shared";
import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  APPROVED: "bg-success/10 text-success",
  COMPLETED: "bg-success/10 text-success",
  ON_TRACK: "bg-success/10 text-success",
  PENDING_APPROVAL: "bg-warning/15 text-[#9A6206]",
  SUBMITTED: "bg-primary-soft text-primary",
  IN_PROGRESS: "bg-primary-soft text-primary",
  UNDER_REVIEW: "bg-soft text-ink/60",
  DRAFT: "bg-ink/[0.06] text-ink/60",
  NOT_STARTED: "bg-ink/[0.05] text-ink/50",
  AT_RISK: "bg-warning/15 text-[#9A6206]",
  NEEDS_REVISION: "bg-warning/15 text-[#9A6206]",
  NEEDS_CLARIFICATION: "bg-warning/15 text-[#9A6206]",
  CHANGES_REQUESTED: "bg-warning/15 text-[#9A6206]",
  REJECTED: "bg-danger/10 text-danger",
  BLOCKED: "bg-danger/10 text-danger",
  ACCEPTED: "bg-success/10 text-success",
  CONVERTED: "bg-primary-soft text-primary",
};

export function StageBadge({
  stage,
  className,
  showDot = true,
}: {
  stage: string;
  className?: string;
  showDot?: boolean;
}) {
  const meta = LIFECYCLE_STAGES.find((item) => item.key === stage);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1 text-[11px] font-semibold text-ink/65",
        className,
      )}
    >
      {showDot ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
      {meta?.label ?? stage}
    </span>
  );
}

export function HealthBadge({
  health,
  className,
}: {
  health: ProductHealth;
  className?: string;
}) {
  const tone =
    health === "ON_TRACK"
      ? "bg-success/10 text-success"
      : health === "AT_RISK"
        ? "bg-warning/15 text-[#9A6206]"
        : health === "BLOCKED"
          ? "bg-danger/10 text-danger"
          : "bg-primary-soft text-primary";
  const dot =
    health === "ON_TRACK"
      ? "bg-success"
      : health === "AT_RISK"
        ? "bg-warning"
        : health === "BLOCKED"
          ? "bg-danger"
          : "bg-primary";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {HEALTH_LABELS[health]}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        statusTone[status] ?? "bg-ink/[0.05] text-ink/60",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

export function CounterBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}
