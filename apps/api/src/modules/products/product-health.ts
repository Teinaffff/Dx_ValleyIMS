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

export function milestoneProgress(
  milestones: { stage: LifecycleStage; isRequired: boolean; status: MilestoneStatus }[],
  stage: LifecycleStage,
) {
  const current = milestones.filter((milestone) => milestone.stage === stage);
  const required = current.filter((milestone) => milestone.isRequired);
  const completed = current.filter((milestone) => milestone.status === "COMPLETED");
  const requiredCompleted = required.filter(
    (milestone) => milestone.status === "COMPLETED",
  );
  return {
    completed: completed.length,
    total: current.length,
    requiredTotal: required.length,
    requiredCompleted: requiredCompleted.length,
    percent: current.length
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
    required.every((milestone) => milestone.status === "COMPLETED")
  ) {
    return "COMPLETED";
  }

  if (
    latestGateStatus === "NEEDS_REVISION" ||
    latestGateStatus === "REJECTED"
  ) {
    return "BLOCKED";
  }

  const overdue = required.filter(
    (milestone) =>
      milestone.status !== "COMPLETED" &&
      milestone.dueDate !== null &&
      milestone.dueDate.getTime() < now.getTime(),
  );

  if (overdue.some((milestone) => now.getTime() - (milestone.dueDate?.getTime() ?? 0) > 7 * DAY)) {
    return "BLOCKED";
  }

  if (overdue.length > 0) return "AT_RISK";

  const dueSoon = required.filter(
    (milestone) =>
      milestone.status !== "COMPLETED" &&
      milestone.dueDate !== null &&
      milestone.dueDate.getTime() >= now.getTime() &&
      milestone.dueDate.getTime() - now.getTime() <= 3 * DAY,
  );

  if (dueSoon.length > 0) return "AT_RISK";

  return "ON_TRACK";
}
