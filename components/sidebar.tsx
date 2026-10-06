"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Boxes, ChartColumn, CreditCard, LayoutDashboard, Package, ReceiptText, RotateCcw, ShoppingCart, Store, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { useMerchantIdentity } from "@/components/merchant/use-merchant-identity";
import { fetchOwnDocument } from "@/lib/hooks/merchant-profile";
import { isNavItemActive } from "@/lib/merchant-identity";
import { cn } from "@/lib/utils";

// Only routes that exist under app/(dashboard) are listed. Settings and promotions/vouchers
// modules do not exist in this frontend yet, so they are intentionally omitted.
type NavItem = { href: string; label: string; icon: LucideIcon; children?: Array<{ href: string; label: string }> };

const sections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Sales",
    items: [
      { href: "/sales/orders", label: "Orders", icon: ShoppingCart },
      { href: "/sales/returns", label: "Returns", icon: RotateCcw },
      { href: "/sales/customers", label: "Customers", icon: Users },
      {
        href: "/sales/products",
        label: "Products",
        icon: Package,
        children: [
          { href: "/sales/products", label: "All Products" },
          { href: "/sales/categories", label: "Categories" },
        ],
      },
      { href: "/sales/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/finance/payments", label: "Payments", icon: CreditCard },
      { href: "/finance/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/finance/refunds", label: "Refunds", icon: RotateCcw },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/sales", label: "Sales Reports", icon: ChartColumn },
      { href: "/reports/customers", label: "Customer Reports", icon: Users },
      { href: "/reports/products", label: "Product Reports", icon: ReceiptText },
      { href: "/reports/inventory", label: "Inventory Reports", icon: Boxes },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/account", label: "My Account", icon: UserRound },
      { href: "/store-profile", label: "Store Profile", icon: Store },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const identity = useMerchantIdentity();

  return (
    <>
      {/* Official SofiaCart platform logo (from the Canva brand design). */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        aria-label="SofiaCart — go to dashboard"
        className="block rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-300"
      >
        <Image
          src="/brand/sofiacart-logo.png"
          alt="SofiaCart — Everything. In One Cart."
          width={600}
          height={196}
          priority
          className="h-auto w-full rounded-lg object-contain"
        />
      </Link>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
        <div className="flex items-center gap-3">
          {/* The logged-in merchant's own uploaded store logo (not the SofiaCart platform logo). */}
          <MerchantStoreLogo fallbackInitials={identity.initials} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{identity.displayName}</p>
            <p className="truncate text-xs text-white/60">{identity.merchantLabel}</p>
          </div>
        </div>
        {identity.statusLabel ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sunset-500" />
            Status: {identity.statusLabel}
          </p>
        ) : null}
      </div>

      <nav aria-label="Merchant navigation" className="-mx-1 mt-6 flex-1 space-y-5 overflow-y-auto px-1 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const childActive = item.children?.some((child) => isNavItemActive(pathname, child.href)) ?? false;
                const active = !item.children && isNavItemActive(pathname, item.href);
                if (item.children) {
                  return (
                    <li key={item.label}>
                      <p
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                          childActive ? "text-white" : "text-white/70",
                        )}
                      >
                        <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", childActive ? "text-sunset-300" : "")} />
                        {item.label}
                      </p>
                      <ul className="ml-5 space-y-0.5 border-l border-white/10 pl-3">
                        {item.children.map((child) => {
                          const subActive = isNavItemActive(pathname, child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                aria-current={subActive ? "page" : undefined}
                                className={cn(
                                  "relative flex items-center rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-300",
                                  subActive ? "bg-white text-brand-800 shadow-lg shadow-black/10" : "text-white/70 hover:bg-white/10 hover:text-white",
                                )}
                              >
                                {subActive ? <span aria-hidden="true" className="absolute -left-[15px] top-2 bottom-2 w-1 rounded-full bg-sunset-500" /> : null}
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-300",
                        active ? "bg-white text-brand-800 shadow-lg shadow-black/10" : "text-white/70 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      {active ? <span aria-hidden="true" className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-sunset-500" /> : null}
                      <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", active ? "text-brand-600" : "")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Powered-by footer: BlitzDev IT Consultancy, the agency behind SofiaCart. */}
      <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Powered by</p>
        <span className="mt-2 inline-flex rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
          <Image src="/brand/blitzdev-logo.png" alt="BlitzDev IT Consultancy" width={1550} height={348} className="h-4 w-auto" />
        </span>
      </div>
    </>
  );
}

/**
 * The signed-in merchant's uploaded store logo, loaded from the authenticated API and shown in the
 * account card. Falls back to the merchant initials when no logo has been uploaded yet.
 */
function MerchantStoreLogo({ fallbackInitials }: { fallbackInitials: string }) {
  const [url, setUrl] = useState("");

  // Mirrors the PrivateEvidence pattern: the authenticated blob is fetched once and shown as an
  // object URL; a 404 (no logo uploaded) simply leaves the initials fallback in place.
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    fetchOwnDocument("store_logo")
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUrl("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (url) {
    return (
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
        {/* object-contain keeps the uploaded logo's aspect ratio; unoptimized because it's a blob URL. */}
        <Image src={url} alt="" width={40} height={40} unoptimized className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-brand-700">
      {fallbackInitials}
    </span>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-rail px-4 py-6 lg:flex">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose, id }: { open: boolean; onClose: () => void; id: string }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        id={id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Merchant navigation menu"
        className="relative flex h-full w-[min(18rem,85vw)] flex-col bg-brand-rail px-4 py-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-300"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
