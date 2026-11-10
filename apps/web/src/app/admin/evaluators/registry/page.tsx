import { ApplicantsTable } from "@/components/admin/evaluators/applicants-table";

export default async function EvaluatorRegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <ApplicantsTable mode="registry" initialStatus={status} />;
}
