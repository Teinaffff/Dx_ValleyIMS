"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import type { MilestoneDto } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Action = "IN_PROGRESS" | "COMPLETED" | "PARKED" | "BLOCKED" | "REOPEN";

export function MilestoneStatusControl({
  productId,
  milestone,
}: {
  productId: string;
  milestone: MilestoneDto;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Completed and blocked milestones are final — no status control offered.
  if (milestone.status === "COMPLETED" || milestone.status === "BLOCKED") {
    return null;
  }

  async function submit(action: Action) {
    const needsReason = action === "PARKED" || action === "BLOCKED";
    if (needsReason && reason.trim().length < 2) {
      setError(
        action === "PARKED"
          ? "Add a short note about what this is waiting on."
          : "A reason is required to block this milestone.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (action === "REOPEN") {
        await apiFetch(
          `/api/products/${productId}/milestones/${milestone.id}/reopen`,
          { method: "POST" },
        );
        toast.success(`Reopened ${milestone.title}`);
      } else {
        await apiFetch(
          `/api/products/${productId}/milestones/${milestone.id}/status`,
          {
            method: "POST",
            body: JSON.stringify({ status: action, reason: reason.trim() }),
          },
        );
        toast.success(
          action === "COMPLETED"
            ? `Completed ${milestone.title}`
            : action === "IN_PROGRESS"
              ? `Started ${milestone.title}`
              : action === "PARKED"
                ? `Parked ${milestone.title}`
                : `Blocked ${milestone.title}`,
        );
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Could not update this milestone. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const parked = milestone.status === "PARKED";
  const notStarted = milestone.status === "NOT_STARTED";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason(parked ? milestone.statusReason ?? "" : "");
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-ink/70 transition hover:bg-primary-soft hover:text-primary"
        aria-label="Update milestone status"
      >
        <Tag className="h-2.5 w-2.5" /> Status
      </button>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <p className="label-caps">{milestone.title}</p>
            <DialogTitle>Update status</DialogTitle>
            <DialogDescription>
              Start it when work begins, complete it, park it while you wait on
              something, or block it with a reason. Parked milestones can be
              reopened later; blocked ones are final.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold text-ink/70">
                Reason <span className="font-normal text-muted">(required to park or block)</span>
              </span>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Waiting on the vendor contract to be signed"
                className="min-h-20"
                disabled={saving}
              />
            </label>

            {error ? (
              <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {parked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => submit("REOPEN")}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Reopen
                </Button>
              ) : null}
              {notStarted ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => submit("IN_PROGRESS")}
                >
                  <Play className="h-3.5 w-3.5" /> Start
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                className="text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => submit("BLOCKED")}
              >
                <Ban className="h-3.5 w-3.5" /> Block
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => submit("PARKED")}
              >
                <Pause className="h-3.5 w-3.5" /> Park
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => submit("COMPLETED")}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
                Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
