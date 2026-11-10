"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Send, Timer } from "lucide-react";
import {
  COMPETENCY_META,
  type AttemptResult,
  type AttemptSession,
  type EvaluatorTokenStatus,
} from "@ims/shared";
import { ApiError } from "@/lib/api";
import { evaluatorFetch, getCredentials, type EvaluatorCredentials } from "@/lib/evaluator-client";
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
import { EvaluatorResults } from "@/components/portal/evaluator-results";

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function EvaluatorAssessment() {
  const router = useRouter();
  const [credentials, setCredentials] = React.useState<EvaluatorCredentials | null>(null);
  const [session, setSession] = React.useState<AttemptSession | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [index, setIndex] = React.useState(0);
  const [remaining, setRemaining] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [outcome, setOutcome] = React.useState<{
    result: AttemptResult;
    status: EvaluatorTokenStatus;
  } | null>(null);
  const started = React.useRef(false);
  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = React.useRef(false);

  // Start (or resume) once.
  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    const creds = getCredentials();
    if (!creds) {
      router.replace("/become-evaluator");
      return;
    }
    setCredentials(creds);
    evaluatorFetch<AttemptSession>("/api/public/evaluator/attempts", creds, { method: "POST" })
      .then((next) => {
        setSession(next);
        setAnswers(next.answers ?? {});
        setRemaining(new Date(next.expiresAt).getTime() - Date.now());
      })
      .catch((requestError) => {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't start the assessment. Please try again.",
        );
      })
      .finally(() => setLoading(false));
  }, [router]);

  const submit = React.useCallback(async () => {
    if (!session || !credentials || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const result = await evaluatorFetch<{ result: AttemptResult; status: EvaluatorTokenStatus }>(
        `/api/public/evaluator/attempts/${session.attemptId}/submit`,
        credentials,
        { method: "POST", body: JSON.stringify({ answers: answersRef.current }) },
      );
      setOutcome(result);
    } catch (requestError) {
      submittedRef.current = false;
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't submit your answers. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [session, credentials]);

  // Countdown; auto-submit at zero.
  React.useEffect(() => {
    if (!session || outcome) return;
    const deadline = new Date(session.expiresAt).getTime();
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) void submit();
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [session, outcome, submit]);

  function choose(questionId: string, option: number) {
    setAnswers((current) => ({ ...current, [questionId]: option }));
    if (!session || !credentials) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void evaluatorFetch(
        `/api/public/evaluator/attempts/${session.attemptId}/answers`,
        credentials,
        { method: "PUT", body: JSON.stringify({ answers: answersRef.current }) },
      ).catch(() => undefined);
    }, 500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing your assessment…
      </div>
    );
  }

  if (outcome) {
    return (
      <div className="mx-auto max-w-2xl rounded-[32px] border border-white/80 bg-surface p-6 shadow-float sm:p-8">
        <p className="label-caps">Assessment complete</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {outcome.result.passed ? "You qualified." : "Not quite there yet."}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {outcome.result.passed
            ? "An administrator will review your result and decide on your authorization. Passing doesn't grant approval rights by itself."
            : outcome.status.canStart || outcome.status.nextAttemptAt
              ? "Review the competency breakdown below. You can try again after the waiting period."
              : "You've used all your attempts. Please contact the innovation team."}
        </p>
        <div className="mt-5">
          <EvaluatorResults result={outcome.result} />
        </div>
        {!outcome.result.passed && outcome.status.nextAttemptAt ? (
          <p className="mt-4 text-[12px] text-ink/75">
            Next attempt from{" "}
            {new Date(outcome.status.nextAttemptAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        ) : null}
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/become-evaluator">Back to my application</Link>
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg rounded-[32px] border border-white/80 bg-surface p-8 text-center shadow-float">
        <h1 className="font-display text-xl font-semibold">We can't start the assessment</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {error ?? "Something went wrong."}
        </p>
        <Button asChild className="mt-6">
          <Link href="/become-evaluator">Back to my application</Link>
        </Button>
      </div>
    );
  }

  const total = session.questions.length;
  const question = session.questions[index];
  const answered = session.questions.filter((q) => answers[q.id] !== undefined).length;
  const unanswered = total - answered;
  const low = remaining <= 5 * 60_000;
  const totalMs = session.durationMinutes * 60_000;

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="sticky top-2 z-10 rounded-[24px] border border-white/80 bg-surface/95 p-4 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Evaluator assessment
            </p>
            <p className="mt-0.5 text-[13px] font-semibold">
              Question {index + 1} of {total}
              <span className="ml-2 font-normal text-muted">
                · {answered} answered
              </span>
            </p>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[15px] font-semibold",
              low ? "bg-danger/10 text-danger" : "bg-primary-soft text-primary",
            )}
            aria-live="off"
          >
            <Timer className="h-4 w-4" /> {clock(remaining)}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
        <div className="mt-2 h-px overflow-hidden rounded-full bg-ink/[0.05]">
          <div
            className={cn("h-full", low ? "bg-danger" : "bg-ink/20")}
            style={{ width: `${Math.max(0, Math.min(100, (remaining / totalMs) * 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
        <section className="rounded-[28px] border border-white/80 bg-surface p-6 shadow-card sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {COMPETENCY_META[question.competency].label}
          </p>
          <h2 className="mt-3 font-display text-[20px] font-semibold leading-snug tracking-tight sm:text-[22px]">
            {question.prompt}
          </h2>

          <div role="radiogroup" aria-label="Answer options" className="mt-6 space-y-2.5">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              return (
                <button
                  key={`${question.id}-${optionIndex}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(question.id, optionIndex)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-[13px] leading-relaxed transition",
                    selected
                      ? "border-primary bg-primary-soft text-ink"
                      : "border-line bg-surface hover:border-primary/30 hover:bg-canvas",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-line text-muted",
                    )}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            {index < total - 1 ? (
              <Button type="button" onClick={() => setIndex((value) => Math.min(total - 1, value + 1))}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit assessment
              </Button>
            )}
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/80 bg-surface p-5 shadow-card lg:self-start">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Questions</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {session.questions.map((item, itemIndex) => {
              const done = answers[item.id] !== undefined;
              const current = itemIndex === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Go to question ${itemIndex + 1}${done ? ", answered" : ""}`}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "h-9 rounded-xl border text-[12px] font-semibold transition",
                    current
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-primary/30 bg-primary-soft text-primary"
                        : "border-line bg-surface text-muted hover:border-primary/30",
                  )}
                >
                  {itemIndex + 1}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
          >
            <Send className="h-4 w-4" /> Submit
          </Button>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Your answers save as you go. If the timer reaches zero, the assessment submits itself.
          </p>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your assessment?</DialogTitle>
            <DialogDescription>
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. They will count as incorrect.`
                : "You've answered every question."}{" "}
              Once submitted, this attempt can't be changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep reviewing
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
