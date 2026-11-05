"use client";

import {
  BadgeCheck,
  FileCheck2,
  GitBranch,
  Lightbulb,
  ListChecks,
  PencilLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ActivityItem } from "@ims/shared";
import { relativeTime } from "@/lib/format";

function activityIcon(action: string) {
  if (action.includes("gate")) return BadgeCheck;
  if (action.includes("stage")) return GitBranch;
  if (action.includes("milestone")) return ListChecks;
  if (action.includes("idea")) return Lightbulb;
  if (action.includes("product.created")) return Sparkles;
  if (action.includes("product")) return PencilLine;
  if (action.includes("audit")) return ShieldCheck;
  return FileCheck2;
}

const toneByAction = (action: string) => {
  if (action.includes("approved")) return "bg-success/10 text-success";
  if (action.includes("rejected")) return "bg-danger/10 text-danger";
  return "bg-soft-strong text-ink/45";
};

export function ActivityFeed({
  activities,
  className,
}: {
  activities: ActivityItem[];
  className?: string;
}) {
  if (activities.length === 0) {
    return (
      <p className="rounded-[20px] border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
        Activity will appear here as the portfolio moves.
      </p>
    );
  }

  return (
    <ol className={className}>
      {activities.map((activity, index) => {
        const Icon = activityIcon(activity.action);
        return (
          <li key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < activities.length - 1 ? (
              <span className="absolute left-[17px] top-10 h-[calc(100%-2.75rem)] w-px bg-line" />
            ) : null}
            <span
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ${toneByAction(
                activity.action,
              )}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[13px] leading-snug">
                <span className="font-semibold">{activity.actorName}</span>{" "}
                <span className="text-ink/65">
                  {activity.summary.charAt(0).toLowerCase() + activity.summary.slice(1)}
                </span>
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                {relativeTime(activity.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
