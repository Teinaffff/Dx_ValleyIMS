import {
  GateStatus,
  LifecycleStage,
  MilestoneStatus,
  ProductHealth,
} from "@prisma/client";

const DAY = 86_400_000;

interface HealthMilestone {
  stage: LifecycleStage;
  isRequired: boolean;
  status: MilestoneStatus;
  dueDate: Date | null;
}

interface ProgressMilestone extends HealthMilestone {
  weight: number;
}

// A milestone is "done" for gate/progress purposes when it is COMPLETED, or
// BLOCKED with a reason (a documented dead-end that no longer gates the stage).
function isSatisfied(status: MilestoneStatus) {
  return status === "COMPLETED" || status === "BLOCKED";
}

export function milestoneProgress(
  milestones: ProgressMilestone[],
  stage: LifecycleStage,
) {
  const current = milestones.filter((milestone) => milestone.stage === stage);
  const required = current.filter((milestone) => milestone.isRequired);
  const completed = current.filter(
    (milestone) => milestone.status === "COMPLETED",
  );
  const requiredCompleted = required.filter(
    (milestone) => milestone.status === "COMPLETED",
  );
  const weightTotal = current.reduce(
    (sum, milestone) => sum + (milestone.weight || 0),
    0,
  );
  const weightDone = current
    .filter((milestone) => isSatisfied(milestone.status))
    .reduce((sum, milestone) => sum + (milestone.weight || 0), 0);
  return {
    completed: completed.length,
    total: current.length,
    requiredTotal: required.length,
    requiredCompleted: requiredCompleted.length,
    weightTotal,
    weightDone,
    percent: weightTotal
      ? Math.round((weightDone / weightTotal) * 100)
      : current.length
        ? Math.round((completed.length / current.length) * 100)
        : 0,
  };
}

export function computeHealth(
  stage: LifecycleStage,
  milestones: HealthMilestone[],
  latestGateStatus?: GateStatus | null,
  now = new Date(),
): ProductHealth {
  const current = milestones.filter((milestone) => milestone.stage === stage);
  const required = current.filter((milestone) => milestone.isRequired);

  if (
    stage === "MONETIZATION" &&
    required.length > 0 &&
    required.every((milestone) => isSatisfied(milestone.status))
  ) {
    return "COMPLETED";
  }

  if (
    latestGateStatus === "NEEDS_REVISION" ||
    latestGateStatus === "REJECTED"
  ) {
    return "BLOCKED";
  }

  // Only actively-pending work (not started / in progress) can go overdue.
  // Parked and blocked milestones are documented states and never counted here.
  const pending = required.filter(
    (milestone) =>
      milestone.status === "NOT_STARTED" || milestone.status === "IN_PROGRESS",
  );

  const overdue = pending.filter(
    (milestone) =>
      milestone.dueDate !== null && milestone.dueDate.getTime() < now.getTime(),
  );

  if (overdue.some((milestone) => now.getTime() - (milestone.dueDate?.getTime() ?? 0) > 7 * DAY)) {
    return "BLOCKED";
  }

  if (overdue.length > 0) return "AT_RISK";

  const dueSoon = pending.filter(
    (milestone) =>
      milestone.dueDate !== null &&
      milestone.dueDate.getTime() >= now.getTime() &&
      milestone.dueDate.getTime() - now.getTime() <= 3 * DAY,
  );

  if (dueSoon.length > 0) return "AT_RISK";

  return "ON_TRACK";
}
