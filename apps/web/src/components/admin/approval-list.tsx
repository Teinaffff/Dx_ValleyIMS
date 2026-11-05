"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { ApprovalItem } from "@ims/shared";
import { stageLabel } from "@ims/shared";
import { formatDate } from "@/lib/format";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GateDecisionButton } from "@/components/admin/gate-decision-dialog";

export function ApprovalList({
  approvals,
  emptyMessage = "No stage gates are waiting for a decision.",
  showReviewLink = true,
  viewerId = null,
  canDecide = false,
}: {
  approvals: ApprovalItem[];
  emptyMessage?: string;
  showReviewLink?: boolean;
  viewerId?: string | null;
  canDecide?: boolean;
}) {
  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[22px] border border-dashed border-line px-6 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium">{emptyMessage}</p>
        <p className="text-xs text-muted">The portfolio is fully unblocked.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/70">
      {approvals.map((approval) => {
        const reviewers = approval.approvers.length;
        const isOwner = viewerId !== null && approval.product.owner.id === viewerId;

        return (
          <li
            key={approval.id}
            className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/products/${approval.product.id}`}
                  className="block truncate text-sm font-semibold hover:text-primary"
                >
                  {approval.product.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="rounded-full bg-soft px-2 py-0.5 font-medium">
                    {stageLabel(approval.fromStage)}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">
                    {stageLabel(approval.toStage)}
                  </span>
                  <span className="text-muted/70">·</span>
                  <span>{formatDate(approval.submittedAt)}</span>
                </div>
              </div>
              <div className="flex -space-x-2">
                {approval.approvers.map((approver) => (
                  <UserAvatar
                    key={approver.id}
                    name={approver.user.name}
                    src={approver.user.avatarUrl}
                    className="h-7 w-7 ring-2 ring-white"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-muted">
              <span className="rounded-full bg-warning/10 px-2 py-0.5 uppercase tracking-wide text-[#9A6206]">
                Awaiting decision
              </span>
              <span>
                {reviewers} reviewer{reviewers === 1 ? "" : "s"} notified
              </span>
              <span className="text-muted/60">·</span>
              <span className="font-medium">{approval.approvalPolicy}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <UserAvatar
                  name={approval.product.owner.name}
                  src={approval.product.owner.avatarUrl}
                  className="h-5 w-5"
                />
                <span className="truncate">Owner: {approval.product.owner.name}</span>
              </div>
              {canDecide && !isOwner ? (
                <GateDecisionButton approval={approval} />
              ) : showReviewLink ? (
                <Button asChild size="sm" variant="secondary" className="h-8 px-3 text-[11px]">
                  <Link href={`/admin/approvals?request=${approval.id}`}>
                    Review <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="h-8 px-3 text-[11px]">
                  <Link href={`/admin/products/${approval.product.id}`}>
                    View product <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
