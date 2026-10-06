"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/components/admin/admin-session";
import { NotificationBell } from "@/components/notification-bell";
import { fetchAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from "@/lib/api/admin";
import { activeNavHref, sidebarEntries, type AdminNavEntry, type AdminNavIcon } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<AdminNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  merchants: Store,
  orders: ShoppingCart,
  products: Package,
  customers: Users,
  payments: CreditCard,
  reports: BarChart3,
  settings: Settings,
  users: UserCog,
  logs: FileText,
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Cheap to derive on each render; the React Compiler handles memoization.
function navTrail(entries: AdminNavEntry[], activeHref: string | undefined) {
  for (const entry of entries) {
    if (entry.href === activeHref) return [entry.label];
    const child = entry.children?.find((item) => item.href === activeHref);
    if (child) return [entry.label, child.label];
  }
  return [];
}

function useNavigation() {
  const pathname = usePathname() ?? "";
  const { permissions } = useAdminSession();
  const entries = sidebarEntries(permissions);
  const activeHref = activeNavHref(
    pathname,
    entries.flatMap((entry) => (entry.children ? entry.children.map((child) => child.href) : entry.href ? [entry.href] : [])),
  );

  return { entries, activeHref, trail: navTrail(entries, activeHref) };
}

function NavGroup({ entry, activeHref, onNavigate }: { entry: AdminNavEntry; activeHref?: string; onNavigate?: () => void }) {
  const Icon = NAV_ICONS[entry.icon];
  const containsActive = entry.children?.some((child) => child.href === activeHref) ?? false;
  const [open, setOpen] = useState(containsActive);
  const expanded = open || containsActive;

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
          containsActive ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <ul className="mt-1 space-y-0.5">
          {entry.children!.map((child) => {
            const active = child.href === activeHref;
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg py-2 pl-9 pr-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                    active ? "bg-brand-600 font-semibold text-white shadow-lg shadow-brand-900/30" : "text-white/65 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white" : "bg-white/40")} />
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { entries, activeHref } = useNavigation();

  return (
    <nav aria-label="Admin navigation" className="-mx-1 flex-1 overflow-y-auto px-1 pb-4">
      {entries.length === 0 ? <p className="px-3 text-sm text-white/60">No admin modules are assigned to your account.</p> : null}
      <ul className="space-y-1">
        {entries.map((entry) => {
          if (entry.children) return <NavGroup key={entry.label} entry={entry} activeHref={activeHref} onNavigate={onNavigate} />;
          const Icon = NAV_ICONS[entry.icon];
          const active = entry.href === activeHref;
          return (
            <li key={entry.href}>
              <Link
                href={entry.href!}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  active ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30" : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                {entry.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sunset-500 to-brand-600 text-lg font-extrabold text-white shadow-lg shadow-black/20">
        S
      </span>
      <span>
        <span className="block text-lg font-bold leading-tight text-white">
          Sofia<span className="text-sunset-300">Cart</span>
        </span>
        <span className="block text-[11px] text-white/60">Everything in One Cart</span>
      </span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <AdminNav onNavigate={onNavigate} />
      </div>
      <Link
        href="/admin/sessions"
        onClick={onNavigate}
        className="mt-2 flex items-center gap-3 rounded-lg border-t border-white/10 px-3 pt-4 text-sm text-white/60 hover:text-white"
      >
        Active sessions
      </Link>
    </>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button type="button" aria-label="Close navigation overlay" className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Admin navigation menu" className="relative flex h-full w-[min(18rem,85vw)] flex-col bg-navy-950 px-4 py-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <SidebarBody onNavigate={onClose} />
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout, logoutAll } = useAdminSession();
  const { trail } = useNavigation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleNames = (user.admin_roles ?? []).map((role) => role.name).join(", ") || "No role assigned";

  return (
    <div className="flex min-h-screen bg-[#f4f2fb]">
      <a href="#admin-main" className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-950 px-4 py-6 xl:flex">
        <SidebarBody />
      </aside>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-navy-900">Super Admin</p>
              <nav aria-label="Breadcrumb" className="truncate text-xs text-muted-foreground">
                <ol className="flex items-center gap-1">
                  <li>
                    <Link href="/admin" className="hover:text-brand-700">
                      Dashboard
                    </Link>
                  </li>
                  {trail
                    .filter((part) => part !== "Dashboard")
                    .map((part, index, parts) => (
                      <li key={part} className="flex items-center gap-1" aria-current={index === parts.length - 1 ? "page" : undefined}>
                        <span aria-hidden="true">›</span>
                        {part}
                      </li>
                    ))}
                </ol>
              </nav>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell
              queryKey={["admin", "notifications"]}
              fetchPage={fetchAdminNotifications}
              markRead={markAdminNotificationRead}
              markAllRead={markAllAdminNotificationsRead}
            />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-brand-600 text-sm font-semibold text-white">{initials(user.name) || "SA"}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-navy-900">{user.name}</p>
                    <p className="max-w-48 truncate text-xs text-muted-foreground">{roleNames}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="z-50 min-w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-soft">
                  <div className="px-3 py-2 text-xs text-muted-foreground">{user.email}</div>
                  <DropdownMenu.Item asChild className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-brand-50 focus:bg-brand-50">
                    <Link href="/admin/sessions">Active sessions</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-brand-50 focus:bg-brand-50"
                    onSelect={() => void logoutAll()}
                  >
                    Sign out of all devices
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50"
                    onSelect={() => void logout()}
                  >
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 focus:outline-none sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
