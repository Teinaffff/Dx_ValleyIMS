"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PencilLine, Plus, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  LIFECYCLE_STAGES,
  productCreateSchema,
  teamsForRole,
  type ProductCreateInput,
  type ProductDetail,
  type TeamRef,
  type UserRef,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ProductForm({
  mode,
  product,
  owners,
  teams,
  onDone,
  prefill,
  ideaId,
}: {
  mode: "create" | "edit";
  product?: ProductDetail;
  owners: UserRef[];
  teams: TeamRef[];
  onDone: (created?: ProductDetail) => void;
  prefill?: { name: string; description: string };
  ideaId?: string;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      name: product?.name ?? prefill?.name ?? "",
      description: product?.description ?? prefill?.description ?? "",
      ownerId: product?.owner.id ?? "",
      teamIds:
        product?.teams?.map((team) => team.id) ??
        (product?.team ? [product.team.id] : []),
      stage: product?.stage ?? "IDEATION",
      visibility: product?.visibility ?? "EVERYONE",
      businessArea: product?.businessArea ?? "",
      targetUsers: product?.targetUsers ?? "",
      expectedImpact: product?.expectedImpact ?? "",
      launchTarget: product?.launchTarget?.slice(0, 10) ?? "",
      customMilestones: [],
      visibilityTeamIds: product?.visibilityTeamIds ?? [],
    },
  });

  const milestones = useFieldArray({
    control: form.control,
    name: "customMilestones",
  });

  const visibility = form.watch("visibility");
  const selectedTeamIds = form.watch("teamIds") ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...values,
        launchTarget: values.launchTarget || undefined,
      };

      if (mode === "create") {
        const created = await apiFetch<ProductDetail>(
          ideaId ? `/api/ideas/${ideaId}/convert` : "/api/products",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        toast.success(
          ideaId
            ? `${created.name} created from this idea`
            : `${created.name} added to the portfolio`,
        );
        onDone(created);
        return;
      }

      const {
        stage: _stage,
        customMilestones: _milestones,
        ...update
      } = payload;
      await apiFetch(`/api/products/${product!.id}`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      toast.success("Product details updated");
      onDone();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not save this product. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Product name"
          className="sm:col-span-2"
          error={form.formState.errors.name?.message}
        >
          <Input placeholder="e.g. Merchant Wallet" {...form.register("name")} />
        </Field>

        <Field
          label="Description"
          className="sm:col-span-2"
          error={form.formState.errors.description?.message}
        >
          <Textarea
            placeholder="What does this product do, and for whom?"
            className="min-h-24"
            {...form.register("description")}
          />
        </Field>

        <Field label="Product owner" error={form.formState.errors.ownerId?.message}>
          <Select {...form.register("ownerId")}>
            <option value="">Choose an owner</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold text-ink/75">
            Development teams
          </p>
          <div className="flex flex-wrap gap-2">
            {teamsForRole(teams, "DEVELOPER").map((team) => {
              const selected = selectedTeamIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    form.setValue(
                      "teamIds",
                      selected
                        ? selectedTeamIds.filter((id) => id !== team.id)
                        : [...selectedTeamIds, team.id],
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
            Select one or more teams building this product. The first team is the
            primary team shown in summaries.
          </p>
        </div>

        {mode === "create" ? (
          <Field label="Starting lifecycle stage">
            <Select {...form.register("stage")}>
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Lifecycle stage" hint="Products only move forward through stage gates.">
            <Input
              value={LIFECYCLE_STAGES.find((stage) => stage.key === product?.stage)?.label}
              readOnly
              disabled
            />
          </Field>
        )}

        <Field label="Visibility">
          <Select {...form.register("visibility")}>
            <option value="EVERYONE">Everyone</option>
            <option value="TEAMS">Specific teams</option>
            <option value="ADMINS_ONLY">Administrators only</option>
          </Select>
        </Field>

        {visibility === "TEAMS" ? (
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-ink/75">Visible to teams</p>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => {
                const selected = (form.watch("visibilityTeamIds") ?? []).includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      const current = form.getValues("visibilityTeamIds") ?? [];
                      form.setValue(
                        "visibilityTeamIds",
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
              Leave empty to default to the development team.
            </p>
          </div>
        ) : null}

        <Field label="Business area">
          <Input placeholder="e.g. Payments" {...form.register("businessArea")} />
        </Field>

        <Field label="Target users">
          <Input placeholder="e.g. SME merchants" {...form.register("targetUsers")} />
        </Field>

        <Field label="Expected impact" className="sm:col-span-2">
          <Textarea
            placeholder="The outcome you expect for customers and the bank"
            className="min-h-20"
            {...form.register("expectedImpact")}
          />
        </Field>

        <Field label="Launch target">
          <Input type="date" {...form.register("launchTarget")} />
        </Field>

        {mode === "create" ? (
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ink/75">
                  Starting milestones (optional)
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Nothing is generated automatically. Add only the milestones you need
                  for the starting stage — the product owner can add more under any
                  stage later.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  milestones.append({
                    title: "",
                    description: "",
                    isRequired: true,
                    weight: "100",
                    dueDate: "",
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add milestone
              </Button>
            </div>

            {milestones.fields.length ? (
              <div className="mt-3 space-y-3">
                {milestones.fields.map((field, index) => {
                  const fieldErrors = form.formState.errors.customMilestones?.[index];
                  return (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-line bg-canvas/40 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-[1fr_150px_84px_auto]">
                        <Input
                          placeholder="Milestone title"
                          aria-label="Milestone title"
                          {...form.register(`customMilestones.${index}.title`)}
                        />
                        <Input
                          type="date"
                          aria-label="Milestone due date"
                          {...form.register(`customMilestones.${index}.dueDate`)}
                        />
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          placeholder="100"
                          aria-label="Milestone weight percent"
                          {...form.register(`customMilestones.${index}.weight`)}
                        />
                        <button
                          type="button"
                          onClick={() => milestones.remove(index)}
                          className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                          aria-label="Remove milestone"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Textarea
                        placeholder="What needs to be true to complete this milestone?"
                        aria-label="Milestone description"
                        className="mt-2 min-h-16"
                        {...form.register(
                          `customMilestones.${index}.description`,
                        )}
                      />
                      <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-ink/70">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#2563EB]"
                          {...form.register(
                            `customMilestones.${index}.isRequired`,
                          )}
                        />
                        Required to pass the stage gate
                      </label>
                      {fieldErrors?.title?.message ? (
                        <p className="mt-2 text-[11px] font-medium text-danger">
                          {fieldErrors.title.message}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
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
          onClick={() => onDone()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Create product" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function CreateProductDialog({
  owners,
  teams,
  defaultOpen = false,
}: {
  owners: UserRef[];
  teams: TeamRef[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <p className="label-caps">Product portfolio</p>
          <DialogTitle>Add a product</DialogTitle>
          <DialogDescription>
            Start a new innovation journey. The product enters the pipeline at the stage you
            choose and can only advance through a stage gate.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          mode="create"
          owners={owners}
          teams={teams}
          onDone={(created) => {
            setOpen(false);
            if (created) router.push(`/admin/products/${created.id}`);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditProductDialog({
  product,
  owners,
  teams,
}: {
  product: ProductDetail;
  owners: UserRef[];
  teams: TeamRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="md">
          <PencilLine className="h-4 w-4" /> Edit product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <p className="label-caps">Product settings</p>
          <DialogTitle>Edit {product.name}</DialogTitle>
          <DialogDescription>
            Update ownership, visibility and product context. Lifecycle stage changes are
            handled through stage gates.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          mode="edit"
          product={product}
          owners={owners}
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

function clamp(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

export function ConvertIdeaDialog({
  idea,
  owners,
  teams,
}: {
  idea: {
    id: string;
    title: string;
    problem: string;
    solution: string;
    expectedImpact: string | null;
  };
  owners: UserRef[];
  teams: TeamRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const prefill = React.useMemo(() => {
    const description = [
      idea.problem ? `Problem: ${idea.problem}` : null,
      idea.solution ? `Proposed solution: ${idea.solution}` : null,
      idea.expectedImpact ? `Expected impact: ${idea.expectedImpact}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      name: clamp(idea.title, 80),
      description: clamp(description, 600),
    };
  }, [idea]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md" variant="secondary">
          <Rocket className="h-4 w-4" /> Let's make it a product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <p className="label-caps">From idea to product</p>
          <DialogTitle>Turn “{idea.title}” into a product</DialogTitle>
          <DialogDescription>
            The name and description are pre-filled from the approved idea. Assign a
            product owner, pick the teams and starting stage, then create it — the idea
            is marked as converted and linked to this product.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          mode="create"
          ideaId={idea.id}
          prefill={prefill}
          owners={owners}
          teams={teams}
          onDone={(created) => {
            setOpen(false);
            if (created) router.push(`/admin/products/${created.id}`);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
