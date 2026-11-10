import type { PrismaClient } from "@prisma/client";
import { PEER_EVALUATOR_STAGES, stageLabel } from "@ims/shared";

type Db = Pick<PrismaClient, "evaluatorApplicant" | "productEvaluator" | "product">;

interface ProductRef {
  id: string;
  stage: string;
  ownerId: string;
}

/**
 * Everyone connected to a product: its owner, creator, product team, members of
 * the development teams attached to it, and whoever submitted its gates.
 */
async function involvedPeople(prisma: Db, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      owner: { select: { id: true, email: true } },
      createdBy: { select: { id: true, email: true } },
      members: { select: { user: { select: { id: true, email: true } } } },
      teams: {
        select: {
          team: {
            select: { members: { select: { user: { select: { id: true, email: true } } } } },
          },
        },
      },
      gateRequests: { select: { submittedBy: { select: { id: true, email: true } } } },
    },
  });
  const ids = new Set<string>();
  const emails = new Set<string>();
  const add = (user?: { id: string; email: string } | null) => {
    if (!user) return;
    ids.add(user.id);
    emails.add(user.email.toLowerCase());
  };
  if (product) {
    add(product.owner);
    add(product.createdBy);
    product.members.forEach((member) => add(member.user));
    product.teams.forEach((entry) => entry.team.members.forEach((member) => add(member.user)));
    product.gateRequests.forEach((request) => add(request.submittedBy));
  }
  return { ids, emails };
}

/**
 * Why a peer evaluator may NOT decide this product's gate right now, or null if
 * every rule passes: active and unexpired authorization, a covered stage,
 * assignment to this product, no involvement in the project (which also rules
 * out approving their own work).
 */
export async function peerBlockReason(
  prisma: Db,
  user: { id: string; email: string },
  product: ProductRef,
): Promise<string | null> {
  const profile = await prisma.evaluatorApplicant.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "AUTHORIZED") {
    return "Your evaluator authorization is not active.";
  }
  if (profile.validUntil && profile.validUntil.getTime() < Date.now()) {
    return "Your evaluator authorization has expired. Ask an administrator to renew it.";
  }

  const stageOk =
    (PEER_EVALUATOR_STAGES as readonly string[]).includes(product.stage) &&
    profile.stages.includes(product.stage as (typeof profile.stages)[number]);
  if (!stageOk) {
    return `Your authorization does not cover gates at the ${stageLabel(
      product.stage,
    )} stage. This decision needs a formal approver.`;
  }

  const assigned = await prisma.productEvaluator.findUnique({
    where: { productId_userId: { productId: product.id, userId: user.id } },
  });
  if (!assigned) return "You are not assigned to evaluate this product.";

  if (user.id === product.ownerId) {
    return "You cannot decide on a stage gate for your own product.";
  }
  const involved = await involvedPeople(prisma, product.id);
  if (involved.ids.has(user.id) || involved.emails.has(user.email.toLowerCase())) {
    return "Conflict of interest: you are involved in this project, so you cannot evaluate it.";
  }
  return null;
}
