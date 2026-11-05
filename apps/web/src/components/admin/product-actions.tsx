"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProductDetail } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArchiveProductDialog } from "@/components/admin/archive-product-dialog";
import { DeleteProductDialog } from "@/components/admin/delete-product-dialog";

export function ProductArchiveButton({
  product,
  canArchive,
}: {
  product: ProductDetail;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  if (!canArchive) return null;

  async function run(action: "archive" | "restore") {
    setBusy(true);
    try {
      await apiFetch(`/api/products/${product.id}/${action}`, { method: "POST" });
      toast.success(
        action === "archive" ? `${product.name} archived` : `${product.name} restored`,
      );
      if (action === "restore") {
        router.refresh();
      } else {
        router.push("/admin/products");
        router.refresh();
      }
      return true;
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That action could not be completed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={product.isArchived ? "outline" : "ghost"}
        size="md"
        onClick={() => {
          if (product.isArchived) void run("restore");
          else setOpen(true);
        }}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : product.isArchived ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
        {product.isArchived ? "Restore" : "Archive"}
      </Button>
      {!product.isArchived ? (
        <ArchiveProductDialog
          open={open}
          onOpenChange={setOpen}
          productName={product.name}
          onConfirm={() => run("archive")}
        />
      ) : null}
    </>
  );
}

export function ProductDeleteButton({
  product,
  canDelete,
}: {
  product: Pick<ProductDetail, "id" | "name">;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  if (!canDelete) return null;

  async function remove() {
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
      toast.success(`${product.name} deleted`);
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "That product could not be deleted.",
      );
      throw error;
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={() => setOpen(true)}
        className="text-danger hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <DeleteProductDialog
        open={open}
        onOpenChange={setOpen}
        productName={product.name}
        onConfirm={remove}
      />
    </>
  );
}
