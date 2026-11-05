import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CalendarDays,
  Heart,
  Megaphone,
  Target,
  Users,
} from "lucide-react";
import { LIFECYCLE_STAGES, stageLabel, type PublicProductDetail } from "@ims/shared";
import { serverGet } from "@/lib/server-api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StageBadge, HealthBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StageTracker } from "@/components/shared/stage-tracker";
import { ProductMilestones } from "@/components/shared/milestone-list";
import {
  ContactOwnerButton,
  ContactOwnerCardAction,
} from "@/components/portal/contact-owner";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await serverGet<PublicProductDetail>(`/api/public/products/${slug}`);
  return { title: product ? product.name : "Product" };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-ink/85">{children}</dd>
    </div>
  );
}

export default async function PublicProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await serverGet<PublicProductDetail>(`/api/public/products/${slug}`);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-ink">
          <ArrowLeft className="h-3 w-3" /> Product portfolio
        </Link>
        <span className="text-ink/20">/</span>
        <span className="truncate font-medium text-ink/70">{product.name}</span>
      </div>

      <section className="relative mt-4 overflow-hidden rounded-[32px] border border-white/80 bg-white p-6 shadow-card sm:p-9">
        <span
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            background: `linear-gradient(90deg, ${
              LIFECYCLE_STAGES.find((stage) => stage.key === product.stage)?.accent ??
              "#0284C7"
            }, transparent)`,
          }}
        />
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lilac/20 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <StageBadge stage={product.stage} />
              <HealthBadge health={product.health} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
                <CalendarClock className="h-3 w-3" /> {product.timeInStageDays} days in stage
              </span>
            </div>

            <h1 className="text-display mt-4 text-[38px] font-semibold leading-[1.02] sm:text-[52px]">
              {product.name}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              {product.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[12px] text-muted">
              <span className="inline-flex items-center gap-2">
                <UserAvatar
                  name={product.owner.name}
                  src={product.owner.avatarUrl}
                  className="h-7 w-7"
                />
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.1em] text-muted/70">
                    Product owner
                  </span>
                  <span className="font-semibold text-ink/85">{product.owner.name}</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />{" "}
                {product.teams.length
                  ? product.teams.map((team) => team.name).join(", ")
                  : (product.team?.name ?? "DxValley")}{" "}
                team
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />{" "}
                {product.businessArea ?? "Innovation portfolio"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className="flex items-center gap-2 rounded-full border border-line bg-canvas/60 px-3.5 py-2 text-[11px] font-medium text-muted">
              <Heart className="h-3.5 w-3.5 text-danger" />
              Followed by {product.followerCount} colleague
              {product.followerCount === 1 ? "" : "s"}
            </div>
            {product.contactEmail ? (
              <ContactOwnerButton
                ownerName={product.owner.name}
                ownerAvatarUrl={product.owner.avatarUrl}
                productName={product.name}
                contactEmail={product.contactEmail}
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <section className="surface-card p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-caps mb-1.5">Product journey</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Where {product.name} stands today
                </h2>
              </div>
              <p className="text-[11px] text-muted">
                In {stageLabel(product.stage)} since {formatDate(product.currentStageEnteredAt)}
              </p>
            </div>
            <StageTracker stage={product.stage} history={product.stageHistory} />
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-caps mb-1.5">Milestones</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Delivery progress
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
              currentStage={product.stage}
              readOnly
            />
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
                <Megaphone className="h-4 w-4" />
              </span>
              <div>
                <p className="label-caps mb-0.5">Product updates</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Notes from the team
                </h2>
              </div>
            </div>
            {product.updates.length === 0 ? (
              <p className="rounded-[20px] border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
                No public updates have been shared yet. Check back as the product advances.
              </p>
            ) : (
              <ol className="space-y-4">
                {product.updates.map((update, index) => (
                  <li
                    key={update.id}
                    className="relative rounded-[20px] border border-line bg-canvas/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold">{update.title}</p>
                      <span className="text-[10px] font-medium text-muted">
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                      {update.body}
                    </p>
                    {index === 0 ? (
                      <span className="absolute -top-2 left-4 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink">
                        Latest
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="surface-card p-5 sm:p-6">
            <p className="label-caps mb-1.5">At a glance</p>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Product facts
            </h2>
            <dl className="mt-5 space-y-5">
              <Fact label="Business area">{product.businessArea ?? "—"}</Fact>
              <Fact label="Target users">{product.targetUsers ?? "Not published yet"}</Fact>
              <Fact label="Expected impact">
                {product.expectedImpact ?? "Not published yet"}
              </Fact>
              <Fact label="Launch target">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted" />
                  {formatDate(product.launchTarget)}
                </span>
              </Fact>
              <Fact label="Product owner">{product.owner.name}</Fact>
              <Fact label="Development teams">
                {product.teams.length
                  ? product.teams.map((team) => team.name).join(", ")
                  : (product.team?.name ?? "DxValley")}
              </Fact>
              <Fact label="In the portfolio since">{formatDate(product.createdAt)}</Fact>
            </dl>
          </section>

          <section className="relative overflow-hidden rounded-[28px] bg-navy p-6 text-white">
            <div className="page-grid absolute inset-0 opacity-[0.09]" />
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-[70px]" />
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Target className="h-5 w-5 text-accent" />
            </span>
            <h2 className="relative mt-4 font-display text-lg font-semibold tracking-tight">
              Have context to share?
            </h2>
            <p className="relative mt-2 text-[12px] leading-relaxed text-white/55">
              Reach the product owner directly with feedback, a pilot opportunity or a team
              that could help move this product forward.
            </p>
            {product.contactEmail ? (
              <ContactOwnerCardAction
                ownerName={product.owner.name}
                ownerAvatarUrl={product.owner.avatarUrl}
                productName={product.name}
                contactEmail={product.contactEmail}
              />
            ) : (
              <p className="relative mt-4 text-[11px] text-white/40">
                Contact details are managed by the innovation office.
              </p>
            )}
          </section>

          <section className="surface-card p-5">
            <p className="text-[11px] font-semibold text-muted">Keep exploring</p>
            <div className="mt-3 space-y-1.5">
              <Link
                href="/"
                className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] text-ink/70 transition hover:bg-canvas hover:text-ink"
              >
                Back to the portfolio <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/submit-idea"
                className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] text-ink/70 transition hover:bg-canvas hover:text-ink"
              >
                Submit your own idea <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 flex justify-center pb-4">
        <Button asChild variant="outline" size="md">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Explore all products
          </Link>
        </Button>
      </div>
    </main>
  );
}
