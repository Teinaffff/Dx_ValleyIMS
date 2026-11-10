import {
  BadgeCheck,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { IdeaSubmissionPanel } from "@/components/portal/idea-submission-panel";

export const metadata = { title: "Submit an idea" };

const STEPS = [
  {
    title: "Describe the opportunity",
    body: "A clear problem statement, who it affects and the outcome you want to change.",
    icon: Lightbulb,
  },
  {
    title: "Get a real evaluation",
    body: "Evaluators review the evidence, ask questions and capture structured notes.",
    icon: MessageSquareText,
  },
  {
    title: "Earn a product journey",
    body: "Accepted ideas become products with an owner, a team and a stage gate path.",
    icon: BadgeCheck,
  },
];

export default function SubmitIdeaPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-5">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/60 shadow-card backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Open to everyone at DxValley
          </span>
          <h1 className="text-display balance mt-6 text-[44px] font-semibold leading-[0.98] sm:text-[56px]">
            An idea is enough
            <br />
            to <span className="text-primary">start.</span>
          </h1>
          <p className="pretty mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
            You do not need a business case, a prototype or an account. Share the problem you
            have noticed and the change you believe is possible. The innovation team will take
            it from there.
          </p>

          <ol className="mt-8 space-y-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">
                    <span className="mr-1.5 text-[10px] font-bold text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            No sign-in. Your idea is shared only with the authorised innovation team.
          </div>
        </section>

        <aside className="lg:pt-4">
          <div className="rounded-[32px] border border-white/80 bg-surface p-6 shadow-float sm:p-8">
            <IdeaSubmissionPanel />
          </div>

          <div className="mt-4 rounded-[24px] border border-white/80 bg-white/70 p-5 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              What happens after review
            </p>
            <ul className="mt-3 space-y-2 text-[12px] text-ink/70">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                The innovation team reads every submission and may reply by email for context.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                Accepted ideas move into the Ideation stage as a product.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                No account is created unless you join the product team later.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
