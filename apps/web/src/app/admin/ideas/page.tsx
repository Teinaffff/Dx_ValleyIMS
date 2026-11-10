import Link from "next/link";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Ban,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Mail,
  PauseCircle,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  PERMISSIONS,
  STATUS_LABELS,
  type CategoryMeta,
  type IdeaInboxResult,
  type IdeaStatus,
} from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { IdeaActions } from "@/components/admin/idea-actions";
import { IdeaAttachments } from "@/components/admin/idea-attachments";
import { IdeaScorePanel } from "@/components/admin/idea-score-panel";
import { ConvertIdeaDialog } from "@/components/admin/product-form";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Idea inbox" };

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "parked", label: "Parked" },
  { key: "rejected", label: "Rejected" },
  { key: "deleted", label: "Deleted" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const statusTone: Record<string, string> = {
  SUBMITTED: "bg-primary-soft text-primary",
  UNDER_REVIEW: "bg-warning/15 text-[#9A6206]",
  NEEDS_CLARIFICATION: "bg-warning/15 text-[#9A6206]",
  ACCEPTED: "bg-success/10 text-success",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  PARKED: "bg-warning/15 text-[#9A6206]",
  CONVERTED: "bg-primary-soft text-primary",
  DELETED: "bg-danger/10 text-danger",
};

function buildHref(params: {
  status: TabKey;
  q?: string;
  sort: "newest" | "oldest" | "score";
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.status !== "all") query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  if (params.sort !== "newest") query.set("sort", params.sort);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const value = query.toString();
  return value ? `/admin/ideas?${value}` : "/admin/ideas";
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const pick = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const requestedStatus = pick(raw.status);
  const status: TabKey = TABS.some((tab) => tab.key === requestedStatus)
    ? (requestedStatus as TabKey)
    : "all";
  const q = pick(raw.q)?.trim() ?? "";
  const requestedSort = pick(raw.sort);
  const sort: "newest" | "oldest" | "score" =
    requestedSort === "oldest" || requestedSort === "score" ? requestedSort : "newest";
  const requestedPage = Number(pick(raw.page) ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const query = new URLSearchParams();
  query.set("status", status);
  if (q) query.set("q", q);
  query.set("sort", sort);
  query.set("page", String(page));

  const [session, data, meta] = await Promise.all([
    getSession(),
    serverGet<IdeaInboxResult>(`/api/ideas?${query.toString()}`),
    serverGet<CategoryMeta>("/api/products/meta"),
  ]);

  const canReview =
    !!session &&
    (session.role === "ADMIN" || session.permissions.includes(PERMISSIONS.IDEA_REVIEW));
  const canApprove =
    !!session &&
    (session.role === "ADMIN" || session.permissions.includes(PERMISSIONS.IDEA_APPROVE));
  const canConvert =
    !!session &&
    (session.role === "ADMIN" ||
      session.permissions.includes(PERMISSIONS.PRODUCT_CREATE));
  const canDelete =
    !!session &&
    (session.role === "ADMIN" || session.permissions.includes(PERMISSIONS.IDEA_DELETE));
  const canRestore =
    !!session &&
    (session.role === "ADMIN" || session.permissions.includes(PERMISSIONS.IDEA_RESTORE));

  const counts = data?.counts ?? { all: 0, pending: 0, approved: 0, parked: 0, rejected: 0, deleted: 0 };
  const items = data?.items ?? [];
  const hasFilters = q.length > 0 || status !== "all";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ideas"
        title="Idea inbox"
        description="Every idea shared with the innovation team, including submissions from people who did not sign in. Approve the ones worth pursuing, or soft-delete the rest with a reason."
        actions={
          <Button asChild variant="outline" size="md">
            <Link href="/submit-idea">
              <Lightbulb className="h-4 w-4" /> Open the idea form
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Ideas in inbox",
            value: counts.all,
            helper: "Everything except deleted ideas",
            icon: <Lightbulb className="h-4 w-4" />,
          },
          {
            label: "Awaiting review",
            value: counts.pending,
            helper: "Submitted, triaged or needing clarification",
            icon: <Search className="h-4 w-4" />,
          },
          {
            label: "Approved",
            value: counts.approved,
            helper: "Cleared for product discovery",
            icon: <CheckCircle2 className="h-4 w-4" />,
          },
        ].map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-muted">{stat.label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-ink/50">
                {stat.icon}
              </span>
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const active = tab.key === status;
            return (
              <Link
                key={tab.key}
                href={buildHref({ status: tab.key, q, sort })}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold transition",
                  active
                    ? "bg-navy text-white shadow-sm"
                    : "bg-canvas text-ink/60 hover:bg-soft-strong hover:text-ink",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active ? "bg-white/15 text-white" : "bg-surface text-muted",
                  )}
                >
                  {counts[tab.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-line/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <form action="/admin/ideas" method="get" className="flex flex-1 flex-wrap items-center gap-2">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search title, submitter or reference code"
                className="pl-10"
                aria-label="Search ideas"
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
            {q ? (
              <Button asChild variant="ghost" size="md">
                <Link href={buildHref({ status, sort })}>
                  <X className="h-4 w-4" /> Clear
                </Link>
              </Button>
            ) : null}
          </form>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted">Sort</span>
            <div className="inline-flex rounded-full border border-line bg-surface p-1">
              {(
                [
                  { key: "newest", label: "Newest", icon: ArrowDownWideNarrow },
                  { key: "oldest", label: "Oldest", icon: ArrowUpWideNarrow },
                  { key: "score", label: "Highest score", icon: Star },
                ] as const
              ).map((option) => (
                <Link
                  key={option.key}
                  href={buildHref({ status, q, sort: option.key })}
                  aria-current={sort === option.key ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                    sort === option.key ? "bg-ink text-white" : "text-ink/60 hover:text-ink",
                  )}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!data ? (
        <EmptyState
          icon={<Lightbulb className="h-5 w-5" />}
          title="Idea inbox unavailable"
          description="Your account may not have permission to view ideas, or the API is not reachable."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={
            status === "deleted" ? (
              <Trash2 className="h-5 w-5" />
            ) : hasFilters ? (
              <Search className="h-5 w-5" />
            ) : (
              <Lightbulb className="h-5 w-5" />
            )
          }
          title={
            status === "deleted"
              ? "Nothing in the deleted tab"
              : hasFilters
                ? "No ideas match this view"
                : "No ideas yet"
          }
          description={
            status === "deleted"
              ? "Soft-deleted ideas stay here so they can be restored. Nothing has been deleted."
              : hasFilters
                ? "Try a different search term, clear the filters, or switch status tabs."
                : "When someone shares an idea through the public form, it will appear here and notify every administrator."
          }
        />
      ) : (
        <section className="space-y-3">
          {items.map((idea) => (
            <article key={idea.id} className="surface-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]",
                        statusTone[idea.status] ?? "bg-canvas text-ink/60",
                      )}
                    >
                      {STATUS_LABELS[idea.status] ?? idea.status}
                    </span>
                    <span className="rounded-full bg-canvas px-2 py-1 font-mono text-[10px] font-semibold text-muted">
                      #{idea.reference}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                      {idea.submitter.accountId ? "Team submission" : "Public submission"}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-[20px] font-semibold tracking-tight">
                    {idea.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                    <span className="font-semibold text-ink/70">{idea.submitter.name}</span>
                    {idea.submitter.jobTitle ? <span>· {idea.submitter.jobTitle}</span> : null}
                    {idea.submitter.email ? (
                      <a
                        href={`mailto:${idea.submitter.email}`}
                        className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" /> {idea.submitter.email}
                      </a>
                    ) : null}
                    <span>· Submitted {formatDate(idea.createdAt)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {idea.convertedProductId ? (
                    <Button asChild variant="outline" size="md">
                      <Link href={`/admin/products/${idea.convertedProductId}`}>
                        <ExternalLink className="h-4 w-4" /> View product
                      </Link>
                    </Button>
                  ) : (
                    canConvert &&
                    (idea.status === "APPROVED" || idea.status === "ACCEPTED") && (
                      <ConvertIdeaDialog
                        idea={{
                          id: idea.id,
                          title: idea.title,
                          problem: idea.problem,
                          solution: idea.solution,
                          expectedImpact: idea.expectedImpact,
                        }}
                        owners={meta?.owners ?? []}
                        teams={meta?.teams ?? []}
                      />
                    )
                  )}

                  <IdeaActions
                    ideaId={idea.id}
                    title={idea.title}
                    status={idea.status as IdeaStatus}
                    canApprove={canApprove}
                    canDelete={canDelete}
                    canRestore={canRestore}
                  />
                </div>
              </div>

              {idea.status === "APPROVED" && (idea.reviewedBy || idea.reviewNote) ? (
                <div className="mt-4 flex flex-wrap items-start gap-x-2 gap-y-1 rounded-2xl border border-success/20 bg-success/[0.05] px-4 py-3 text-[11px] text-ink/70">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  <span className="font-semibold">
                    Approved by {idea.reviewedBy?.name ?? "an administrator"}
                  </span>
                  {idea.approvedAt ? <span>· {formatDate(idea.approvedAt)}</span> : null}
                  {idea.reviewNote ? <span className="w-full pl-5">“{idea.reviewNote}”</span> : null}
                </div>
              ) : null}

              {idea.status === "REJECTED" || idea.status === "PARKED" ? (
                <div
                  className={cn(
                    "mt-4 flex flex-wrap items-start gap-x-2 gap-y-1 rounded-2xl border px-4 py-3 text-[11px] text-ink/70",
                    idea.status === "REJECTED"
                      ? "border-danger/15 bg-danger/[0.04]"
                      : "border-warning/25 bg-warning/[0.07]",
                  )}
                >
                  {idea.status === "REJECTED" ? (
                    <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                  ) : (
                    <PauseCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6206]" />
                  )}
                  <span className="font-semibold">
                    {idea.status === "REJECTED" ? "Rejected" : "Parked"} by{" "}
                    {idea.reviewedBy?.name ?? "an administrator"}
                  </span>
                  {idea.statusChangedAt ? <span>· {formatDate(idea.statusChangedAt)}</span> : null}
                  {idea.reviewNote ? (
                    <span className="w-full pl-5">
                      {idea.status === "REJECTED" ? "Reason (internal): " : "Note: "}
                      {idea.reviewNote}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {idea.status === "DELETED" ? (
                <div className="mt-4 flex flex-wrap items-start gap-x-2 gap-y-1 rounded-2xl border border-danger/15 bg-danger/[0.04] px-4 py-3 text-[11px] text-ink/70">
                  <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                  <span className="font-semibold">
                    Deleted by {idea.reviewedBy?.name ?? "an administrator"}
                  </span>
                  {idea.deletedAt ? <span>· {formatDate(idea.deletedAt)}</span> : null}
                  {idea.deleteReason ? (
                    <span className="w-full pl-5">Reason: {idea.deleteReason}</span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-canvas/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    The problem
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-ink/75">
                    {idea.problem || "Not written out. See the attachments below."}
                  </p>
                </div>
                <div className="rounded-2xl bg-canvas/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Proposed solution
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-ink/75">
                    {idea.solution || "Not written out. See the attachments below."}
                  </p>
                </div>
              </div>

              {idea.attachments.length ? (
                <IdeaAttachments ideaId={idea.id} attachments={idea.attachments} />
              ) : null}

              {idea.status !== "DELETED" ? (
                <IdeaScorePanel
                  ideaId={idea.id}
                  title={idea.title}
                  scoring={idea.scoring}
                  canScore={canReview}
                />
              ) : null}

              {idea.expectedImpact ? (
                <div className="mt-3 rounded-2xl border border-line/70 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Expected impact
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink/75">
                    {idea.expectedImpact}
                  </p>
                </div>
              ) : null}
            </article>
          ))}

          {data.pageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
              <p className="text-[11px] text-muted">
                Page {data.page} of {data.pageCount} · {data.total} idea
                {data.total === 1 ? "" : "s"} in this view
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  aria-disabled={data.page <= 1}
                  className={data.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                >
                  <Link href={buildHref({ status, q, sort, page: data.page - 1 })}>Previous</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.pageCount}
                  aria-disabled={data.page >= data.pageCount}
                  className={
                    data.page >= data.pageCount ? "pointer-events-none opacity-50" : undefined
                  }
                >
                  <Link href={buildHref({ status, q, sort, page: data.page + 1 })}>Next</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <p className="px-1 text-[11px] text-muted">
        Every approve, delete and restore is written to the immutable audit log. Deleted ideas
        are never removed from the database.
      </p>
    </div>
  );
}
