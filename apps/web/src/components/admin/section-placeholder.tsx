import Link from "next/link";
import { ArrowRight, Check, Clock3, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export function SectionPlaceholder({
  eyebrow,
  title,
  description,
  icon,
  phase,
  features,
  liveLinks,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  phase: string;
  features: string[];
  liveLinks: { label: string; href: string }[];
}) {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="surface-card flex flex-col p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
              {icon}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A6206]">
              <Clock3 className="h-3 w-3" /> {phase}
            </span>
          </div>

          <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            Scoped, designed, next in the build sequence.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            The foundation is in place — database schema, role-based API, authentication and
            the shared design system. This workspace will be wired to its endpoints in{" "}
            {phase.toLowerCase()} without changing the shell or navigation.
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 rounded-[14px] bg-soft px-3.5 py-3 text-[12px] text-ink/75"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline"
            >
              Back to the live dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="rounded-[24px] bg-soft p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Live today
          </div>
          <h2 className="mt-3 font-display text-[17px] font-semibold tracking-tight">
            The foundation already works
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Use the live workspaces below while this module is being completed.
          </p>
          <div className="mt-5 space-y-2">
            {liveLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-[14px] border border-black/[0.06] bg-white px-4 py-3 text-[12px] font-medium text-ink/70 transition hover:bg-soft-strong hover:text-ink"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
          <p className="mt-5 rounded-[14px] bg-white/70 p-3.5 text-[10px] leading-relaxed text-muted">
            Every module shares the same server-enforced permissions and audit trail.
          </p>
        </section>
      </div>
    </div>
  );
}
