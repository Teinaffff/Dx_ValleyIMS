"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import type { NotificationFeed } from "@ims/shared";
import { apiFetch } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsMenu() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationFeed>("/api/notifications"),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition hover:bg-canvas"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-[11px] font-semibold text-primary transition hover:underline disabled:opacity-60"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto border-y border-line/70">
          {isPending ? (
            <div className="space-y-2 p-4">
              {[0, 1].map((key) => (
                <div key={key} className="h-16 animate-pulse rounded-xl bg-canvas" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-4 text-xs leading-relaxed text-muted">
              Notifications could not be loaded. Try again in a moment.
            </p>
          ) : items.length === 0 ? (
            <div className="p-4">
              <p className="text-sm font-medium text-ink">You&apos;re all caught up</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                New ideas, stage gate requests and overdue milestones will appear here.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const href =
                item.link?.startsWith("/") ? item.link : "/admin/ideas";
              return (
                <DropdownMenuItem key={item.id} asChild className="p-0">
                  <Link
                    href={href}
                    onClick={() => {
                      if (!item.readAt) markRead.mutate(item.id);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-line/50 px-4 py-3 last:border-0",
                      item.readAt ? "bg-surface" : "bg-primary-soft/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        item.readAt ? "bg-line" : "bg-primary",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink">
                          {item.title}
                        </span>
                        {markRead.isPending && markRead.variables === item.id ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted" />
                        ) : null}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-muted">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[10px] font-medium text-muted/80">
                        {relativeTime(item.createdAt)}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <div className="p-1.5">
          <DropdownMenuItem asChild>
            <Link href="/admin/ideas" className="justify-center font-semibold">
              Open idea inbox
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
