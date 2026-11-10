"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import {
  EVENT_LABELS,
  type ApplicantRow,
  type HistoryRow,
  type Overview,
} from "@/lib/evaluator-admin";
import { relativeTime } from "@/lib/format";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-display text-[28px] font-semibold leading-none tracking-tight">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function EvaluatorOverview() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [waiting, setWaiting] = React.useState<ApplicantRow[]>([]);
  const [events, setEvents] = React.useState<HistoryRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      apiFetch<Overview>("/api/admin/evaluators/overview"),
      apiFetch<ApplicantRow[]>("/api/admin/evaluators/applicants?status=QUALIFIED"),
      apiFetch<HistoryRow[]>("/api/admin/evaluators/events?limit=6"),
    ])
      .then(([o, w, e]) => {
        setOverview(o);
        setWaiting(w.slice(0, 5));
        setEvents(e);
      })
      .catch((requestError) =>
        setError(requestError instanceof ApiError ? requestError.message : "Couldn't load the overview."),
      );
  }, []);

  if (error) {
    return <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>;
  }
  if (!overview) {
    return (
      <div className="flex items-center gap-2 py-10 text-[13px] text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const maxActive = Math.max(1, ...overview.bank.map((row) => row.active));

  return (
    <div className="space-y-5">
      {!overview.bankReady ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-warning/30 bg-warning/[0.07] p-4 text-[12px] leading-relaxed text-ink/80">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6206]" />
          <p>
            The question bank has {overview.activeQuestions} active questions but each attempt
            needs {overview.questionCount}. Applicants can't start the assessment until you{" "}
            <Link href="/admin/evaluators/questions" className="font-semibold text-primary underline-offset-4 hover:underline">
              add more
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applicants" value={overview.applicants} hint={`${overview.candidates} still candidates`} />
        <Stat label="Awaiting authorization" value={overview.qualified} hint="Passed, need your review" />
        <Stat label="Authorized evaluators" value={overview.authorized} hint={`${overview.expiringSoon} expiring in 30 days`} />
        <Stat
          label="Pass rate"
          value={overview.passRate === null ? "—" : `${overview.passRate}%`}
          hint={
            overview.averageScore === null
              ? "No attempts yet"
              : `Average score ${overview.averageScore}% across ${overview.attempts} attempts`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Needs your review</h2>
            <Link href="/admin/evaluators/applications?status=QUALIFIED" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {waiting.length === 0 ? (
            <p className="mt-4 text-[12px] text-muted">Nobody is waiting for authorization.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line/60">
              {waiting.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-[12px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.name}</p>
                    <p className="truncate text-muted">{row.department ?? row.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
                    {row.bestScore === null ? "—" : `${Math.round(row.bestScore)}%`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Question bank health</h2>
            <Link href="/admin/evaluators/questions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-3 space-y-3">
            {overview.bank.map((row) => (
              <li key={row.competency}>
                <div className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="shrink-0 text-muted">{row.active} active</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(row.active / maxActive) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Recent activity</h2>
          <Link href="/admin/evaluators/history" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            Full history <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="mt-4 text-[12px] text-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/60">
            {events.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 py-3 text-[12px]">
                <p className="min-w-0 truncate">
                  <span className="font-semibold">{event.applicant.name}</span>{" "}
                  <span className="text-muted">· {EVENT_LABELS[event.action] ?? event.action}</span>
                </p>
                <span className="shrink-0 text-muted">{relativeTime(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
