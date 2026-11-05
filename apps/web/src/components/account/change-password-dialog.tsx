"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePasswordSchema, type ChangePasswordInput } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_VALUES: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY_VALUES,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(EMPTY_VALUES);
      setVisible(false);
      setError(null);
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      toast.success("Password updated. Use it the next time you sign in.");
      onOpenChange(false);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not update your password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((value) => !value)}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-ink"
      aria-label={visible ? "Hide passwords" : "Show passwords"}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  const type = visible ? "text" : "password";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="label-caps">Your account</p>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Verify your current password and choose a new one with at least 8
            characters. Your existing session stays signed in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Current password"
            error={form.formState.errors.currentPassword?.message}
          >
            <div className="relative">
              <Input
                type={type}
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
              {toggle}
            </div>
          </Field>

          <Field label="New password" error={form.formState.errors.newPassword?.message}>
            <div className="relative">
              <Input
                type={type}
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              {toggle}
            </div>
          </Field>

          <Field
            label="Confirm new password"
            error={form.formState.errors.confirmPassword?.message}
          >
            <div className="relative">
              <Input
                type={type}
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {toggle}
            </div>
          </Field>

          {error ? (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
