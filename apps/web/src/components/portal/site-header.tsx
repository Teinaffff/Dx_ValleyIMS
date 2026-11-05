"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  X,
} from "lucide-react";
import type { SessionUser } from "@ims/shared";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";

const NAV: { href: string; label: string; desktopOnly?: boolean }[] = [
  { href: "/", label: "Portfolio" },
  { href: "/submit-idea", label: "Submit an idea", desktopOnly: true },
];

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The cookie is cleared server-side when possible; continue to safety.
    }
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass-card mx-auto flex max-w-[1240px] items-center gap-3 rounded-[24px] px-4 py-2.5">
        <Logo href="/" />

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold transition",
                  item.desktopOnly && "hidden lg:inline-flex",
                  active
                    ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
                    : "text-ink/55 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Admin workspace
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-line bg-white/70 py-1 pl-1 pr-3 transition hover:bg-white"
                  >
                    <UserAvatar name={user.name} src={user.avatarUrl} className="h-8 w-8" />
                    <span className="text-left">
                      <span className="block max-w-[110px] truncate text-[11px] font-semibold leading-tight">
                        {user.name}
                      </span>
                      <span className="block text-[9px] uppercase tracking-[0.1em] text-muted">
                        {user.role === "PRODUCT_OWNER" ? "Product owner" : user.role}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="normal-case tracking-normal">
                    <span className="block text-sm font-semibold text-ink">{user.name}</span>
                    <span className="block truncate text-[11px] font-normal text-muted">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/submit-idea">
                      <Plus className="h-4 w-4" /> Submit an idea
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">
                      <LayoutDashboard className="h-4 w-4" /> Admin workspace
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
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/submit-idea">
                Submit an idea <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-ink/70 hover:bg-canvas md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div className="glass-card mx-auto mt-2 max-w-[1240px] rounded-[22px] p-3 md:hidden">
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-white hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
            {user ? (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <UserAvatar name={user.name} src={user.avatarUrl} className="h-8 w-8" />
                  <span className="truncate text-[11px] font-semibold">{user.name}</span>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/admin/dashboard">Admin</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasswordOpen(true)}
                  aria-label="Change password"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="flex-1">
                <Link href="/submit-idea">Submit an idea</Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  );
}
