"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Search, SlidersHorizontal, X } from "lucide-react";
import { LIFECYCLE_STAGES, HEALTH_LABELS, PRODUCT_HEALTH } from "@ims/shared";
import type { TeamRef, UserRef } from "@ims/shared";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";

export function PortfolioFilters({
  owners,
  teams,
  total,
}: {
  owners: UserRef[];
  teams: TeamRef[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");

  React.useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  function push(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    push(params);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setParam("search", search.trim());
  }

  const showArchived = searchParams.get("includeArchived") === "true";
  const activeFilters = ["stage", "ownerId", "teamId", "health", "search", "includeArchived"].filter(
    (key) => searchParams.get(key),
  ).length;

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <form onSubmit={submitSearch} className="relative flex-1 xl:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products by name or owner…"
            className="pl-11"
          />
        </form>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:ml-auto xl:flex xl:items-center">
          <Select
            value={searchParams.get("stage") ?? ""}
            onChange={(event) => setParam("stage", event.target.value)}
            className="h-10 text-[12px] xl:w-[138px]"
            aria-label="Filter by lifecycle stage"
          >
            <option value="">All stages</option>
            {LIFECYCLE_STAGES.map((stage) => (
              <option key={stage.key} value={stage.key}>
                {stage.label}
              </option>
            ))}
          </Select>

          <Select
            value={searchParams.get("ownerId") ?? ""}
            onChange={(event) => setParam("ownerId", event.target.value)}
            className="h-10 text-[12px] xl:w-[150px]"
            aria-label="Filter by product owner"
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </Select>

          <Select
            value={searchParams.get("teamId") ?? ""}
            onChange={(event) => setParam("teamId", event.target.value)}
            className="h-10 text-[12px] xl:w-[140px]"
            aria-label="Filter by development team"
          >
            <option value="">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>

          <Select
            value={searchParams.get("health") ?? ""}
            onChange={(event) => setParam("health", event.target.value)}
            className="h-10 text-[12px] xl:w-[132px]"
            aria-label="Filter by product health"
          >
            <option value="">All health</option>
            {PRODUCT_HEALTH.map((health) => (
              <option key={health} value={health}>
                {HEALTH_LABELS[health]}
              </option>
            ))}
          </Select>

          <Select
            value={searchParams.get("sort") ?? "updated_desc"}
            onChange={(event) => setParam("sort", event.target.value)}
            className="h-10 text-[12px] xl:w-[158px]"
            aria-label="Sort products"
          >
            <option value="updated_desc">Recently updated</option>
            <option value="updated_asc">Oldest update</option>
            <option value="name_asc">Name A–Z</option>
            <option value="created_desc">Newest created</option>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line/70 pt-3">
        <button
          type="button"
          aria-pressed={showArchived}
          onClick={() => setParam("includeArchived", showArchived ? "" : "true")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
            showArchived
              ? "border-primary bg-primary-soft text-primary"
              : "border-line bg-surface text-muted hover:border-primary/30 hover:text-ink",
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? "Showing archived" : "Show archived"}
        </button>

        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <SlidersHorizontal className="h-3 w-3" />
          {total} product{total === 1 ? "" : "s"} in view
        </span>

        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              push(new URLSearchParams());
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-ink/60 transition hover:text-ink"
          >
            <X className="h-3 w-3" /> Clear {activeFilters} filter
            {activeFilters === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
