import {
  BadgeCheck,
  ClipboardCheck,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { serverGet } from "@/lib/server-api";
import type { EvaluatorInfo } from "@ims/shared";
import { LIFECYCLE_STAGES } from "@ims/shared";
import { EvaluatorApplyPanel } from "@/components/portal/evaluator-apply-panel";

export const metadata = { title: "Become an Evaluator" };

const RESPONSIBILITIES = [
  {
    title: "Judge on evidence",
    body: "Read the milestones, test results and customer evidence a team submits, and decide on what is shown, not on who is asking.",
    icon: ClipboardCheck,
  },
  {
    title: "Stay impartial",
    body: "Step aside from any project you are involved in. You never evaluate your own work or a team you belong to.",
    icon: Scale,
  },
  {
    title: "Give useful feedback",
    body: "Explain every decision in writing so teams can improve, and reject only with a clear reason.",
    icon: Users,
  },
  {
    title: "Protect confidentiality",
    body: "Evaluation material can include customer and financial information. Use it only for the evaluation.",
    icon: ShieldCheck,
  },
];

export default async function BecomeEvaluatorPage() {
  const info = await serverGet<EvaluatorInfo>("/api/public/evaluator/info");
  const config = info?.config;
  const peerStages = LIFECYCLE_STAGES.filter((stage) => info?.stages.includes(stage.key));

  return (
    <main className="mx-auto max-w-[1240px] px-4 pt-10 pb-16 sm:px-5">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/60 shadow-card backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Authority is earned, not inherited
          </span>
          <h1 className="text-display balance mt-6 text-[44px] font-semibold leading-[0.98] sm:text-[56px]">
            Help decide what
            <br />
            DxValley builds <span className="text-primary">next.</span>
          </h1>
          <p className="pretty mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            You don't need to be a manager to evaluate innovation. Show that you understand how
            good ideas are tested, pass a short assessment, and an administrator can authorize
            you to evaluate early-stage products.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {RESPONSIBILITIES.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary-soft text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-[13px] font-semibold">{item.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-white/80 bg-surface p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold tracking-tight">
                What the assessment measures
              </h2>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              Six competencies, each weighted. Questions are drawn at random from a larger
              bank, so every attempt is different.
            </p>
            <ul className="mt-4 divide-y divide-line/70">
              {(info?.competencies ?? []).map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{item.summary}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                    {item.weight}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/80 bg-surface p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Qualification criteria
              </h2>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink/75">
                <Criterion>
                  {config?.questionCount ?? 20} multiple-choice questions in{" "}
                  {config?.durationMinutes ?? 30} minutes
                </Criterion>
                <Criterion>Pass mark of {config?.passScore ?? 80}% overall</Criterion>
                <Criterion>
                  Up to {config?.maxAttempts ?? 2} attempts, with{" "}
                  {config?.retakeAfterDays ?? 2} days between them
                </Criterion>
                <Criterion>Questions and answer options are shuffled for every person</Criterion>
              </ul>
            </div>
            <div className="rounded-[28px] border border-white/80 bg-surface p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                What you can evaluate
              </h2>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink/75">
                <Criterion>
                  Qualifying is step one. An administrator then authorizes you and assigns you to
                  specific products.
                </Criterion>
                <Criterion>
                  Early-stage gates only
                  {peerStages.length ? ` (${peerStages.map((stage) => stage.label).join(", ")})` : ""}.
                  From Pilot onward a formal approver decides.
                </Criterion>
                <Criterion>You can never evaluate a project you are part of.</Criterion>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-[22px] border border-white/80 bg-white/70 p-4 text-[12px] leading-relaxed text-ink/70 backdrop-blur">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p>
              <span className="font-semibold text-ink">Three steps, kept separate.</span> Candidate
              means you applied. Qualified means you passed. Authorized means an administrator
              formally gave you the right to decide. Passing never grants approval rights on its
              own.
            </p>
          </div>
        </section>

        <aside className="lg:pt-4">
          <div className="rounded-[32px] border border-white/80 bg-surface p-6 shadow-float sm:p-8 lg:sticky lg:top-6">
            <EvaluatorApplyPanel info={info} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function Criterion({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}
