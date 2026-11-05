"use client";

import { Archive } from "lucide-react";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";

export function ArchiveProductDialog({
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
      tone="warning"
      icon={<Archive className="h-5 w-5" />}
      title={<>Archive &ldquo;{productName}&rdquo;?</>}
      description="Archiving hides the product from the active portfolio and public catalog without deleting any data."
      consequencesLabel="What changes"
      consequences={[
        "It leaves the active portfolio and public catalog",
        "Milestones, stage history and teams are preserved",
        "You can restore it at any time",
      ]}
      footnote="Archived products are listed under Product portfolio → Show archived."
      cancelLabel="Keep active"
      confirmLabel="Archive product"
      busyLabel="Archiving…"
      onConfirm={onConfirm}
    />
  );
}
