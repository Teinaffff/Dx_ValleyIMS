"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Archive, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import type { ProductListItem } from "@ims/shared";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { StageBadge, HealthBadge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StageTracker } from "@/components/shared/stage-tracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArchiveProductDialog } from "@/components/admin/archive-product-dialog";
import { DeleteProductDialog } from "@/components/admin/delete-product-dialog";

export function ProductsTable({
  products,
  showActions = false,
  showArchived = false,
  canDelete = false,
  onArchive,
  onRestore,
  onDelete,
  className,
}: {
  products: ProductListItem[];
  showActions?: boolean;
  showArchived?: boolean;
  canDelete?: boolean;
  onArchive?: (
    product: ProductListItem,
  ) => Promise<boolean | void> | boolean | void;
  onRestore?: (product: ProductListItem) => void;
  onDelete?: (
    product: ProductListItem,
  ) => Promise<boolean | void> | boolean | void;
  className?: string;
}) {
  const [archiveTarget, setArchiveTarget] = useState<ProductListItem | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const teamLabel = (product: ProductListItem) =>
    product.teams.length
      ? product.teams.map((team) => team.name).join(", ")
      : (product.team?.name ?? "No team");

  return (
    <div className={className}>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              <th className="pb-3 pl-1 pr-4 font-semibold">Product</th>
              <th className="px-4 pb-3 font-semibold">Stage</th>
              <th className="px-4 pb-3 font-semibold">Owner</th>
              <th className="px-4 pb-3 font-semibold">Milestones</th>
              <th className="px-4 pb-3 font-semibold">Health</th>
              <th className="px-4 pb-3 font-semibold">Updated</th>
              <th className="pb-3 pl-4 pr-1 text-right font-semibold">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className={cn(
                  "group border-t border-line/80 transition-colors hover:bg-soft/70",
                  product.isArchived && "opacity-60",
                )}
              >
                <td className="py-3.5 pl-1 pr-4">
                  <Link href={`/admin/products/${product.id}`} className="block max-w-[280px]">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink group-hover:text-primary">
                      {product.name}
                      {product.isArchived ? (
                        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                          Archived
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {teamLabel(product)} · {product.businessArea ?? "Unassigned area"}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <div className="space-y-2">
                    <StageBadge stage={product.stage} />
                    <StageTracker
                      stage={product.stage}
                      variant="compact"
                      className="w-[62px]"
                    />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={product.owner.name}
                      src={product.owner.avatarUrl}
                      className="h-7 w-7"
                    />
                    <span className="max-w-[110px] truncate text-xs font-medium text-ink/80">
                      {product.owner.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="w-28">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted">
                      <span>
                        {product.milestoneProgress.requiredCompleted}/
                        {product.milestoneProgress.requiredTotal} required
                      </span>
                      <span className="font-semibold text-ink/60">
                        {product.milestoneProgress.percent}%
                      </span>
                    </div>
                    <Progress value={product.milestoneProgress.percent} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <HealthBadge health={product.health} />
                </td>
                <td className="px-4 py-3.5 text-xs text-muted">
                  {formatDate(product.lastUpdated)}
                </td>
                <td className="py-3.5 pl-4 pr-1 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {showActions && product.isArchived && onRestore ? (
                      <button
                        type="button"
                        onClick={() => onRestore(product)}
                        className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] font-semibold text-ink/70 transition hover:border-primary/30 hover:text-primary"
                        title={`Restore ${product.name} to the active portfolio`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                    ) : null}
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                      aria-label={`Open ${product.name}`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    {showActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-ink/[0.05] hover:text-ink"
                            aria-label="Product actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${product.id}`}>Open product</Link>
                          </DropdownMenuItem>
                          {!product.isArchived && onArchive ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                setArchiveTarget(product);
                                setArchiveOpen(true);
                              }}
                            >
                              <Archive className="h-4 w-4" /> Archive product
                            </DropdownMenuItem>
                          ) : null}
                          {product.isArchived && onRestore ? (
                            <DropdownMenuItem onSelect={() => onRestore(product)}>
                              <RotateCcw className="h-4 w-4" /> Restore product
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete && onDelete ? (
                            <DropdownMenuItem
                              className="text-danger focus:text-danger"
                              onSelect={() => {
                                setDeleteTarget(product);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> Delete permanently
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 xl:hidden">
        {products.map((product) => (
          <div
            key={product.id}
            className={cn(
              "rounded-[20px] bg-soft p-4 transition-colors hover:bg-soft-strong",
              product.isArchived && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/admin/products/${product.id}`}
                className="min-w-0 flex-1"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="truncate">{product.name}</span>
                  {product.isArchived ? (
                    <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                      Archived
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {teamLabel(product)} · {product.owner.name}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <HealthBadge health={product.health} />
                {showActions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white/70 hover:text-ink"
                        aria-label="Product actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/products/${product.id}`}>Open product</Link>
                      </DropdownMenuItem>
                      {!product.isArchived && onArchive ? (
                        <DropdownMenuItem
                          onSelect={() => {
                            setArchiveTarget(product);
                            setArchiveOpen(true);
                          }}
                        >
                          <Archive className="h-4 w-4" /> Archive product
                        </DropdownMenuItem>
                      ) : null}
                      {product.isArchived && onRestore ? (
                        <DropdownMenuItem onSelect={() => onRestore(product)}>
                          <RotateCcw className="h-4 w-4" /> Restore product
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete && onDelete ? (
                        <DropdownMenuItem
                          className="text-danger focus:text-danger"
                          onSelect={() => {
                            setDeleteTarget(product);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete permanently
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <StageBadge stage={product.stage} />
              <span className="text-[10px] text-muted">{formatDate(product.lastUpdated)}</span>
            </div>
            <Link
              href={`/admin/products/${product.id}`}
              className="mt-3 flex items-center gap-3"
            >
              <Progress value={product.milestoneProgress.percent} className="flex-1" />
              <span className="text-[10px] font-semibold text-muted">
                {product.milestoneProgress.percent}%
              </span>
            </Link>
          </div>
        ))}
      </div>

      {showArchived && products.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No products match your filters.</p>
      ) : null}

      <ArchiveProductDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        productName={archiveTarget?.name ?? ""}
        onConfirm={() =>
          archiveTarget && onArchive ? onArchive(archiveTarget) : false
        }
      />

      <DeleteProductDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        productName={deleteTarget?.name ?? ""}
        onConfirm={() =>
          deleteTarget && onDelete ? onDelete(deleteTarget) : false
        }
      />
    </div>
  );
}
