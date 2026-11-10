import { CheckCircle2, XCircle } from "lucide-react";
import type { AttemptResult } from "@ims/shared";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export function EvaluatorResults({ result }: { result: AttemptResult }) {
  const tone = result.passed ? "text-success" : "text-danger";
  return (
    <div className="rounded-[24px] border border-line/70 bg-canvas/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Overall score
          </p>
          <p className={cn("text-display mt-1 text-[44px] font-semibold leading-none", tone)}>
            {Math.round(result.score)}%
          </p>
          <p className="mt-2 text-[11px] text-muted">
            Pass mark {result.passScore}% · {formatDate(result.submittedAt)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
            result.passed ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
          )}
        >
          {result.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {result.passed ? "Passed" : result.expired ? "Time expired" : "Not passed"}
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {result.breakdown.map((row) => (
          <li key={row.competency}>
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="min-w-0 truncate font-medium">{row.label}</span>
              <span className="shrink-0 text-muted">
                {row.correct}/{row.total} · {Math.round(row.percent)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.percent >= result.passScore ? "bg-success" : row.percent >= 50 ? "bg-warning" : "bg-danger",
                )}
                style={{ width: `${row.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
