"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { EVENT_LABELS, type HistoryRow } from "@/lib/evaluator-admin";
import { formatDate, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export function HistoryList() {
  const [rows, setRows] = React.useState<HistoryRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    apiFetch<HistoryRow[]>("/api/admin/evaluators/events?limit=200")
      .then(setRows)
      .catch((requestError) =>
        setError(requestError instanceof ApiError ? requestError.message : "Couldn't load the history."),
      );
  }, []);

  if (error) {
    return <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>;
  }
  if (!rows) {
    return (
      <div className="flex items-center gap-2 py-10 text-[13px] text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!rows.length) {
    return (
      <EmptyState
        title="No history yet"
        description="Applications, authorizations, suspensions and assignments are recorded here."
      />
    );
  }

  return (
    <div className="surface-card divide-y divide-line/60">
      {rows.map((event) => (
        <div key={event.id} className="flex flex-col gap-1 px-5 py-4 text-[12px] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">
              {event.applicant.name}
              <span className="ml-2 font-normal text-muted">{event.applicant.email}</span>
            </p>
            <p className="mt-0.5 text-ink/75">
              {EVENT_LABELS[event.action] ?? event.action}
              {event.actor ? <span className="text-muted"> · by {event.actor.name}</span> : null}
            </p>
            {event.note ? <p className="mt-1 text-muted">“{event.note}”</p> : null}
          </div>
          <span className="shrink-0 text-muted" title={formatDate(event.createdAt)}>
            {relativeTime(event.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
