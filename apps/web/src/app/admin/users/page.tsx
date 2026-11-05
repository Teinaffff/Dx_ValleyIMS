import Link from "next/link";
import { Search, Users, X } from "lucide-react";
import { PERMISSIONS, type TeamRef, type UserSummary } from "@ims/shared";
import { getSession, serverGet } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateUserDialog } from "@/components/admin/user-form";
import { UserActions } from "@/components/admin/user-actions";
import { formatDate } from "@/lib/format";

export const metadata = { title: "User management" };

const roleTone: Record<string, string> = {
  ADMIN: "bg-ink text-white",
  EVALUATOR: "bg-soft text-ink/60",
  PRODUCT_OWNER: "bg-primary-soft text-primary",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const term = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.trim() ?? "";

  const [session, users, teams] = await Promise.all([
    getSession(),
    serverGet<UserSummary[]>("/api/users"),
    serverGet<TeamRef[]>("/api/teams"),
  ]);

  const directory = users ?? [];
  const needle = term.toLowerCase();
  const visible = needle
    ? directory.filter((user) =>
        [user.name, user.email, user.title ?? "", user.roleLabel]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : directory;

  const canManage = session?.permissions.includes(PERMISSIONS.USER_MANAGE) ?? false;
  const active = users?.filter((user) => user.isActive).length ?? 0;
  const owners = users?.filter((user) => user.role === "PRODUCT_OWNER").length ?? 0;
  const activeAdminCount =
    users?.filter((user) => user.role === "ADMIN" && user.isActive).length ?? 0;
  const viewerId = session?.id ?? "";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="People & access"
        description="Everyone who can shape, review or explore the innovation portfolio. Roles are enforced by the API, not just the interface."
        actions={canManage ? <CreateUserDialog teams={teams ?? []} /> : null}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "People", value: users?.length ?? 0, helper: "Accounts in the workspace" },
          { label: "Active", value: active, helper: "Can sign in today" },
          { label: "Product owners", value: owners, helper: "Accountable for delivery" },
        ].map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <p className="text-[11px] font-medium text-muted">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{stat.helper}</p>
          </div>
        ))}
      </div>

      {users ? (
        <form action="/admin/users" method="get" className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              name="q"
              defaultValue={term}
              placeholder="Search name, email, title or role"
              className="pl-10"
              aria-label="Search people"
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
          {term ? (
            <Button asChild variant="ghost" size="md">
              <Link href="/admin/users">
                <X className="h-4 w-4" /> Clear
              </Link>
            </Button>
          ) : null}
          {term ? (
            <span className="text-[11px] font-medium text-muted">
              {visible.length} of {directory.length}
            </span>
          ) : null}
        </form>
      ) : null}

      {!users ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="People directory unavailable"
          description="Your account may not have permission to view users, or the API is not reachable."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No people match"
          description={`Nobody matches “${term}”. Try part of a name, an email address or a role.`}
        />
      ) : (
        <section className="surface-card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  <th className="px-6 py-3.5">Person</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Teams</th>
                  <th className="px-4 py-3.5 text-center">Products owned</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Joined</th>
                  {canManage ? <th className="px-6 py-3.5 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user.id} className="border-b border-line/70 last:border-0">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{user.name}</p>
                          <p className="truncate text-[11px] text-muted">{user.email}</p>
                          {user.title ? (
                            <p className="truncate text-[10px] text-muted/80">{user.title}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          roleTone[user.role] ?? "bg-canvas text-ink/60"
                        }`}
                      >
                        {user.roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {user.teams.length ? (
                          user.teams.map((team) => (
                            <span
                              key={team.id}
                              className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-ink/60"
                            >
                              {team.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-ink/70">
                      {user.ownedProductCount}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          user.isActive
                            ? "bg-success/10 text-success"
                            : "bg-ink/[0.06] text-muted"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? "bg-success" : "bg-muted"
                          }`}
                        />
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[11px] text-muted">
                      {formatDate(user.createdAt)}
                    </td>
                    {canManage ? (
                      <td className="px-6 py-3.5 text-right">
                        <UserActions
                          user={user}
                          teams={teams ?? []}
                          viewerId={viewerId}
                          activeAdminCount={activeAdminCount}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-line md:hidden">
            {visible.map((user) => (
              <div key={user.id} className="flex gap-3 p-4">
                <UserAvatar name={user.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-[11px] text-muted">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          roleTone[user.role] ?? "bg-canvas text-ink/60"
                        }`}
                      >
                        {user.roleLabel}
                      </span>
                      {canManage ? (
                        <UserActions
                          user={user}
                          teams={teams ?? []}
                          viewerId={viewerId}
                          activeAdminCount={activeAdminCount}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        user.isActive
                          ? "bg-success/10 text-success"
                          : "bg-ink/[0.06] text-muted"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.isActive ? "bg-success" : "bg-muted"
                        }`}
                      />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                    {user.teams.map((team) => (
                      <span
                        key={team.id}
                        className="rounded-full bg-canvas px-2 py-0.5 text-[10px] text-ink/60"
                      >
                        {team.name}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted">
                      {user.ownedProductCount} product
                      {user.ownedProductCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="px-1 text-[11px] text-muted">
        New accounts can sign in immediately with the temporary password set here. Every
        change is recorded in the audit log.
      </p>
    </div>
  );
}
