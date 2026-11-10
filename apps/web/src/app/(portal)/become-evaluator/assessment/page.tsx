import { EvaluatorAssessment } from "@/components/portal/evaluator-assessment";

export const metadata = { title: "Evaluator assessment" };

export default function EvaluatorAssessmentPage() {
  return (
    <main className="px-4 pt-6 pb-16 sm:px-5">
      <EvaluatorAssessment />
    </main>
  );
}
