import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Layers,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { stageLabel, type PublicPortfolio } from "@ims/shared";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const CHIPS: {
  Icon: React.ElementType;
  position: string;
  chip: string;
  icon: string;
  delay: string;
}[] = [
  {
    Icon: Lightbulb,
    position: "left-[5%] top-[19%]",
    chip: "h-12 w-12",
    icon: "h-5 w-5 text-accent",
    delay: "0s",
  },
  {
    Icon: Sparkles,
    position: "right-[6%] top-[15%]",
    chip: "h-14 w-14",
    icon: "h-6 w-6 text-primary",
    delay: "-1.4s",
  },
  {
    Icon: Users,
    position: "left-[2.5%] top-[48%]",
    chip: "h-14 w-14",
    icon: "h-6 w-6 text-success",
    delay: "-2.6s",
  },
  {
    Icon: Rocket,
    position: "right-[2.5%] top-[44%]",
    chip: "h-12 w-12",
    icon: "h-5 w-5 text-accent",
    delay: "-3.4s",
  },
  {
    Icon: Target,
    position: "left-[15%] bottom-[15%]",
    chip: "h-11 w-11",
    icon: "h-5 w-5 text-primary",
    delay: "-0.8s",
  },
  {
    Icon: TrendingUp,
    position: "right-[14%] bottom-[13%]",
    chip: "h-12 w-12",
    icon: "h-5 w-5 text-success",
    delay: "-2s",
  },
  {
    Icon: Layers,
    position: "left-[23%] top-[6%]",
    chip: "h-10 w-10",
    icon: "h-4 w-4 text-ink/45",
    delay: "-1s",
  },
  {
    Icon: Building2,
    position: "right-[22%] top-[7%]",
    chip: "h-10 w-10",
    icon: "h-4 w-4 text-ink/45",
    delay: "-3s",
  },
];

export function LandingHero({
  data,
  variant = "full",
}: {
  data: PublicPortfolio;
  variant?: "full" | "compact" | "bleed";
}) {
  const compact = variant === "compact";
  const bleed = variant === "bleed";

  const activity = data.products.slice(0, 3).map((product) => ({
    id: product.id,
    slug: product.slug,
    productName: product.name,
    ownerName: product.owner.name,
    avatarUrl: product.owner.avatarUrl,
    stage: product.stage,
    percent: product.milestoneProgress.percent,
  }));
  const teamNames = Array.from(
    new Map(
      data.products
        .flatMap((product) =>
          product.teams.length ? product.teams : product.team ? [product.team] : [],
        )
        .map((team) => [team.id, team.name]),
    ).values(),
  ).slice(0, 8);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        bleed
          ? "flex h-full flex-col items-center justify-center bg-gradient-to-b from-white via-white to-canvas px-6 py-12 sm:px-10"
          : cn(
              "border border-white/80 bg-white shadow-card",
              compact
                ? "rounded-[30px] px-5 pb-9 pt-11 sm:px-7 sm:pt-12"
                : "rounded-[34px] px-4 pb-10 pt-12 sm:px-8 sm:pb-12 sm:pt-14 lg:rounded-[40px] lg:px-10 lg:pb-16 lg:pt-16",
            ),
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-[44%] h-px w-px">
        <span className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/80 sm:h-[500px] sm:w-[500px] lg:h-[640px] lg:w-[640px]" />
        <span className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/60 sm:h-[700px] sm:w-[700px] lg:h-[900px] lg:w-[900px]" />
        <span className="absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 sm:h-[960px] sm:w-[960px] lg:h-[1220px] lg:w-[1220px]" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[64%] h-[260px] w-[560px] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[90px]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-lilac/20 blur-[100px]" />
      {bleed ? (
        <>
          <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
        </>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute inset-0 hidden",
          compact ? "xl:block" : "lg:block",
        )}
      >
        {CHIPS.map(({ Icon, position, chip, icon, delay }, index) => (
          <span
            key={index}
            className={cn(
              "absolute flex animate-floaty items-center justify-center rounded-full border border-white bg-white shadow-lift",
              position,
              chip,
            )}
            style={{ animationDelay: delay }}
          >
            <Icon className={icon} />
          </span>
        ))}
      </div>

      <div
        className={cn(
          "relative mx-auto flex flex-col items-center text-center",
          bleed && "w-full animate-fade-up",
          bleed || compact ? "max-w-2xl" : "max-w-4xl",
        )}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60 shadow-card">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          DxValley Innovation Hub
        </span>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-medium text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            {data.stats.totalProducts} live products
          </span>
          <span className="h-3 w-px bg-line max-sm:hidden" />
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            {data.stats.activeTeams} teams building
          </span>
          <span className="h-3 w-px bg-line max-sm:hidden" />
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            Stage-gated delivery
          </span>
        </div>

        <h1
          className={cn(
            "text-display balance mt-7 font-semibold tracking-[-0.045em]",
            bleed
              ? "text-[32px] leading-[1.02] sm:text-[44px] xl:text-[56px]"
              : compact
                ? "text-[28px] leading-[1.02] sm:text-[36px] lg:text-[44px]"
                : "text-[36px] leading-[0.98] sm:text-[58px] sm:leading-[0.96] lg:text-[72px]",
          )}
        >
          Where ideas become
          <br className="hidden sm:block" />{" "}
          {bleed ? (
            <span className="bg-gradient-to-r from-primary to-accent-strong bg-clip-text text-transparent">
              real products
            </span>
          ) : (
            "real products"
          )}
          <span className="text-accent">.</span>
        </h1>

        <p
          className={cn(
            "pretty mx-auto mt-5 max-w-xl leading-relaxed text-muted",
            compact ? "text-[13px] sm:text-[14px]" : "text-[14px] sm:text-[15px]",
          )}
        >
          One place for DxValley teams to shape, validate and launch digital products —
          with every stage earned, never skipped.
        </p>

        {!compact && !bleed ? (
          <div className="mt-7 flex w-full flex-wrap items-center justify-center gap-2.5">
            <Button
              asChild
              variant="dark"
              size="lg"
              className="w-full max-w-[280px] px-6 sm:w-auto"
            >
              <Link href="#portfolio">Explore the portfolio</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full max-w-[280px] border-line bg-white/80 px-6 sm:w-auto"
            >
              <Link href="/submit-idea">Submit an idea</Link>
            </Button>
          </div>
        ) : null}

        {activity.length ? (
          <div
            className={cn(
              "relative w-full max-w-[420px]",
              compact || bleed ? "mt-9" : "mt-12",
            )}
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
            <p className="relative mb-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Live from the portfolio
            </p>
            <div className="relative">
              {activity.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug}`}
                  className={cn(
                    "group relative mx-auto block rounded-[18px] border border-line/70 bg-white px-3.5 py-3 text-left shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift",
                    index > 0 && "-mt-2.5",
                  )}
                  style={{
                    zIndex: activity.length - index,
                    width: `${100 - index * 5}%`,
                    opacity: 1 - index * 0.08,
                    marginLeft: index === 1 ? -8 : index === 2 ? 6 : 0,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={item.ownerName}
                      src={item.avatarUrl}
                      className="h-8 w-8"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-ink">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted">
                        <span className="truncate">{item.ownerName}</span>
                        <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-ink/20" />
                        <span className="shrink-0">{stageLabel(item.stage)}</span>
                        <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-ink/20" />
                        <span className="shrink-0">{item.percent}%</span>
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink/25 transition group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
            <p className="relative mt-4 text-center text-[10px] text-muted/80">
              Open any card to see the full product journey.
            </p>
          </div>
        ) : (
          <div className="relative mt-10 rounded-[22px] border border-line bg-white px-5 py-4 text-[12px] text-muted shadow-card">
            The first product is waiting for its stage gate.{" "}
            <Link href="/submit-idea" className="font-semibold text-primary">
              Submit an idea
            </Link>
          </div>
        )}

        {!compact ? (
          <div
            className={cn(
              "relative w-full",
              bleed
                ? "hidden mt-12 [@media(min-height:780px)]:block"
                : "mt-14",
            )}
          >
            <div className="mx-auto mb-8 h-px w-full max-w-md bg-gradient-to-r from-transparent via-line to-transparent" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/80">
              Trusted by product teams across DxValley
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {teamNames.length ? (
                teamNames.map((name) => (
                  <span
                    key={name}
                    className="font-display text-[16px] font-semibold tracking-[-0.02em] text-ink/30"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="font-display text-[16px] font-semibold tracking-[-0.02em] text-ink/30">
                  DxValley
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
