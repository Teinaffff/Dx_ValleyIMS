"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Pause,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  stageLabel,
  type ApprovalItem,
  type GateRequestSummary,
  type GateSubmissionState,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Decision = "APPROVED" | "REJECTED" | "PARKED";

function DecisionDialog({
  approval,
  open,
  onOpenChange,
}: {
  approval: ApprovalItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<GateSubmissionState | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<Decision | null>(null);
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setState(null);
      setComment("");
      setError(null);
      setSubmitting(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiFetch<GateSubmissionState>(`/api/products/${approval.product.id}/gate`)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "We could not load this stage-gate request.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, approval.product.id]);

  const pending = state?.pendingRequest ?? null;

  const decide = async (decision: Decision) => {
    if (decision === "REJECTED" && !comment.trim()) {
      setError("A rejection requires a written reason.");
      return;
    }

    setSubmitting(decision);
    setError(null);
    try {
      const result = await apiFetch<GateRequestSummary>(
        `/api/products/${approval.product.id}/gate/decision`,
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            comment: comment.trim() || undefined,
          }),
        },
      );
      if (decision === "APPROVED") {
        const remaining = Math.max(
          0,
          result.approvalsNeeded - result.approvalsReceived,
        );
        toast.success(
          result.status === "APPROVED"
            ? `${approval.product.name} approved — moved to ${stageLabel(approval.toStage)} (${result.approvalsNeeded}/${result.approvalsNeeded} evaluators)`
            : `Approval recorded — ${remaining} more evaluator${remaining === 1 ? "" : "s"} needed (${result.approvalsReceived}/${result.approvalsNeeded})`,
        );
      } else if (decision === "REJECTED") {
        toast.success(
          `${approval.product.name} rejected — stays in ${stageLabel(approval.fromStage)}`,
        );
      } else {
        toast.success(
          `${approval.product.name} parked at ${stageLabel(approval.fromStage)}`,
        );
      }
      onOpenChange(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not record this decision. Please try again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="label-caps">Stage gate decision</p>
          <DialogTitle>{approval.product.name}</DialogTitle>
          <DialogDescription>
            This gate needs several independent evaluator approvals. Your approval is
            recorded and the product only advances once enough evaluators have approved;
            a single rejection closes the gate immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className="rounded-full bg-soft px-2.5 py-1">
            {stageLabel(approval.fromStage)}
          </span>
          <ArrowRight className="h-3 w-3 text-muted" />
          <span className="rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
            {stageLabel(approval.toStage)}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-[18px] border border-line p-4 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the submitted
            snapshot…
          </div>
        ) : null}

        {!loading && !pending && !error ? (
          <p className="rounded-[18px] border border-line p-4 text-xs text-muted">
            This request is no longer awaiting a decision. Refresh the queue to see the
            latest state.
          </p>
        ) : null}

        {pending ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <span className="rounded-full bg-soft px-2 py-0.5 font-medium">
                Round {pending.round}
              </span>
              <span>
                Submitted by {pending.submittedBy.name} on{" "}
                {formatDate(pending.submittedAt)}
              </span>
              <span className="text-muted/60">·</span>
              <span>{pending.approvers.length} reviewers notified</span>
              <span className="text-muted/60">·</span>
              <span className="font-semibold text-ink/75">
                {pending.approvalsReceived}/{pending.approvalsNeeded} approved
              </span>
            </div>

            {pending.note ? (
              <div className="rounded-[16px] bg-canvas/60 p-3.5 text-[12px] leading-relaxed text-ink/75">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
                  Owner note
                </p>
                {pending.note}
              </div>
            ) : null}

            <div className="rounded-[18px] border border-line bg-canvas/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Readiness
              </p>
              <ul className="mt-3 space-y-2.5">
                {(state?.checks ?? [])
                  .filter((check) => check.key !== "pending")
                  .map((check) => (
                  <li
                    key={check.key}
                    className="flex items-start gap-2.5 text-[12px]"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        check.met
                          ? "bg-accent text-white"
                          : "bg-white text-ink/30 ring-1 ring-line",
                      )}
                    >
                      {check.met ? (
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      ) : (
                        <X className="h-2.5 w-2.5" strokeWidth={3} />
                      )}
                    </span>
                    <span className={check.met ? "text-ink/75" : "text-ink/45"}>
                      {check.label}
                      {check.detail ? (
                        <span className="mt-0.5 block text-[10px] text-muted">
                          {check.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pending.approvers.map((approver) => (
                <span
                  key={approver.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-soft py-1 pl-1 pr-2.5 text-[10px] font-medium text-ink/70"
                >
                  <UserAvatar
                    name={approver.user.name}
                    src={approver.user.avatarUrl}
                    className="h-5 w-5"
                  />
                  {approver.user.name}
                </span>
              ))}
            </div>

            <div>
              <label
                htmlFor="gate-decision-comment"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
              >
                Decision note {pending.policy.rejectionRequiresReason ? "(required to reject)" : ""}
              </label>
              <Textarea
                id="gate-decision-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain your decision — this is stored in the immutable audit trail."
                className="min-h-20"
                maxLength={2000}
              />
            </div>
          </>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(submitting)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => decide("PARKED")}
            disabled={!pending || Boolean(submitting)}
          >
            {submitting === "PARKED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            Park
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => decide("REJECTED")}
            disabled={!pending || Boolean(submitting)}
          >
            {submitting === "REJECTED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Reject
          </Button>
          <Button
            type="button"
            onClick={() => decide("APPROVED")}
            disabled={!pending || Boolean(submitting)}
          >
            {submitting === "APPROVED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GateDecisionButton({ approval }: { approval: ApprovalItem }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8 px-3 text-[11px]"
        onClick={() => setOpen(true)}
      >
        <Clock className="h-3 w-3" /> Review &amp; decide
      </Button>
      <DecisionDialog approval={approval} open={open} onOpenChange={setOpen} />
    </>
  );
}
