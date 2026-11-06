"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  gateSubmitSchema,
  stageLabel,
  type GateRequestSummary,
  type GateSubmissionState,
  type GateSubmitInput,
  type UserRef,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function PolicyChips({ state }: { state: GateSubmissionState }) {
  const needed = state.eligibleApprovers.length;
  const chips = needed
    ? [
        `${needed} evaluator approval${needed === 1 ? "" : "s"} needed`,
        "Any one rejection closes the gate",
      ]
    : ["No further gate"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-ink/70"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function ApproverList({ approvers }: { approvers: UserRef[] }) {
  if (!approvers.length) {
    return (
      <p className="text-[11px] text-danger">
        No eligible approvers are configured. Ask an administrator to assign a
        reviewer with gate.decide.
      </p>
    );
  }
  return (
    <p className="text-[11px] text-muted">
      Notified reviewers:{" "}
      <span className="font-medium text-ink/75">
        {approvers.map((approver) => approver.name).join(", ")}
      </span>
    </p>
  );
}

function SubmitGateDialog({
  open,
  onOpenChange,
  productId,
  productName,
  state,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  state: GateSubmissionState;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<GateSubmitInput>({
    resolver: zodResolver(gateSubmitSchema),
    defaultValues: { note: "" },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ note: "" });
      setError(null);
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/products/${productId}/gate`, {
        method: "POST",
        body: JSON.stringify({ note: values.note || undefined }),
      });
      toast.success(`${productName} submitted for ${stageLabel(state.nextStage!)} review`);
      onOpenChange(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not submit this stage gate. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  const ready = state.canSubmit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="label-caps">Stage gate</p>
          <DialogTitle>
            Submit for {state.nextStage ? stageLabel(state.nextStage) : "review"}
          </DialogTitle>
          <DialogDescription>
            The API verifies readiness, notifies independent reviewers and records an
            immutable snapshot of this stage. Any authorised evaluator can then approve,
            park or reject it. Completing milestones alone never advances a product.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-[18px] border border-line bg-canvas/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Readiness
              </p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                  ready
                    ? "bg-accent/10 text-accent-strong"
                    : "bg-warning/15 text-[#9A6206]",
                )}
              >
                {ready ? "Ready" : "Not ready"}
              </span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {state.checks.map((check) => (
                <li key={check.key} className="flex items-start gap-2.5 text-[12px]">
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

          <div className="space-y-2">
            <PolicyChips state={state} />
            <ApproverList approvers={state.eligibleApprovers} />
          </div>

          <Field label="Note for approvers (optional)">
            <Textarea
              placeholder="Share context that helps reviewers decide."
              className="min-h-20"
              {...form.register("note")}
            />
          </Field>

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
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !ready}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit for review
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GateSubmitButton({
  productId,
  productName,
  state,
  canSubmit,
}: {
  productId: string;
  productName: string;
  state: GateSubmissionState;
  canSubmit: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  if (!state.nextStage) return null;

  if (state.pendingRequest) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-2xl bg-warning/15 px-3.5 py-2.5 text-[12px] font-semibold text-[#9A6206]">
        <Clock className="h-3.5 w-3.5" />
        Awaiting {stageLabel(state.pendingRequest.toStage)} approval
      </span>
    );
  }

  if (!canSubmit) {
    return (
      <Button
        type="button"
        size="md"
        variant="outline"
        disabled
        title="Only the product owner can submit a stage gate for approval."
      >
        <ShieldCheck className="h-4 w-4" /> Submit for {stageLabel(state.nextStage)}
      </Button>
    );
  }

  return (
    <>
      <Button type="button" size="md" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" /> Submit for {stageLabel(state.nextStage)}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <SubmitGateDialog
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        productName={productName}
        state={state}
      />
    </>
  );
}

export function GatePendingSummary({
  request,
}: {
  request: GateRequestSummary;
}) {
  return (
    <div className="mt-4 rounded-[16px] border border-warning/20 bg-warning/[0.06] p-3.5">
      <p className="text-[11px] font-semibold text-[#9A6206]">
        Submitted for {stageLabel(request.toStage)} review
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted">
        Round {request.round} · {request.approvalsReceived}/{request.approvalsNeeded}{" "}
        evaluator approvals in · {request.approvers.length} reviewer
        {request.approvers.length === 1 ? "" : "s"} notified.
      </p>
    </div>
  );
}
