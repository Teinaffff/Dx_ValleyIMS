import { PageHeader } from "@/components/ui/page-header";
import { EvaluatorTabs } from "@/components/admin/evaluators/evaluator-tabs";

export const metadata = { title: "Evaluator management" };

export default function EvaluatorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Evaluator management"
        description="Qualify employees by competency, then authorize them for specific early-stage gates and products. Passing never grants approval rights on its own."
      />
      <EvaluatorTabs />
      {children}
    </div>
  );
}
