-- CreateEnum
CREATE TYPE "Competency" AS ENUM ('INNOVATION_FUNDAMENTALS', 'STRATEGIC_THINKING', 'CRITICAL_THINKING', 'RISK_MANAGEMENT', 'EVALUATION_ETHICS', 'PRODUCT_BUSINESS');

-- CreateEnum
CREATE TYPE "Specialization" AS ENUM ('INNOVATION_MANAGEMENT', 'BUSINESS_STRATEGY', 'TECHNOLOGY', 'FINANCE', 'RISK_COMPLIANCE', 'CUSTOMER_EXPERIENCE');

-- CreateEnum
CREATE TYPE "EvaluatorStatus" AS ENUM ('CANDIDATE', 'QUALIFIED', 'AUTHORIZED', 'REJECTED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'PEER_EVALUATOR';

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "competency" "Competency" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluatorApplicant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT,
    "department" TEXT,
    "motivation" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "EvaluatorStatus" NOT NULL DEFAULT 'CANDIDATE',
    "specializations" "Specialization"[],
    "stages" "LifecycleStage"[],
    "validUntil" TIMESTAMP(3),
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluatorApplicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "breakdown" JSONB,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluatorEvent" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluatorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentQuestion_competency_isActive_idx" ON "AssessmentQuestion"("competency", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluatorApplicant_email_key" ON "EvaluatorApplicant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluatorApplicant_userId_key" ON "EvaluatorApplicant"("userId");

-- CreateIndex
CREATE INDEX "EvaluatorApplicant_status_idx" ON "EvaluatorApplicant"("status");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_applicantId_idx" ON "AssessmentAttempt"("applicantId");

-- CreateIndex
CREATE INDEX "EvaluatorEvent_applicantId_createdAt_idx" ON "EvaluatorEvent"("applicantId", "createdAt");

-- AddForeignKey
ALTER TABLE "EvaluatorApplicant" ADD CONSTRAINT "EvaluatorApplicant_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorApplicant" ADD CONSTRAINT "EvaluatorApplicant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "EvaluatorApplicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorEvent" ADD CONSTRAINT "EvaluatorEvent_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "EvaluatorApplicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorEvent" ADD CONSTRAINT "EvaluatorEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
