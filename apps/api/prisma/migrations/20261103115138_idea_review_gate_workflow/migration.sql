-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'PARKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewCadence" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY');

-- AlterEnum
ALTER TYPE "GateDecision" ADD VALUE 'PARKED';

-- AlterEnum
ALTER TYPE "GateStatus" ADD VALUE 'PARKED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IdeaStatus" ADD VALUE 'APPROVED';
ALTER TYPE "IdeaStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "reviewNote" TEXT;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "actualValue" DOUBLE PRECISION,
ADD COLUMN     "isStandard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetValue" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "nextReviewDate" TIMESTAMP(3),
ADD COLUMN     "reviewCadence" "ReviewCadence",
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedById" TEXT,
ADD COLUMN     "statusReason" TEXT;

-- AlterTable
ALTER TABLE "StageGateRequest" ADD COLUMN     "note" TEXT,
ADD COLUMN     "snapshot" JSONB;

-- AlterTable
ALTER TABLE "StageTemplate" ADD COLUMN     "measurable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "ProductEvaluator" (
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvaluator_pkey" PRIMARY KEY ("productId","userId")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductEvaluator_userId_idx" ON "ProductEvaluator"("userId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_reviewerId_idx" ON "ProductReview"("reviewerId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_statusChangedById_fkey" FOREIGN KEY ("statusChangedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvaluator" ADD CONSTRAINT "ProductEvaluator_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvaluator" ADD CONSTRAINT "ProductEvaluator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Only one pending gate request may exist per product
CREATE UNIQUE INDEX "StageGateRequest_one_pending_per_product"
  ON "StageGateRequest"("productId")
  WHERE "status" = 'PENDING_APPROVAL';
