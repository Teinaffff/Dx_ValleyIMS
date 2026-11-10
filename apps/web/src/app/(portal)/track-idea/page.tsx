import { Mail, ShieldCheck } from "lucide-react";
import { TrackIdeaForm } from "@/components/portal/track-idea-form";

export const metadata = { title: "Track your idea" };

export default async function TrackIdeaPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const reference = typeof ref === "string" ? ref.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) : "";

  return (
    <main className="mx-auto max-w-[620px] px-4 pt-10 pb-16 sm:px-5">
      <div className="rounded-[32px] border border-white/80 bg-surface p-6 shadow-float sm:p-8">
        <TrackIdeaForm initialReference={reference} />
      </div>
      <div className="mt-4 space-y-2 rounded-[24px] border border-white/80 bg-white/70 p-5 text-[12px] leading-relaxed text-ink/70 backdrop-blur">
        <p className="flex items-start gap-2">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          We also email you when your idea is approved, becomes a product or is closed.
        </p>
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          Your reference and access code are both needed, so only you can see your idea's status.
        </p>
      </div>
    </main>
  );
}
