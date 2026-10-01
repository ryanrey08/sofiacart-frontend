"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, ChartColumn, CreditCard, Package, ShoppingBag, ShoppingCart, Tags, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { PageIntro, SampleDataBadge } from "@/components/merchant/page-intro";
import { useMerchantIdentity } from "@/components/merchant/use-merchant-identity";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDashboard } from "@/lib/mocks";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types";

const metricIcons = [ShoppingBag, ArrowUpRight, Users, Package];

// Every quick action points at an existing merchant route.
const quickActions = [
  { href: "/sales/products", label: "Manage products", icon: Package },
  { href: "/sales/orders", label: "View orders", icon: ShoppingCart },
  { href: "/sales/categories", label: "Categories", icon: Tags },
  { href: "/sales/inventory", label: "Inventory", icon: Boxes },
  { href: "/finance/payments", label: "Payments", icon: CreditCard },
  { href: "/reports/sales", label: "Sales reports", icon: ChartColumn },
];

const recentOrderColumns: DataTableColumn<Order>[] = [
  { key: "orderNumber", header: "Order #", sortable: true },
  { key: "customer", header: "Customer", sortable: true },
  { key: "items", header: "Items", sortable: true },
  { key: "total", header: "Total", sortable: true, render: (order: Order) => formatCurrency(order.total) },
  { key: "status", header: "Status", render: (order: Order) => <StatusBadge status={order.status} /> },
];

function PanelHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base text-navy-900">{title}</CardTitle>
          <SampleDataBadge label="Sample" />
        </div>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </CardHeader>
  );
}

export default function DashboardHomePage() {
  const identity = useMerchantIdentity();

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Dashboard overview"
        title={`Welcome back, ${identity.firstName}`}
        description="Your store at a glance. Use the quick actions to jump into live product, order and finance tools."
        actions={
          <Button asChild>
            <Link href="/sales/products">
              <Package aria-hidden="true" className="h-4 w-4" />
              Manage products
            </Link>
          </Button>
        }
      />

      <p className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <SampleDataBadge />
        No merchant dashboard analytics endpoint is available yet, so the KPIs, charts, top products, low stock and recent orders below are sample preview figures — not live store data.
      </p>

      <section aria-label="Key metrics (sample preview)" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {mockDashboard.metrics.map((metric, index) => {
          const Icon = metricIcons[index];
          return <MetricCard key={metric.label} icon={Icon} tone={index} {...metric} />;
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card>
          <PanelHeader title="Sales Overview" description="Weekly revenue trend and daily totals." />
          <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockDashboard.salesChart}>
                  <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDashboard.salesChart}>
                  <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} width={48} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="value" fill="#ff8f3d" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base text-navy-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-4 pt-0">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-start gap-2 rounded-xl border border-slate-200/80 bg-[#faf9fe] p-3 text-sm font-semibold text-navy-900 transition hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  {action.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card className="min-w-0">
          <PanelHeader
            title="Recent Orders"
            description="Illustrative rows only — open Orders for your live order list."
            action={
              <Link href="/sales/orders" className="inline-flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            }
          />
          <CardContent className="p-0">
            <DataTable<Order> data={mockDashboard.recentOrders} columns={recentOrderColumns} pageSize={5} className="rounded-none border-0 border-t border-slate-100 shadow-none" />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card>
            <PanelHeader
              title="Low Stock"
              action={
                <Link href="/sales/inventory" className="inline-flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Inventory <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              }
            />
            <CardContent className="space-y-2 p-4 pt-0">
              {mockDashboard.lowStockItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf9fe] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-900">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Reorder at {item.threshold}</p>
                  </div>
                  <span className={item.stock === 0 ? "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700" : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"}>
                    {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <PanelHeader title="Top Selling Products" />
            <CardContent className="space-y-2 p-4 pt-0">
              {mockDashboard.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3 rounded-xl bg-[#faf9fe] px-3 py-2.5">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sales}</p>
                  </div>
                  <p className="text-sm font-semibold text-brand-700">{product.revenue}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
