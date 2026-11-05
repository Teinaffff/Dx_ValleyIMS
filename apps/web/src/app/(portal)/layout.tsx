import { getSession } from "@/lib/server-api";
import { SiteHeader } from "@/components/portal/site-header";
import { SiteFooter } from "@/components/portal/site-footer";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] overflow-hidden">
        <div className="absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-lilac/30 blur-[120px]" />
        <div className="absolute right-[-10%] top-0 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[130px]" />
      </div>
      <SiteHeader user={session} />
      {children}
      <SiteFooter />
    </div>
  );
}
