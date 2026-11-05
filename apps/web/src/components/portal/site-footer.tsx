import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LIFECYCLE_STAGES } from "@ims/shared";
import { Logo } from "@/components/ui/logo";

export function SiteFooter() {
  return (
    <footer className="px-3 pb-4 pt-10 sm:px-5">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-navy px-6 py-10 text-white sm:px-10">
        <div className="page-grid absolute inset-0 opacity-[0.08]" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-[90px]" />
        <div className="relative grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-white/50">
              The digital product showcase of DxValley Innovation Hub — where ideas from
              across the team become validated, scaled and monetized products.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {LIFECYCLE_STAGES.map((stage) => (
                <span
                  key={stage.key}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[9px] font-semibold text-white/55"
                >
                  {stage.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              Explore
            </p>
            <ul className="mt-4 space-y-2.5 text-[12px] text-white/60">
              <li>
                <Link href="/" className="transition hover:text-white">
                  Product portfolio
                </Link>
              </li>
              <li>
                <Link href="/submit-idea" className="transition hover:text-white">
                  Submit an idea
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              Inside DxValley
            </p>
            <p className="mt-4 text-[12px] leading-relaxed text-white/50">
              Every product on this page is owned, built and measured by DxValley teams.
              Internal approval notes and commercial data stay in the admin workspace.
            </p>
            <Link
              href="/submit-idea"
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
            >
              Have an idea? Start here <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="relative mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} DxValley Innovation Hub. Internal showcase.</span>
          <span>Innovation Management System · Built for the whole bank</span>
        </div>
      </div>
    </footer>
  );
}
