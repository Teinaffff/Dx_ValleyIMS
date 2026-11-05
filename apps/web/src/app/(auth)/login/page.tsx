import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { LIFECYCLE_STAGES, type PublicPortfolio } from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { LoginForm } from "@/components/auth/login-form";
import { LandingHero } from "@/components/portal/landing-hero";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/admin/dashboard");

  const data = await serverGet<PublicPortfolio>("/api/public/portfolio");

  return (
    <main className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-soft via-surface to-surface px-6 py-14 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute -left-28 top-14 h-72 w-72 rounded-full bg-primary/[0.07] blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-lilac/25 blur-[110px]" />
        <div className="relative w-full max-w-[420px]">
          <Suspense
            fallback={
              <div className="h-96 w-full max-w-[420px] animate-pulse rounded-[28px] bg-canvas" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-black/[0.06] bg-white lg:block">
        <div className="relative h-full w-full">
          {data ? (
            <LandingHero data={data} variant="bleed" />
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60 shadow-card">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                DxValley Innovation Hub
              </span>
              <h2 className="text-display mt-6 max-w-md text-[38px] font-semibold leading-[1.0] tracking-[-0.04em]">
                Where ideas become real products
                <span className="text-accent">.</span>
              </h2>
              <p className="pretty mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
                One place for DxValley teams to shape, validate and launch digital products —
                with every stage earned, never skipped.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {LIFECYCLE_STAGES.map((stage) => (
                  <span
                    key={stage.key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-[10px] font-semibold text-ink/60"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: stage.accent }}
                    />
                    {stage.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}
