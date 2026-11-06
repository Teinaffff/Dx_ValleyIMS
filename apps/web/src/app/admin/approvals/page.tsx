import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { PERMISSIONS, type DashboardData } from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ApprovalList } from "@/components/admin/approval-list";

export const metadata = { title: "Stage gate approvals" };

export default async function ApprovalsPage() {
  const [data, session] = await Promise.all([
    serverGet<DashboardData>("/api/dashboard"),
    getSession(),
  ]);
  const canDecide = Boolean(
    session &&
      (session.role === "ADMIN" ||
        session.permissions.includes(PERMISSIONS.GATE_DECIDE)),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage gates"
        title="Approvals that mean something."
        description="Evaluators with gate.decide approve, park or reject a pending gate. Your approval is recorded and the product advances only once the required number of evaluators have approved; a single rejection closes the gate. Every decision is append-only and audited."
        actions={
          <Button asChild variant="outline" size="md">
            <Link href="/admin/products">Review portfolio</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="surface-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="label-caps mb-1.5">Awaiting decision</p>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Pending stage gates
              </h2>
            </div>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-warning/15 px-2 text-sm font-bold text-[#9A6206]">
              {data?.approvals.length ?? 0}
            </span>
          </div>

          {!data ? (
            <EmptyState
              icon={<BadgeCheck className="h-5 w-5" />}
              title="Approvals unavailable"
              description="The approval queue could not be loaded from the API."
            />
          ) : (
            <ApprovalList
              approvals={data.approvals}
              showReviewLink={false}
              viewerId={session?.id ?? null}
              canDecide={canDecide}
            />
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-[24px] bg-soft p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-[17px] font-semibold tracking-tight">
              How a gate is decided
            </h2>
            <ol className="mt-4 space-y-3 text-[12px] text-muted">
              {[
                "The Product Owner completes every required milestone.",
                "The API verifies readiness and freezes a snapshot of the stage.",
                "A panel of independent evaluators is notified.",
                "Each evaluator approves, parks or rejects once; your decision is recorded.",
                "The product advances only when enough evaluators have approved. A single rejection closes the gate.",
                "Every decision is written to the audit trail.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-accent">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-[16px] border border-black/[0.06] bg-white p-3.5 text-[11px] leading-relaxed text-muted">
              Decisions are append-only. Parking pauses the product until it is resumed
              from the product page.
            </div>
          </section>

          <section className="surface-card p-5">
            <p className="label-caps mb-1.5">Approval policy</p>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Evaluator quorum
            </h3>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Gates up to MVP need 2 evaluator approvals; gates from MVP onward need 3.
              Your approval is recorded and the product advances once the required number
              of independent evaluators have approved.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-soft px-3 py-2.5 text-[10px] font-medium text-muted">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              A single rejection closes the gate; reasons are required.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
