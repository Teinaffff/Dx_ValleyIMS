"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ROLE_CODES,
  ROLE_LABELS,
  teamsForRole,
  userUpdateSchema,
  type TeamRef,
  type UserSummary,
  type UserUpdateInput,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";

function formValues(user: UserSummary): UserUpdateInput {
  return {
    name: user.name,
    email: user.email,
    title: user.title ?? "",
    role: user.role,
    teamIds: user.teams.map((team) => team.id),
  };
}

function EditUserDialog({
  user,
  teams,
  open,
  onOpenChange,
  isSelf,
}: {
  user: UserSummary;
  teams: TeamRef[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: formValues(user),
  });

  const role = form.watch("role");

  React.useEffect(() => {
    const allowed = new Set(teamsForRole(teams, role).map((team) => team.id));
    const current = form.getValues("teamIds") ?? [];
    const next = current.filter((id) => allowed.has(id));
    if (next.length !== current.length) form.setValue("teamIds", next);
  }, [role, teams, form]);

  React.useEffect(() => {
    if (open) {
      form.reset(formValues(user));
      setError(null);
    }
  }, [open, user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...values,
          title: values.title || undefined,
          teamIds: values.teamIds ?? [],
        }),
      });
      toast.success(`${values.name} updated`);
      onOpenChange(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not update this user. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <p className="label-caps">People & access</p>
          <DialogTitle>Edit workspace user</DialogTitle>
          <DialogDescription>
            Update profile details, role and team membership. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={form.formState.errors.name?.message}>
              <Input autoComplete="name" {...form.register("name")} />
            </Field>

            <Field label="Job title">
              <Input
                placeholder="e.g. Product Analyst"
                autoComplete="organization-title"
                {...form.register("title")}
              />
            </Field>

            <Field label="Work email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register("email")} />
            </Field>

            <Field
              label="Role"
              hint={isSelf ? "You cannot change your own role." : undefined}
              error={form.formState.errors.role?.message}
            >
              <Select disabled={isSelf} {...form.register("role")}>
                {ROLE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {ROLE_LABELS[code]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-semibold text-ink/75">Teams</p>
              <div className="flex flex-wrap gap-2">
                {teamsForRole(teams, role).map((team) => {
                  const selected = (form.watch("teamIds") ?? []).includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        const current = form.getValues("teamIds") ?? [];
                        form.setValue(
                          "teamIds",
                          selected
                            ? current.filter((id) => id !== team.id)
                            : [...current, team.id],
                          { shouldValidate: true },
                        );
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                        selected
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-line bg-surface text-muted hover:border-primary/30 hover:text-ink",
                      )}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserActions({
  user,
  teams,
  viewerId,
  activeAdminCount,
}: {
  user: UserSummary;
  teams: TeamRef[];
  viewerId: string;
  activeAdminCount: number;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const isSelf = user.id === viewerId;
  const isLastActiveAdmin =
    user.role === "ADMIN" && user.isActive && activeAdminCount <= 1;
  const protectedFromRemoval = isSelf || isLastActiveAdmin;

  async function setActive(isActive: boolean) {
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      toast.success(`${user.name} ${isActive ? "activated" : "deactivated"}`);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "That account could not be updated.",
      );
      throw error;
    }
  }

  async function toggleActive() {
    if (user.isActive) {
      setDeactivateOpen(true);
      return;
    }
    setBusy(true);
    try {
      await setActive(true);
    } catch {
      // The toast above explains the failure.
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
      toast.success(`${user.name} deleted`);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "That account could not be deleted.",
      );
      throw error;
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Manage ${user.name}`}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Manage user</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit user
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void toggleActive()}
            disabled={protectedFromRemoval}
            title={
              isSelf
                ? "You cannot deactivate your own account"
                : isLastActiveAdmin
                  ? "At least one active administrator must remain"
                  : undefined
            }
          >
            {user.isActive ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {user.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            disabled={protectedFromRemoval}
            className="text-danger focus:text-danger"
            title={
              isSelf
                ? "You cannot delete your own account"
                : isLastActiveAdmin
                  ? "At least one active administrator must remain"
                  : undefined
            }
          >
            <Trash2 className="h-4 w-4" /> Delete user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog
        user={user}
        teams={teams}
        open={editOpen}
        onOpenChange={setEditOpen}
        isSelf={isSelf}
      />

      <ConfirmActionDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        tone="warning"
        icon={<PowerOff className="h-5 w-5" />}
        title={<>Deactivate &ldquo;{user.name}&rdquo;?</>}
        description="They will be signed out immediately and cannot sign in again until reactivated."
        consequencesLabel="What changes"
        consequences={[
          "Existing sessions are rejected on their next request",
          "Their work, owned products and audit history stay intact",
          "You can reactivate the account at any time",
        ]}
        cancelLabel="Keep active"
        confirmLabel="Deactivate user"
        busyLabel="Deactivating…"
        onConfirm={() => setActive(false)}
      />

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tone="danger"
        icon={<Trash2 className="h-5 w-5" />}
        title={<>Delete &ldquo;{user.name}&rdquo;?</>}
        description="This removes the account from the directory and permanently revokes access. Historical records are preserved."
        consequencesLabel="What changes"
        consequences={[
          "The account disappears from the people directory",
          "Their ideas, products and audit trail are preserved",
          "Team membership and team-lead assignments are cleared",
          "This cannot be undone from the interface",
        ]}
        cancelLabel="Keep user"
        confirmLabel="Delete user"
        busyLabel="Deleting…"
        onConfirm={remove}
      />
    </>
  );
}
