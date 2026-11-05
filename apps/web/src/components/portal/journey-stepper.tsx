import Link from "next/link";
import { Check } from "lucide-react";
import type { PublicPortfolio } from "@ims/shared";
import { cn } from "@/lib/utils";

type Stage = PublicPortfolio["stages"][number];
type StepState = "done" | "current" | "next";

function stepState(index: number, current: number): StepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "next";
}

function StepCircle({
  index,
  state,
  className,
}: {
  index: number;
  state: StepState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold transition duration-300 group-hover:scale-105",
        state === "next"
          ? "border-white bg-[#EBEFF7] text-ink/40"
          : "border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(2,132,199,0.9)]",
        state === "current" && "ring-4 ring-primary/10",
        className,
      )}
    >
      {state === "done" ? (
        <Check className="h-4 w-4" strokeWidth={3} />
      ) : (
        index + 1
      )}
    </span>
  );
}

function Fill({ percent }: { percent: number }) {
  return (
    <span
      className="absolute inset-y-0 left-0 rounded-full bg-primary"
      style={{ width: `${percent}%` }}
    />
  );
}

export function JourneyStepper({ stages }: { stages: PublicPortfolio["stages"] }) {
  if (!stages.length) return null;
  const focusIndex = stages.reduce(
    (best, stage, index) => (stage.count > stages[best].count ? index : best),
    0,
  );

  return (
    <>
      <div className="mt-8 hidden rounded-[28px] border border-[#E3E6EF] bg-white px-6 py-9 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.4)] md:block sm:px-8">
        <div className="grid grid-cols-6">
          {stages.map((stage, index) => {
            const state = stepState(index, focusIndex);
            const before = index <= focusIndex ? 100 : 0;
            const after = index < focusIndex ? 100 : index === focusIndex ? 45 : 0;
            return (
              <Link
                key={stage.stage}
                href="#portfolio"
                title={stage.summary}
                className="group flex flex-col items-center"
              >
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "relative h-[2px] flex-1 overflow-hidden rounded-full bg-line",
                      index === 0 && "opacity-0",
                    )}
                  >
                    <Fill percent={before} />
                  </span>
                  <StepCircle index={index} state={state} className="h-11 w-11" />
                  <span
                    className={cn(
                      "relative h-[2px] flex-1 overflow-hidden rounded-full bg-line",
                      index === stages.length - 1 && "opacity-0",
                    )}
                  >
                    <Fill percent={after} />
                  </span>
                </div>

                <span
                  className={cn(
                    "mt-4 text-center text-[13px] font-semibold tracking-[-0.01em] transition duration-300",
                    state === "next" ? "text-muted group-hover:text-ink" : "text-ink",
                  )}
                >
                  {stage.label}
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-muted">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: stage.accent }}
                  />
                  {stage.count} live
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-[26px] border border-[#E3E6EF] bg-white p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.4)] md:hidden">
        <ol>
          {stages.map((stage, index) => {
            const state = stepState(index, focusIndex);
            const rail = index < focusIndex ? 100 : index === focusIndex ? 45 : 0;
            return (
              <li key={stage.stage} className="relative">
                {index < stages.length - 1 ? (
                  <span className="absolute bottom-0 left-5 top-10 w-[2px] -translate-x-1/2 overflow-hidden rounded-full bg-line">
                    <span
                      className="absolute inset-x-0 top-0 bg-primary"
                      style={{ height: `${rail}%` }}
                    />
                  </span>
                ) : null}
                <Link
                  href="#portfolio"
                  className={cn(
                    "group flex gap-3.5",
                    index < stages.length - 1 && "pb-6",
                  )}
                >
                  <StepCircle
                    index={index}
                    state={state}
                    className="h-10 w-10 text-[12px]"
                  />
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[13px] font-semibold tracking-[-0.01em]",
                          state === "next" ? "text-ink/70" : "text-ink",
                        )}
                      >
                        {stage.label}
                      </span>
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink/45">
                        {stage.count} live
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                      {stage.summary}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
