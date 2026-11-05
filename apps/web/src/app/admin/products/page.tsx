import Link from "next/link";
import { Archive, ArrowLeft, ArrowRight, Layers } from "lucide-react";
import { PERMISSIONS, type CategoryMeta, type ProductListResult } from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PortfolioFilters } from "@/components/admin/portfolio-filters";
import { PortfolioTable } from "@/components/admin/portfolio-table";
import { CreateProductDialog } from "@/components/admin/product-form";

export const metadata = { title: "Product portfolio" };

type SearchParams = Record<string, string | string[] | undefined>;

const FILTER_KEYS = [
  "search",
  "stage",
  "ownerId",
  "teamId",
  "health",
  "sort",
  "includeArchived",
] as const;

function readParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(readParam(params, "page") ?? 1) || 1);

  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = readParam(params, key);
    if (value) query.set(key, value);
  }
  query.set("page", String(page));
  query.set("pageSize", "10");

  const [session, data, meta] = await Promise.all([
    getSession(),
    serverGet<ProductListResult>(`/api/products?${query.toString()}`),
    serverGet<CategoryMeta>("/api/products/meta"),
  ]);

  const canCreate =
    session?.role === "ADMIN" ||
    session?.permissions.includes(PERMISSIONS.PRODUCT_CREATE) === true;
  const canDelete = session?.role === "ADMIN";
  const canArchive = session?.role === "ADMIN";
  const includeArchived = readParam(params, "includeArchived") === "true";

  function archivedHref() {
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      if (key === "includeArchived") continue;
      const value = readParam(params, key);
      if (value) next.set(key, value);
    }
    if (!includeArchived) next.set("includeArchived", "true");
    const query = next.toString();
    return query ? `/admin/products?${query}` : "/admin/products";
  }

  function pageHref(target: number) {
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = readParam(params, key);
      if (value) next.set(key, value);
    }
    next.set("page", String(target));
    return `/admin/products?${next.toString()}`;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Product portfolio"
        title="Every product, one pipeline."
        description="Search, filter and open any product in the portfolio. Lifecycle stage, milestone progress and health are calculated from live product data."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canArchive ? (
              <Button asChild variant="outline" size="md">
                <Link href={archivedHref()}>
                  <Archive className="h-4 w-4" />
                  {includeArchived ? "Hide archived" : "Archived products"}
                </Link>
              </Button>
            ) : null}
            {canCreate ? (
              <CreateProductDialog
                owners={meta?.owners ?? []}
                teams={meta?.teams ?? []}
                defaultOpen={readParam(params, "new") === "1"}
              />
            ) : null}
          </div>
        }
      />

      <PortfolioFilters
        owners={meta?.owners ?? []}
        teams={meta?.teams ?? []}
        total={data?.total ?? 0}
      />

      {includeArchived && canArchive ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 text-[12px] leading-relaxed text-ink/75">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold text-ink">Archived products are shown.</span>{" "}
            Use <span className="font-semibold">Restore</span> on an archived row, or open
            the product and choose <span className="font-semibold">Restore</span>, to
            return it to the active portfolio.
          </p>
        </div>
      ) : null}

      {!data ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="Portfolio unavailable"
          description="The product list could not be loaded. Confirm the API is running and that your account can view products."
        />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No products match these filters"
          description="Try a different stage, owner or team — or clear the filters to see the full portfolio."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <section className="surface-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label-caps mb-1">Portfolio</p>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {data.total} product{data.total === 1 ? "" : "s"}
                <span className="ml-2 text-xs font-medium text-muted">
                  page {data.page} of {data.pageCount}
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-muted">
              Health is rule-based: overdue required milestones, revision requests and
              completed monetization.
            </p>
          </div>

          <PortfolioTable
            products={data.items}
            showActions={canCreate || canDelete}
            canDelete={canDelete}
          />

          <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-4">
            <p className="text-[11px] text-muted">
              Showing {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              {data.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(data.page - 1)}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </Button>
              )}
              {data.page < data.pageCount ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(data.page + 1)}>
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
