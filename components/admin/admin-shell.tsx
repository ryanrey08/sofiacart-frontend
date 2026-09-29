"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Menu, ShieldCheck, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/components/admin/admin-session";
import { visibleNavSections } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const { permissions } = useAdminSession();
  const sections = useMemo(() => visibleNavSections(permissions), [permissions]);
  const activeHref = useMemo(() => {
    const hrefs = sections.flatMap((section) => section.items.map((item) => item.href));
    return hrefs
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0];
  }, [pathname, sections]);

  return (
    <nav aria-label="Admin navigation" className="space-y-6">
      {sections.length === 0 ? (
        <p className="px-3 text-sm text-muted-foreground">No admin modules are assigned to your account.</p>
      ) : null}
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{section.title}</p>
          <div className="space-y-1">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "block rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                  activeHref === item.href ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-brand-gradient p-4 text-white shadow-soft">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-semibold">SofiaCart</p>
        <p className="text-sm text-white/80">Super Admin console</p>
      </div>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout, logoutAll } = useAdminSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleNames = (user.admin_roles ?? []).map((role) => role.name).join(", ") || "No role assigned";

  return (
    <div className="flex min-h-screen bg-brand-soft">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/60 bg-white/80 px-5 py-6 backdrop-blur xl:flex">
        <Brand />
        <AdminNav />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex xl:hidden">
          <div className="w-72 space-y-6 overflow-y-auto bg-white px-5 py-6 shadow-soft">
            <div className="flex justify-end">
              <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Brand />
            <AdminNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <button type="button" aria-label="Close navigation overlay" className="flex-1 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 p-4 lg:p-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
          <header className="flex items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="xl:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-sm text-muted-foreground">Platform administration</p>
                <p className="text-sm font-semibold text-slate-900">{roleNames}</p>
              </div>
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 text-left">
                  <Avatar>
                    <AvatarFallback>{initials(user.name) || "SA"}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="z-50 min-w-56 rounded-2xl border border-border bg-white p-2 shadow-soft">
                  <DropdownMenu.Item asChild className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none hover:bg-brand-50">
                    <Link href="/admin/sessions">Active sessions</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none hover:bg-brand-50"
                    onSelect={() => void logoutAll()}
                  >
                    Sign out of all devices
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
                    onSelect={() => void logout()}
                  >
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
