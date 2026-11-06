import { Ban, Check, Circle, Clock, ExternalLink, Minus, Pause, Play } from "lucide-react";
import type { LifecycleStage, MilestoneDto, UserRef } from "@ims/shared";
import { LIFECYCLE_STAGES, stageLabel } from "@ims/shared";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { MilestoneStatusControl } from "./milestone-toggle";
import {
  AddMilestoneButton,
  DeleteMilestoneButton,
  EditMilestoneButton,
} from "./milestone-editor";

export function isOverdue(milestone: MilestoneDto) {
  return (
    (milestone.status === "NOT_STARTED" || milestone.status === "IN_PROGRESS") &&
    Boolean(milestone.dueDate) &&
    new Date(milestone.dueDate!).getTime() < Date.now()
  );
}

function StatusIcon({ milestone }: { milestone: MilestoneDto }) {
  if (milestone.status === "COMPLETED") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (milestone.status === "BLOCKED") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-white">
        <Ban className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (milestone.status === "PARKED") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning text-white">
        <Pause className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (milestone.status === "IN_PROGRESS") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary-soft">
        <span className="h-2 w-2 rounded-full bg-primary" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
      <Circle className="h-2.5 w-2.5 text-ink/20" />
    </span>
  );
}

export function MilestoneRow({
  milestone,
  productId,
  canManage = false,
  owners = [],
}: {
  milestone: MilestoneDto;
  productId?: string;
  canManage?: boolean;
  owners?: UserRef[];
}) {
  const overdue = isOverdue(milestone);
  const stage = milestone.stage as LifecycleStage;
  const hasTarget =
    milestone.targetValue !== null && milestone.targetValue !== undefined;
  const hasActual =
    milestone.actualValue !== null && milestone.actualValue !== undefined;
  return (
    <li className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <StatusIcon milestone={milestone} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              "text-[13px] font-medium",
              milestone.status === "COMPLETED" && "text-ink/55 line-through decoration-ink/20",
            )}
          >
            {milestone.title}
            {milestone.isRequired ? (
              <span
                className="ml-1 align-top text-[13px] font-bold text-[#9A6206]"
                title="Required milestone"
                aria-label="Required milestone"
              >
                *
              </span>
            ) : null}
          </p>
          {milestone.status === "NOT_STARTED" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.05] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
              <Circle className="h-2.5 w-2.5" /> Not started
            </span>
          ) : null}
          {milestone.status === "IN_PROGRESS" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              <Play className="h-2.5 w-2.5" /> In progress
            </span>
          ) : null}
          {milestone.status === "PARKED" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9A6206]">
              <Pause className="h-2.5 w-2.5" /> Parked
            </span>
          ) : null}
          {milestone.status === "BLOCKED" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-danger">
              <Ban className="h-2.5 w-2.5" /> Blocked
            </span>
          ) : null}
          {overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-danger">
              <Clock className="h-2.5 w-2.5" /> Overdue
            </span>
          ) : null}
        </div>
        {milestone.description ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {milestone.description}
          </p>
        ) : null}
        {milestone.statusReason ? (
          <p className="mt-1 text-[11px] italic leading-relaxed text-muted">
            {milestone.status === "BLOCKED" ? "Blocked — " : "Waiting on — "}
            {milestone.statusReason}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
          {milestone.owner ? (
            <span className="inline-flex items-center gap-1.5">
              <UserAvatar
                name={milestone.owner.name}
                src={milestone.owner.avatarUrl}
                className="h-4 w-4"
              />
              {milestone.owner.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted/70">
              <Minus className="h-3 w-3" /> No owner
            </span>
          )}
          <span className={overdue ? "font-semibold text-danger" : undefined}>
            Due {formatDate(milestone.dueDate)}
          </span>
          {milestone.weight !== 100 ? (
            <span>Weight {milestone.weight}%</span>
          ) : null}
          {hasTarget ? (
            <span>
              Target {milestone.targetValue}
              {milestone.unit ? ` ${milestone.unit}` : ""}
            </span>
          ) : null}
          {hasActual ? (
            <span>
              Actual {milestone.actualValue}
              {milestone.unit ? ` ${milestone.unit}` : ""}
            </span>
          ) : null}
          {milestone.status === "IN_PROGRESS" && milestone.startedAt ? (
            <span>In progress since {formatDate(milestone.startedAt)}</span>
          ) : null}
          {milestone.completedAt ? (
            <span>Completed {formatDate(milestone.completedAt)}</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 self-start">
        {canManage && productId ? (
          <div className="flex items-center gap-1">
            <MilestoneStatusControl productId={productId} milestone={milestone} />
            <EditMilestoneButton
              productId={productId}
              stage={stage}
              owners={owners}
              milestone={milestone}
            />
            {milestone.isStandard ? null : (
              <DeleteMilestoneButton
                productId={productId}
                milestone={milestone}
              />
            )}
          </div>
        ) : null}
        {milestone.evidenceLink ? (
          <a
            href={milestone.evidenceLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary-soft"
          >
            Evidence <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function ProductMilestones({
  milestones,
  currentStage,
  readOnly = false,
  productId,
  canManage = false,
  owners = [],
  locked = false,
}: {
  milestones: MilestoneDto[];
  currentStage: string;
  readOnly?: boolean;
  productId?: string;
  canManage?: boolean;
  owners?: UserRef[];
  locked?: boolean;
}) {
  const currentIndex = LIFECYCLE_STAGES.findIndex(
    (stage) => stage.key === currentStage,
  );
  const isSatisfied = (status: string) =>
    status === "COMPLETED" || status === "BLOCKED";
  const grouped = LIFECYCLE_STAGES.map((stage, index) => {
    const items = milestones.filter((milestone) => milestone.stage === stage.key);
    const completed = items.filter((m) => m.status === "COMPLETED").length;
    const doneCount = items.filter((m) => isSatisfied(m.status)).length;
    const weightTotal = items.reduce((sum, m) => sum + (m.weight || 0), 0);
    const weightDone = items
      .filter((m) => isSatisfied(m.status))
      .reduce((sum, m) => sum + (m.weight || 0), 0);
    const required = items.filter((milestone) => milestone.isRequired);
    const requiredCompleted = required.filter((m) =>
      isSatisfied(m.status),
    ).length;
    return {
      ...stage,
      items,
      completed,
      doneCount,
      weightTotal,
      weightDone,
      requiredTotal: required.length,
      requiredCompleted,
      isCurrent: stage.key === currentStage,
      isPast: index < currentIndex,
      editable: canManage && !locked && index >= currentIndex,
    };
  });

  return (
    <div className="space-y-3">
      {grouped.map((stage) => {
        const percent = stage.weightTotal
          ? Math.round((stage.weightDone / stage.weightTotal) * 100)
          : stage.items.length
            ? Math.round((stage.doneCount / stage.items.length) * 100)
            : 0;
        return (
          <details
            key={stage.key}
            open={stage.isCurrent}
            className={cn(
              "group rounded-[22px] border bg-surface [&_summary::-webkit-details-marker]:hidden",
              stage.isCurrent ? "border-primary/25 shadow-card" : "border-line",
            )}
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.accent }}
              />
              <span className="text-[13px] font-semibold">{stage.label}</span>
              {stage.isCurrent ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  Current stage
                </span>
              ) : null}
              {stage.isPast ? (
                <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                  Complete
                </span>
              ) : null}
              <span className="ml-auto text-[10px] font-medium text-muted">
                {stage.items.length
                  ? `${stage.requiredCompleted}/${stage.requiredTotal} required · ${stage.doneCount}/${stage.items.length} done`
                  : stage.editable
                    ? "No milestones yet — expand to add"
                    : "No milestones yet"}
              </span>
              {stage.items.length ? (
                <span className="hidden w-24 sm:block">
                  <Progress value={percent} />
                </span>
              ) : null}
            </summary>
            <div className="border-t border-line/70 px-4 py-2">
              {stage.items.length ? (
                <ul className="divide-y divide-line/60">
                  {stage.items.map((milestone) => (
                    <MilestoneRow
                      key={milestone.id}
                      milestone={milestone}
                      productId={productId}
                      canManage={stage.editable}
                      owners={owners}
                    />
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-[11px] leading-relaxed text-muted">
                  {stage.isPast
                    ? `No milestones were recorded for ${stage.label}.`
                    : stage.isCurrent
                      ? `No milestones yet. Add what this stage needs to prove before a gate submission.`
                      : `Nothing planned for ${stage.label} yet. You can add milestones to upcoming stages at any time.`}
                </p>
              )}
              {stage.editable && productId ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 py-2.5">
                  <p className="text-[10px] text-muted">
                    {locked
                      ? "Locked while a stage-gate request is pending."
                      : "Completing milestones never advances the stage on its own."}
                  </p>
                  <AddMilestoneButton
                    productId={productId}
                    stage={stage.key}
                    owners={owners}
                  />
                </div>
              ) : null}
              {!readOnly && locked && stage.editable === false && stage.isCurrent ? (
                <p className="pb-2 pt-2 text-[10px] text-muted">
                  Milestones are locked while a stage-gate request is pending.
                </p>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function currentStageGateReadiness(
  milestones: MilestoneDto[],
  stage: string,
  health: string,
) {
  const stageMilestones = milestones.filter((milestone) => milestone.stage === stage);
  const required = stageMilestones.filter((milestone) => milestone.isRequired);
  return [
    {
      label: stageMilestones.length
        ? `${stageMilestones.length} ${stageLabel(stage)} milestone${
            stageMilestones.length === 1 ? "" : "s"
          } defined`
        : `No milestones required for ${stageLabel(stage)} (optional)`,
      met: true,
    },
    {
      label: "All required milestones completed or blocked",
      met: required.every(
        (item) => item.status === "COMPLETED" || item.status === "BLOCKED",
      ),
    },
    {
      label: "No unresolved blocking conditions",
      met: health !== "BLOCKED",
    },
  ];
}
