import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PipelineStageStat } from "@ims/shared";
import { cn } from "@/lib/utils";

export function PipelineCard({
  stage,
  index,
  active,
}: {
  stage: PipelineStageStat;
  index: number;
  active?: boolean;
}) {
  return (
    <Link
      href={`/admin/products?stage=${stage.stage}`}
      className={cn(
        "group relative flex min-w-[150px] flex-col rounded-[18px] bg-soft p-4 transition-colors duration-200 hover:bg-soft-strong",
        active && "bg-accent-soft",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
        <ArrowUpRight className="h-3 w-3 text-ink/25 transition group-hover:text-accent" />
      </div>
      <span className="mt-3 font-display text-[30px] font-semibold leading-none tracking-[-0.04em]">
        {stage.count}
      </span>
      <span className="mt-1.5 text-xs font-medium text-ink/60">{stage.label}</span>
    </Link>
  );
}
