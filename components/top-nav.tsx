"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Store } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMerchantIdentity } from "@/components/merchant/use-merchant-identity";
import { clearStoredAuth } from "@/lib/auth";

export function TopNav({ menuOpen, onMenuClick, menuId }: { menuOpen: boolean; onMenuClick: () => void; menuId: string }) {
  const router = useRouter();
  const identity = useMerchantIdentity();

  return (
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-card sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <span aria-hidden="true" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
          <Store className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current store</p>
          <p className="flex items-center gap-2 truncate text-sm font-semibold text-navy-900">
            <span className="truncate">{identity.merchantLabel}</span>
            {identity.statusLabel ? <span className="hidden rounded-full bg-sunset-100 px-2 py-0.5 text-[11px] font-semibold text-sunset-700 sm:inline">{identity.statusLabel}</span> : null}
          </p>
        </div>
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 sm:px-2" aria-label={`Account menu for ${identity.displayName}`}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-brand-600 text-white">{identity.initials}</AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[12rem] truncate text-sm font-semibold text-navy-900">{identity.displayName}</span>
              <span className="block text-xs text-muted-foreground">{identity.roleLabel}</span>
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-navy-900">{identity.displayName}</p>
              {identity.email ? <p className="truncate text-xs text-muted-foreground">{identity.email}</p> : null}
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 outline-none data-[highlighted]:bg-red-50"
              onSelect={() => {
                clearStoredAuth();
                router.push("/login");
              }}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
