import { Prisma } from "@prisma/client";
import { ROLE_LABELS, RoleCode, SessionUser } from "@ims/shared";

export const sessionInclude = {
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
  teams: true,
} satisfies Prisma.UserInclude;

export type UserWithSession = Prisma.UserGetPayload<{
  include: typeof sessionInclude;
}>;

export function toSessionUser(dbUser: UserWithSession): SessionUser {
  const role = dbUser.role.code as RoleCode;
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    title: dbUser.title,
    avatarUrl: dbUser.avatarUrl,
    role,
    roleLabel: ROLE_LABELS[role] ?? dbUser.role.name,
    permissions: dbUser.role.permissions.map((item) => item.permission.code),
    teamIds: dbUser.teams.map((membership) => membership.teamId),
    isActive: dbUser.isActive,
  };
}
