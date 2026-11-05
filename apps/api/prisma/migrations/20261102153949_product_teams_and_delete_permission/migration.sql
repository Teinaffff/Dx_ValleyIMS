-- CreateTable
CREATE TABLE "ProductTeam" (
    "productId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "ProductTeam_pkey" PRIMARY KEY ("productId","teamId")
);

-- CreateIndex
CREATE INDEX "ProductTeam_teamId_idx" ON "ProductTeam"("teamId");

-- AddForeignKey
ALTER TABLE "ProductTeam" ADD CONSTRAINT "ProductTeam_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTeam" ADD CONSTRAINT "ProductTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the join table from the existing primary team
INSERT INTO "ProductTeam" ("productId", "teamId")
SELECT "id", "teamId" FROM "Product" WHERE "teamId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Grant permanent product deletion to administrators
INSERT INTO "Permission" ("id", "code", "description")
VALUES ('perm_product_delete_2026', 'product.delete', 'Delete products permanently')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'product.delete'
WHERE r."code" = 'ADMIN'
ON CONFLICT DO NOTHING;
