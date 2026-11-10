"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Loader2,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import {
  PEER_EVALUATOR_STAGES,
  SPECIALIZATIONS,
  SPECIALIZATION_LABELS,
  stageLabel,
  type Specialization,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import {
  EVENT_LABELS,
  STATUS_TONE,
  type ApplicantDetail,
} from "@/lib/evaluator-admin";
import { formatDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";

type ProductOption = { id: string; name: string; stage: string };
type Panel = "none" | "authorize" | "reject" | "suspend" | "revoke";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-line bg-surface text-muted hover:border-primary/30 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function ApplicantDialog({
  applicantId,
  onOpenChange,
  onChanged,
}: {
  applicantId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = React.useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [panel, setPanel] = React.useState<Panel>("none");
  const [note, setNote] = React.useState("");
  const [specs, setSpecs] = React.useState<Specialization[]>([]);
  const [stages, setStages] = React.useState<string[]>([...PEER_EVALUATOR_STAGES]);
  const [validUntil, setValidUntil] = React.useState("");
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [assigned, setAssigned] = React.useState<string[]>([]);
  const [productQuery, setProductQuery] = React.useState("");
  const [productOptions, setProductOptions] = React.useState<ProductOption[]>([]);

  const load = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const next = await apiFetch<ApplicantDetail>(`/api/admin/evaluators/applicants/${id}`);
      setDetail(next);
      setSpecs(next.specializations);
      setStages(next.stages.length ? next.stages : [...PEER_EVALUATOR_STAGES]);
      setValidUntil(next.validUntil ? next.validUntil.slice(0, 10) : "");
      setAssigned(next.assignedProducts.map((product) => product.id));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Couldn't load this applicant.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setPanel("none");
    setNote("");
    setError(null);
    setCredentials(null);
    setDetail(null);
    if (applicantId) void load(applicantId);
  }, [applicantId, load]);

  const canManage = detail && ["AUTHORIZED", "SUSPENDED"].includes(detail.status);

  // Product picker for assignments.
  React.useEffect(() => {
    if (!canManage || detail?.status !== "AUTHORIZED") return;
    const handle = setTimeout(() => {
      apiFetch<{ items: ProductOption[] }>(
        `/api/products?pageSize=20&search=${encodeURIComponent(productQuery)}`,
      )
        .then((result) => setProductOptions(result.items))
        .catch(() => setProductOptions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [canManage, detail?.status, productQuery]);

  async function run(path: string, init: RequestInit, after?: (payload: unknown) => void) {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await apiFetch<unknown>(`/api/admin/evaluators/applicants/${detail.id}${path}`, init);
      after?.(payload);
      onChanged();
      await load(detail.id);
      setPanel("none");
      setNote("");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const authorize = () =>
    run(
      "/authorize",
      {
        method: "POST",
        body: JSON.stringify({
          specializations: specs,
          stages,
          validUntil: validUntil || undefined,
          note: note || undefined,
        }),
      },
      (payload) => {
        const result = payload as { temporaryPassword: string | null };
        if (result.temporaryPassword && detail) {
          setCredentials({ email: detail.email, password: result.temporaryPassword });
        }
      },
    );

  async function copyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`${credentials.email}\n${credentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // visible on screen anyway
    }
  }

  const noteField = (label: string) => (
    <Field label={label} hint="Optional. Recorded in the evaluator history.">
      <Textarea
        className="min-h-20"
        maxLength={500}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </Field>
  );

  return (
    <Dialog open={Boolean(applicantId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.name ?? "Applicant"}</DialogTitle>
          <DialogDescription>
            {detail ? `${detail.email}${detail.department ? ` · ${detail.department}` : ""}` : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="flex items-center gap-2 py-8 text-[13px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : null}

        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", STATUS_TONE[detail.status])}>
                {detail.statusLabel}
              </span>
              {detail.jobTitle ? <span className="text-[12px] text-muted">{detail.jobTitle}</span> : null}
              <span className="text-[12px] text-muted">Applied {formatDate(detail.appliedAt)}</span>
              {detail.status === "AUTHORIZED" || detail.status === "SUSPENDED" ? (
                <span className={cn("text-[12px]", detail.expired ? "font-semibold text-danger" : "text-muted")}>
                  {detail.expired ? "Expired" : "Valid until"} {formatDate(detail.validUntil, "no end date")}
                </span>
              ) : null}
            </div>

            {detail.motivation ? (
              <p className="rounded-2xl bg-canvas px-4 py-3 text-[12px] leading-relaxed text-ink/75">
                “{detail.motivation}”
              </p>
            ) : null}

            {credentials ? (
              <div className="rounded-[20px] border border-warning/30 bg-warning/[0.07] p-4">
                <p className="text-[12px] font-semibold text-[#9A6206]">Account created. Share this once, securely.</p>
                <p className="mt-1 text-[11px] text-ink/70">
                  This temporary password is not stored anywhere and won't be shown again.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded-xl bg-surface px-3 py-2 font-mono text-[12px]">{credentials.email}</code>
                  <code className="rounded-xl bg-surface px-3 py-2 font-mono text-[13px] font-semibold">
                    {credentials.password}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyCredentials}>
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Assessment results */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Assessment results</p>
              {detail.attempts.length === 0 ? (
                <p className="mt-2 text-[12px] text-muted">No completed attempts yet.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {detail.attempts.map((attempt, index) => (
                    <li key={attempt.id} className="rounded-2xl border border-line/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-semibold">
                          Attempt {detail.attempts.length - index} · {formatDate(attempt.submittedAt ?? attempt.startedAt)}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-bold",
                            attempt.passed ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                          )}
                        >
                          {Math.round(attempt.score ?? 0)}% · {attempt.status === "EXPIRED" ? "Expired" : attempt.passed ? "Passed" : "Not passed"}
                        </span>
                      </div>
                      {attempt.breakdown?.length ? (
                        <ul className="mt-3 space-y-2">
                          {attempt.breakdown.map((row) => (
                            <li key={row.competency} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[11px]">
                              <span className="truncate">{row.label}</span>
                              <span className="text-muted">
                                {row.correct}/{row.total} · {Math.round(row.percent)}%
                              </span>
                              <div className="col-span-2 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                                <div
                                  className={cn("h-full", row.percent >= 80 ? "bg-success" : row.percent >= 50 ? "bg-warning" : "bg-danger")}
                                  style={{ width: `${row.percent}%` }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Authorization details & product assignment */}
            {canManage ? (
              <div className="space-y-4 rounded-[20px] border border-line/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Authorization</p>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink/75">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((key) => (
                      <Chip key={key} active={specs.includes(key)} onClick={() => setSpecs(toggle(specs, key))}>
                        {SPECIALIZATION_LABELS[key]}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink/75">Gates they may decide (by the product's current stage)</p>
                  <div className="flex flex-wrap gap-2">
                    {PEER_EVALUATOR_STAGES.map((key) => (
                      <Chip key={key} active={stages.includes(key)} onClick={() => setStages(toggle(stages, key))}>
                        {stageLabel(key)}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">Pilot and later gates always need a formal approver.</p>
                </div>
                <Field label="Authorization valid until">
                  <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                </Field>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || stages.length === 0}
                  onClick={() =>
                    run("/authorization", {
                      method: "PATCH",
                      body: JSON.stringify({ specializations: specs, stages, validUntil: validUntil || undefined }),
                    })
                  }
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save authorization
                </Button>

                {detail.status === "AUTHORIZED" ? (
                  <div className="border-t border-line/70 pt-4">
                    <p className="text-xs font-semibold text-ink/75">Assigned products</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      They see and decide only the products listed here, and never one they work on.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {detail.assignedProducts.length === 0 && assigned.length === 0 ? (
                        <span className="text-[12px] text-muted">None yet.</span>
                      ) : null}
                      {assigned.map((id) => {
                        const known =
                          detail.assignedProducts.find((product) => product.id === id) ??
                          productOptions.find((product) => product.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1.5 text-[11px] font-semibold text-primary"
                          >
                            {known?.name ?? "Product"}
                            <button
                              type="button"
                              aria-label="Remove assignment"
                              onClick={() => setAssigned(assigned.filter((value) => value !== id))}
                              className="rounded-full p-0.5 hover:bg-primary/10"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <Input
                      className="mt-3 h-10"
                      placeholder="Search products to add…"
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                    />
                    {productOptions.length ? (
                      <ul className="mt-2 max-h-40 divide-y divide-line/60 overflow-y-auto rounded-2xl border border-line/70">
                        {productOptions.map((product) => {
                          const on = assigned.includes(product.id);
                          return (
                            <li key={product.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setAssigned(on ? assigned.filter((id) => id !== product.id) : [...assigned, product.id])
                                }
                                className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[12px] hover:bg-canvas"
                              >
                                <span className="truncate font-medium">{product.name}</span>
                                <span className="flex shrink-0 items-center gap-2 text-muted">
                                  {stageLabel(product.stage)}
                                  {on ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      disabled={busy}
                      onClick={() => run("/products", { method: "PUT", body: JSON.stringify({ productIds: assigned }) })}
                    >
                      Save assignments
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Authorize form */}
            {panel === "authorize" ? (
              <div className="space-y-4 rounded-[20px] border border-primary/20 bg-primary-soft/40 p-4">
                <p className="text-[12px] font-semibold">Authorize {detail.name}</p>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink/75">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((key) => (
                      <Chip key={key} active={specs.includes(key)} onClick={() => setSpecs(toggle(specs, key))}>
                        {SPECIALIZATION_LABELS[key]}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink/75">Gates they may decide</p>
                  <div className="flex flex-wrap gap-2">
                    {PEER_EVALUATOR_STAGES.map((key) => (
                      <Chip key={key} active={stages.includes(key)} onClick={() => setStages(toggle(stages, key))}>
                        {stageLabel(key)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Field label="Valid until" hint="Leave blank to use the default period from the settings.">
                  <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                </Field>
                {noteField("Note")}
                <p className="text-[11px] leading-relaxed text-muted">
                  This creates a Peer Evaluator account with a temporary password, limited to the
                  products you assign.
                </p>
                <div className="flex gap-2">
                  <Button type="button" onClick={authorize} disabled={busy || stages.length === 0}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Authorize evaluator
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPanel("none")}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {panel === "reject" || panel === "suspend" || panel === "revoke" ? (
              <div className="space-y-3 rounded-[20px] border border-danger/20 bg-danger/[0.04] p-4">
                <p className="text-[12px] font-semibold">
                  {panel === "reject"
                    ? "Don't approve this application"
                    : panel === "suspend"
                      ? "Suspend authorization"
                      : "Revoke evaluator privileges"}
                </p>
                {panel === "revoke" ? (
                  <p className="text-[11px] text-muted">
                    Their account is deactivated and product assignments are removed. This is recorded
                    in the history.
                  </p>
                ) : null}
                {noteField("Reason")}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => run(`/${panel}`, { method: "POST", body: JSON.stringify({ note: note || undefined }) })}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPanel("none")}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">{error}</p>
            ) : null}

            {panel === "none" ? (
              <div className="flex flex-wrap gap-2">
                {detail.status === "QUALIFIED" || detail.status === "REVOKED" ? (
                  <Button type="button" onClick={() => setPanel("authorize")}>
                    <ShieldCheck className="h-4 w-4" />
                    {detail.status === "REVOKED" ? "Re-authorize" : "Authorize"}
                  </Button>
                ) : null}
                {detail.status === "CANDIDATE" || detail.status === "QUALIFIED" ? (
                  <Button type="button" variant="outline" onClick={() => setPanel("reject")}>
                    <ShieldOff className="h-4 w-4" /> Don't approve
                  </Button>
                ) : null}
                {detail.status === "AUTHORIZED" ? (
                  <Button type="button" variant="outline" onClick={() => setPanel("suspend")}>
                    <PauseCircle className="h-4 w-4" /> Suspend
                  </Button>
                ) : null}
                {detail.status === "SUSPENDED" ? (
                  <Button type="button" variant="outline" disabled={busy} onClick={() => run("/reinstate", { method: "POST" })}>
                    <PlayCircle className="h-4 w-4" /> Reinstate
                  </Button>
                ) : null}
                {detail.status === "AUTHORIZED" || detail.status === "SUSPENDED" ? (
                  <Button type="button" variant="danger" onClick={() => setPanel("revoke")}>
                    <ShieldOff className="h-4 w-4" /> Revoke
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* History */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">History</p>
              <ol className="mt-2 space-y-2">
                {detail.events.map((event) => (
                  <li key={event.id} className="flex gap-3 text-[12px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {EVENT_LABELS[event.action] ?? event.action}
                        <span className="ml-2 font-normal text-muted">
                          {event.actor ? `by ${event.actor.name} · ` : ""}
                          {relativeTime(event.createdAt)}
                        </span>
                      </p>
                      {event.note ? <p className="mt-0.5 text-muted">“{event.note}”</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
