import type { Kpi } from "@ims/shared";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="bg-white px-5 py-5" title={kpi.helper}>
      <div className="flex items-end gap-1">
        <span className="font-display text-[30px] font-semibold leading-none tracking-[-0.04em] text-ink">
          {kpi.value}
        </span>
        {kpi.suffix ? (
          <span className="pb-0.5 text-sm font-semibold text-muted">{kpi.suffix}</span>
        ) : null}
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-muted">{kpi.label}</p>
    </div>
  );
}
