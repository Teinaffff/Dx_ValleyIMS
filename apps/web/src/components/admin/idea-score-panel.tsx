"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import type { IdeaScoring } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
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

const DIMENSIONS = [
  {
    key: "impact",
    label: "Impact",
    hint: "How much would it change things for customers, teams or the bank?",
  },
  {
    key: "feasibility",
    label: "Feasibility",
    hint: "How realistic is it to build and run with what we have?",
  },
  {
    key: "strategicFit",
    label: "Strategic fit",
    hint: "How well does it support the bank's priorities?",
  },
] as const;

type Key = (typeof DIMENSIONS)[number]["key"];
const SCALE = ["Very low", "Low", "Medium", "High", "Very high"];

export function IdeaScorePanel({
  ideaId,
  title,
  scoring,
  canScore,
}: {
  ideaId: string;
  title: string;
  scoring: IdeaScoring;
  canScore: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [showEntries, setShowEntries] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [values, setValues] = React.useState<Record<Key, number>>({
    impact: scoring.mine?.impact ?? 0,
    feasibility: scoring.mine?.feasibility ?? 0,
    strategicFit: scoring.mine?.strategicFit ?? 0,
  });
  const [comment, setComment] = React.useState(scoring.mine?.comment ?? "");

  const complete = DIMENSIONS.every((dimension) => values[dimension.key] > 0);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/api/ideas/${ideaId}/score`, {
        method: "PUT",
        body: JSON.stringify({ ...values, comment: comment.trim() || undefined }),
      });
      toast.success("Your score was saved.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save your score.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold",
              scoring.average === null ? "bg-ink/[0.06] text-muted" : "bg-warning/15 text-[#9A6206]",
            )}
          >
            <Star className="h-3.5 w-3.5" />
            {scoring.average === null ? "Not scored" : `${scoring.average.toFixed(1)} / 5`}
          </span>
          {scoring.averages ? (
            <p className="text-[11px] text-muted">
              Impact {scoring.averages.impact.toFixed(1)} · Feasibility{" "}
              {scoring.averages.feasibility.toFixed(1)} · Fit {scoring.averages.strategicFit.toFixed(1)}
              <span className="ml-1">
                · {scoring.count} evaluator{scoring.count === 1 ? "" : "s"}
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-muted">Score it on impact, feasibility and strategic fit.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {scoring.entries.length ? (
            <button
              type="button"
              onClick={() => setShowEntries((value) => !value)}
              aria-expanded={showEntries}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink"
            >
              Individual scores
              <ChevronDown className={cn("h-3.5 w-3.5 transition", showEntries && "rotate-180")} />
            </button>
          ) : null}
          {canScore ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              {scoring.mine ? "Update my score" : "Score this idea"}
            </Button>
          ) : null}
        </div>
      </div>

      {showEntries ? (
        <ul className="mt-3 divide-y divide-line/60 border-t border-line/60">
          {scoring.entries.map((entry) => (
            <li key={entry.evaluator.id} className="py-2.5 text-[12px]">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{entry.evaluator.name}</span>
                <span className="text-muted">
                  Impact {entry.impact} · Feasibility {entry.feasibility} · Fit {entry.strategicFit} ·{" "}
                  {relativeTime(entry.updatedAt)}
                </span>
              </p>
              {entry.comment ? <p className="mt-1 text-muted">“{entry.comment}”</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Score this idea</DialogTitle>
            <DialogDescription>
              {title}. Rate each dimension from 1 to 5. You can change your score later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension.key}>
                <p className="text-xs font-semibold text-ink/80">{dimension.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{dimension.hint}</p>
                <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label={dimension.label}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = values[dimension.key] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setValues((current) => ({ ...current, [dimension.key]: n }))}
                        className={cn(
                          "rounded-xl border py-2 text-center transition",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-line bg-surface hover:border-primary/30",
                        )}
                      >
                        <span className="block text-[14px] font-bold">{n}</span>
                        <span className={cn("block text-[9px]", on ? "text-white/80" : "text-muted")}>
                          {SCALE[n - 1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <Field label="Comment" hint="Optional. Visible to other reviewers, not to the submitter.">
              <Textarea
                className="min-h-20"
                maxLength={500}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={!complete || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
