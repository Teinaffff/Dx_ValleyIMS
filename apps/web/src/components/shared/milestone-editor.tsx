"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PencilLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  milestoneEditorSchema,
  stageLabel,
  type LifecycleStage,
  type MilestoneDto,
  type MilestoneEditorInput,
  type UserRef,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";

function toPayload(values: MilestoneEditorInput) {
  const number = (value?: string) =>
    value && value.trim() !== "" ? Number(value) : null;
  return {
    title: values.title,
    description: values.description ?? null,
    isRequired: values.isRequired,
    weight: Number(values.weight) || 100,
    dueDate: values.dueDate ?? null,
    ownerId: values.ownerId ?? null,
    evidenceLink: values.evidenceLink ?? null,
    targetValue: number(values.targetValue),
    actualValue: number(values.actualValue),
    unit: values.unit ?? null,
  };
}

function MilestoneFormDialog({
  open,
  onOpenChange,
  productId,
  stage,
  owners,
  milestone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  stage: LifecycleStage;
  owners: UserRef[];
  milestone?: MilestoneDto;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<MilestoneEditorInput>({
    resolver: zodResolver(milestoneEditorSchema),
    defaultValues: {
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      isRequired: milestone?.isRequired ?? true,
      weight:
        milestone?.weight !== null && milestone?.weight !== undefined
          ? String(milestone.weight)
          : "100",
      dueDate: milestone?.dueDate?.slice(0, 10) ?? "",
      ownerId: milestone?.owner?.id ?? "",
      evidenceLink: milestone?.evidenceLink ?? "",
      targetValue:
        milestone?.targetValue !== null && milestone?.targetValue !== undefined
          ? String(milestone.targetValue)
          : "",
      actualValue:
        milestone?.actualValue !== null && milestone?.actualValue !== undefined
          ? String(milestone.actualValue)
          : "",
      unit: milestone?.unit ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
    }
  }, [open, form]);

  const ownerOptions = React.useMemo(() => {
    const list = [...owners];
    const current = milestone?.owner;
    if (current && !list.some((owner) => owner.id === current.id)) {
      list.unshift(current);
    }
    return list;
  }, [owners, milestone]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      if (milestone) {
        await apiFetch(
          `/api/products/${productId}/milestones/${milestone.id}`,
          { method: "PATCH", body: JSON.stringify(toPayload(values)) },
        );
        toast.success(`Updated ${values.title}`);
      } else {
        await apiFetch(`/api/products/${productId}/milestones`, {
          method: "POST",
          body: JSON.stringify({ ...toPayload(values), stage }),
        });
        toast.success(`Added ${values.title} to ${stageLabel(stage)}`);
      }
      onOpenChange(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not save this milestone. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="label-caps">{stageLabel(stage)}</p>
          <DialogTitle>
            {milestone ? "Edit milestone" : "Add a milestone"}
          </DialogTitle>
          <DialogDescription>
            {milestone
              ? "Update the details of this milestone. Completion history is preserved."
              : "Define what needs to happen in this stage. Milestones are optional — add only what makes sense for this product."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Milestone title"
            error={form.formState.errors.title?.message}
          >
            <Input
              placeholder="e.g. Validate pricing with 10 merchants"
              {...form.register("title")}
            />
          </Field>

          <Field
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              placeholder="What needs to be true for this milestone to be complete?"
              className="min-h-20"
              {...form.register("description")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date">
              <Input type="date" {...form.register("dueDate")} />
            </Field>
            <Field
              label="Milestone owner"
              hint="Owners come from this product's Team. Add people under Team first."
            >
              <Select {...form.register("ownerId")}>
                <option value="">No owner</option>
                {ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Weight (%)"
            error={form.formState.errors.weight?.message}
            hint="Relative importance of this milestone (1–100) for stage progress."
          >
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              placeholder="100"
              {...form.register("weight")}
            />
          </Field>

          <Field label="Evidence link">
            <Input
              placeholder="https://…"
              {...form.register("evidenceLink")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Target value">
              <Input
                type="number"
                step="any"
                placeholder="100"
                {...form.register("targetValue")}
              />
            </Field>
            <Field label="Actual value">
              <Input
                type="number"
                step="any"
                placeholder="0"
                {...form.register("actualValue")}
              />
            </Field>
            <Field label="Unit">
              <Input placeholder="% / users / KES" {...form.register("unit")} />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-[12px] font-medium text-ink/75">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#2563EB]"
              {...form.register("isRequired")}
            />
            Required to pass the stage gate
          </label>

          {error ? (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
              {milestone ? "Save changes" : "Add milestone"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddMilestoneButton({
  productId,
  stage,
  owners,
}: {
  productId: string;
  stage: LifecycleStage;
  owners: UserRef[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" /> Add milestone
      </Button>
      <MilestoneFormDialog
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        stage={stage}
        owners={owners}
      />
    </>
  );
}

export function EditMilestoneButton({
  productId,
  stage,
  owners,
  milestone,
}: {
  productId: string;
  stage: LifecycleStage;
  owners: UserRef[];
  milestone: MilestoneDto;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
        aria-label="Edit milestone"
      >
        <PencilLine className="h-3 w-3" />
      </button>
      <MilestoneFormDialog
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        stage={stage}
        owners={owners}
        milestone={milestone}
      />
    </>
  );
}

export function DeleteMilestoneButton({
  productId,
  milestone,
}: {
  productId: string;
  milestone: MilestoneDto;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function remove() {
    try {
      await apiFetch(
        `/api/products/${productId}/milestones/${milestone.id}`,
        { method: "DELETE" },
      );
      toast.success(`Deleted ${milestone.title}`);
      return true;
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not delete this milestone. Please try again.",
      );
      return false;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
        aria-label="Delete milestone"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${milestone.title}"?`}
        description="This removes the milestone and its completion record from the stage."
        icon={<Trash2 className="h-5 w-5" />}
        confirmLabel="Delete milestone"
        busyLabel="Deleting…"
        onConfirm={async () => {
          const ok = await remove();
          if (ok) {
            setOpen(false);
            router.refresh();
          }
          return false;
        }}
      />
    </>
  );
}
