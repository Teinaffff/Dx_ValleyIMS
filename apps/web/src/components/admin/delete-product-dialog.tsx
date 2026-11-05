"use client";

import { AlertTriangle } from "lucide-react";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";

const CONSEQUENCES = [
  "All milestones and delivery progress",
  "Stage history and approval records",
  "Development team links and visibility rules",
  "Product notifications from the feed",
];

export function DeleteProductDialog({
  open,
  onOpenChange,
  productName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
}) {
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={<AlertTriangle className="h-5 w-5" />}
      title={<>Delete &ldquo;{productName}&rdquo;?</>}
      description="This permanently removes the product and everything attached to it. You cannot undo this action."
      consequencesLabel="This will also delete"
      consequences={CONSEQUENCES}
      footnote="The deletion itself is recorded in the immutable audit log. Only administrators can delete a product."
      cancelLabel="Keep product"
      confirmLabel="Delete product"
      busyLabel="Deleting…"
      onConfirm={onConfirm}
    />
  );
}
