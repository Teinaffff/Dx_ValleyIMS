"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { loginSchema, type LoginInput, type SessionUser } from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const user = await apiFetch<SessionUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const target = next ?? "/admin/dashboard";
      router.replace(target);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not sign you in. Please try again.",
      );
      setSubmitting(false);
    }
  });

  return (
    <form method="post" onSubmit={onSubmit} className="w-full max-w-[420px]">
      <Logo className="mb-10" />

      <p className="label-caps mb-3">Innovation workspace</p>
      <h1 className="text-display text-[34px] font-semibold sm:text-[40px]">
        Welcome back.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Sign in to manage the portfolio, review stage gates and keep every product moving.
      </p>

      <div className="mt-8 space-y-4">
        <Field label="Work email" error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@dxvalley.dev"
            {...form.register("email")}
          />
        </Field>

        <Field label="Password" error={form.formState.errors.password?.message}>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pr-12"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
      </div>

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? "Signing in…" : "Sign in"}
        {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>

      <p className="mt-8 text-center text-[11px] text-muted">
        Just exploring?{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Browse the product portfolio
        </Link>
      </p>
    </form>
  );
}
