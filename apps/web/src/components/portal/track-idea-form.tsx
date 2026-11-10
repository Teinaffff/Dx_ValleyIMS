"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2, Paperclip, Search } from "lucide-react";
import type { IdeaTrackResult } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const STEPS = ["Received", "In review", "Decision"] as const;

const REACHED: Record<IdeaTrackResult["stage"], number> = {
  RECEIVED: 0,
  IN_REVIEW: 1,
  NEEDS_INFO: 1,
  PARKED: 2,
  APPROVED: 2,
  PRODUCT: 2,
  CLOSED: 2,
};

const TONE: Record<IdeaTrackResult["stage"], string> = {
  RECEIVED: "bg-primary-soft text-primary",
  IN_REVIEW: "bg-primary-soft text-primary",
  NEEDS_INFO: "bg-warning/15 text-[#9A6206]",
  PARKED: "bg-warning/15 text-[#9A6206]",
  APPROVED: "bg-success/10 text-success",
  PRODUCT: "bg-success/10 text-success",
  CLOSED: "bg-ink/[0.06] text-ink/70",
};

type Mode = "code" | "lost" | "legacy";

export function TrackIdeaForm({
  initialReference,
  onShareAnother,
}: {
  initialReference?: string;
  /** When the form sits next to the idea form, switch to it instead of navigating. */
  onShareAnother?: () => void;
}) {
  const [reference, setReference] = React.useState(initialReference ?? "");
  const [code, setCode] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("code");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<IdeaTrackResult | null>(null);

  // Same device as the submission: fill in what we saved.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ims.idea.last");
      if (!raw) return;
      const saved = JSON.parse(raw) as { reference?: string; code?: string };
      if (!saved.reference || !saved.code) return;
      if (initialReference && initialReference.toUpperCase() !== saved.reference.toUpperCase()) return;
      setReference((current) => current || saved.reference!);
      setCode(saved.code);
    } catch {
      // ignore
    }
  }, [initialReference]);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "lost") {
        const response = await apiFetch<{ message: string }>("/api/public/ideas/track/reissue", {
          method: "POST",
          body: JSON.stringify({ reference: reference.trim(), email: email.trim() }),
        });
        setNotice(response.message);
        return;
      }
      setResult(
        await apiFetch<IdeaTrackResult>("/api/public/ideas/track", {
          method: "POST",
          body: JSON.stringify(
            mode === "legacy"
              ? { reference: reference.trim(), email: email.trim() }
              : { reference: reference.trim(), accessCode: code.trim() },
          ),
        }),
      );
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof ApiError ? requestError.message : "We couldn't look that up. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const reached = REACHED[result.stage];
    return (
      <div>
        <p className="label-caps">Reference · {result.reference}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight">
          {result.title}
        </h2>
        <p className="mt-1 text-[12px] text-muted">Submitted {formatDate(result.submittedAt)}</p>

        <ol className="mt-6 flex items-start">
          {STEPS.map((step, index) => {
            const done = index <= reached;
            return (
              <li key={step} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={cn("h-px flex-1", index === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-line")} />
                  {done ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-line" />
                  )}
                  <span
                    className={cn(
                      "h-px flex-1",
                      index === STEPS.length - 1 ? "bg-transparent" : index < reached ? "bg-primary" : "bg-line",
                    )}
                  />
                </div>
                <span className={cn("mt-2 text-[11px] font-semibold", done ? "text-ink" : "text-muted")}>
                  {step}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-[22px] border border-line/70 bg-canvas/50 p-5">
          <span className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-bold", TONE[result.stage])}>
            {result.headline}
          </span>
          <p className="mt-3 text-[13px] leading-relaxed text-ink/80">{result.message}</p>
          {result.clarification ? (
            <p className="mt-3 rounded-2xl bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink/80">
              “{result.clarification}”
            </p>
          ) : null}
          {result.decidedAt ? (
            <p className="mt-3 text-[11px] text-muted">Updated {formatDate(result.decidedAt)}</p>
          ) : null}
          {result.attachmentCount ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted">
              <Paperclip className="h-3 w-3" />
              {result.attachmentCount} attachment{result.attachmentCount === 1 ? "" : "s"} included
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {onShareAnother ? (
            <Button type="button" variant="ghost" onClick={onShareAnother}>
              Share another idea
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/submit-idea">Share another idea</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="label-caps">Track your idea</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Where does it stand?</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {mode === "code"
          ? "Enter the reference and access code you were given when you submitted."
          : mode === "lost"
            ? "Enter your reference and the email address you used. We'll email you a new access code."
            : "For ideas submitted before access codes existed: use your reference and email."}
      </p>
      <form onSubmit={lookup} className="mt-6 space-y-4">
        <Field label="Reference" hint="Eight letters and numbers, like BCKCD41B.">
          <Input
            required
            maxLength={16}
            className="font-mono uppercase tracking-[0.12em]"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        {mode === "code" ? (
          <Field label="Access code" hint="Looks like K7QF-29XM-PD4R.">
            <Input
              required
              maxLength={32}
              autoComplete="off"
              className="font-mono uppercase tracking-[0.12em]"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
        ) : (
          <Field label="Work email">
            <Input
              required
              type="email"
              maxLength={160}
              autoComplete="email"
              placeholder="you@dxvalley.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
        )}
        {error ? (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-xs font-medium text-success">{notice}</p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {mode === "lost" ? "Email me a new code" : "Check status"}
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {mode !== "code" ? (
          <button type="button" onClick={() => { setMode("code"); setError(null); setNotice(null); }} className="font-semibold text-primary hover:underline">
            I have my access code
          </button>
        ) : (
          <button type="button" onClick={() => { setMode("lost"); setError(null); setNotice(null); }} className="font-semibold text-primary hover:underline">
            I lost my access code
          </button>
        )}
        {mode === "code" ? (
          <button type="button" onClick={() => { setMode("legacy"); setError(null); setNotice(null); }} className="text-muted hover:text-ink hover:underline">
            My idea is from before access codes
          </button>
        ) : null}
      </div>
    </div>
  );
}
