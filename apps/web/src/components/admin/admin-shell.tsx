"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  ChartNoAxesCombined,
  ChevronsUpDown,
  GitBranch,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  LogOut,
  Menu,
  ScrollText,
  Settings2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { SessionUser } from "@ims/shared";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { initials } from "@/lib/format";
import { FEATURES, type FeatureKey } from "@/config/features";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/avatar";
import { NotificationsMenu } from "@/components/admin/notifications-menu";
import { GlobalSearch } from "@/components/admin/global-search";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_GROUPS: {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    feature?: FeatureKey;
    permission?: string;
  }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/ideas", label: "Idea management", icon: Lightbulb },
      { href: "/admin/pipeline", label: "Innovation pipeline", icon: GitBranch },
      { href: "/admin/products", label: "Product portfolio", icon: Layers },
      { href: "/admin/milestones", label: "Projects & milestones", icon: ListChecks, feature: "projectsMilestones" },
      { href: "/admin/approvals", label: "Stage gate approvals", icon: BadgeCheck },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/admin/teams", label: "Teams & resources", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: ChartNoAxesCombined, feature: "analytics" },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/admin/users", label: "User management", icon: UserCog },
      {
        href: "/admin/evaluators",
        label: "Evaluator management",
        icon: GraduationCap,
        permission: "evaluator.manage",
      },
      { href: "/admin/roles", label: "Roles & permissions", icon: KeyRound, feature: "rolesPermissions" },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText, feature: "auditLogs" },
      { href: "/admin/settings", label: "System configuration", icon: Settings2, feature: "systemConfiguration" },
    ],
  },
];

const VISIBLE_NAV_GROUPS = NAV_GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) => !item.feature || FEATURES[item.feature]),
})).filter((group) => group.items.length > 0);

// Peer evaluators get a focused workspace: only what they need to evaluate the
// products assigned to them. Everyone else sees the pages their permissions allow.
const PEER_EVALUATOR_PAGES = ["/admin/dashboard", "/admin/products", "/admin/approvals"];

function navFor(user: SessionUser) {
  return VISIBLE_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      user.role === "PEER_EVALUATOR"
        ? PEER_EVALUATOR_PAGES.includes(item.href)
        : !item.permission || user.permissions.includes(item.permission),
    ),
  })).filter((group) => group.items.length > 0);
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navGroups = React.useMemo(() => navFor(user), [user]);
  const searchPages = React.useMemo(
    () => [
      ...navGroups.flatMap((group) => group.items).map((item) => ({
        href: item.href,
        label: item.label,
      })),
      { href: "/", label: "Public portal" },
    ],
    [navGroups],
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookies are cleared server-side when possible; still return to sign in.
    }
    router.push("/login");
    router.refresh();
  }

  const renderProfileMenu = (align: "start" | "end", side?: "top") => (
    <DropdownMenuContent align={align} side={side} className="w-60">
      <DropdownMenuLabel>{initials(user.name)} · {user.email}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/">
          <ArrowUpRight className="h-4 w-4" /> Public portal
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/admin/users">
          <UserCog className="h-4 w-4" /> People & access
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
        <KeyRound className="h-4 w-4" /> Change password
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={signOut} disabled={signingOut}>
        <LogOut className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Logo href="/admin/dashboard" showIms={false} />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-soft lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <GlobalSearch pages={searchPages} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/35">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isCurrent(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[12.5px] font-medium transition-colors",
                          active
                            ? "bg-soft-strong text-ink"
                            : "text-ink/55 hover:bg-soft hover:text-ink",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-ink" : "text-ink/40 group-hover:text-ink/70",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-black/[0.06] p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-colors hover:bg-soft"
            >
              <UserAvatar name={user.name} src={user.avatarUrl} className="h-8 w-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{user.name}</span>
                <span className="block truncate text-[10px] text-muted">{user.roleLabel}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted" />
            </button>
          </DropdownMenuTrigger>
          {renderProfileMenu("start", "top")}
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-canvas sm:p-3 lg:p-4">
      <div className="mx-auto flex h-full max-w-[1580px] overflow-hidden bg-surface sm:rounded-[26px] sm:border sm:border-black/[0.06]">
        <aside className="hidden h-full w-[264px] shrink-0 border-r border-black/[0.06] lg:block">
          {sidebar}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[286px] border-r border-black/[0.06] bg-surface">
              {sidebar}
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 hover:bg-soft lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <Logo href="/admin/dashboard" showIms={false} className="lg:hidden" />

            <div className="ml-auto flex items-center gap-1.5">
              <div className="mr-1 hidden items-center gap-2 rounded-full bg-soft px-3 py-1.5 text-[11px] font-medium text-muted md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Live portfolio
              </div>
              <NotificationsMenu />

              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-soft"
                      aria-label="Account menu"
                    >
                      <UserAvatar
                        name={user.name}
                        src={user.avatarUrl}
                        className="h-8 w-8"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  {renderProfileMenu("end")}
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="admin-ui min-w-0 flex-1 overflow-y-auto px-3 pb-12 pt-1 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1240px]">{children}</div>
          </main>
        </div>
      </div>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}
