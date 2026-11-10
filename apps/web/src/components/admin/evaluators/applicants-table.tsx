"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { EVALUATOR_STATUS_LABELS, SPECIALIZATION_LABELS, stageLabel } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { STATUS_TONE, type ApplicantRow } from "@/lib/evaluator-admin";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ApplicantDialog } from "@/components/admin/evaluators/applicant-dialog";

const FILTERS = {
  applications: [
    { value: "all", label: "All" },
    { value: "CANDIDATE", label: "Candidates" },
    { value: "QUALIFIED", label: "Qualified" },
    { value: "REJECTED", label: "Not approved" },
  ],
  registry: [
    { value: "registry", label: "All" },
    { value: "QUALIFIED", label: "Awaiting authorization" },
    { value: "AUTHORIZED", label: "Authorized" },
    { value: "SUSPENDED", label: "Suspended" },
    { value: "REVOKED", label: "Revoked" },
  ],
} as const;

export function ApplicantsTable({
  mode,
  initialStatus,
}: {
  mode: "applications" | "registry";
  initialStatus?: string;
}) {
  const initial = initialStatus ?? null;
  const filters = FILTERS[mode];
  const [status, setStatus] = React.useState<string>(
    filters.some((filter) => filter.value === initial) ? (initial as string) : filters[0].value,
  );
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<ApplicantRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const search = new URLSearchParams({ status });
      if (query.trim()) search.set("q", query.trim());
      setRows(await apiFetch<ApplicantRow[]>(`/api/admin/evaluators/applicants?${search}`));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Couldn't load applicants.");
    }
  }, [status, query]);

  React.useEffect(() => {
    const handle = setTimeout(() => void load(), 200);
    return () => clearTimeout(handle);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              aria-pressed={status === filter.value}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
                status === filter.value
                  ? "bg-ink text-white"
                  : "bg-surface text-muted shadow-card hover:text-ink",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="h-10 pl-10"
            placeholder="Search name, email or department"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>
      ) : null}

      {rows === null && !error ? (
        <div className="flex items-center gap-2 py-10 text-[13px] text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {rows && rows.length === 0 ? (
        <EmptyState
          title={mode === "registry" ? "No evaluators here yet" : "No applications"}
          description={
            mode === "registry"
              ? "People appear here once they pass the assessment."
              : "Applications from staff who use Become an Evaluator will show up here."
          }
        />
      ) : null}

      {rows && rows.length ? (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-line/70 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  <th className="px-5 py-3">Person</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Score</th>
                  {mode === "registry" ? (
                    <>
                      <th className="px-3 py-3">Specializations</th>
                      <th className="px-3 py-3">Gates</th>
                      <th className="px-3 py-3">Valid until</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3">Attempts</th>
                      <th className="px-3 py-3">Applied</th>
                    </>
                  )}
                  <th className="px-5 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-canvas/60">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-muted">
                        {row.email}
                        {row.department ? ` · ${row.department}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_TONE[row.status])}>
                        {EVALUATOR_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 font-semibold">
                      {row.bestScore === null ? "—" : `${Math.round(row.bestScore)}%`}
                    </td>
                    {mode === "registry" ? (
                      <>
                        <td className="px-3 py-3.5">
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            {row.specializations.length ? (
                              row.specializations.map((key) => (
                                <span key={key} className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {SPECIALIZATION_LABELS[key]}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-muted">
                          {row.stages.length ? row.stages.map((stage) => stageLabel(stage)).join(", ") : "—"}
                        </td>
                        <td className={cn("px-3 py-3.5", row.expired ? "font-semibold text-danger" : "text-muted")}>
                          {row.status === "AUTHORIZED" || row.status === "SUSPENDED"
                            ? `${row.expired ? "Expired " : ""}${formatDate(row.validUntil, "No end date")}`
                            : "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3.5 text-muted">{row.attemptsUsed}</td>
                        <td className="px-3 py-3.5 text-muted">{formatDate(row.appliedAt)}</td>
                      </>
                    )}
                    <td className="px-5 py-3.5 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(row.id)}>
                        {row.status === "QUALIFIED" ? "Review" : "Open"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <ApplicantDialog
        applicantId={openId}
        onOpenChange={(open) => !open && setOpenId(null)}
        onChanged={() => void load()}
      />
    </div>
  );
}
