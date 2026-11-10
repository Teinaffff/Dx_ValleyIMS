-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'DEVELOPER';

-- CreateTable
CREATE TABLE "ProductMember" (
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedById" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMember_pkey" PRIMARY KEY ("productId","userId")
);

-- CreateIndex
CREATE INDEX "ProductMember_userId_idx" ON "ProductMember"("userId");

-- AddForeignKey
ALTER TABLE "ProductMember" ADD CONSTRAINT "ProductMember_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMember" ADD CONSTRAINT "ProductMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMember" ADD CONSTRAINT "ProductMember_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
