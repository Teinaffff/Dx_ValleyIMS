import {
  ChallengeStatus,
  ChallengeSubmissionStatus,
  GateDecision,
  GateStatus,
  IdeaStatus,
  LifecycleStage,
  MilestoneStatus,
  Prisma,
  PrismaClient,
  ProductHealth,
  ProductVisibility,
  RoleCode,
} from "@prisma/client";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { PERMISSION_CATALOG, ROLE_PERMISSIONS } from "@ims/shared";

const prisma = new PrismaClient();

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const daysFromNow = (days: number) => new Date(now.getTime() + days * 86_400_000);

const STAGE_TEMPLATES: {
  stage: LifecycleStage;
  title: string;
  description: string;
  isRequired: boolean;
  requiresEvidence: boolean;
}[] = [
  {
    stage: "IDEATION",
    title: "Problem validation",
    description: "Confirm the problem with evidence from users or operations.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "IDEATION",
    title: "Stakeholder interviews",
    description: "Interview at least five stakeholders across business and technology.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "IDEATION",
    title: "Concept brief",
    description: "Document the concept, scope and intended outcomes.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "IDEATION",
    title: "Initial risk scan",
    description: "Capture initial regulatory, security and operational risks.",
    isRequired: false,
    requiresEvidence: false,
  },
  {
    stage: "VALIDATION",
    title: "Market assessment",
    description: "Size the opportunity and map competing solutions.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "VALIDATION",
    title: "User testing with 10+ users",
    description: "Test the prototype with a representative user group.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "VALIDATION",
    title: "Business case approved",
    description: "Secure sponsor approval for value, cost and risk.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "VALIDATION",
    title: "Technical feasibility review",
    description: "Confirm the solution can be built within platform constraints.",
    isRequired: false,
    requiresEvidence: false,
  },
  {
    stage: "MVP",
    title: "MVP scope defined",
    description: "Agree the thin slice that proves the core value.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "MVP",
    title: "Core build complete",
    description: "Ship the core flow behind a feature flag.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "MVP",
    title: "Security review passed",
    description: "Complete threat modelling and security sign-off.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "MVP",
    title: "Internal demo",
    description: "Demo the MVP to the innovation council.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "PILOT",
    title: "Pilot cohort recruited",
    description: "Confirm pilot participants and success measures.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "PILOT",
    title: "Pilot live",
    description: "Run the product with real users in a controlled environment.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "PILOT",
    title: "Feedback report",
    description: "Summarise pilot outcomes, usage and qualitative feedback.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "PILOT",
    title: "Go/no-go review",
    description: "Decide whether to progress to scale.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "SCALE",
    title: "Scale architecture review",
    description: "Confirm architecture, resilience and capacity for scale.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "SCALE",
    title: "Operations runbook",
    description: "Document support, monitoring and incident response.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "SCALE",
    title: "Rollout plan approved",
    description: "Approve the phased rollout across business units.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "SCALE",
    title: "Support model defined",
    description: "Agree ownership of level 1 and level 2 support.",
    isRequired: false,
    requiresEvidence: false,
  },
  {
    stage: "MONETIZATION",
    title: "Pricing model approved",
    description: "Approve commercial pricing and revenue recognition.",
    isRequired: true,
    requiresEvidence: false,
  },
  {
    stage: "MONETIZATION",
    title: "Revenue tracking live",
    description: "Instrument revenue, cost and adoption dashboards.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "MONETIZATION",
    title: "Commercial launch",
    description: "Launch to the target market with support in place.",
    isRequired: true,
    requiresEvidence: true,
  },
  {
    stage: "MONETIZATION",
    title: "Post-launch review",
    description: "Review outcomes against the business case.",
    isRequired: false,
    requiresEvidence: false,
  },
];

const SYSTEM_SETTINGS: {
  key: string;
  value: Prisma.InputJsonValue;
  description: string;
}[] = [
  {
    key: "approval.policy",
    value: {
      approverCount: 1,
      earlyCount: 1,
      lateCount: 3,
      mode: "UNANIMOUS",
      allowSelfApproval: false,
      rejectionRequiresReason: true,
    },
    description: "Default stage gate approval configuration",
  },
  {
    key: "visibility.default",
    value: { value: "EVERYONE" },
    description: "Default visibility applied to new products",
  },
  {
    key: "notifications.enabled",
    value: { inApp: true, email: false },
    description: "Notification channels",
  },
];

const ROLE_DEFS: [RoleCode, string, string][] = [
  ["ADMIN", "System Administrator", "Full control of the innovation system"],
  ["EVALUATOR", "Innovation Evaluator", "Review ideas and decide stage gates"],
  ["PRODUCT_OWNER", "Product Owner", "Own products, milestones and stage submissions"],
  ["DEVELOPER", "Developer", "Recorded for rostering and milestone ownership; no portal access"],
];

/**
 * Default seed for a real deployment: reference data only, written idempotently,
 * plus one administrator from env. Touches no other rows and never creates a
 * shared password. Demo content lives in seedDemo() and requires SEED_DEMO=1.
 */
async function seedBase() {
  console.log("Seeding reference data only — no demo accounts, no data reset.");

  const roles: Record<string, { id: string }> = {};
  for (const [code, name, description] of ROLE_DEFS) {
    roles[code] = await prisma.role.upsert({
      where: { code },
      update: { name, description },
      create: { code, name, description },
    });
  }

  const permissions: Record<string, string> = {};
  for (const permission of PERMISSION_CATALOG) {
    const row = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: { code: permission.code, description: permission.description },
    });
    permissions[permission.code] = row.id;
  }

  for (const [code] of ROLE_DEFS) {
    await prisma.rolePermission.deleteMany({ where: { roleId: roles[code].id } });
    const grants = (ROLE_PERMISSIONS[code] ?? [])
      .filter((permissionCode) => permissions[permissionCode])
      .map((permissionCode) => ({
        roleId: roles[code].id,
        permissionId: permissions[permissionCode],
      }));
    if (grants.length) await prisma.rolePermission.createMany({ data: grants });
  }

  let templatesAdded = 0;
  for (const template of STAGE_TEMPLATES) {
    const existing = await prisma.stageTemplate.findFirst({
      where: { stage: template.stage, title: template.title },
    });
    if (existing) continue;
    await prisma.stageTemplate.create({
      data: {
        ...template,
        sortOrder:
          STAGE_TEMPLATES.filter((item) => item.stage === template.stage).indexOf(template) + 1,
        isActive: true,
      },
    });
    templatesAdded += 1;
  }

  let settingsAdded = 0;
  for (const setting of SYSTEM_SETTINGS) {
    const existing = await prisma.systemSetting.findUnique({ where: { key: setting.key } });
    if (existing) continue;
    await prisma.systemSetting.create({
      data: { key: setting.key, value: setting.value, description: setting.description },
    });
    settingsAdded += 1;
  }

  console.log(`  roles ${ROLE_DEFS.length}, permissions ${PERMISSION_CATALOG.length}, stage templates +${templatesAdded}, settings +${settingsAdded}`);

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const adminCount = await prisma.user.count({
    where: { role: { code: "ADMIN" }, isActive: true, deletedAt: null },
  });

  if (!email || !password) {
    console.log(`  administrators in database: ${adminCount}`);
    console.log(
      adminCount === 0
        ? "  WARNING: nobody can sign in yet. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, then re-run npm run seed -w @ims/api."
        : "  Existing accounts left untouched.",
    );
    return;
  }

  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const admin = await prisma.user.upsert({
    where: { email },
    // Never overwrite the password of an account that already exists.
    update: { roleId: roles.ADMIN.id, isActive: true, deletedAt: null },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME?.trim() || email.split("@")[0],
      title: "System Administrator",
      passwordHash: await bcrypt.hash(password, 10),
      roleId: roles.ADMIN.id,
      isActive: true,
    },
  });
  console.log(`  administrator ready: ${admin.email}`);
}

async function seedDemo() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_CONFIRM !== "1") {
    throw new Error(
      "Refusing to wipe and re-seed fake demo data in production. Run without SEED_DEMO for reference data, or set SEED_DEMO_CONFIRM=1 to override.",
    );
  }
  console.log("Resetting demo data...");
  await prisma.stageGateDecision.deleteMany();
  await prisma.stageGateApprover.deleteMany();
  await prisma.stageGateRequest.deleteMany();
  await prisma.stageHistory.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.productUpdate.deleteMany();
  await prisma.productFollower.deleteMany();
  await prisma.productVisibilityTeam.deleteMany();
  await prisma.productTeam.deleteMany();
  await prisma.product.deleteMany();
  await prisma.stageTemplate.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.challengeSubmission.deleteMany();
  await prisma.innovationChallenge.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.userTeam.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const roles = await Promise.all(
    ROLE_DEFS.map(([code, name, description]) =>
      prisma.role.create({ data: { code, name, description } }),
    ),
  );

  const permissions = await Promise.all(
    PERMISSION_CATALOG.map((permission) =>
      prisma.permission.create({ data: permission }),
    ),
  );

  for (const role of roles) {
    const codes = ROLE_PERMISSIONS[role.code] ?? [];
    await prisma.rolePermission.createMany({
      data: permissions
        .filter((permission) => codes.includes(permission.code))
        .map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    });
  }

  const roleByName = Object.fromEntries(roles.map((role) => [role.code, role]));

  const usersData = [
    {
      key: "admin",
      name: "Hanna Tesfaye",
      email: "admin@dxvalley.dev",
      title: "Head of Innovation",
      role: "ADMIN" as RoleCode,
    },
    {
      key: "evaluator",
      name: "Nadia Bekele",
      email: "evaluator@dxvalley.dev",
      title: "Innovation Evaluator",
      role: "EVALUATOR" as RoleCode,
    },
    {
      key: "approver",
      name: "Yonas Girma",
      email: "approver@dxvalley.dev",
      title: "Stage Gate Approver",
      role: "EVALUATOR" as RoleCode,
    },
    {
      key: "owner",
      name: "Sara Mekonnen",
      email: "owner@dxvalley.dev",
      title: "Product Owner — Payments",
      role: "PRODUCT_OWNER" as RoleCode,
    },
    {
      key: "owner2",
      name: "Dawit Alemu",
      email: "owner2@dxvalley.dev",
      title: "Product Owner — Platform",
      role: "PRODUCT_OWNER" as RoleCode,
    },
    {
      key: "owner3",
      name: "Liya Haile",
      email: "owner3@dxvalley.dev",
      title: "Product Owner — AI",
      role: "PRODUCT_OWNER" as RoleCode,
    },
    {
      key: "owner4",
      name: "Samuel Tadesse",
      email: "owner4@dxvalley.dev",
      title: "Product Owner — Operations",
      role: "PRODUCT_OWNER" as RoleCode,
    },
  ];

  const users = await Promise.all(
    usersData.map((user) =>
      prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          title: user.title,
          passwordHash,
          isActive: true,
          roleId: roleByName[user.role].id,
          lastLoginAt: daysAgo(1),
        },
      }),
    ),
  );
  const user = Object.fromEntries(users.map((item, index) => [usersData[index].key, item]));

  // Developers are recorded for rostering and milestone ownership only. They have no portal
  // access: the login guard blocks the DEVELOPER role and each account gets an unusable password.
  const devPasswordHash = await bcrypt.hash(randomUUID(), 12);

  const developersData = [
    { key: "aiDev1", name: "Bekele Worku", email: "bekele.worku@dxvalley.dev", title: "ML Engineer", teamKey: "ai" },
    { key: "aiDev2", name: "Halen Fikru", email: "halen.fikru@dxvalley.dev", title: "Data Scientist", teamKey: "ai" },
    { key: "aiDev3", name: "Meron Alemu", email: "meron.alemu@dxvalley.dev", title: "AI Application Engineer", teamKey: "ai" },
    { key: "payDev1", name: "Tesfaye Kuma", email: "tesfaye.kuma@dxvalley.dev", title: "Payments Backend Engineer", teamKey: "payment" },
    { key: "payDev2", name: "Genet Assefa", email: "genet.assefa@dxvalley.dev", title: "Wallet Engineer", teamKey: "payment" },
    { key: "payDev3", name: "Abel Tessema", email: "abel.tessema@dxvalley.dev", title: "Settlement Engineer", teamKey: "payment" },
    { key: "platDev1", name: "Dennis Girma", email: "dennis.girma@dxvalley.dev", title: "Platform Engineer", teamKey: "platform" },
    { key: "platDev2", name: "Saba Birhanu", email: "saba.birhanu@dxvalley.dev", title: "API Engineer", teamKey: "platform" },
    { key: "platDev3", name: "Yared Bekele", email: "yared.bekele@dxvalley.dev", title: "Infrastructure Engineer", teamKey: "platform" },
    { key: "intDev1", name: "Lidya Mekuria", email: "lidya.mekuria@dxvalley.dev", title: "Integration Engineer", teamKey: "integration" },
    { key: "intDev2", name: "Fikru Wondimu", email: "fikru.wondimu@dxvalley.dev", title: "Middleware Engineer", teamKey: "integration" },
    { key: "intDev3", name: "Nardos Gela", email: "nardos.gela@dxvalley.dev", title: "Partner Connectivity Engineer", teamKey: "integration" },
  ];

  const developers = await Promise.all(
    developersData.map((dev) =>
      prisma.user.create({
        data: {
          name: dev.name,
          email: dev.email,
          title: dev.title,
          passwordHash: devPasswordHash,
          isActive: true,
          roleId: roleByName.DEVELOPER.id,
        },
      }),
    ),
  );
  const dev = Object.fromEntries(
    developers.map((item, index) => [developersData[index].key, item]),
  );

  const teamsData = [
    {
      key: "ai",
      name: "AI",
      description: "Applied AI, document intelligence and agentic automation.",
      leadId: user.owner3.id,
      memberIds: [user.admin.id, user.evaluator.id, dev.aiDev1.id, dev.aiDev2.id, dev.aiDev3.id],
    },
    {
      key: "payment",
      name: "Payment",
      description: "Merchant payments, wallets and settlement experiences.",
      leadId: user.owner.id,
      memberIds: [dev.payDev1.id, dev.payDev2.id, dev.payDev3.id],
    },
    {
      key: "platform",
      name: "Platform",
      description: "Core banking APIs, shared services and developer platform.",
      leadId: user.owner2.id,
      memberIds: [user.evaluator.id, dev.platDev1.id, dev.platDev2.id, dev.platDev3.id],
    },
    {
      key: "integration",
      name: "Integration",
      description: "Partner connectivity, middleware and ecosystem integrations.",
      leadId: user.approver.id,
      memberIds: [user.approver.id, dev.intDev1.id, dev.intDev2.id, dev.intDev3.id],
    },
    {
      key: "products",
      name: "Products",
      description: "Product owners shaping and steering the portfolio.",
      leadId: null,
      memberIds: [user.owner.id, user.owner2.id, user.owner3.id, user.owner4.id],
    },
  ];

  const teams = await Promise.all(
    teamsData.map((team) =>
      prisma.team.create({
        data: {
          name: team.name,
          description: team.description,
          leadId: team.leadId,
          members: {
            create: team.memberIds.map((userId) => ({
              userId,
              isLead: userId === team.leadId,
            })),
          },
        },
      }),
    ),
  );
  const team = Object.fromEntries(teams.map((item, index) => [teamsData[index].key, item]));

  await prisma.stageTemplate.createMany({
    data: STAGE_TEMPLATES.map((template, index) => ({
      ...template,
      sortOrder:
        STAGE_TEMPLATES.filter((item) => item.stage === template.stage).indexOf(template) + 1,
      isActive: true,
      createdById: user.admin.id,
      createdAt: daysAgo(160 - index),
    })),
  });

  const settingData = SYSTEM_SETTINGS;
  for (const setting of settingData) {
    await prisma.systemSetting.create({
      data: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedById: user.admin.id,
      },
    });
  }

  const slug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  type ProductSeed = {
    key: string;
    name: string;
    description: string;
    ownerId: string;
    teamId: string;
    additionalTeamIds?: string[];
    stage: LifecycleStage;
    health: ProductHealth;
    visibility?: ProductVisibility;
    businessArea: string;
    targetUsers: string;
    expectedImpact: string;
    launchInDays?: number;
    createdDaysAgo: number;
    visibilityTeamIds?: string[];
    idea?: { title: string; problem: string; solution: string; status: IdeaStatus };
  };

  const ideaSeeds: {
    title: string;
    problem: string;
    solution: string;
    status: IdeaStatus;
    submittedBy: string;
    evaluator: string | null;
    days: number;
    reviewNote?: string;
    deleteReason?: string;
  }[] = [
    {
      title: "Instant payroll advances via wallet",
      problem: "Workers need short-term liquidity before payday but branch lending is slow.",
      solution: "Pre-approved payroll advances inside the merchant wallet with automated repayment.",
      status: IdeaStatus.CONVERTED,
      submittedBy: user.owner4.id,
      evaluator: user.evaluator.id,
      days: 38,
    },
    {
      title: "Automate loan document intake",
      problem: "Operations manually key in thousands of scanned loan documents every week.",
      solution: "Use document AI with human review queues to extract and validate loan packets.",
      status: IdeaStatus.SUBMITTED,
      submittedBy: user.owner4.id,
      evaluator: null,
      days: 3,
    },
    {
      title: "Voice-first banking for rural customers",
      problem: "Low-literacy customers struggle with mobile menus and branch travel.",
      solution: "A voice-first assistant in Amharic that completes balances, transfers and bill payments.",
      status: IdeaStatus.UNDER_REVIEW,
      submittedBy: user.owner3.id,
      evaluator: user.evaluator.id,
      days: 6,
    },
    {
      title: "Smart branch queue prediction",
      problem: "Branches are unevenly staffed and customers wait unpredictably.",
      solution: "Forecast footfall with historical and calendar signals to optimise staffing.",
      status: IdeaStatus.NEEDS_CLARIFICATION,
      submittedBy: user.owner4.id,
      evaluator: user.evaluator.id,
      days: 11,
    },
    {
      title: "Merchant settlement insights API",
      problem: "Merchants cannot see when and why settlements are delayed.",
      solution: "Expose settlement timelines and reasons through a partner API.",
      status: IdeaStatus.ACCEPTED,
      submittedBy: user.owner3.id,
      evaluator: user.evaluator.id,
      days: 14,
    },
    {
      title: "Reusable KYC orchestration layer",
      problem: "Every product team rebuilds identity verification flows.",
      solution: "A shared orchestration service for KYC vendors and policy checks.",
      status: IdeaStatus.REJECTED,
      submittedBy: user.owner4.id,
      evaluator: user.evaluator.id,
      days: 22,
    },
    {
      title: "Shared fraud signal exchange",
      problem: "Fraud patterns spotted in one product are not visible to the others.",
      solution: "Publish anonymised risk signals to a shared exchange with policy controls.",
      status: IdeaStatus.APPROVED,
      submittedBy: user.owner3.id,
      evaluator: user.evaluator.id,
      days: 8,
      reviewNote: "Strong platform fit. Approved for product discovery.",
    },
    {
      title: "Duplicate settlement insights request",
      problem: "Merchants want more visibility into settlement timing.",
      solution: "A settlement timeline dashboard for merchants.",
      status: IdeaStatus.DELETED,
      submittedBy: user.owner4.id,
      evaluator: null,
      days: 31,
      deleteReason: "Duplicate of an existing settlement insights submission.",
    },
  ];

  const ideas = [];
  for (const item of ideaSeeds) {
    ideas.push(
      await prisma.idea.create({
        data: {
          title: item.title,
          problem: item.problem,
          solution: item.solution,
          status: item.status,
          submittedById: item.submittedBy,
          assignedEvaluatorId: item.evaluator,
          clarificationNote:
            item.status === IdeaStatus.NEEDS_CLARIFICATION
              ? "Please share which branches and date range should be used for the forecast."
              : null,
          internalNotes:
            item.status === IdeaStatus.ACCEPTED
              ? "Strong fit with the partner platform roadmap. Convert after pilot planning."
              : null,
          approvedById:
            item.status === IdeaStatus.APPROVED ? user.admin.id : null,
          approvedAt:
            item.status === IdeaStatus.APPROVED
              ? daysAgo(Math.max(item.days - 1, 0))
              : null,
          reviewNote:
            item.status === IdeaStatus.APPROVED ? item.reviewNote : null,
          deletedById:
            item.status === IdeaStatus.DELETED ? user.admin.id : null,
          deletedAt:
            item.status === IdeaStatus.DELETED
              ? daysAgo(Math.max(item.days - 2, 0))
              : null,
          deleteReason:
            item.status === IdeaStatus.DELETED ? item.deleteReason : null,
          createdAt: daysAgo(item.days),
          updatedAt: daysAgo(Math.max(item.days - 2, 0)),
        },
      }),
    );
  }
  const ideaByTitle = Object.fromEntries(ideas.map((idea) => [idea.title, idea]));

  const productsData: ProductSeed[] = [
    {
      key: "payment",
      name: "Payment Operator",
      description:
        "A single operations workspace for merchant payments: onboarding, settlement exceptions and reconciliation in one place.",
      ownerId: user.owner.id,
      teamId: team.payment.id,
      additionalTeamIds: [team.ai.id],
      stage: LifecycleStage.PILOT,
      health: ProductHealth.ON_TRACK,
      businessArea: "Payments",
      targetUsers: "Merchant operations teams and payment specialists",
      expectedImpact: "Cuts reconciliation time by 60% and reduces settlement exceptions by a third.",
      launchInDays: 60,
      createdDaysAgo: 125,
    },
    {
      key: "partnerApi",
      name: "Partner API Hub",
      description:
        "A developer portal and gateway that lets partners discover, test and launch banking APIs with self-service credentials.",
      ownerId: user.owner2.id,
      teamId: team.platform.id,
      additionalTeamIds: [team.integration.id],
      stage: LifecycleStage.MVP,
      health: ProductHealth.ON_TRACK,
      businessArea: "Platform",
      targetUsers: "Fintech partners and internal integration teams",
      expectedImpact: "Reduces partner onboarding from six weeks to five days.",
      launchInDays: 90,
      createdDaysAgo: 96,
    },
    {
      key: "agentBanking",
      name: "Agent Banking App",
      description:
        "A lightweight agent app for cash-in, cash-out and account opening in underserved communities.",
      ownerId: user.owner.id,
      teamId: team.integration.id,
      stage: LifecycleStage.VALIDATION,
      health: ProductHealth.AT_RISK,
      businessArea: "Retail Banking",
      targetUsers: "Agent networks and field operations",
      expectedImpact: "Extends reach to 2,400 agents and cuts onboarding to under ten minutes.",
      launchInDays: 150,
      createdDaysAgo: 64,
    },
    {
      key: "documentAi",
      name: "Document AI",
      description:
        "Document intelligence for loan packets, trade finance and customer onboarding, with human-in-the-loop review.",
      ownerId: user.owner2.id,
      teamId: team.ai.id,
      additionalTeamIds: [team.platform.id],
      stage: LifecycleStage.IDEATION,
      health: ProductHealth.ON_TRACK,
      visibility: ProductVisibility.TEAMS,
      visibilityTeamIds: [team.ai.id],
      businessArea: "Operations",
      targetUsers: "Credit operations, trade finance and compliance teams",
      expectedImpact: "Removes 70% of manual document keying across lending operations.",
      launchInDays: 210,
      createdDaysAgo: 26,
    },
    {
      key: "distributorFinance",
      name: "Distributor Finance",
      description:
        "Working capital for FMCG distributors, scored from verified sales and settlement patterns.",
      ownerId: user.owner.id,
      teamId: team.payment.id,
      stage: LifecycleStage.SCALE,
      health: ProductHealth.ON_TRACK,
      businessArea: "Lending",
      targetUsers: "Distributors supplying major consumer brands",
      expectedImpact: "Unlocks a $42M working capital book within 18 months.",
      launchInDays: 30,
      createdDaysAgo: 112,
    },
    {
      key: "merchantWallet",
      name: "Merchant Wallet",
      description:
        "A settlement wallet for merchants with instant visibility of fees, refunds and payouts.",
      ownerId: user.owner.id,
      teamId: team.payment.id,
      stage: LifecycleStage.MONETIZATION,
      health: ProductHealth.COMPLETED,
      businessArea: "Payments",
      targetUsers: "Small and medium merchants",
      expectedImpact: "Grew fee-based revenue by 18% in the first two quarters.",
      createdDaysAgo: 170,
      idea: {
        title: ideaByTitle["Instant payroll advances via wallet"].title,
        problem: "",
        solution: "",
        status: IdeaStatus.CONVERTED,
      },
    },
    {
      key: "fraudRadar",
      name: "Fraud Radar",
      description:
        "Real-time anomaly detection for agent and merchant transactions using graph signals.",
      ownerId: user.owner2.id,
      teamId: team.ai.id,
      stage: LifecycleStage.SCALE,
      health: ProductHealth.BLOCKED,
      visibility: ProductVisibility.ADMINS_ONLY,
      businessArea: "Risk",
      targetUsers: "Financial crime and fraud operations teams",
      expectedImpact: "Flags 45% more mule accounts before first loss.",
      launchInDays: 45,
      createdDaysAgo: 101,
    },
    {
      key: "treasuryCopilot",
      name: "Treasury Copilot",
      description:
        "An AI copilot that explains liquidity positions and drafts treasury actions with full traceability.",
      ownerId: user.owner2.id,
      teamId: team.platform.id,
      stage: LifecycleStage.VALIDATION,
      health: ProductHealth.ON_TRACK,
      businessArea: "Treasury",
      targetUsers: "Treasury analysts and ALM teams",
      expectedImpact: "Saves eight analyst hours per week per desk.",
      launchInDays: 180,
      createdDaysAgo: 23,
    },
  ];

  const products: Record<string, { id: string; name: string }> = {};
  for (const [index, item] of productsData.entries()) {
    const created = await prisma.product.create({
      data: {
        name: item.name,
        slug: slug(item.name),
        description: item.description,
        ownerId: item.ownerId,
        teamId: item.teamId,
        stage: item.stage,
        health: item.health,
        visibility: item.visibility ?? ProductVisibility.EVERYONE,
        businessArea: item.businessArea,
        targetUsers: item.targetUsers,
        expectedImpact: item.expectedImpact,
        launchTarget: item.launchInDays ? daysFromNow(item.launchInDays) : null,
        createdById: user.admin.id,
        createdAt: daysAgo(item.createdDaysAgo),
        updatedAt: daysAgo(index === 0 ? 1 : index + 2),
        ideaId: item.key === "merchantWallet" ? ideaByTitle["Instant payroll advances via wallet"].id : null,
        teams: {
          create: [item.teamId, ...(item.additionalTeamIds ?? [])].map((teamId) => ({
            teamId,
          })),
        },
        visibilityTeams: item.visibilityTeamIds
          ? { create: item.visibilityTeamIds.map((teamId) => ({ teamId })) }
          : undefined,
      },
    });
    products[item.key] = { id: created.id, name: created.name };
  }

  type MilestoneSeed = {
    title: string;
    required: boolean;
    status: MilestoneStatus;
    dueIn: number;
    evidence?: string;
    completedDaysAgo?: number;
    ownerId?: string;
    weight?: number;
    statusReason?: string;
  };

  const milestoneSeeds: Record<string, { stage: LifecycleStage; items: MilestoneSeed[] }> = {
    payment: {
      stage: "PILOT",
      items: [
        {
          title: "Pilot cohort recruited",
          required: true,
          status: "COMPLETED",
          dueIn: -20,
          completedDaysAgo: 18,
          ownerId: user.owner.id,
        },
        {
          title: "Pilot live",
          required: true,
          status: "COMPLETED",
          dueIn: -6,
          completedDaysAgo: 5,
          evidence: "https://dxvalley.dev/evidence/payment-operator-pilot",
          ownerId: user.owner.id,
        },
        {
          title: "Feedback report",
          required: true,
          status: "PARKED",
          statusReason: "Waiting on the pilot cohort to return the exit surveys.",
          weight: 60,
          dueIn: 10,
          ownerId: user.owner4.id,
        },
        {
          title: "Go/no-go review",
          required: true,
          status: "NOT_STARTED",
          weight: 40,
          dueIn: 20,
          ownerId: user.owner.id,
        },
      ],
    },
    partnerApi: {
      stage: "MVP",
      items: [
        {
          title: "MVP scope defined",
          required: true,
          status: "COMPLETED",
          dueIn: -20,
          completedDaysAgo: 18,
          ownerId: user.owner2.id,
        },
        {
          title: "Core build complete",
          required: true,
          status: "COMPLETED",
          dueIn: -10,
          completedDaysAgo: 9,
          evidence: "https://dxvalley.dev/evidence/partner-api-core",
          ownerId: user.owner3.id,
        },
        {
          title: "Security review passed",
          required: true,
          status: "COMPLETED",
          dueIn: -5,
          completedDaysAgo: 4,
          evidence: "https://dxvalley.dev/evidence/partner-api-security",
          ownerId: user.evaluator.id,
        },
        {
          title: "Internal demo",
          required: true,
          status: "COMPLETED",
          dueIn: -2,
          completedDaysAgo: 2,
          ownerId: user.owner2.id,
        },
      ],
    },
    agentBanking: {
      stage: "VALIDATION",
      items: [
        {
          title: "Market assessment",
          required: true,
          status: "COMPLETED",
          dueIn: -30,
          completedDaysAgo: 27,
          evidence: "https://dxvalley.dev/evidence/agent-market",
          ownerId: user.owner.id,
        },
        {
          title: "User testing with 10+ users",
          required: true,
          status: "COMPLETED",
          dueIn: -12,
          completedDaysAgo: 11,
          evidence: "https://dxvalley.dev/evidence/agent-testing",
          ownerId: user.owner4.id,
        },
        {
          title: "Business case approved",
          required: true,
          status: "BLOCKED",
          statusReason: "Blocked by the open regulatory query on collateral tokenisation.",
          weight: 70,
          dueIn: -2,
          ownerId: user.owner.id,
        },
        {
          title: "Technical feasibility review",
          required: false,
          status: "IN_PROGRESS",
          weight: 30,
          dueIn: 15,
          ownerId: user.approver.id,
        },
      ],
    },
    documentAi: {
      stage: "IDEATION",
      items: [
        {
          title: "Problem validation",
          required: true,
          status: "COMPLETED",
          dueIn: -10,
          completedDaysAgo: 8,
          evidence: "https://dxvalley.dev/evidence/document-ai-problem",
          ownerId: user.owner3.id,
        },
        {
          title: "Stakeholder interviews",
          required: true,
          status: "IN_PROGRESS",
          dueIn: 6,
          ownerId: user.owner2.id,
        },
        {
          title: "Concept brief",
          required: true,
          status: "NOT_STARTED",
          dueIn: 14,
          ownerId: user.owner2.id,
        },
        {
          title: "Initial risk scan",
          required: false,
          status: "NOT_STARTED",
          dueIn: 20,
          ownerId: user.evaluator.id,
        },
      ],
    },
    distributorFinance: {
      stage: "SCALE",
      items: [
        {
          title: "Scale architecture review",
          required: true,
          status: "COMPLETED",
          dueIn: -25,
          completedDaysAgo: 23,
          ownerId: user.owner.id,
        },
        {
          title: "Operations runbook",
          required: true,
          status: "COMPLETED",
          dueIn: -15,
          completedDaysAgo: 14,
          evidence: "https://dxvalley.dev/evidence/distributor-runbook",
          ownerId: user.owner4.id,
        },
        {
          title: "Rollout plan approved",
          required: true,
          status: "COMPLETED",
          dueIn: -5,
          completedDaysAgo: 5,
          ownerId: user.owner.id,
        },
        {
          title: "Support model defined",
          required: false,
          status: "IN_PROGRESS",
          dueIn: 10,
          ownerId: user.owner4.id,
        },
      ],
    },
    merchantWallet: {
      stage: "MONETIZATION",
      items: [
        {
          title: "Pricing model approved",
          required: true,
          status: "COMPLETED",
          dueIn: -55,
          completedDaysAgo: 53,
          ownerId: user.owner.id,
        },
        {
          title: "Revenue tracking live",
          required: true,
          status: "COMPLETED",
          dueIn: -35,
          completedDaysAgo: 34,
          evidence: "https://dxvalley.dev/evidence/wallet-revenue",
          ownerId: user.owner.id,
        },
        {
          title: "Commercial launch",
          required: true,
          status: "COMPLETED",
          dueIn: -20,
          completedDaysAgo: 19,
          evidence: "https://dxvalley.dev/evidence/wallet-launch",
          ownerId: user.owner.id,
        },
        {
          title: "Post-launch review",
          required: false,
          status: "COMPLETED",
          dueIn: -5,
          completedDaysAgo: 4,
          ownerId: user.owner4.id,
        },
      ],
    },
    fraudRadar: {
      stage: "SCALE",
      items: [
        {
          title: "Scale architecture review",
          required: true,
          status: "COMPLETED",
          dueIn: -40,
          completedDaysAgo: 38,
          ownerId: user.owner2.id,
        },
        {
          title: "Operations runbook",
          required: true,
          status: "IN_PROGRESS",
          dueIn: -10,
          ownerId: user.owner3.id,
        },
        {
          title: "Rollout plan approved",
          required: true,
          status: "NOT_STARTED",
          dueIn: 14,
          ownerId: user.owner2.id,
        },
        {
          title: "Support model defined",
          required: false,
          status: "NOT_STARTED",
          dueIn: 20,
          ownerId: user.evaluator.id,
        },
      ],
    },
    treasuryCopilot: {
      stage: "VALIDATION",
      items: [
        {
          title: "Market assessment",
          required: true,
          status: "IN_PROGRESS",
          dueIn: 7,
          ownerId: user.owner2.id,
        },
        {
          title: "User testing with 10+ users",
          required: true,
          status: "NOT_STARTED",
          dueIn: 14,
          ownerId: user.owner2.id,
        },
        {
          title: "Business case approved",
          required: true,
          status: "NOT_STARTED",
          dueIn: 21,
          ownerId: user.owner2.id,
        },
        {
          title: "Technical feasibility review",
          required: false,
          status: "IN_PROGRESS",
          dueIn: 10,
          ownerId: user.owner3.id,
        },
      ],
    },
  };

  for (const [productKey, config] of Object.entries(milestoneSeeds)) {
    const product = products[productKey];
    let order = 0;
    for (const item of config.items) {
      order += 1;
      await prisma.milestone.create({
        data: {
          productId: product.id,
          stage: config.stage,
          title: item.title,
          description: STAGE_TEMPLATES.find(
            (template) => template.stage === config.stage && template.title === item.title,
          )?.description,
          isRequired: item.required,
          status: item.status,
          weight: item.weight ?? 100,
          statusReason: item.statusReason ?? null,
          ownerId: item.ownerId,
          dueDate: daysFromNow(item.dueIn),
          evidenceLink: item.evidence,
          completedAt:
            item.completedDaysAgo !== undefined ? daysAgo(item.completedDaysAgo) : null,
          completedById:
            item.completedDaysAgo !== undefined ? item.ownerId ?? user.owner.id : null,
          sortOrder: order,
          createdAt: daysAgo(70 - order),
        },
      });
    }
  }

  const historySeeds: {
    productKey: string;
    moves: [LifecycleStage | null, LifecycleStage, number][];
  }[] = [
    {
      productKey: "payment",
      moves: [
        [null, "IDEATION", 120],
        ["IDEATION", "VALIDATION", 110],
        ["VALIDATION", "MVP", 80],
        ["MVP", "PILOT", 12],
      ],
    },
    {
      productKey: "partnerApi",
      moves: [
        [null, "IDEATION", 92],
        ["IDEATION", "VALIDATION", 80],
        ["VALIDATION", "MVP", 30],
      ],
    },
    {
      productKey: "agentBanking",
      moves: [
        [null, "IDEATION", 60],
        ["IDEATION", "VALIDATION", 45],
      ],
    },
    {
      productKey: "documentAi",
      moves: [[null, "IDEATION", 24]],
    },
    {
      productKey: "distributorFinance",
      moves: [
        [null, "IDEATION", 105],
        ["IDEATION", "VALIDATION", 100],
        ["VALIDATION", "MVP", 70],
        ["MVP", "PILOT", 50],
        ["PILOT", "SCALE", 25],
      ],
    },
    {
      productKey: "merchantWallet",
      moves: [
        [null, "IDEATION", 160],
        ["IDEATION", "VALIDATION", 150],
        ["VALIDATION", "MVP", 130],
        ["MVP", "PILOT", 110],
        ["PILOT", "SCALE", 80],
        ["SCALE", "MONETIZATION", 45],
      ],
    },
    {
      productKey: "fraudRadar",
      moves: [
        [null, "IDEATION", 96],
        ["IDEATION", "VALIDATION", 90],
        ["VALIDATION", "MVP", 65],
        ["MVP", "PILOT", 45],
        ["PILOT", "SCALE", 20],
      ],
    },
    {
      productKey: "treasuryCopilot",
      moves: [
        [null, "IDEATION", 21],
        ["IDEATION", "VALIDATION", 18],
      ],
    },
  ];

  for (const item of historySeeds) {
    for (const [fromStage, toStage, days] of item.moves) {
      await prisma.stageHistory.create({
        data: {
          productId: products[item.productKey].id,
          fromStage,
          toStage,
          movedById: user.admin.id,
          reason:
            fromStage === null
              ? "Product created"
              : `Stage gate approved — moved to ${toStage.toLowerCase()}`,
          createdAt: daysAgo(days),
        },
      });
    }
  }

  const policy = {
    approverCount: 3,
    earlyCount: 2,
    lateCount: 3,
    mode: "UNANIMOUS",
    allowSelfApproval: false,
  };

  type GateSeed = {
    productKey: string;
    fromStage: LifecycleStage;
    toStage: LifecycleStage;
    status: GateStatus;
    submittedDaysAgo: number;
    decidedDaysAgo?: number;
    approvers: { id: string; decision: GateDecision | null; comment?: string; daysAgo?: number }[];
    submittedBy: string;
  };

  const gateSeeds: GateSeed[] = [
    {
      productKey: "payment",
      fromStage: "MVP",
      toStage: "PILOT",
      status: GateStatus.APPROVED,
      submittedDaysAgo: 14,
      decidedDaysAgo: 12,
      submittedBy: user.owner.id,
      approvers: [
        {
          id: user.admin.id,
          decision: GateDecision.APPROVED,
          comment: "Pilot plan and success measures are clear.",
          daysAgo: 13,
        },
        {
          id: user.evaluator.id,
          decision: GateDecision.APPROVED,
          comment: "Security review is satisfactory.",
          daysAgo: 12,
        },
        {
          id: user.approver.id,
          decision: GateDecision.APPROVED,
          comment: "Approved for a three-merchant pilot.",
          daysAgo: 12,
        },
      ],
    },
    {
      productKey: "partnerApi",
      fromStage: "MVP",
      toStage: "PILOT",
      status: GateStatus.PENDING_APPROVAL,
      submittedDaysAgo: 3,
      submittedBy: user.owner2.id,
      approvers: [
        {
          id: user.admin.id,
          decision: GateDecision.APPROVED,
          comment: "Strong evidence pack. Ready for pilot.",
          daysAgo: 2,
        },
        { id: user.evaluator.id, decision: null },
        { id: user.approver.id, decision: null },
      ],
    },
    {
      productKey: "distributorFinance",
      fromStage: "SCALE",
      toStage: "MONETIZATION",
      status: GateStatus.PENDING_APPROVAL,
      submittedDaysAgo: 1,
      submittedBy: user.owner.id,
      approvers: [
        { id: user.evaluator.id, decision: null },
        { id: user.approver.id, decision: null },
      ],
    },
    {
      productKey: "fraudRadar",
      fromStage: "SCALE",
      toStage: "MONETIZATION",
      status: GateStatus.NEEDS_REVISION,
      submittedDaysAgo: 18,
      decidedDaysAgo: 15,
      submittedBy: user.owner2.id,
      approvers: [
        {
          id: user.evaluator.id,
          decision: GateDecision.CHANGES_REQUESTED,
          comment: "Operations runbook is overdue and rollout evidence is missing.",
          daysAgo: 15,
        },
        { id: user.approver.id, decision: null },
      ],
    },
  ];

  for (const item of gateSeeds) {
    await prisma.stageGateRequest.create({
      data: {
        productId: products[item.productKey].id,
        fromStage: item.fromStage,
        toStage: item.toStage,
        status: item.status,
        submittedById: item.submittedBy,
        submittedAt: daysAgo(item.submittedDaysAgo),
        decidedAt: item.decidedDaysAgo ? daysAgo(item.decidedDaysAgo) : null,
        policy:
          item.approvers.length === 2
            ? { ...policy, approverCount: 2, mode: "MAJORITY" }
            : policy,
        resolutionNote:
          item.status === GateStatus.NEEDS_REVISION
            ? "Corrections requested before the gate can be reconsidered."
            : null,
        approvers: {
          create: item.approvers.map((approver) => ({
            userId: approver.id,
            decision: approver.decision,
            comment: approver.comment,
            decidedAt: approver.daysAgo ? daysAgo(approver.daysAgo) : null,
          })),
        },
        decisions: {
          create: item.approvers
            .filter((approver) => approver.decision !== null)
            .map((approver) => ({
              approverId: approver.id,
              decision: approver.decision as GateDecision,
              comment: approver.comment,
              createdAt: daysAgo(approver.daysAgo ?? item.submittedDaysAgo),
            })),
        },
      },
    });
  }

  const challenges = await Promise.all([
    prisma.innovationChallenge.create({
      data: {
        title: "Agentic AI for customer operations",
        slug: "agentic-ai-customer-operations",
        description:
          "Design an agentic workflow that resolves a meaningful share of customer operations requests end to end.",
        problemStatement:
          "Operations handle more than 90,000 requests each month, most of which are repetitive and rules-based.",
        eligibility: "All DxValley team members and embedded partners",
        evaluationCriteria: "Impact 40%, feasibility 30%, responsible AI 20%, originality 10%",
        submissionRequirements: "Concept note, workflow map and a measurable success metric",
        startDate: daysAgo(10),
        deadline: daysFromNow(30),
        status: ChallengeStatus.PUBLISHED,
      },
    }),
    prisma.innovationChallenge.create({
      data: {
        title: "Zero-friction merchant onboarding",
        slug: "zero-friction-merchant-onboarding",
        description:
          "Reimagine how merchants join and activate accounts, from first touch to first transaction.",
        problemStatement:
          "Merchants abandon onboarding because of document friction and unclear status.",
        eligibility: "Product, operations and technology teams",
        evaluationCriteria: "Customer impact 50%, speed 25%, cost 25%",
        submissionRequirements: "Journey prototype and a target activation metric",
        startDate: daysAgo(4),
        deadline: daysFromNow(18),
        status: ChallengeStatus.PUBLISHED,
      },
    }),
    prisma.innovationChallenge.create({
      data: {
        title: "Fraud signals marketplace",
        slug: "fraud-signals-marketplace",
        description: "A draft challenge for sharing fraud signals across the partner ecosystem.",
        problemStatement: "Signals are trapped in silos, letting mule networks reuse patterns.",
        startDate: daysFromNow(5),
        deadline: daysFromNow(45),
        status: ChallengeStatus.DRAFT,
      },
    }),
  ]);

  await prisma.challengeSubmission.createMany({
    data: [
      {
        challengeId: challenges[0].id,
        userId: user.owner3.id,
        title: "Ops agent with human escalation",
        summary:
          "An agent that resolves balance, statement and card requests, escalating at defined risk thresholds.",
        status: ChallengeSubmissionStatus.SHORTLISTED,
      },
      {
        challengeId: challenges[1].id,
        userId: user.owner4.id,
        title: "Ten-minute merchant activation",
        summary:
          "Progressive onboarding with document capture, instant KYC and a live activation tracker.",
        status: ChallengeSubmissionStatus.SUBMITTED,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.admin.id,
        type: "approval.pending",
        title: "2 stage gate requests awaiting decision",
        body: "Partner API Hub (MVP → Pilot) and Distributor Finance (Scale → Monetization) need review.",
        link: "/admin/approvals",
        createdAt: daysAgo(1),
      },
      {
        userId: user.admin.id,
        type: "idea.new",
        title: "New idea: Automate loan document intake",
        body: "Samuel Tadesse submitted an idea about automating loan document processing.",
        link: "/admin/ideas",
        createdAt: daysAgo(3),
      },
      {
        userId: user.evaluator.id,
        type: "approval.assigned",
        title: "You were assigned to Partner API Hub",
        body: "Review the MVP → Pilot evidence and submit your decision.",
        link: "/admin/approvals",
        createdAt: daysAgo(3),
      },
      {
        userId: user.owner.id,
        type: "approval.submitted",
        title: "Distributor Finance submitted for Monetization",
        body: "Your request is now with 2 approvers.",
        link: "/admin/products",
        createdAt: daysAgo(1),
      },
      {
        userId: user.owner2.id,
        type: "milestone.due",
        title: "Fraud Radar has an overdue milestone",
        body: "Operations runbook is 10 days overdue and is blocking scale progression.",
        link: "/admin/products",
        createdAt: daysAgo(1),
      },
      {
        userId: user.owner.id,
        type: "milestone.due",
        title: "Payment Operator feedback report is due soon",
        body: "The pilot feedback report is due in 10 days.",
        link: "/admin/products",
        createdAt: daysAgo(2),
      },
    ],
  });

  const audit = async (
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    summary: string,
    days: number,
    metadata?: object,
  ) =>
    prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        summary,
        metadata,
        createdAt: daysAgo(days),
      },
    });

  await audit(
    user.admin.id,
    "idea.accepted",
    "Idea",
    ideaByTitle["Merchant settlement insights API"].id,
    "Accepted idea “Merchant settlement insights API”",
    12,
  );
  await audit(
    user.admin.id,
    "stage.approved",
    "StageGateRequest",
    "seed-gate-payment",
    "Approved Payment Operator for Pilot",
    12,
    { productName: "Payment Operator", fromStage: "MVP", toStage: "PILOT" },
  );
  await audit(
    user.owner.id,
    "milestone.completed",
    "Milestone",
    "seed-milestone-payment",
    "Completed “Pilot live” on Payment Operator",
    5,
    { productName: "Payment Operator" },
  );
  await audit(
    user.owner2.id,
    "stage.submitted",
    "StageGateRequest",
    "seed-gate-partner",
    "Submitted Partner API Hub for Pilot approval",
    3,
    { productName: "Partner API Hub", fromStage: "MVP", toStage: "PILOT" },
  );
  await audit(
    user.owner4.id,
    "idea.submitted",
    "Idea",
    ideaByTitle["Automate loan document intake"].id,
    "Submitted idea “Automate loan document intake”",
    3,
  );
  await audit(
    user.owner.id,
    "stage.submitted",
    "StageGateRequest",
    "seed-gate-distributor",
    "Submitted Distributor Finance for Monetization approval",
    1,
    { productName: "Distributor Finance", fromStage: "SCALE", toStage: "MONETIZATION" },
  );
  await audit(
    user.evaluator.id,
    "stage.changes_requested",
    "StageGateRequest",
    "seed-gate-fraud",
    "Requested changes on Fraud Radar before Monetization",
    15,
    { productName: "Fraud Radar", fromStage: "SCALE", toStage: "MONETIZATION" },
  );
  await audit(
    user.admin.id,
    "product.created",
    "Product",
    products.treasuryCopilot.id,
    "Created product Treasury Copilot",
    23,
    { productName: "Treasury Copilot" },
  );
  await audit(
    user.admin.id,
    "product.created",
    "Product",
    products.partnerApi.id,
    "Created product Partner API Hub",
    96,
    { productName: "Partner API Hub" },
  );
  await audit(
    user.admin.id,
    "product.created",
    "Product",
    products.payment.id,
    "Created product Payment Operator",
    125,
    { productName: "Payment Operator" },
  );

  await prisma.productUpdate.createMany({
    data: [
      {
        productId: products.payment.id,
        title: "Pilot expanded to three merchant cohorts",
        body: "Payment Operator is now live with three merchant cohorts. Settlement exceptions are down 31% in the first two weeks.",
        isPublic: true,
        createdById: user.owner.id,
        createdAt: daysAgo(5),
      },
      {
        productId: products.merchantWallet.id,
        title: "Instant payouts rolled out",
        body: "Merchant Wallet now supports instant payouts for qualifying merchants, with fee transparency in the app.",
        isPublic: true,
        createdById: user.owner.id,
        createdAt: daysAgo(12),
      },
      {
        productId: products.distributorFinance.id,
        title: "Scale rollout reached 60% of regions",
        body: "The distributor finance product is live in four of six regions, with a 92% approval-to-disbursement SLA.",
        isPublic: true,
        createdById: user.owner.id,
        createdAt: daysAgo(7),
      },
    ],
  });

  console.log("\nDemo seed complete — these accounts are fake and share one password.");
  console.log("Demo accounts (password: Password123!):");
  console.log("  Admin           admin@dxvalley.dev");
  console.log("  Evaluator       evaluator@dxvalley.dev");
  console.log("  Approver        approver@dxvalley.dev");
  console.log("  Product Owner   owner@dxvalley.dev");
  console.log("  Product Owner   owner2@dxvalley.dev");
  console.log("  Product Owner   owner3@dxvalley.dev");
  console.log("  Product Owner   owner4@dxvalley.dev");
}

const wantDemo = process.env.SEED_DEMO === "1" || process.argv.includes("--demo");

(wantDemo ? seedDemo() : seedBase())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
