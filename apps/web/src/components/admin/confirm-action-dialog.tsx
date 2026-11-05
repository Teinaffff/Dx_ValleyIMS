"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tone = "danger" | "warning";

const TONES: Record<
  Tone,
  { icon: string; panel: string; label: string; bullet: string; button: "danger" | "warning" }
> = {
  danger: {
    icon: "bg-danger/10 text-danger",
    panel: "border-danger/15 bg-danger/[0.04]",
    label: "text-danger",
    bullet: "bg-danger/70",
    button: "danger",
  },
  warning: {
    icon: "bg-warning/15 text-[#B45309]",
    panel: "border-warning/20 bg-warning/[0.06]",
    label: "text-[#B45309]",
    bullet: "bg-warning/70",
    button: "warning",
  },
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = "danger",
  consequences,
  consequencesLabel,
  footnote,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancel",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  icon: React.ReactNode;
  tone?: Tone;
  consequences?: string[];
  consequencesLabel?: string;
  footnote?: React.ReactNode;
  confirmLabel: string;
  busyLabel: string;
  cancelLabel?: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
}) {
  const [busy, setBusy] = React.useState(false);
  const styles = TONES[tone];

  React.useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  async function confirm() {
    setBusy(true);
    try {
      const result = await onConfirm();
      if (result !== false) onOpenChange(false);
    } catch {
      // The caller surfaces the error; keep the dialog open so it can be retried.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent
        hideClose={busy}
        className="max-w-lg"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <span
            className={cn(
              "mb-3 flex h-11 w-11 items-center justify-center rounded-full",
              styles.icon,
            )}
          >
            {icon}
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {consequences?.length ? (
          <div className={cn("rounded-2xl border p-4", styles.panel)}>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.14em]",
                styles.label,
              )}
            >
              {consequencesLabel}
            </p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink/75">
              {consequences.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
                      styles.bullet,
                    )}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {footnote ? (
          <p className="mt-4 text-[11px] leading-relaxed text-muted">{footnote}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={styles.button}
            size="md"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? busyLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
