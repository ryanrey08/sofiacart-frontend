import Link from "next/link";
import { Boxes, ChartColumn, CreditCard, LayoutDashboard, Package, RefreshCcw, ShoppingCart, Tags, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Sales",
    items: [
      { href: "/sales/orders", label: "Orders", icon: ShoppingCart },
      { href: "/sales/customers", label: "Customers", icon: Users },
      { href: "/sales/products", label: "Products", icon: Package },
      { href: "/sales/categories", label: "Categories", icon: Tags },
      { href: "/sales/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/finance/payments", label: "Payments", icon: CreditCard },
      { href: "/finance/transactions", label: "Transactions", icon: RefreshCcw },
      { href: "/finance/refunds", label: "Refunds", icon: RefreshCcw },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/sales", label: "Sales Reports", icon: ChartColumn },
      { href: "/reports/customers", label: "Customer Reports", icon: Users },
      { href: "/reports/products", label: "Product Reports", icon: Package },
      { href: "/reports/inventory", label: "Inventory Reports", icon: Boxes },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col border-r border-white/60 bg-white/80 px-5 py-6 backdrop-blur xl:flex">
      <Link href="/" className="rounded-2xl bg-brand-gradient p-5 text-white shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold">SC</div>
          <div>
            <p className="text-lg font-semibold">SofiaCart</p>
            <p className="text-sm text-white/80">Merchant command center</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
          <p className="font-semibold">Sofia Lifestyle Store</p>
          <p className="mt-1 text-white/80">Status: Active Merchant</p>
          <p className="text-white/80">sofiacart.shop/sofia-lifestyle</p>
        </div>
      </Link>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
        <Link href="/" className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 font-semibold text-brand-700">
          <LayoutDashboard className="h-5 w-5" />
          Dashboard Overview
        </Link>
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700")}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Card className="border-none bg-brand-gradient text-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Promo</p>
          <h3 className="mt-3 text-xl font-semibold">Boost holiday sales</h3>
          <p className="mt-2 text-sm text-white/80">Launch time-limited discounts, track inventory, and keep your merchants ahead of the rush.</p>
        </CardContent>
      </Card>
    </aside>
  );
}
