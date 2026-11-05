import { ChartNoAxesCombined } from "lucide-react";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <SectionPlaceholder
      eyebrow="Analytics & reports"
      title="Measure the innovation engine."
      description="Stage trends, milestone completion, approval turnaround and team contribution — all from live database data."
      icon={<ChartNoAxesCombined className="h-5 w-5" />}
      phase="Phase 6"
      features={[
        "Products by lifecycle stage",
        "Stage transition trends",
        "Milestone completion rate",
        "Average time spent per stage",
        "Approval turnaround",
        "Team contribution and launches",
      ]}
      liveLinks={[
        { label: "Pipeline overview", href: "/admin/pipeline" },
        { label: "Product portfolio", href: "/admin/products" },
        { label: "Live dashboard", href: "/admin/dashboard" },
      ]}
    />
  );
}
