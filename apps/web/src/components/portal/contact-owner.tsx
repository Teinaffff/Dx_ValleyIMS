"use client";

import * as React from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactOwnerProps {
  ownerName: string;
  ownerAvatarUrl?: string | null;
  productName: string;
  contactEmail: string;
}

function ContactOwnerDialog({
  open,
  onOpenChange,
  ownerName,
  ownerAvatarUrl,
  productName,
  contactEmail,
}: ContactOwnerProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const markCopied = () => {
    setCopied(true);
    toast.success("Email address copied");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      markCopied();
      return;
    } catch {
      // Clipboard API is unavailable outside secure contexts; fall back below.
    }

    const field = document.createElement("textarea");
    field.value = contactEmail;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    try {
      if (!document.execCommand("copy")) throw new Error("copy failed");
      markCopied();
    } catch {
      toast.error("Could not copy the email address.");
    } finally {
      document.body.removeChild(field);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="label-caps">Product owner</p>
          <DialogTitle>Contact {ownerName}</DialogTitle>
          <DialogDescription>
            Reach the owner of {productName} with feedback, a pilot opportunity or a
            team that could help move the product forward.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-[18px] border border-line bg-canvas/40 p-4">
          <UserAvatar
            name={ownerName}
            src={ownerAvatarUrl}
            className="h-11 w-11"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ownerName}</p>
            <p className="text-[11px] text-muted">Product owner · {productName}</p>
          </div>
        </div>

        <div className="rounded-[18px] border border-line p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Email
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-ink">
              {contactEmail}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={copyEmail}
              title="Copy email address"
              aria-label="Copy email address"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button asChild>
            <a href={`mailto:${contactEmail}`}>
              <Send className="h-4 w-4" /> Open mail app
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ContactOwnerButton(props: ContactOwnerProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="md" onClick={() => setOpen(true)}>
        <Mail className="h-4 w-4" /> Contact owner
      </Button>
      <ContactOwnerDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ContactOwnerCardAction(props: ContactOwnerProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-white/15"
      >
        <Mail className="h-3.5 w-3.5 text-accent" />
        {props.contactEmail}
      </button>
      <ContactOwnerDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}
