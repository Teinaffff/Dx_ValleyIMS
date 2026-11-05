"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProductListItem } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { ProductsTable } from "@/components/admin/products-table";

export function PortfolioTable({
  products,
  showActions,
  canDelete = false,
}: {
  products: ProductListItem[];
  showActions: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();

  async function run(
    product: ProductListItem,
    action: "archive" | "restore" | "delete",
  ) {
    try {
      if (action === "delete") {
        await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
        toast.success(`${product.name} deleted`);
      } else {
        await apiFetch(`/api/products/${product.id}/${action}`, { method: "POST" });
        toast.success(
          action === "archive"
            ? `${product.name} archived`
            : `${product.name} restored`,
        );
      }
      router.refresh();
      return true;
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That action could not be completed.",
      );
      return false;
    }
  }

  return (
    <ProductsTable
      products={products}
      showActions={showActions}
      showArchived
      canDelete={canDelete}
      onArchive={(product) => run(product, "archive")}
      onRestore={(product) => void run(product, "restore")}
      onDelete={(product) => void run(product, "delete")}
    />
  );
}
