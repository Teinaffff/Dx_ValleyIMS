-- AlterEnum
ALTER TYPE "IdeaStatus" ADD VALUE 'PARKED';

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedById" TEXT;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_statusChangedById_fkey" FOREIGN KEY ("statusChangedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
