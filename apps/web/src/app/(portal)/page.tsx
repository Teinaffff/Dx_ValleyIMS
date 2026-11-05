import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import type { PublicPortfolio } from "@ims/shared";
import { serverGet } from "@/lib/server-api";
import { cn } from "@/lib/utils";
import { StageBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/portal/landing-hero";
import { PortfolioExplorer } from "@/components/portal/portfolio-explorer";
import { JourneyStepper } from "@/components/portal/journey-stepper";

export const metadata = {
  title: "Our digital product portfolio",
};

export default async function PortalHomePage() {
  const data = await serverGet<PublicPortfolio>("/api/public/portfolio");

  if (!data) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-[1240px] items-center px-5">
        <div className="surface-card w-full p-10 text-center">
          <h1 className="font-display text-2xl font-semibold">Showcase unavailable</h1>
          <p className="mt-2 text-sm text-muted">
            We could not load the public portfolio. Check that the API is running and refresh
            this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-2">
      <section className="mx-auto max-w-[1240px] px-3 pt-4 sm:px-5 lg:pt-6">
        <LandingHero data={data} />
      </section>

      {/* <section className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-5 lg:pt-14">
        <div className="glass-card grid grid-cols-2 divide-line/70 rounded-[26px] px-2 py-1 sm:grid-cols-4 sm:divide-x">
          {[
            {
              label: "Digital products",
              value: data.stats.totalProducts,
              icon: <Rocket className="h-3.5 w-3.5" />,
            },
            {
              label: "Teams building",
              value: data.stats.activeTeams,
              icon: <Users className="h-3.5 w-3.5" />,
            },
            {
              label: "At Pilot or beyond",
              value: data.stats.inPilotOrBeyond,
              icon: <TrendingUp className="h-3.5 w-3.5" />,
            },
            {
              label: "Monetized",
              value: data.stats.monetized,
              icon: <Sparkles className="h-3.5 w-3.5" />,
            },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2 px-5 py-5 sm:py-6">
              <span className="flex min-h-[26px] items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:min-h-0">
                <span className="text-primary">{stat.icon}</span>
                {stat.label}
              </span>
              <span className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </section> */}

      <section id="journey" className="mx-auto max-w-[1240px] px-4 pt-14 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps mb-2">The journey</p>
            <h2 className="text-display text-[30px] font-semibold sm:text-[38px]">
              Six stages. No shortcuts.
            </h2>
          </div>
          <p className="max-w-sm text-[12px] leading-relaxed text-muted">
            A product only moves forward when its stage gate is approved. That is how the
            portfolio stays honest.
          </p>
        </div>

        <JourneyStepper stages={data.stages} />

        <p className="mt-4 text-center text-[10px] text-muted/80">
          Every product earns its way through — open the portfolio to see where each one stands.
        </p>
      </section>

      <section id="portfolio" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-14 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="label-caps mb-2">Our craft</p>
            <h2 className="text-display balance text-[34px] font-semibold sm:text-[44px]">
              Our digital product portfolio
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
              Real products, real owners, real progress. Browse what the bank is building and
              open any product to see its full journey.
            </p>
          </div>
          <Link
            href="/submit-idea"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
          >
            Add your idea to the pipeline <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6">
          <PortfolioExplorer products={data.products} />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pt-16 sm:px-5">
        <div className="relative overflow-hidden rounded-[36px] bg-navy px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="page-grid absolute inset-0 opacity-[0.09]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/35 blur-[100px]" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-lilac/20 blur-[90px]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Team ideas, built into products
              </span>
              <h2 className="text-display balance mt-5 text-[36px] font-semibold leading-[1.02] sm:text-[46px]">
                Your idea could be the next product on this page.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55">
                Every product here started with someone noticing a better way. Submit an idea,
                get real evaluation feedback, and — if it earns it — a product owner, a team and
                a place in the pipeline.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Button asChild variant="accent" size="lg">
                  <Link href="/submit-idea">
                    Submit an idea <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="#portfolio"
                  className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-[13px] font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
                >
                  Explore the portfolio
                </Link>
              </div>
            </div>

            <div className="relative hidden justify-center lg:flex">
              <div className="w-[280px] rotate-[3deg] rounded-[26px] border border-white/50 bg-white p-5 text-ink shadow-float">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  From idea to product
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    { label: "Idea submitted", done: true },
                    { label: "Evaluated & accepted", done: true },
                    { label: "Product owner assigned", done: true },
                    { label: "Stage gates in motion", done: false },
                  ].map((step) => (
                    <li key={step.label} className="flex items-center gap-2.5 text-[12px]">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full",
                          step.done
                            ? "bg-success text-white"
                            : "border border-line text-muted",
                        )}
                      >
                        {step.done ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                        )}
                      </span>
                      <span className={step.done ? "font-medium" : "text-muted"}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-canvas px-3 py-2.5">
                  <StageBadge stage="IDEATION" />
                  <span className="text-[10px] font-semibold text-muted">Your journey starts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
