"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  ROLE_CODES,
  ROLE_LABELS,
  userCreateSchema,
  type RoleCode,
  type TeamRef,
  type UserCreateInput,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  ADMIN: "Full governance access, every product and system configuration.",
  EVALUATOR: "Reviews assigned stage gates and leaves independent decisions.",
  PRODUCT_OWNER: "Owns products, milestones and stage-gate submissions.",
};

function CreateUserForm({
  teams,
  onDone,
}: {
  teams: TeamRef[];
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      title: "",
      role: "PRODUCT_OWNER",
      password: "",
      teamIds: [],
    },
  });

  const role = form.watch("role");

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ name: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          title: values.title || undefined,
          teamIds: values.teamIds ?? [],
        }),
      });
      toast.success(`${created.name} can now sign in`);
      onDone();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not create this user. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={form.formState.errors.name?.message}>
          <Input
            placeholder="e.g. Meron Tesfaye"
            autoComplete="name"
            {...form.register("name")}
          />
        </Field>

        <Field label="Job title">
          <Input
            placeholder="e.g. Product Analyst"
            autoComplete="organization-title"
            {...form.register("title")}
          />
        </Field>

        <Field label="Work email" error={form.formState.errors.email?.message}>
          <Input
            type="email"
            placeholder="you@dxvalley.dev"
            autoComplete="email"
            {...form.register("email")}
          />
        </Field>

        <Field label="Role" error={form.formState.errors.role?.message}>
          <Select {...form.register("role")}>
            {ROLE_CODES.map((code) => (
              <option key={code} value={code}>
                {ROLE_LABELS[code]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Temporary password"
          hint="At least 8 characters. Share it through a secure channel."
          error={form.formState.errors.password?.message}
        >
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Set an initial password"
              autoComplete="new-password"
              className="pr-12"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        <div className="self-end rounded-2xl bg-canvas/60 px-4 py-3">
          <p className="text-[11px] font-semibold text-ink/75">
            {ROLE_LABELS[role]}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            {ROLE_DESCRIPTIONS[role]}
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold text-ink/75">Teams</p>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => {
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
          <p className="mt-1.5 text-[11px] text-muted">
            Optional. Team membership also unlocks team-restricted products.
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create user
        </Button>
      </div>
    </form>
  );
}

export function CreateUserDialog({ teams }: { teams: TeamRef[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">
          <UserPlus className="h-4 w-4" /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <p className="label-caps">People & access</p>
          <DialogTitle>Add a workspace user</DialogTitle>
          <DialogDescription>
            Create an account with a role and optional team membership. The user can sign
            in immediately with the temporary password you set.
          </DialogDescription>
        </DialogHeader>
        <CreateUserForm
          teams={teams}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
