import { Settings2 } from "lucide-react";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata = { title: "System configuration" };

export default function SettingsPage() {
  return (
    <SectionPlaceholder
      eyebrow="Configuration"
      title="Tune the rules, keep the guardrails."
      description="Milestone templates, stage-gate approval policy, visibility defaults and the notification cadence."
      icon={<Settings2 className="h-5 w-5" />}
      phase="Phase 5"
      features={[
        "Milestone templates per stage",
        "Approver count and policy",
        "Self-approval rules",
        "Evidence requirements",
        "Product visibility defaults",
        "Notification preferences",
      ]}
      liveLinks={[
        { label: "Stage gate approvals", href: "/admin/approvals" },
        { label: "People & access", href: "/admin/users" },
        { label: "Live dashboard", href: "/admin/dashboard" },
      ]}
    />
  );
}
