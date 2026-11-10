import { ApplicantsTable } from "@/components/admin/evaluators/applicants-table";

export default async function EvaluatorApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <ApplicantsTable mode="applications" initialStatus={status} />;
}
