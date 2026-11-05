import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
import {
  LIFECYCLE_STAGES,
  type ProductListResult,
} from "@ims/shared";
import { serverGet } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HealthBadge, StageBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Innovation pipeline" };

export default async function PipelinePage() {
  const data = await serverGet<ProductListResult>("/api/products?pageSize=50&sort=updated_desc");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Innovation pipeline"
        title="The portfolio, stage by stage."
        description="A stage-aligned view of every active product. The pipeline is a progress model, not a task board — products advance only when a stage gate is approved."
      />

      {!data ? (
        <EmptyState
          icon={<GitBranch className="h-5 w-5" />}
          title="Pipeline unavailable"
          description="The product pipeline could not be loaded from the API."
        />
      ) : (
        <div className="space-y-4">
          {LIFECYCLE_STAGES.map((stage, index) => {
            const products = data.items.filter((product) => product.stage === stage.key);
            return (
              <section key={stage.key} className="surface-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-soft text-[11px] font-semibold text-ink/50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[17px] font-semibold tracking-tight">
                      {stage.label}
                    </h2>
                    <p className="text-[11px] text-muted">{stage.summary}</p>
                  </div>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-soft px-2 text-xs font-semibold text-ink/60">
                      {products.length}
                    </span>
                    <Link
                      href={`/admin/products?stage=${stage.key}`}
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      Filter portfolio
                    </Link>
                  </span>
                </div>

                <div className="border-t border-line/70 px-5 py-4 sm:px-6">
                  {products.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-[12px] text-muted">
                      No products in {stage.label} right now.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {products.map((product) => (
                        <Link
                          key={product.id}
                          href={`/admin/products/${product.id}`}
                          className="group rounded-[18px] bg-soft p-4 transition-colors hover:bg-soft-strong"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold group-hover:text-primary">
                              {product.name}
                            </p>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted transition group-hover:text-primary" />
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                            {product.description}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
                              <UserAvatar
                                name={product.owner.name}
                                src={product.owner.avatarUrl}
                                className="h-5 w-5"
                              />
                              <span className="truncate">{product.owner.name}</span>
                            </span>
                            <HealthBadge health={product.health} />
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Progress
                              value={product.milestoneProgress.percent}
                              className="flex-1"
                            />
                            <span className="text-[9px] font-semibold text-muted">
                              {product.milestoneProgress.percent}%
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-2 px-1 text-[11px] text-muted">
        <StageBadge stage="IDEATION" showDot={false} />
        Products always belong to exactly one stage. Completed stages remain in each
        product&apos;s history forever.
      </p>
    </div>
  );
}
