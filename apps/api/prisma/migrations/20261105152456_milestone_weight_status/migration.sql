-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MilestoneStatus" ADD VALUE 'PARKED';
ALTER TYPE "MilestoneStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 100;
