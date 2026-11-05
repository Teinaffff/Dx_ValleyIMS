import { ScrollText } from "lucide-react";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata = { title: "Audit logs" };

export default function AuditLogsPage() {
  return (
    <SectionPlaceholder
      eyebrow="Governance"
      title="An immutable record of change."
      description="Every product edit, milestone completion, approval decision and stage transition is written to the audit trail."
      icon={<ScrollText className="h-5 w-5" />}
      phase="Phase 5"
      features={[
        "Actor, action and entity",
        "Before and after values",
        "Timestamp and metadata",
        "Stage transition history",
        "Approval decision trail",
        "Configuration changes",
      ]}
      liveLinks={[
        { label: "Stage gate approvals", href: "/admin/approvals" },
        { label: "Product portfolio", href: "/admin/products" },
        { label: "Live dashboard", href: "/admin/dashboard" },
      ]}
    />
  );
}
