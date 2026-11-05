import { KeyRound } from "lucide-react";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata = { title: "Roles & permissions" };

export default function RolesPage() {
  return (
    <SectionPlaceholder
      eyebrow="Governance"
      title="Access that follows the org."
      description="Understand which role can view, create, approve and configure — with core security restrictions that can never be bypassed."
      icon={<KeyRound className="h-5 w-5" />}
      phase="Phase 5"
      features={[
        "Administrator",
        "Innovation evaluator",
        "Product owner",
        "Permission catalog",
        "Server-enforced access",
      ]}
      liveLinks={[
        { label: "People & access", href: "/admin/users" },
        { label: "Teams & resources", href: "/admin/teams" },
        { label: "Live dashboard", href: "/admin/dashboard" },
      ]}
    />
  );
}
