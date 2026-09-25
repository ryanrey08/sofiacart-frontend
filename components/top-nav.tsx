"use client";

import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Search } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { clearStoredAuth } from "@/lib/auth";

export function TopNav() {
  const router = useRouter();

  return (
    <header className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-soft backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Current store</p>
        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
          Sofia Lifestyle Store
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search orders, products, or customers</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" placeholder="Search orders, products, or customers" />
        </label>
        <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-sunset-500" />
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2 text-left">
              <Avatar>
                <AvatarFallback>SR</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-slate-900">Sofia Reyes</p>
                <p className="text-xs text-muted-foreground">Merchant Admin</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className="z-50 min-w-48 rounded-2xl border border-border bg-white p-2 shadow-soft">
              <DropdownMenu.Item className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none hover:bg-brand-50">Profile settings</DropdownMenu.Item>
              <DropdownMenu.Item className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none hover:bg-brand-50">Store preferences</DropdownMenu.Item>
              <DropdownMenu.Item
                className="cursor-pointer rounded-xl px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
                onSelect={() => {
                  clearStoredAuth();
                  router.push("/login");
                }}
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
