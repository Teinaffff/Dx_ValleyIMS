"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/evaluators", label: "Overview", exact: true },
  { href: "/admin/evaluators/applications", label: "Applications" },
  { href: "/admin/evaluators/registry", label: "Evaluator registry" },
  { href: "/admin/evaluators/questions", label: "Question bank" },
  { href: "/admin/evaluators/history", label: "History" },
];

export function EvaluatorTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Evaluator management" className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition",
              active ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
