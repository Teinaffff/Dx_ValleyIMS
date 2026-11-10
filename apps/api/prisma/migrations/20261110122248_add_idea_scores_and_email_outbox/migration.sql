-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IdeaScore" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "impact" INTEGER NOT NULL,
    "feasibility" INTEGER NOT NULL,
    "strategicFit" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdeaScore_ideaId_idx" ON "IdeaScore"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaScore_ideaId_evaluatorId_key" ON "IdeaScore"("ideaId", "evaluatorId");

-- CreateIndex
CREATE INDEX "Notification_emailedAt_createdAt_idx" ON "Notification"("emailedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
