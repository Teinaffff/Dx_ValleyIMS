import { LIFECYCLE_STAGES } from "@ims/shared";
import { cn } from "@/lib/utils";

const skeleton = "bg-[#E9EDF6]";

export function ProductPreview({
  accent,
  percent,
  stageIndex,
}: {
  accent: string;
  percent: number;
  stageIndex: number;
}) {
  return (
    <div
      className="relative h-[148px] overflow-hidden rounded-[18px]"
      style={{
        background: `linear-gradient(155deg, ${accent}2E 0%, #FFFFFF 52%, ${accent}14 100%)`,
      }}
    >
      <span
        className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <span className="pointer-events-none absolute -bottom-14 right-[-30px] h-36 w-36 rounded-full bg-white/80 blur-2xl" />

      <div className="absolute inset-x-4 top-4 rounded-[14px] border border-white/90 bg-white/90 p-3 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
            style={{ backgroundColor: `${accent}26` }}
          >
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: accent }} />
          </span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className={cn("block h-1.5 w-20 rounded-full", skeleton)} />
            <span className={cn("block h-1.5 w-12 rounded-full", skeleton)} />
          </span>
          <span className={cn("h-5 w-5 shrink-0 rounded-full", skeleton)} />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {LIFECYCLE_STAGES.map((stage, index) => {
            const done = index < stageIndex;
            const current = index === stageIndex;
            return (
              <span
                key={stage.key}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor: current ? accent : done ? `${accent}80` : "#E9EDF6",
                }}
              />
            );
          })}
        </div>

        <div className="mt-3">
          <span className={cn("block h-1.5 overflow-hidden rounded-full", skeleton)}>
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(4, percent)}%`, backgroundColor: accent }}
            />
          </span>
          <div className="mt-2 flex items-center justify-between">
            <span className={cn("h-1.5 w-9 rounded-full", skeleton)} />
            <span className={cn("h-1.5 w-5 rounded-full", skeleton)} />
          </div>
        </div>
      </div>
    </div>
  );
}
