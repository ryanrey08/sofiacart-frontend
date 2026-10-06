"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationPage } from "@/types/notifications";

/**
 * In-app notification bell, shared by the merchant and admin shells. Each shell passes fetchers
 * for its own authenticated API (`/api/v1/notifications` or `/api/admin/notifications`).
 * Polls every minute and on window focus; there is no realtime channel in the backend.
 */
export function NotificationBell({
  queryKey,
  fetchPage,
  markRead,
  markAllRead,
}: {
  queryKey: readonly unknown[];
  fetchPage: (params: { per_page: number }) => Promise<NotificationPage>;
  markRead: (id: string) => Promise<unknown>;
  markAllRead: () => Promise<unknown>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey,
    queryFn: () => fetchPage({ per_page: 8 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const readOne = useMutation({ mutationFn: markRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: markAllRead, onSuccess: refresh });

  const unread = notifications.data?.meta.unread_count ?? 0;
  const items = notifications.data?.data ?? [];

  const open = (notification: AppNotification) => {
    if (!notification.read_at) readOne.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-sm font-semibold text-navy-900">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                {readAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Mark all as read
              </button>
            ) : null}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          {notifications.isPending ? (
            <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications…
            </p>
          ) : notifications.isError ? (
            <p role="alert" className="px-3 py-6 text-sm text-red-600">
              Notifications could not be loaded.
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((notification) => (
                <DropdownMenu.Item
                  key={notification.id}
                  onSelect={() => open(notification)}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 outline-none data-[highlighted]:bg-slate-50",
                    !notification.read_at && "bg-brand-50/60",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", notification.read_at ? "bg-transparent" : "bg-brand-600")}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy-900">
                      {notification.title ?? "Notification"}
                      {!notification.read_at ? <span className="sr-only"> (unread)</span> : null}
                    </span>
                    {notification.message ? <span className="block text-xs text-slate-600">{notification.message}</span> : null}
                    <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(notification.created_at)}</span>
                  </span>
                </DropdownMenu.Item>
              ))}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
