-- DropForeignKey
ALTER TABLE "Idea" DROP CONSTRAINT "Idea_submittedById_fkey";

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "expectedImpact" TEXT,
ADD COLUMN     "submitterEmail" TEXT,
ADD COLUMN     "submitterName" TEXT,
ADD COLUMN     "submitterTitle" TEXT,
ALTER COLUMN "submittedById" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Idea_createdAt_idx" ON "Idea"("createdAt");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
