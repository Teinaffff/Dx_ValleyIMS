import { Check } from "lucide-react";
import { LIFECYCLE_STAGES } from "@ims/shared";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export function StageTracker({
  stage,
  history,
  variant = "full",
  className,
}: {
  stage: string;
  history?: { toStage: string; createdAt: string }[];
  variant?: "full" | "compact";
  className?: string;
}) {
  const currentIndex = LIFECYCLE_STAGES.findIndex((item) => item.key === stage);

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)} aria-label={`Stage: ${stage}`}>
        {LIFECYCLE_STAGES.map((item, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;
          return (
            <span
              key={item.key}
              title={item.label}
              className={cn(
                "h-1.5 rounded-full transition-all",
                completed
                  ? "w-4 bg-primary"
                  : current
                    ? "w-6 bg-navy"
                    : "w-3 bg-ink/10",
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-x-auto no-scrollbar", className)}>
      <ol className="flex min-w-[640px] items-start gap-0">
        {LIFECYCLE_STAGES.map((item, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;
          const date = history?.find((entry) => entry.toStage === item.key)?.createdAt;
          return (
            <li key={item.key} className="flex flex-1 items-start">
              <div className="flex flex-col items-center px-1">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold transition",
                    completed
                      ? "border-primary bg-primary text-white"
                      : current
                        ? "border-navy bg-navy text-white shadow-[0_0_0_5px_rgba(10,16,36,0.08)]"
                        : "border-line bg-surface text-muted",
                  )}
                >
                  {completed ? <Check className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "mt-2.5 whitespace-nowrap text-[11px] font-semibold",
                    current ? "text-ink" : completed ? "text-ink/70" : "text-muted",
                  )}
                >
                  {item.label}
                </span>
                <span className="mt-0.5 h-3 whitespace-nowrap text-[10px] text-muted">
                  {completed || current ? (date ? formatDate(date) : current ? "Current" : "") : ""}
                </span>
              </div>
              {index < LIFECYCLE_STAGES.length - 1 ? (
                <span
                  className={cn(
                    "mt-[17px] h-0.5 flex-1 rounded-full",
                    index < currentIndex ? "bg-primary/60" : "bg-line",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
