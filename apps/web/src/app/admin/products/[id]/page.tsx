import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  Lightbulb,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  nextStage,
  stageLabel,
  PERMISSIONS,
  VISIBILITY_LABELS,
  type CategoryMeta,
  type GateSubmissionState,
  type ProductDetail,
} from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { FEATURES } from "@/config/features";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { StageBadge, HealthBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StageTracker } from "@/components/shared/stage-tracker";
import {
  ProductMilestones,
  currentStageGateReadiness,
} from "@/components/shared/milestone-list";
import { EditProductDialog } from "@/components/admin/product-form";
import {
  GatePendingSummary,
  GateSubmitButton,
} from "@/components/shared/gate-submit";
import {
  ProductArchiveButton,
  ProductDeleteButton,
} from "@/components/admin/product-actions";

export const metadata = { title: "Product" };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-ink/85">{children}</dd>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, product, meta, gate] = await Promise.all([
    getSession(),
    serverGet<ProductDetail>(`/api/products/${id}`),
    serverGet<CategoryMeta>("/api/products/meta"),
    serverGet<GateSubmissionState>(`/api/products/${id}/gate`),
  ]);

  if (!product) notFound();

  const canEdit =
    session?.role === "ADMIN" ||
    (session?.permissions.includes(PERMISSIONS.PRODUCT_UPDATE) === true &&
      product.owner.id === session?.id);
  const canArchive = session?.role === "ADMIN";
  const canDelete = session?.role === "ADMIN";
  const canManageMilestones =
    session?.role === "ADMIN" ||
    (session?.permissions.includes(PERMISSIONS.MILESTONE_MANAGE) === true &&
      product.owner.id === session?.id);
  const canSubmitGate =
    session?.permissions.includes(PERMISSIONS.GATE_SUBMIT) === true &&
    product.owner.id === session?.id;
  const teamNames = product.teams.map((team) => team.name).join(", ");

  const currentMilestones = product.milestones.filter(
    (milestone) => milestone.stage === product.stage,
  );
  const readiness = currentStageGateReadiness(
    product.milestones,
    product.stage,
    product.health,
  );
  const ready = readiness.every((item) => item.met);
  const upcoming = nextStage(product.stage);
  const stageMeta = product.stage;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <Link href="/admin/products" className="inline-flex items-center gap-1 hover:text-ink">
          <ArrowLeft className="h-3 w-3" /> Product portfolio
        </Link>
        <ChevronRight className="h-3 w-3 text-ink/25" />
        <span className="truncate font-medium text-ink/70">{product.name}</span>
      </div>

      {product.isArchived ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-danger/15 bg-danger/[0.04] px-4 py-3 text-[12px] leading-relaxed text-ink/75">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p>
            <span className="font-semibold text-ink">This product is archived.</span> It
            is hidden from the active portfolio and public catalog. Use{" "}
            <span className="font-semibold">Restore</span> to return it to the active
            portfolio.
          </p>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[24px] border border-black/[0.06] bg-surface">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={product.stage} />
                <HealthBadge health={product.health} />
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
                  {VISIBILITY_LABELS[product.visibility]}
                </span>
                {product.isArchived ? (
                  <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">
                    Archived
                  </span>
                ) : null}
              </div>
              <h1 className="text-display mt-3 text-[34px] font-semibold sm:text-[42px]">
                {product.name}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                {product.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <UserAvatar
                    name={product.owner.name}
                    src={product.owner.avatarUrl}
                    className="h-5 w-5"
                  />
                  <span className="font-medium text-ink/80">{product.owner.name}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {teamNames || "No team"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> {product.businessArea ?? "No business area"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Updated{" "}
                  {formatDate(product.lastUpdated)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {canEdit ? (
                <EditProductDialog
                  product={product}
                  owners={meta?.owners ?? []}
                  teams={meta?.teams ?? []}
                />
              ) : null}
              <ProductArchiveButton product={product} canArchive={canArchive} />
              <ProductDeleteButton product={product} canDelete={canDelete} />
              {upcoming ? (
                gate ? (
                  <GateSubmitButton
                    productId={product.id}
                    productName={product.name}
                    state={gate}
                    canSubmit={canSubmitGate}
                  />
                ) : (
                  <Button
                    type="button"
                    size="md"
                    disabled
                    title="Stage-gate state could not be loaded."
                  >
                    Submit for {stageLabel(upcoming)}
                  </Button>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps mb-1.5">Lifecycle</p>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Innovation journey
            </h2>
          </div>
          <p className="text-[11px] text-muted">
            Current stage entered {formatDate(product.currentStageEnteredAt)}
          </p>
        </div>
        <StageTracker stage={product.stage} history={product.stageHistory} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="surface-card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="label-caps mb-1.5">Overview</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Product context
                </h2>
              </div>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Description">{product.description}</Detail>
              <Detail label="Business area">{product.businessArea ?? "—"}</Detail>
              <Detail label="Product owner">
                <span className="inline-flex items-center gap-2">
                  <UserAvatar
                    name={product.owner.name}
                    src={product.owner.avatarUrl}
                    className="h-5 w-5"
                  />
                  {product.owner.name}
                </span>
              </Detail>
              <Detail label="Development teams">
                {teamNames || "—"}
              </Detail>
              <Detail label="Target users">{product.targetUsers ?? "—"}</Detail>
              <Detail label="Launch target">{formatDate(product.launchTarget)}</Detail>
              <Detail label="Expected impact">{product.expectedImpact ?? "—"}</Detail>
              <Detail label="Created">
                {formatDate(product.createdAt)}
                {product.createdBy ? ` by ${product.createdBy.name}` : ""}
              </Detail>
              {product.idea ? (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    Origin
                  </dt>
                  <dd className="mt-1.5 inline-flex items-center gap-2 rounded-2xl bg-canvas px-3 py-2 text-[12px] text-ink/75">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    Converted from the idea &ldquo;{product.idea.title}&rdquo;
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-caps mb-1.5">Milestones</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Stage-by-stage delivery
                </h2>
              </div>
              <div className="min-w-[180px]">
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted">
                  <span>
                    {product.milestoneProgress.requiredCompleted}/
                    {product.milestoneProgress.requiredTotal} required completed
                  </span>
                  <span className="font-semibold text-ink/60">
                    {product.milestoneProgress.percent}%
                  </span>
                </div>
                <Progress value={product.milestoneProgress.percent} />
              </div>
            </div>
            <ProductMilestones
              milestones={product.milestones}
              currentStage={stageMeta}
              productId={product.id}
              canManage={canManageMilestones}
              owners={meta?.owners ?? []}
              locked={product.latestGateStatus === "PENDING_APPROVAL"}
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[24px] bg-soft p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Stage gate
                </p>
                <h2 className="mt-1.5 font-display text-[17px] font-semibold tracking-tight">
                  {upcoming ? `${stageLabel(product.stage)} → ${stageLabel(upcoming)}` : "Final stage"}
                </h2>
              </div>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  gate?.pendingRequest
                    ? "bg-warning/20 text-[#9A6206]"
                    : ready
                      ? "bg-accent text-white"
                      : "bg-white text-ink/35",
                )}
              >
                <BadgeCheck className="h-4 w-4" />
              </span>
            </div>

            {gate?.pendingRequest ? (
              <GatePendingSummary request={gate.pendingRequest} />
            ) : null}

            <ul className="mt-5 space-y-3">
              {readiness.map((item) => (
                <li key={item.label} className="flex items-start gap-2.5 text-[12px]">
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      item.met ? "bg-accent text-white" : "bg-white text-ink/25",
                    )}
                  >
                    {item.met ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    ) : (
                      <X className="h-2.5 w-2.5" strokeWidth={3} />
                    )}
                  </span>
                  <span className={item.met ? "text-ink/75" : "text-ink/40"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-[16px] border border-black/[0.06] bg-white p-3.5">
              <p className="text-[11px] leading-relaxed text-muted">
                {upcoming
                  ? "Completing milestones never advances a product on its own. Submission, independent approver decisions and the approval policy are all enforced by the API."
                  : "This product has reached Monetization. Any rollback requires an administrator and a recorded reason."}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] font-medium text-muted/80">
              <span>{currentMilestones.length} milestones in this stage</span>
              <span>{formatDate(product.currentStageEnteredAt)}</span>
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="mb-5">
              <p className="label-caps mb-1.5">History</p>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Stage transitions
              </h2>
            </div>
            <ol className="space-y-4">
              {product.stageHistory.map((entry, index) => (
                <li key={entry.id} className="relative flex gap-3">
                  {index < product.stageHistory.length - 1 ? (
                    <span className="absolute left-[7px] top-5 h-[calc(100%-0.5rem)] w-px bg-line" />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white",
                      index === product.stageHistory.length - 1
                        ? "bg-accent ring-2 ring-accent/10"
                        : "bg-ink/20",
                    )}
                  />
                  <div className="min-w-0 pb-1">
                    <p className="text-[12px] font-semibold">
                      {entry.fromStage
                        ? `${stageLabel(entry.fromStage)} → ${stageLabel(entry.toStage)}`
                        : `Entered ${stageLabel(entry.toStage)}`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {formatDate(entry.createdAt)}
                      {entry.movedBy ? ` · ${entry.movedBy.name}` : ""}
                    </p>
                    {entry.reason ? (
                      <p className="mt-1 text-[10px] italic text-muted/80">
                        &ldquo;{entry.reason}&rdquo;
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="surface-card p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
              <Target className="h-3.5 w-3.5" /> Portfolio links
            </div>
            <div className="mt-3 space-y-1.5">
              {FEATURES.projectsMilestones ? (
                <Link
                  href="/admin/milestones"
                  className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] text-ink/70 transition hover:bg-canvas hover:text-ink"
                >
                  Projects & milestones <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
              <Link
                href="/admin/approvals"
                className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] text-ink/70 transition hover:bg-canvas hover:text-ink"
              >
                Stage gate approvals <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href={`/products/${product.slug}`}
                className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] text-ink/70 transition hover:bg-canvas hover:text-ink"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" /> Public view
                </span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
