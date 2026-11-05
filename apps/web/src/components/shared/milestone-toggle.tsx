"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { MilestoneDto } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MilestoneToggle({
  productId,
  milestone,
}: {
  productId: string;
  milestone: MilestoneDto;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const completed = milestone.status === "COMPLETED";

  async function toggle() {
    setSaving(true);
    try {
      await apiFetch(
        `/api/products/${productId}/milestones/${milestone.id}/${
          completed ? "reopen" : "complete"
        }`,
        {
          method: "POST",
          body: completed ? undefined : JSON.stringify({}),
        },
      );
      toast.success(
        completed
          ? `Reopened ${milestone.title}`
          : `Completed ${milestone.title}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not update this milestone. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition disabled:opacity-60",
        completed
          ? "bg-canvas text-muted hover:bg-canvas/70 hover:text-ink"
          : "bg-success/10 text-success hover:bg-success/20",
      )}
      aria-label={completed ? "Reopen milestone" : "Mark milestone complete"}
    >
      {saving ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : completed ? (
        <RotateCcw className="h-2.5 w-2.5" />
      ) : (
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      )}
      {completed ? "Reopen" : "Complete"}
    </button>
  );
}
