"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { LIFECYCLE_STAGES, type PublicProductListItem } from "@ims/shared";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/portal/public-product-card";

export function PortfolioExplorer({
  products,
}: {
  products: PublicProductListItem[];
}) {
  const [search, setSearch] = React.useState("");
  const [stage, setStage] = React.useState("");
  const [team, setTeam] = React.useState("");
  const [area, setArea] = React.useState("");

  const teams = React.useMemo(
    () =>
      Array.from(
        new Set(
          products.flatMap((product) =>
            product.teams.length
              ? product.teams.map((item) => item.name)
              : product.team
                ? [product.team.name]
                : [],
          ),
        ),
      )
        .sort()
        .map((name) => name as string),
    [products],
  );

  const areas = React.useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.businessArea).filter(Boolean)),
      )
        .sort()
        .map((name) => name as string),
    [products],
  );

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const teamNames = (product: PublicProductListItem) =>
      product.teams.length
        ? product.teams.map((item) => item.name)
        : product.team
          ? [product.team.name]
          : [];
    return products.filter((product) => {
      if (stage && product.stage !== stage) return false;
      if (team && !teamNames(product).includes(team)) return false;
      if (area && product.businessArea !== area) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.owner.name.toLowerCase().includes(term) ||
        teamNames(product).some((name) => name.toLowerCase().includes(term))
      );
    });
  }, [products, search, stage, team, area]);

  const hasFilters = Boolean(search || stage || team || area);

  function reset() {
    setSearch("");
    setStage("");
    setTeam("");
    setArea("");
  }

  return (
    <div>
      <div className="glass-card rounded-[26px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, owners or teams…"
              className="border-white/80 bg-white/80 pl-11 backdrop-blur placeholder:text-muted/70 focus:bg-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:ml-auto lg:flex lg:items-center">
            <Select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="h-10 border-white/80 bg-white/80 text-[12px] backdrop-blur lg:w-[136px]"
              aria-label="Filter by stage"
            >
              <option value="">All stages</option>
              {LIFECYCLE_STAGES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="h-10 border-white/80 bg-white/80 text-[12px] backdrop-blur lg:w-[130px]"
              aria-label="Filter by team"
            >
              <option value="">All teams</option>
              {teams.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="h-10 border-white/80 bg-white/80 text-[12px] backdrop-blur lg:w-[150px]"
              aria-label="Filter by business area"
            >
              <option value="">All areas</option>
              {areas.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/70 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <SlidersHorizontal className="h-3 w-3" />
            {filtered.length} product{filtered.length === 1 ? "" : "s"} on display
          </span>
          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink/60 shadow-card transition hover:text-ink"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[28px] border border-dashed border-white bg-white/40 px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No products match those filters</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Try another stage or team — or clear the filters to explore the full showcase.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={reset}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <PublicProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
