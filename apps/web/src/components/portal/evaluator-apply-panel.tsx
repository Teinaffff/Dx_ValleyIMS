"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import {
  SPECIALIZATION_LABELS,
  type EvaluatorInfo,
  type EvaluatorTokenStatus,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import {
  clearCredentials,
  evaluatorFetch,
  getCredentials,
  saveCredentials,
  type EvaluatorCredentials,
} from "@/lib/evaluator-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EvaluatorResults } from "@/components/portal/evaluator-results";

type Mode = "apply" | "continue";

const STEPS: { status: string; label: string }[] = [
  { status: "CANDIDATE", label: "Candidate" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "AUTHORIZED", label: "Authorized" },
];

function Stepper({ status }: { status: string }) {
  const current = Math.max(
    0,
    STEPS.findIndex((step) => step.status === status),
  );
  const dead = ["REJECTED", "SUSPENDED", "REVOKED"].includes(status);
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = !dead && index <= current;
        return (
          <li key={step.status} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                done ? "bg-primary text-primary-foreground" : "bg-ink/[0.07] text-muted",
              )}
            >
              {index + 1}
            </span>
            <span className={cn("text-[11px] font-semibold", done ? "text-ink" : "text-muted")}>
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span className={cn("h-px flex-1", done && index < current ? "bg-primary" : "bg-line")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function EvaluatorApplyPanel({ info }: { info: EvaluatorInfo | null }) {
  const [credentials, setCredentials] = React.useState<EvaluatorCredentials | null>(null);
  const [status, setStatus] = React.useState<EvaluatorTokenStatus | null>(null);
  const [ready, setReady] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("apply");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [freshCode, setFreshCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    jobTitle: "",
    department: "",
    motivation: "",
  });
  const [resume, setResume] = React.useState({ email: "", code: "" });

  const load = React.useCallback(async (creds: EvaluatorCredentials) => {
    try {
      const next = await evaluatorFetch<EvaluatorTokenStatus>("/api/public/evaluator/status", creds);
      setStatus(next);
      setCredentials(creds);
      return true;
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) clearCredentials();
      setCredentials(null);
      setStatus(null);
      return false;
    }
  }, []);

  React.useEffect(() => {
    const stored = getCredentials();
    if (!stored) {
      setReady(true);
      return;
    }
    void load(stored).finally(() => setReady(true));
  }, [load]);

  async function submitApplication(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ email: string; accessCode: string }>(
        "/api/public/evaluator/apply",
        { method: "POST", body: JSON.stringify(form) },
      );
      const creds = { email: result.email, code: result.accessCode };
      saveCredentials(creds);
      setFreshCode(result.accessCode);
      await load(creds);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : "We couldn't send your application.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function continueWithCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const creds = { email: resume.email.trim().toLowerCase(), code: resume.code.trim() };
    try {
      await evaluatorFetch<EvaluatorTokenStatus>("/api/public/evaluator/status", creds);
      saveCredentials(creds);
      await load(creds);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't check that code. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    clearCredentials();
    setCredentials(null);
    setStatus(null);
    setFreshCode(null);
    setError(null);
  }

  async function copyCode() {
    if (!freshCode) return;
    try {
      await navigator.clipboard.writeText(freshCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // The code is visible on screen, so a failed copy is not blocking.
    }
  }

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  // ---------------------------------------------------------- signed-in view
  if (status && credentials) {
    const out = info?.config;
    return (
      <div>
        <p className="label-caps">Your application</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Hello, {status.name.split(" ")[0]}.
        </h2>
        <p className="mt-1 text-[12px] text-muted">{status.email}</p>

        <div className="mt-5">
          <Stepper status={status.status} />
          <p className="mt-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
            {status.statusLabel}
          </p>
        </div>

        {freshCode ? (
          <div className="mt-5 rounded-[22px] border border-warning/30 bg-warning/[0.07] p-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[#9A6206]">
              <KeyRound className="h-3.5 w-3.5" /> Save your access code
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink/70">
              You have no account, so this code and your email are how you come back to take
              the assessment or check your result. It is shown only once.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="rounded-xl bg-surface px-3 py-2 font-mono text-[15px] font-semibold tracking-[0.12em]">
                {freshCode}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {status.status === "CANDIDATE" ? (
            <>
              <p className="text-[13px] leading-relaxed text-ink/75">
                {status.attemptsUsed === 0
                  ? `You're ready for the assessment: ${out?.questionCount ?? 20} multiple-choice questions in ${
                      out?.durationMinutes ?? 30
                    } minutes. You need ${out?.passScore ?? 80}% to qualify.`
                  : `Attempts used: ${status.attemptsUsed} of ${status.attemptsAllowed}.`}
              </p>
              {status.inProgressAttemptId ? (
                <Button asChild size="lg" className="w-full">
                  <Link href="/become-evaluator/assessment">
                    Resume your assessment <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : status.canStart ? (
                <Button asChild size="lg" className="w-full">
                  <Link href="/become-evaluator/assessment">
                    {status.attemptsUsed === 0 ? "Start the assessment" : "Retake the assessment"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : status.nextAttemptAt ? (
                <p className="flex items-start gap-2 rounded-2xl bg-canvas px-4 py-3 text-[12px] text-ink/75">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  You can retake it from{" "}
                  {new Date(status.nextAttemptAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  . Use the time to review the competencies.
                </p>
              ) : (
                <p className="rounded-2xl bg-canvas px-4 py-3 text-[12px] text-ink/75">
                  You've used all {status.attemptsAllowed} attempts. Please contact the innovation team.
                </p>
              )}
            </>
          ) : null}

          {status.status === "QUALIFIED" ? (
            <p className="flex items-start gap-2 rounded-2xl bg-success/10 px-4 py-3 text-[12px] leading-relaxed text-ink/80">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              You passed. An administrator now reviews your result and decides on your
              authorization. Passing does not grant approval rights on its own.
            </p>
          ) : null}

          {status.status === "AUTHORIZED" ? (
            <div className="space-y-3">
              <p className="flex items-start gap-2 rounded-2xl bg-success/10 px-4 py-3 text-[12px] leading-relaxed text-ink/80">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                You're an authorized evaluator
                {status.validUntil ? ` until ${formatDate(status.validUntil)}` : ""}. Sign in with
                the account the innovation team created for you.
              </p>
              {status.specializations.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {status.specializations.map((key) => (
                    <span
                      key={key}
                      className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary"
                    >
                      {SPECIALIZATION_LABELS[key]}
                    </span>
                  ))}
                </div>
              ) : null}
              <Button asChild size="lg" className="w-full">
                <Link href="/login">
                  <LogIn className="h-4 w-4" /> Sign in to the evaluator portal
                </Link>
              </Button>
            </div>
          ) : null}

          {status.status === "REJECTED" ? (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-[12px] leading-relaxed text-ink/75">
              The innovation team did not approve this application. You're welcome to talk to
              them about next steps.
            </p>
          ) : null}
          {status.status === "SUSPENDED" ? (
            <p className="rounded-2xl bg-warning/10 px-4 py-3 text-[12px] leading-relaxed text-ink/75">
              Your evaluator authorization is suspended for now. Contact the innovation team.
            </p>
          ) : null}
          {status.status === "REVOKED" ? (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-[12px] leading-relaxed text-ink/75">
              Your evaluator privileges were withdrawn. Contact the innovation team for details.
            </p>
          ) : null}

          {status.lastResult ? <EvaluatorResults result={status.lastResult} /> : null}
        </div>

        <button
          type="button"
          onClick={leave}
          className="mt-5 text-[11px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Not you? Use a different email
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------- apply view
  return (
    <div>
      <p className="label-caps">Apply</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        Become an evaluator.
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        No portal account needed. Apply with your work email, take the assessment, and if you
        qualify the innovation team will review you for authorization.
      </p>

      <div className="mt-5 inline-flex rounded-full bg-canvas p-1 text-[11px] font-semibold">
        {(["apply", "continue"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 transition",
              mode === value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {value === "apply" ? "New application" : "I have an access code"}
          </button>
        ))}
      </div>

      {mode === "apply" ? (
        <form onSubmit={submitApplication} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <Input
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="e.g. Meron Tesfaye"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Work email">
              <Input
                required
                type="email"
                maxLength={160}
                autoComplete="email"
                placeholder="you@dxvalley.dev"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" hint="Optional">
              <Input
                maxLength={80}
                value={form.jobTitle}
                onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
              />
            </Field>
            <Field label="Department" hint="Optional">
              <Input
                maxLength={80}
                value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Why do you want to evaluate?" hint="Optional: a sentence or two is plenty.">
            <Textarea
              maxLength={1000}
              className="min-h-20"
              value={form.motivation}
              onChange={(event) => setForm({ ...form, motivation: event.target.value })}
            />
          </Field>
          {error ? (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Apply to become an evaluator
          </Button>
        </form>
      ) : (
        <form onSubmit={continueWithCode} className="mt-5 space-y-4">
          <Field label="Work email">
            <Input
              required
              type="email"
              autoComplete="email"
              value={resume.email}
              onChange={(event) => setResume({ ...resume, email: event.target.value })}
            />
          </Field>
          <Field label="Access code" hint="The code you were shown when you applied, e.g. K7QF-29XM-PD4R.">
            <Input
              required
              className="font-mono uppercase tracking-[0.12em]"
              value={resume.code}
              onChange={(event) => setResume({ ...resume, code: event.target.value })}
            />
          </Field>
          {error ? (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Continue
          </Button>
        </form>
      )}
    </div>
  );
}
