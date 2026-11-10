"use client";

import * as React from "react";
import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  COMPETENCIES,
  COMPETENCY_META,
  type AssessmentConfig,
  type Competency,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import type { QuestionRow } from "@/lib/evaluator-admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

interface Draft {
  id: string | null;
  competency: Competency;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isActive: boolean;
}

const blank = (): Draft => ({
  id: null,
  competency: "INNOVATION_FUNDAMENTALS",
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  isActive: true,
});

export function QuestionBank() {
  const [questions, setQuestions] = React.useState<QuestionRow[] | null>(null);
  const [competency, setCompetency] = React.useState("all");
  const [state, setState] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<QuestionRow | null>(null);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({ competency, state });
      if (query.trim()) params.set("q", query.trim());
      setQuestions(await apiFetch<QuestionRow[]>(`/api/admin/evaluators/questions?${params}`));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Couldn't load questions.");
    }
  }, [competency, state, query]);

  React.useEffect(() => {
    const handle = setTimeout(() => void load(), 200);
    return () => clearTimeout(handle);
  }, [load]);

  async function save() {
    if (!draft) return;
    const options = draft.options.map((option) => option.trim()).filter(Boolean);
    if (options.length < 2) return setFormError("Add at least two answer options.");
    const correctText = draft.options[draft.correctIndex]?.trim();
    if (!correctText) return setFormError("Mark one of the filled options as correct.");
    const correctIndex = options.indexOf(correctText);

    setSaving(true);
    setFormError(null);
    try {
      const body = JSON.stringify({
        competency: draft.competency,
        prompt: draft.prompt.trim(),
        options,
        correctIndex,
        explanation: draft.explanation.trim() || undefined,
        isActive: draft.isActive,
      });
      await apiFetch(draft.id ? `/api/admin/evaluators/questions/${draft.id}` : "/api/admin/evaluators/questions", {
        method: draft.id ? "PATCH" : "POST",
        body,
      });
      setDraft(null);
      await load();
    } catch (requestError) {
      setFormError(requestError instanceof ApiError ? requestError.message : "Couldn't save the question.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(question: QuestionRow) {
    try {
      await apiFetch(`/api/admin/evaluators/questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !question.isActive }),
      });
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Couldn't update the question.");
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/admin/evaluators/questions/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Couldn't delete the question.");
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5">
      <SettingsCard />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_160px_1fr]">
          <Select value={competency} onChange={(event) => setCompetency(event.target.value)} className="h-10">
            <option value="all">All competencies</option>
            {COMPETENCIES.map((key) => (
              <option key={key} value={key}>
                {COMPETENCY_META[key].label}
              </option>
            ))}
          </Select>
          <Select value={state} onChange={(event) => setState(event.target.value)} className="h-10">
            <option value="all">Any state</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="h-10 pl-10"
              placeholder="Search questions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <Button type="button" onClick={() => setDraft(blank())}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      {error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p> : null}

      {questions === null && !error ? (
        <div className="flex items-center gap-2 py-10 text-[13px] text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {questions && questions.length === 0 ? (
        <EmptyState title="No questions match" description="Add a question or change the filters." />
      ) : null}

      <ul className="space-y-3">
        {questions?.map((question) => (
          <li key={question.id} className={cn("surface-card p-5", !question.isActive && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                    {question.competencyLabel}
                  </span>
                  {!question.isActive ? (
                    <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[10px] font-semibold text-muted">Inactive</span>
                  ) : null}
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-snug">{question.prompt}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => void toggleActive(question)}>
                  {question.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label="Edit question"
                  onClick={() =>
                    setDraft({
                      id: question.id,
                      competency: question.competency,
                      prompt: question.prompt,
                      options: [...question.options, ...Array(Math.max(0, 4 - question.options.length)).fill("")],
                      correctIndex: question.correctIndex,
                      explanation: question.explanation ?? "",
                      isActive: question.isActive,
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label="Delete question"
                  onClick={() => setDeleting(question)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {question.options.map((option, index) => (
                <li
                  key={index}
                  className={cn(
                    "flex items-start gap-2 rounded-xl px-3 py-2 text-[12px]",
                    index === question.correctIndex ? "bg-success/10 font-medium text-ink" : "bg-canvas/60 text-ink/70",
                  )}
                >
                  {index === question.correctIndex ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  {option}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit question" : "Add question"}</DialogTitle>
            <DialogDescription>
              Multiple choice. Option order is shuffled for every applicant, so write each option to
              stand on its own.
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <Field label="Competency">
                <Select value={draft.competency} onChange={(event) => setDraft({ ...draft, competency: event.target.value as Competency })}>
                  {COMPETENCIES.map((key) => (
                    <option key={key} value={key}>
                      {COMPETENCY_META[key].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Question">
                <Textarea
                  className="min-h-24"
                  maxLength={600}
                  value={draft.prompt}
                  onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
                />
              </Field>
              <div>
                <p className="mb-2 text-xs font-semibold text-ink/75">Answer options · select the correct one</p>
                <div className="space-y-2">
                  {draft.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Mark option ${index + 1} as correct`}
                        aria-pressed={draft.correctIndex === index}
                        onClick={() => setDraft({ ...draft, correctIndex: index })}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
                          draft.correctIndex === index
                            ? "border-success bg-success text-white"
                            : "border-line text-muted hover:border-success/50",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <Input
                        className="h-10"
                        maxLength={300}
                        placeholder={`Option ${index + 1}${index > 1 ? " (optional)" : ""}`}
                        value={option}
                        onChange={(event) => {
                          const options = [...draft.options];
                          options[index] = event.target.value;
                          setDraft({ ...draft, options });
                        }}
                      />
                      {draft.options.length > 2 ? (
                        <button
                          type="button"
                          aria-label="Remove option"
                          onClick={() => {
                            const options = draft.options.filter((_, i) => i !== index);
                            setDraft({
                              ...draft,
                              options,
                              correctIndex:
                                draft.correctIndex === index ? 0 : draft.correctIndex > index ? draft.correctIndex - 1 : draft.correctIndex,
                            });
                          }}
                          className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {draft.options.length < 6 ? (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
                    className="mt-2 text-[11px] font-semibold text-primary hover:underline"
                  >
                    + Add an option
                  </button>
                ) : null}
              </div>
              <Field label="Explanation" hint="Optional. For admins only; never shown to applicants.">
                <Textarea
                  className="min-h-16"
                  maxLength={600}
                  value={draft.explanation}
                  onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-[12px] font-medium">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                />
                Active (eligible to be drawn into assessments)
              </label>
              {formError ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{formError}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !draft?.prompt.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this question?</DialogTitle>
            <DialogDescription>
              It is removed from the bank for good. Past assessments keep their own copy, so
              existing results don't change. Consider deactivating instead if you may want it back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => void remove()}>
              Delete question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsCard() {
  const [config, setConfig] = React.useState<AssessmentConfig | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    apiFetch<AssessmentConfig>("/api/admin/evaluators/config").then(setConfig).catch(() => undefined);
  }, []);

  if (!config) return null;

  const total = COMPETENCIES.reduce((sum, key) => sum + (Number(config.weights[key]) || 0), 0);
  const numeric = (key: keyof AssessmentConfig, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        className="h-10"
        value={config[key] as number}
        onChange={(event) => setConfig({ ...config, [key]: Number(event.target.value) })}
      />
    </Field>
  );

  async function save() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      setConfig(await apiFetch<AssessmentConfig>("/api/admin/evaluators/config", { method: "PUT", body: JSON.stringify(config) }));
      setMessage({ ok: true, text: "Settings saved. They apply to new attempts." });
    } catch (requestError) {
      setMessage({ ok: false, text: requestError instanceof ApiError ? requestError.message : "Couldn't save." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="surface-card group p-5" open>
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Assessment settings</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {config.questionCount} questions · {config.durationMinutes} min · pass {config.passScore}% · {config.maxAttempts} attempts · retake after {config.retakeAfterDays} days
          </p>
        </div>
        <span className="text-[11px] font-semibold text-primary group-open:hidden">Edit</span>
      </summary>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {numeric("questionCount", "Questions per attempt")}
        {numeric("durationMinutes", "Duration (minutes)")}
        {numeric("passScore", "Pass score (%)")}
        {numeric("maxAttempts", "Maximum attempts")}
        {numeric("retakeAfterDays", "Days before a retake")}
        {numeric("authorizationMonths", "Default authorization (months)")}
      </div>
      <p className="mt-5 text-xs font-semibold text-ink/75">
        Competency weights{" "}
        <span className={cn("ml-1 font-bold", total === 100 ? "text-success" : "text-danger")}>{total}%</span>
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COMPETENCIES.map((key) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas/60 px-4 py-2.5 text-[12px]">
            <span className="min-w-0 truncate">{COMPETENCY_META[key].label}</span>
            <input
              type="number"
              min={0}
              max={100}
              className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-right text-[12px]"
              value={config.weights[key]}
              onChange={(event) =>
                setConfig({ ...config, weights: { ...config.weights, [key]: Number(event.target.value) } })
              }
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={() => void save()} disabled={saving || total !== 100}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
        {message ? (
          <span className={cn("text-[12px] font-medium", message.ok ? "text-success" : "text-danger")}>{message.text}</span>
        ) : null}
      </div>
    </details>
  );
}
