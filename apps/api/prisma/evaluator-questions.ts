// Starter question bank for the evaluator qualification test. Administrators
// own this list afterwards (add, edit, deactivate, delete) from Evaluator
// management; the seed only inserts these when the bank is empty.

export type Competency =
  | "INNOVATION_FUNDAMENTALS"
  | "STRATEGIC_THINKING"
  | "CRITICAL_THINKING"
  | "RISK_MANAGEMENT"
  | "EVALUATION_ETHICS"
  | "PRODUCT_BUSINESS";

export interface SeedQuestion {
  competency: Competency;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export const STARTER_QUESTIONS: SeedQuestion[] = [
  // --- Innovation Management Fundamentals ---------------------------------
  {
    competency: "INNOVATION_FUNDAMENTALS",
    prompt: "What is the main purpose of a stage gate in an innovation pipeline?",
    options: [
      "To slow projects down so fewer of them reach the market",
      "To decide with evidence whether a project deserves the next level of investment",
      "To give managers a formal way to approve every task",
      "To record project status for the annual report",
    ],
    correctIndex: 1,
  },
  {
    competency: "INNOVATION_FUNDAMENTALS",
    prompt: "Which statement best describes an MVP?",
    options: [
      "A fully featured product launched to every customer at once",
      "A prototype that is never shown to real users",
      "The smallest version that lets the team test its riskiest assumption with real users",
      "A cheaper copy of a competitor's product",
    ],
    correctIndex: 2,
  },
  {
    competency: "INNOVATION_FUNDAMENTALS",
    prompt: "An early-stage project is stopped at a gate after testing showed customers do not want it. How should this be treated?",
    options: [
      "As a failure of the team that should be recorded against them",
      "As a useful result: the organisation learned cheaply and can redirect resources",
      "As a reason to lower the bar for the next project",
      "As proof that stage gates are too strict",
    ],
    correctIndex: 1,
  },
  {
    competency: "INNOVATION_FUNDAMENTALS",
    prompt: "Why do early gates ask for lighter evidence than later gates?",
    options: [
      "Because early projects matter less",
      "Because less money is at risk and uncertainty is high, so evidence should match the investment",
      "Because evaluators are less experienced early on",
      "Because later gates are only for senior managers",
    ],
    correctIndex: 1,
  },
  {
    competency: "INNOVATION_FUNDAMENTALS",
    prompt: "Which is an example of an experiment rather than a plan?",
    options: [
      "A 12-month delivery schedule signed off by all departments",
      "A two-week test with 20 customers designed to disprove a specific assumption",
      "A budget request for a full build team",
      "A slide deck describing the market size",
    ],
    correctIndex: 1,
  },
  {
    competency: "INNOVATION_FUNDAMENTALS",
    prompt: "What is the key difference between innovation work and routine operations?",
    options: [
      "Innovation has no goals",
      "Innovation deals with high uncertainty and learns its way to a result; operations repeat a known process",
      "Operations always cost more",
      "Innovation is only done by technology teams",
    ],
    correctIndex: 1,
  },

  // --- Strategic Thinking -------------------------------------------------
  {
    competency: "STRATEGIC_THINKING",
    prompt: "A proposal is technically impressive but unrelated to any bank priority. What is the strongest evaluation response?",
    options: [
      "Approve it because the technology is novel",
      "Reject it without discussion",
      "Ask how it supports a stated strategic goal; without a clear link, do not advance it",
      "Approve it if the team is enthusiastic",
    ],
    correctIndex: 2,
  },
  {
    competency: "STRATEGIC_THINKING",
    prompt: "When comparing two proposals with similar cost, which should usually rank higher?",
    options: [
      "The one with the more detailed slide deck",
      "The one that addresses a larger, clearly evidenced customer need and fits strategy",
      "The one submitted first",
      "The one championed by the more senior person",
    ],
    correctIndex: 1,
  },
  {
    competency: "STRATEGIC_THINKING",
    prompt: "What does it mean for a product to have a sustainable advantage?",
    options: [
      "It is cheaper this quarter",
      "Competitors find it hard to copy or match its value over time",
      "It uses the newest technology available",
      "It has more features than rivals",
    ],
    correctIndex: 1,
  },
  {
    competency: "STRATEGIC_THINKING",
    prompt: "A project fits today's strategy but depends on a market trend that is fading. What should an evaluator do?",
    options: [
      "Ignore the trend and judge only today's fit",
      "Raise the dependency as a risk and ask the team how the idea holds up if the trend fades",
      "Reject the project immediately",
      "Approve and revisit in two years",
    ],
    correctIndex: 1,
  },
  {
    competency: "STRATEGIC_THINKING",
    prompt: "Why is it useful to look at the whole portfolio rather than each project alone?",
    options: [
      "To make sure every project gets the same budget",
      "To balance risk, timing and resources so the bank is not over-exposed to one bet",
      "To reduce the number of evaluators needed",
      "To avoid making hard decisions",
    ],
    correctIndex: 1,
  },
  {
    competency: "STRATEGIC_THINKING",
    prompt: "Which question best tests whether an idea is strategic rather than merely interesting?",
    options: [
      "Is it exciting?",
      "If it succeeds, what changes for our customers and our position in the market?",
      "Has another bank done it?",
      "Can we build it quickly?",
    ],
    correctIndex: 1,
  },

  // --- Critical Thinking and Decision-Making ------------------------------
  {
    competency: "CRITICAL_THINKING",
    prompt: "A team says '90% of customers love it' but surveyed only their own colleagues. How should you treat this evidence?",
    options: [
      "As strong proof, because 90% is high",
      "As weak evidence: the sample is biased, so ask for results from real target customers",
      "As irrelevant, and reject the project",
      "As proof the product is ready to scale",
    ],
    correctIndex: 1,
  },
  {
    competency: "CRITICAL_THINKING",
    prompt: "Two metrics rose after a feature launched. What must you check before concluding the feature caused it?",
    options: [
      "Whether the team worked overtime",
      "Whether something else changed at the same time and whether a comparison group exists",
      "Whether the numbers are in a chart",
      "Nothing, the timing is enough",
    ],
    correctIndex: 1,
  },
  {
    competency: "CRITICAL_THINKING",
    prompt: "You have most, but not all, of the evidence you wanted and the decision is reversible and low-cost. What is the sensible approach?",
    options: [
      "Wait until every uncertainty is removed",
      "Decide with what you have, record the assumptions and set a point to review",
      "Pass the decision to someone else",
      "Reject, because evidence is incomplete",
    ],
    correctIndex: 1,
  },
  {
    competency: "CRITICAL_THINKING",
    prompt: "A confident presenter answers a hard question with a story instead of data. What should an evaluator do?",
    options: [
      "Accept it, because confidence signals competence",
      "Politely ask again for the data or note it as a gap in the assessment",
      "Mark the project down for the presenter's style",
      "Move on to avoid conflict",
    ],
    correctIndex: 1,
  },
  {
    competency: "CRITICAL_THINKING",
    prompt: "Which is the best example of an assumption that should be tested rather than trusted?",
    options: [
      "Our team has three engineers",
      "Customers will pay a monthly fee for this service",
      "The meeting is on Tuesday",
      "The project has a code name",
    ],
    correctIndex: 1,
  },
  {
    competency: "CRITICAL_THINKING",
    prompt: "Your initial impression of a project was very positive. New data contradicts a key claim. What is the right response?",
    options: [
      "Keep the original view to stay consistent",
      "Update your judgment based on the new data and explain why",
      "Ignore the data as an outlier",
      "Ask others to decide instead",
    ],
    correctIndex: 1,
  },

  // --- Risk Management ----------------------------------------------------
  {
    competency: "RISK_MANAGEMENT",
    prompt: "Which pair of factors is used to prioritise a risk?",
    options: [
      "Cost and duration",
      "Likelihood and impact",
      "Owner and department",
      "Age and visibility",
    ],
    correctIndex: 1,
  },
  {
    competency: "RISK_MANAGEMENT",
    prompt: "A fintech pilot could breach a regulatory requirement if launched as planned. What should an evaluator do?",
    options: [
      "Advance it and let the team sort the rules out later",
      "Require a compliance view and a mitigation plan before the project advances",
      "Ignore it, because compliance is someone else's job",
      "Reject all fintech projects",
    ],
    correctIndex: 1,
  },
  {
    competency: "RISK_MANAGEMENT",
    prompt: "What is a good mitigation for the risk that customers may not adopt a new service?",
    options: [
      "Spend more on the build",
      "Test demand early with a small group before committing to a full launch",
      "Hide the risk from the approval document",
      "Assume customers will adopt it",
    ],
    correctIndex: 1,
  },
  {
    competency: "RISK_MANAGEMENT",
    prompt: "A project shows a long list of risks, but none has an owner or a plan. How should this be read?",
    options: [
      "As strong risk management, because the list is long",
      "As incomplete: risks without owners and responses do not reduce exposure",
      "As proof the project is too risky for any gate",
      "As a documentation issue only",
    ],
    correctIndex: 1,
  },
  {
    competency: "RISK_MANAGEMENT",
    prompt: "Which risk is hardest to reverse once the product is live?",
    options: [
      "A minor wording issue in a help page",
      "Loss of customer data or trust",
      "A delayed internal report",
      "A colour change in the interface",
    ],
    correctIndex: 1,
  },
  {
    competency: "RISK_MANAGEMENT",
    prompt: "Why should risk be reassessed at every gate rather than once at the start?",
    options: [
      "Because risk never changes",
      "Because new information and a larger commitment change both likelihood and impact",
      "Because it is a formality",
      "Because evaluators change each time",
    ],
    correctIndex: 1,
  },

  // --- Evaluation Ethics and Impartiality ---------------------------------
  {
    competency: "EVALUATION_ETHICS",
    prompt: "You are asked to evaluate a project led by a close friend. What should you do?",
    options: [
      "Evaluate it, because you know the person well enough to be fair",
      "Declare the conflict of interest and step aside from that decision",
      "Evaluate it but give a slightly lower score to look fair",
      "Quietly advise your friend how to pass the gate",
    ],
    correctIndex: 1,
  },
  {
    competency: "EVALUATION_ETHICS",
    prompt: "A senior leader privately asks you to approve their favoured project. What is the right response?",
    options: [
      "Approve it to avoid conflict",
      "Judge it on the evidence like every other project and report the pressure if it continues",
      "Approve it and reject another to keep balance",
      "Delay the decision until the leader forgets",
    ],
    correctIndex: 1,
  },
  {
    competency: "EVALUATION_ETHICS",
    prompt: "You are on a project team and have also been authorized as an evaluator. Which of these is allowed?",
    options: [
      "Approving the gate for your own project",
      "Evaluating other teams' projects where you have no involvement",
      "Approving your own project if two others agree",
      "Evaluating your own project when it is urgent",
    ],
    correctIndex: 1,
  },
  {
    competency: "EVALUATION_ETHICS",
    prompt: "While evaluating, you see confidential customer or financial information. What should you do?",
    options: [
      "Share it with colleagues who might find it useful",
      "Use it only for the evaluation and keep it confidential",
      "Post a summary in a public channel",
      "Keep a copy for later reference",
    ],
    correctIndex: 1,
  },
  {
    competency: "EVALUATION_ETHICS",
    prompt: "Which is the fairest way to treat projects from a department you personally dislike?",
    options: [
      "Apply stricter standards to be safe",
      "Apply the same criteria and evidence standards you apply to everyone",
      "Avoid giving written feedback",
      "Delay their decisions",
    ],
    correctIndex: 1,
  },
  {
    competency: "EVALUATION_ETHICS",
    prompt: "A rejection decision should always include:",
    options: [
      "No explanation, to avoid argument",
      "A clear written reason based on the criteria so the team can learn or improve",
      "A comment on the team's personal skills",
      "A promise to approve next time",
    ],
    correctIndex: 1,
  },

  // --- Product and Business Understanding ---------------------------------
  {
    competency: "PRODUCT_BUSINESS",
    prompt: "Which is the best evidence of real customer demand for a new service?",
    options: [
      "The team believes customers will like it",
      "Customers sign up, pay or commit time to a test version",
      "A competitor launched something similar",
      "The idea scored well in a brainstorming session",
    ],
    correctIndex: 1,
  },
  {
    competency: "PRODUCT_BUSINESS",
    prompt: "Unit economics describes:",
    options: [
      "The total size of the bank's budget",
      "The revenue and cost of serving one customer or one transaction",
      "The number of employees on a team",
      "The age of the product",
    ],
    correctIndex: 1,
  },
  {
    competency: "PRODUCT_BUSINESS",
    prompt: "A product has many users but each one costs more to serve than they pay. What does this suggest?",
    options: [
      "It is ready to scale",
      "Growth will increase losses unless pricing or costs change",
      "Cost does not matter if usage is high",
      "The product should be launched in more countries",
    ],
    correctIndex: 1,
  },
  {
    competency: "PRODUCT_BUSINESS",
    prompt: "What is product-market fit?",
    options: [
      "When the product has every feature customers asked for",
      "When a clearly defined group of customers consistently chooses and keeps using the product",
      "When the product matches the company's brand colours",
      "When the team finishes the roadmap",
    ],
    correctIndex: 1,
  },
  {
    competency: "PRODUCT_BUSINESS",
    prompt: "Which question helps most to find out who the product is really for?",
    options: [
      "Which department built it?",
      "Which specific customer has this problem, and how do they solve it today?",
      "How large is the team?",
      "What is the launch date?",
    ],
    correctIndex: 1,
  },
  {
    competency: "PRODUCT_BUSINESS",
    prompt: "A pilot shows strong adoption but customers rarely come back. What should you ask for before advancing?",
    options: [
      "A bigger marketing budget",
      "An explanation of why users leave and a plan to improve retention",
      "A faster launch",
      "Nothing: adoption is enough",
    ],
    correctIndex: 1,
  },
];
