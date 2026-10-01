"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Info } from "lucide-react";
import { MobileSidebar, Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";

const MOBILE_NAV_ID = "merchant-mobile-navigation";

export function MerchantShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex min-h-screen bg-[#f6f5fb]">
      <a href="#merchant-main" className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar />
      <MobileSidebar id={MOBILE_NAV_ID} open={menuOpen} onClose={closeMenu} />
      <div className="min-w-0 flex-1 px-3 py-3 sm:px-5 sm:py-5 lg:px-7">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
          <TopNav menuOpen={menuOpen} onMenuClick={() => setMenuOpen(true)} menuId={MOBILE_NAV_ID} />
          <p className="flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Dashboard overview and reports may use sample data and are labelled when they do. Product, category, inventory, customer, order and finance pages require the merchant API and show errors when it is unavailable.
            </span>
          </p>
          <main id="merchant-main" tabIndex={-1} className="min-w-0 focus:outline-none">{children}</main>
        </div>
      </div>
    </div>
  );
}
