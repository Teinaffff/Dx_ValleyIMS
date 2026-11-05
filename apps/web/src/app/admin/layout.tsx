import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-api";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/admin/dashboard");
  }

  return <AdminShell user={session}>{children}</AdminShell>;
}
