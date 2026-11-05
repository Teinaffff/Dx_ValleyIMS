"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { IdeaStatus } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ActionKind = "approve" | "delete";

const PENDING = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_CLARIFICATION"];

const COPY: Record<
  ActionKind,
  { title: string; description: string; label: string; placeholder: string; confirm: string; busy: string }
> = {
  approve: {
    title: "Approve this idea?",
    description:
      "The idea moves to the approved tab and is recorded in the review history. You can add an optional note for the record.",
    label: "Review note (optional)",
    placeholder: "Why is this idea worth pursuing?",
    confirm: "Approve idea",
    busy: "Approving…",
  },
  delete: {
    title: "Delete this idea?",
    description:
      "The idea is soft-deleted: it disappears from the inbox but stays in the database so it can be restored later. Add an optional reason for the record.",
    label: "Reason (optional)",
    placeholder: "Why should this idea be removed?",
    confirm: "Delete idea",
    busy: "Deleting…",
  },
};

export function IdeaActions({
  ideaId,
  title,
  status,
  canApprove,
  canDelete,
  canRestore,
}: {
  ideaId: string;
  title: string;
  status: IdeaStatus;
  canApprove: boolean;
  canDelete: boolean;
  canRestore: boolean;
}) {
  const router = useRouter();
  const [action, setAction] = React.useState<ActionKind | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const deleted = status === "DELETED";
  const pending = PENDING.includes(status);

  function open(kind: ActionKind) {
    setNote("");
    setAction(kind);
  }

  async function confirm() {
    if (!action) return;
    setBusy(true);
    try {
      if (action === "approve") {
        await apiFetch(`/api/ideas/${ideaId}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "APPROVED",
            note: note.trim() || undefined,
          }),
        });
        toast.success(`“${title}” approved`);
      } else {
        await apiFetch(`/api/ideas/${ideaId}`, {
          method: "DELETE",
          body: JSON.stringify({ reason: note.trim() || undefined }),
        });
        toast.success(`“${title}” moved to deleted`);
      }
      setAction(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    try {
      await apiFetch(`/api/ideas/${ideaId}/restore`, { method: "POST" });
      toast.success(`“${title}” restored to the pending queue`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!canApprove && !canDelete && !canRestore) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {deleted && canRestore ? (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => void restore()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Restore
        </Button>
      ) : null}

      {!deleted && pending && canApprove ? (
        <Button type="button" size="md" onClick={() => open("approve")} disabled={busy}>
          <Check className="h-4 w-4" /> Approve
        </Button>
      ) : null}

      {!deleted && canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="text-danger hover:bg-danger/[0.06] hover:text-danger"
          onClick={() => open("delete")}
          disabled={busy}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      ) : null}

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!busy && !open) setAction(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {action ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {action === "approve" ? "Approve" : "Delete"} “{title}”?
                </DialogTitle>
                <DialogDescription>{COPY[action].description}</DialogDescription>
              </DialogHeader>

              <Field label={COPY[action].label}>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={COPY[action].placeholder}
                  maxLength={action === "approve" ? 1000 : 500}
                  disabled={busy}
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setAction(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={action === "delete" ? "danger" : "primary"}
                  size="md"
                  onClick={() => void confirm()}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? COPY[action].busy : COPY[action].confirm}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
