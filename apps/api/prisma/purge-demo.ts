import { PrismaClient, Prisma } from "@prisma/client";

const p = new PrismaClient();
type Client = PrismaClient | Prisma.TransactionClient;
const APPLY = process.argv.includes("--apply");

// Purges the seeded @dxvalley.dev demo accounts and the demo content they own.
// Kept: real user accounts, their products/milestones, the team records (demo
// leads cleared), and all reference data (roles, permissions, stage templates).
async function main() {
  const users = await p.user.findMany({ select: { id: true, email: true, name: true } });
  const demoIds = users.filter((u) => u.email.endsWith("@dxvalley.dev")).map((u) => u.id);
  if (demoIds.length === 0) {
    console.log("No demo accounts found — nothing to do.");
    return;
  }

  const products = await p.product.findMany({ select: { id: true, ownerId: true, ideaId: true } });
  const demoProductIds = products.filter((x) => demoIds.includes(x.ownerId)).map((x) => x.id);
  const keptProductIds = products.filter((x) => !demoIds.includes(x.ownerId)).map((x) => x.id);

  const ideas = await p.idea.findMany({ select: { id: true, submittedById: true } });
  const keptIdeaIds = new Set(
    products.filter((x) => !demoIds.includes(x.ownerId)).map((x) => x.ideaId).filter(Boolean) as string[],
  );
  // Only demo-attributed ideas: anonymous public intake has no submittedById and is real data.
  const demoIdeaIds = ideas
    .filter((i) => !keptIdeaIds.has(i.id))
    .filter((i) => i.submittedById !== null && demoIds.includes(i.submittedById))
    .map((i) => i.id);
  const survivingIdeaIds = ideas.filter((i) => !demoIdeaIds.includes(i.id)).map((i) => i.id);

  const [milestoneIds, gateRequestIds] = await Promise.all([
    p.milestone.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then((r) => r.map((x) => x.id)),
    p.stageGateRequest.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then((r) => r.map((x) => x.id)),
  ]);
  const deadEntityIds = [...demoProductIds, ...demoIdeaIds, ...milestoneIds, ...gateRequestIds];

  const steps: { label: string; preview: () => Promise<number>; run: (c: Client) => Promise<{ count: number }> }[] = [
    {
      label: "detach demo creators on kept products",
      preview: () => p.product.count({ where: { id: { in: keptProductIds }, createdById: { in: demoIds } } }),
      run: (c) => c.product.updateMany({ where: { id: { in: keptProductIds }, createdById: { in: demoIds } }, data: { createdById: null } }),
    },
    {
      label: "detach demo stage movers on kept products",
      preview: () => p.stageHistory.count({ where: { productId: { in: keptProductIds }, movedById: { in: demoIds } } }),
      run: (c) => c.stageHistory.updateMany({ where: { productId: { in: keptProductIds }, movedById: { in: demoIds } }, data: { movedById: null } }),
    },
    {
      label: "detach demo owners on kept milestones",
      preview: () => p.milestone.count({ where: { productId: { in: keptProductIds }, ownerId: { in: demoIds } } }),
      run: (c) => c.milestone.updateMany({ where: { productId: { in: keptProductIds }, ownerId: { in: demoIds } }, data: { ownerId: null } }),
    },
    {
      label: "detach demo completers on kept milestones",
      preview: () => p.milestone.count({ where: { productId: { in: keptProductIds }, completedById: { in: demoIds } } }),
      run: (c) => c.milestone.updateMany({ where: { productId: { in: keptProductIds }, completedById: { in: demoIds } }, data: { completedById: null } }),
    },
    {
      label: "delete demo-submitted gate requests on kept products",
      preview: () => p.stageGateRequest.count({ where: { productId: { in: keptProductIds }, submittedById: { in: demoIds } } }),
      run: (c) => c.stageGateRequest.deleteMany({ where: { productId: { in: keptProductIds }, submittedById: { in: demoIds } } }),
    },
    {
      label: "delete gate decisions by demo approvers",
      preview: () => p.stageGateDecision.count({ where: { approverId: { in: demoIds } } }),
      run: (c) => c.stageGateDecision.deleteMany({ where: { approverId: { in: demoIds } } }),
    },
    {
      label: "delete gate approver assignments to demo users",
      preview: () => p.stageGateApprover.count({ where: { userId: { in: demoIds } } }),
      run: (c) => c.stageGateApprover.deleteMany({ where: { userId: { in: demoIds } } }),
    },
    {
      label: "detach demo approver on surviving ideas",
      preview: () => p.idea.count({ where: { id: { in: survivingIdeaIds }, approvedById: { in: demoIds } } }),
      run: (c) => c.idea.updateMany({ where: { id: { in: survivingIdeaIds }, approvedById: { in: demoIds } }, data: { approvedById: null } }),
    },
    {
      label: "detach demo evaluator on surviving ideas",
      preview: () => p.idea.count({ where: { id: { in: survivingIdeaIds }, assignedEvaluatorId: { in: demoIds } } }),
      run: (c) => c.idea.updateMany({ where: { id: { in: survivingIdeaIds }, assignedEvaluatorId: { in: demoIds } }, data: { assignedEvaluatorId: null } }),
    },
    {
      label: "detach demo deleter on surviving ideas",
      preview: () => p.idea.count({ where: { id: { in: survivingIdeaIds }, deletedById: { in: demoIds } } }),
      run: (c) => c.idea.updateMany({ where: { id: { in: survivingIdeaIds }, deletedById: { in: demoIds } }, data: { deletedById: null } }),
    },
    {
      label: "detach demo status-changer on kept products",
      preview: () => p.product.count({ where: { id: { in: keptProductIds }, statusChangedById: { in: demoIds } } }),
      run: (c) => c.product.updateMany({ where: { id: { in: keptProductIds }, statusChangedById: { in: demoIds } }, data: { statusChangedById: null } }),
    },
    {
      label: "delete demo reviews/updates/evaluators on kept products",
      preview: async () =>
        (
          await Promise.all([
            p.productReview.count({ where: { productId: { in: keptProductIds }, reviewerId: { in: demoIds } } }),
            p.productUpdate.count({ where: { productId: { in: keptProductIds }, createdById: { in: demoIds } } }),
            p.productEvaluator.count({ where: { productId: { in: keptProductIds }, userId: { in: demoIds } } }),
          ])
        ).reduce((a, b) => a + b, 0),
      run: async (c) => {
        const rows = await Promise.all([
          c.productReview.deleteMany({ where: { productId: { in: keptProductIds }, reviewerId: { in: demoIds } } }),
          c.productUpdate.deleteMany({ where: { productId: { in: keptProductIds }, createdById: { in: demoIds } } }),
          c.productEvaluator.deleteMany({ where: { productId: { in: keptProductIds }, userId: { in: demoIds } } }),
        ]);
        return { count: rows.reduce((a, b) => a + b.count, 0) };
      },
    },
    {
      label: "delete demo products (cascades children)",
      preview: () => Promise.resolve(demoProductIds.length),
      run: (c) => c.product.deleteMany({ where: { id: { in: demoProductIds } } }),
    },
    {
      label: "delete demo ideas",
      preview: () => Promise.resolve(demoIdeaIds.length),
      run: (c) => c.idea.deleteMany({ where: { id: { in: demoIdeaIds } } }),
    },
    {
      label: "clear demo team leads (teams are kept)",
      preview: () => p.team.count({ where: { leadId: { in: demoIds } } }),
      run: (c) => c.team.updateMany({ where: { leadId: { in: demoIds } }, data: { leadId: null } }),
    },
    {
      label: "delete demo challenge submissions",
      preview: () => p.challengeSubmission.count({ where: { userId: { in: demoIds } } }),
      run: (c) => c.challengeSubmission.deleteMany({ where: { userId: { in: demoIds } } }),
    },
    {
      label: "delete seeded innovation challenges",
      preview: () => p.innovationChallenge.count(),
      run: (c) => c.innovationChallenge.deleteMany({}),
    },
    {
      label: "delete audit rows for demo actors/entities",
      preview: () => p.auditLog.count({ where: { OR: [{ actorId: { in: demoIds } }, { entityId: { in: deadEntityIds } }] } }),
      run: (c) => c.auditLog.deleteMany({ where: { OR: [{ actorId: { in: demoIds } }, { entityId: { in: deadEntityIds } }] } }),
    },
    {
      label: "clear demo authors on stage templates",
      preview: () => p.stageTemplate.count({ where: { createdById: { in: demoIds } } }),
      run: (c) => c.stageTemplate.updateMany({ where: { createdById: { in: demoIds } }, data: { createdById: null } }),
    },
    {
      label: "clear demo updaters on settings",
      preview: () => p.systemSetting.count({ where: { updatedById: { in: demoIds } } }),
      run: (c) => c.systemSetting.updateMany({ where: { updatedById: { in: demoIds } }, data: { updatedById: null } }),
    },
    {
      label: "delete demo notifications",
      preview: () => p.notification.count({ where: { userId: { in: demoIds } } }),
      run: (c) => c.notification.deleteMany({ where: { userId: { in: demoIds } } }),
    },
    {
      label: "delete demo team memberships",
      preview: () => p.userTeam.count({ where: { userId: { in: demoIds } } }),
      run: (c) => c.userTeam.deleteMany({ where: { userId: { in: demoIds } } }),
    },
    {
      label: "DELETE demo users",
      preview: () => Promise.resolve(demoIds.length),
      run: (c) => c.user.deleteMany({ where: { id: { in: demoIds } } }),
    },
  ];

  console.log(APPLY ? "APPLYING demo purge\n" : "DRY RUN — no writes\n");

  if (APPLY) {
    await p.$transaction(async (tx) => {
      for (const step of steps) {
        const res = await step.run(tx);
        console.log(String(res.count).padStart(6), step.label);
      }
    });
  } else {
    for (const step of steps) {
      console.log(String(await step.preview()).padStart(6), step.label);
    }
  }

  const after = await p.$transaction([
    p.user.count(),
    p.product.count(),
    p.idea.count(),
    p.team.count(),
    p.milestone.count(),
    p.stageTemplate.count(),
    p.role.count(),
    p.permission.count(),
  ]);
  console.log("\nremaining user/product/idea/team/milestone/stageTemplate/role/permission =", after.join(" / "));
  const remaining = await p.user.findMany({ select: { email: true, name: true, role: { select: { code: true } } } });
  for (const u of remaining) console.log("  user:", u.email, "|", u.name, "|", u.role.code);
}

main()
  .catch((e) => {
    console.error("ERR", String(e).slice(0, 600));
    process.exit(1);
  })
  .finally(() => p.$disconnect());
