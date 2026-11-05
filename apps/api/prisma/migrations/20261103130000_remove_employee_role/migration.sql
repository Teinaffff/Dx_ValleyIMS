-- Retire the EMPLOYEE role. Existing accounts keep access as product owners.
UPDATE "User" AS u
SET "roleId" = owner_role.id
FROM "Role" AS owner_role
WHERE owner_role.code = 'PRODUCT_OWNER'
  AND u."roleId" = (SELECT id FROM "Role" WHERE code = 'EMPLOYEE');

DELETE FROM "Role" WHERE code = 'EMPLOYEE';

ALTER TYPE "RoleCode" RENAME TO "RoleCode_old";
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'EVALUATOR', 'PRODUCT_OWNER');
ALTER TABLE "Role" ALTER COLUMN "code" TYPE "RoleCode" USING ("code"::text::"RoleCode");
DROP TYPE "RoleCode_old";
