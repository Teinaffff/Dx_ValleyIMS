-- Product owners get their own "Products" team and leave the developer groups
-- (AI / Payment / Platform / Integration). Team-lead assignments stay untouched.

INSERT INTO "Team" ("id", "name", "description", "updatedAt")
VALUES ('team_products', 'Products', 'Product owners shaping and steering the portfolio.', NOW())
ON CONFLICT ("name") DO NOTHING;

-- Move every product owner into the Products team.
INSERT INTO "UserTeam" ("userId", "teamId")
SELECT u."id", t."id"
FROM "User" u
JOIN "Role" r ON r."id" = u."roleId"
CROSS JOIN "Team" t
WHERE r."code" = 'PRODUCT_OWNER'
  AND u."deletedAt" IS NULL
  AND t."name" = 'Products'
ON CONFLICT DO NOTHING;

-- Remove product owners from every other team.
DELETE FROM "UserTeam" ut
USING "User" u, "Role" r
WHERE ut."userId" = u."id"
  AND r."id" = u."roleId"
  AND r."code" = 'PRODUCT_OWNER'
  AND ut."teamId" <> (SELECT "id" FROM "Team" WHERE "name" = 'Products');