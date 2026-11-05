import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers, Plus } from "lucide-react";
import type { DashboardData } from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { FEATURES } from "@/config/features";
import { formatLongDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/kpi-card";
import { ProductsTable } from "@/components/admin/products-table";
import { ApprovalList } from "@/components/admin/approval-list";
import { ActivityFeed } from "@/components/admin/activity-feed";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [session, data] = await Promise.all([
    getSession(),
    serverGet<DashboardData>("/api/dashboard"),
  ]);

  if (!data) {
    return (
      <div className="surface-card p-10 text-center">
        <h1 className="font-display text-2xl font-semibold">Dashboard unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          We could not load the innovation workspace. Check that the API is running, then
          refresh this page.
        </p>
      </div>
    );
  }

  const firstName = session?.name.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const pending = data.kpis.find((kpi) => kpi.key === "pending-approvals")?.value ?? 0;
  const busiestStage = Math.max(1, ...data.pipeline.map((stage) => stage.count));

  return (
    <div className="space-y-7 pb-2 pt-2">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">{formatLongDate(new Date())}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.025em] sm:text-[30px]">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
            A live read on ideas, stage gates and the products moving through the pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/products">
              <Layers className="h-3.5 w-3.5" /> Open portfolio
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/products?new=1">
              <Plus className="h-3.5 w-3.5" /> New product
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-black/[0.06] bg-black/[0.06] sm:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      <section className="min-w-0 rounded-[24px] border border-black/[0.06] p-5 sm:p-6">
        <p className="label-caps mb-1.5">Innovation pipeline</p>
        <h2 className="font-display text-[17px] font-semibold tracking-tight">
          Six stages, one honest journey
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-x-5 gap-y-6 sm:grid-cols-6">
          {data.pipeline.map((stage) => {
            const percent = Math.round((stage.count / busiestStage) * 100);
            return (
              <Link
                key={stage.stage}
                href={`/admin/products?stage=${stage.stage}`}
                className="group block"
                title={`${stage.count} product${stage.count === 1 ? "" : "s"} in ${stage.label}`}
              >
                <span className="font-display text-[19px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {stage.count}
                </span>
                <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
                  <span
                    className="block h-full rounded-full bg-accent transition-all duration-500 group-hover:bg-accent/75"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="mt-2 block truncate text-[11px] font-medium text-muted transition-colors group-hover:text-ink">
                  {stage.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-[18px] border border-black/[0.06] bg-soft p-4">
          <p className="text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-ink">Reminder:</span> completing every
            milestone never moves a product on its own. A stage gate needs the configured
            approvers to agree first.
          </p>
          {FEATURES.systemConfiguration ? (
            <Link
              href="/admin/settings"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
            >
              Review approval policy <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-[24px] border border-black/[0.06] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="label-caps mb-1.5">Product portfolio</p>
              <h2 className="font-display text-[17px] font-semibold tracking-tight">
                Recently updated
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/products">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ProductsTable products={data.products} />
        </section>

        <section className="flex min-w-0 flex-col rounded-[24px] border border-black/[0.06] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="label-caps mb-1.5">Stage gates</p>
              <h2 className="font-display text-[17px] font-semibold tracking-tight">
                Pending approvals
              </h2>
            </div>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-warning/10 px-2 text-xs font-semibold text-[#9A6206]">
              {pending}
            </span>
          </div>
          <div className="flex-1">
            <ApprovalList approvals={data.approvals} />
          </div>
          <Button asChild variant="outline" size="sm" className="mt-5 w-full">
            <Link href="/admin/approvals">
              Open approvals workspace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>
      </div>

      <section className="min-w-0 rounded-[24px] border border-black/[0.06] p-5 sm:p-6">
        <div className="mb-5">
          <p className="label-caps mb-1.5">Activity</p>
          <h2 className="font-display text-[17px] font-semibold tracking-tight">
            Recent movements
          </h2>
        </div>
        <ActivityFeed activities={data.activities} />
      </section>
    </div>
  );
}
