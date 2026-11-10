"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import {
  publicIdeaCreateSchema,
  type PublicIdeaCreateInput,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { AttachmentPicker } from "@/components/portal/attachment-picker";

export function PublicIdeaForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reference, setReference] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);

  const form = useForm<PublicIdeaCreateInput>({
    resolver: zodResolver(publicIdeaCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      jobTitle: "",
      title: "",
      problem: "",
      solution: "",
      expectedImpact: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    // Writing is only required when there is no voice note, video, image or file.
    if (!files.length) {
      let blocked = false;
      for (const key of ["problem", "solution"] as const) {
        if (values[key].length < 20) {
          form.setError(key, {
            message: "Write at least 20 characters, or add a voice note, video, image or document.",
          });
          blocked = true;
        }
      }
      if (blocked) return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" && value) body.append(key, value);
      }
      for (const file of files) body.append("files", file, file.name);

      const result = await apiFetch<{ reference: string }>("/api/public/ideas", {
        method: "POST",
        body,
      });
      setReference(result.reference);
      form.reset();
      setFiles([]);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not send your idea. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (reference) {
    return (
      <div className="flex flex-col items-start">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
          Idea received.
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          The innovation team has been notified. We will follow up at the email you shared if
          we need more context or decide to take it forward.
        </p>
        <p className="mt-4 rounded-full bg-canvas px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-ink/70">
          REFERENCE · {reference}
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" size="md" onClick={() => setReference(null)}>
            Share another idea
          </Button>
          <Button asChild variant="ghost" size="md">
            <Link href="/">Explore the portfolio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="label-caps">Share an idea</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        No account needed.
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Tell us what you have noticed and what could change. Your note goes straight to the
        DxValley innovation team.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" error={form.formState.errors.name?.message}>
            <Input
              placeholder="e.g. Meron Tesfaye"
              autoComplete="name"
              maxLength={80}
              {...form.register("name")}
            />
          </Field>

          <Field label="Work email" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              placeholder="you@dxvalley.dev"
              autoComplete="email"
              maxLength={160}
              {...form.register("email")}
            />
          </Field>
        </div>

        <Field label="Job title" hint="Optional — helps us understand your vantage point.">
          <Input
            placeholder="e.g. Product Analyst"
            autoComplete="organization-title"
            maxLength={80}
            {...form.register("jobTitle")}
          />
        </Field>

        <Field label="Idea title" error={form.formState.errors.title?.message}>
          <Input
            placeholder="One line that captures the idea"
            maxLength={120}
            {...form.register("title")}
          />
        </Field>

        <AttachmentPicker files={files} onChange={setFiles} />

        <Field
          label="The problem you have noticed"
          error={form.formState.errors.problem?.message}
        >
          <Textarea
            placeholder="What is happening today, who is affected and why does it matter?"
            className="min-h-28"
            maxLength={2000}
            {...form.register("problem")}
          />
        </Field>

        <Field
          label="Your proposed solution"
          error={form.formState.errors.solution?.message}
        >
          <Textarea
            placeholder="What would you change, build or try? Rough sketches are welcome."
            className="min-h-28"
            maxLength={2000}
            {...form.register("solution")}
          />
        </Field>

        <Field
          label="Expected impact"
          hint="Optional — the outcome you expect for customers, teams or the bank."
          error={form.formState.errors.expectedImpact?.message}
        >
          <Textarea
            placeholder="What improves if this works?"
            className="min-h-20"
            maxLength={1000}
            {...form.register("expectedImpact")}
          />
        </Field>

        {error ? (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Sending your idea…" : "Send idea to the innovation team"}
        </Button>

        <p className="text-center text-[10px] leading-relaxed text-muted">
          No account is created. Your idea and contact details are visible only to the
          authorised innovation team.
        </p>
      </form>
    </div>
  );
}
