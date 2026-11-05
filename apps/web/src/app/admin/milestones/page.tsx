import { ListChecks } from "lucide-react";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata = { title: "Projects & milestones" };

export default function MilestonesPage() {
  return (
    <SectionPlaceholder
      eyebrow="Delivery"
      title="Milestones across the portfolio."
      description="One cross-product workspace for due dates, owners, evidence and overdue delivery."
      icon={<ListChecks className="h-5 w-5" />}
      phase="Phase 4"
      features={[
        "Portfolio-wide milestone table",
        "Filter by stage, owner and status",
        "Overdue and due-soon views",
        "Reassign milestone owners",
        "Evidence and completion capture",
        "Stage-gate readiness signals",
      ]}
      liveLinks={[
        { label: "Open any product's milestones", href: "/admin/products" },
        { label: "Stage gate approvals", href: "/admin/approvals" },
        { label: "Live dashboard", href: "/admin/dashboard" },
      ]}
    />
  );
}
