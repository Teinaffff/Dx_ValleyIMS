import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import {
  LIFECYCLE_STAGES,
  stageLabel,
  type PublicProductListItem,
} from "@ims/shared";
import { HealthBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { ProductPreview } from "@/components/portal/card-preview";

export function PublicProductCard({ product }: { product: PublicProductListItem }) {
  const stage = LIFECYCLE_STAGES.find((item) => item.key === product.stage);
  const accent = stage?.accent ?? "#0284C7";
  const stageIndex = stage ? stage.order - 1 : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col rounded-[24px] border border-[#E3E6EF] bg-white p-3.5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.4)] transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_30px_60px_-38px_rgba(2,132,199,0.5)]"
    >
      <ProductPreview
        accent={accent}
        percent={product.milestoneProgress.percent}
        stageIndex={stageIndex}
      />

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
            {stageLabel(product.stage)}
          </span>
          <HealthBadge health={product.health} />
        </div>

        <h3 className="mt-2 font-display text-[17px] font-semibold tracking-[-0.01em] transition group-hover:text-primary">
          {product.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[12px] leading-relaxed text-muted">
          {product.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar
              name={product.owner.name}
              src={product.owner.avatarUrl}
              className="h-6 w-6"
            />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold text-ink/80">
                {product.owner.name}
              </span>
              <span className="block truncate text-[10px] text-muted">
                {product.teams.length
                  ? product.teams.map((team) => team.name).join(", ")
                  : (product.team?.name ?? "DxValley")}{" "}
                team
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted">
            <CalendarClock className="h-3 w-3" />
            {product.timeInStageDays}d
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 px-3.5 py-2 text-[11px] font-semibold text-primary transition group-hover:bg-primary group-hover:text-white">
            View product <ArrowRight className="h-3 w-3" />
          </span>
          <span className="text-[10px] font-semibold text-muted">
            {product.milestoneProgress.percent}% complete
          </span>
        </div>
      </div>
    </Link>
  );
}
