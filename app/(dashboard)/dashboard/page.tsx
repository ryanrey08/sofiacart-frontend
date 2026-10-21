"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, ChartColumn, CreditCard, Package, ShoppingBag, ShoppingCart, Tags, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { PageIntro } from "@/components/merchant/page-intro";
import { useMerchantIdentity } from "@/components/merchant/use-merchant-identity";
import { EmptyState, ErrorState, LoadingState, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMerchantDashboard } from "@/lib/hooks/dashboard";
import { formatMoney } from "@/lib/admin/format";
import { formatCurrency } from "@/lib/utils";
import type { MerchantDashboard } from "@/types/commerce";

const metricIcons = [ShoppingBag, ShoppingCart, Users, Package];

// Every quick action points at an existing merchant route.
const quickActions = [
  { href: "/sales/products", label: "Manage products", icon: Package },
  { href: "/sales/orders", label: "View orders", icon: ShoppingCart },
  { href: "/sales/categories", label: "Categories", icon: Tags },
  { href: "/sales/inventory", label: "Inventory", icon: Boxes },
  { href: "/finance/payments", label: "Payments", icon: CreditCard },
  { href: "/reports/sales", label: "Sales reports", icon: ChartColumn },
];

type RecentOrderRow = MerchantDashboard["recent"]["orders"][number];
type SeriesPoint = MerchantDashboard["series"][number];

const recentOrderColumns: DataTableColumn<RecentOrderRow>[] = [
  { key: "order_number", header: "Order #", sortable: true, render: (row) => <span className="font-semibold text-navy-900">{row.order_number}</span> },
  { key: "customer_name", header: "Customer", sortable: true, render: (row) => row.customer_name ?? "—" },
  { key: "items_count", header: "Items", sortable: true },
  { key: "total_amount", header: "Total", sortable: true, sortValue: (row) => Number(row.total_amount), render: (row) => formatMoney(row.total_amount) },
  { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
];

// Short weekday-style label for the sales chart; falls back to a month/day label for long ranges.
function chartLabel(point: SeriesPoint) {
  const date = new Date(`${point.date}T00:00:00`);
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(date);
}

function PanelHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3">
      <div className="min-w-0">
        <CardTitle className="text-base text-navy-900">{title}</CardTitle>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </CardHeader>
  );
}

export default function DashboardHomePage() {
  const identity = useMerchantIdentity();
  const query = useMerchantDashboard();
  const data = query.data;

  const salesSeries = data?.series.map((point) => ({ label: chartLabel(point), value: Number(point.gross_sales) })) ?? [];
  const hasSales = salesSeries.some((point) => point.value > 0);
  const lowStockCount = data ? data.totals.inventory.low_stock + data.totals.inventory.out_of_stock : 0;

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Dashboard overview"
        title={`Welcome back, ${identity.firstName}`}
        description="Your store at a glance, from live product, order and finance data. Last 30 days unless noted."
        actions={
          <Button asChild>
            <Link href="/sales/products">
              <Package aria-hidden="true" className="h-4 w-4" />
              Manage products
            </Link>
          </Button>
        }
      />

      {query.isPending ? <LoadingState label="Loading your store overview…" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {data ? (
        <>
          <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={metricIcons[0]}
              tone={0}
              label="Net Revenue · 30 days"
              value={formatMoney(data.metrics.net_revenue)}
              trend={`${data.metrics.payments_count.toLocaleString()} payments collected`}
              trendDirection="up"
            />
            <MetricCard
              icon={metricIcons[1]}
              tone={1}
              label="Orders · 30 days"
              value={data.metrics.orders_count.toLocaleString()}
              trend={`${data.metrics.paid_orders_count.toLocaleString()} paid · ${data.totals.pending_orders.toLocaleString()} pending`}
              trendDirection="up"
            />
            <MetricCard
              icon={metricIcons[2]}
              tone={2}
              label="Total Customers"
              value={data.totals.customers.toLocaleString()}
              trend={`${data.metrics.new_customers.toLocaleString()} new in 30 days`}
              trendDirection="up"
            />
            <MetricCard
              icon={metricIcons[3]}
              tone={3}
              label="Total Products"
              value={data.totals.products.toLocaleString()}
              trend={lowStockCount > 0 ? `${lowStockCount.toLocaleString()} low / out of stock` : "All products in stock"}
              trendDirection={lowStockCount > 0 ? "down" : "up"}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <Card>
              <PanelHeader title="Sales Overview" description={`Gross sales per day · ${formatMoney(data.metrics.gross_sales)} total over the last 30 days`} />
              <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2">
                {hasSales ? (
                  <>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesSeries}>
                          <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} minTickGap={24} />
                          <YAxis axisLine={false} tickLine={false} fontSize={12} width={48} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesSeries}>
                          <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} minTickGap={24} />
                          <YAxis axisLine={false} tickLine={false} fontSize={12} width={48} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Bar dataKey="value" fill="#ff8f3d" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <EmptyState title="No sales in the last 30 days" description="Sales will appear here once you record orders." />
                  </div>
                )}
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
                description="Your five most recent orders."
                action={
                  <Link href="/sales/orders" className="inline-flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                }
              />
              <CardContent className="p-0">
                {data.recent.orders.length === 0 ? (
                  <div className="p-4 pt-0">
                    <EmptyState title="No orders yet" description="New orders will show up here." />
                  </div>
                ) : (
                  <DataTable<RecentOrderRow>
                    data={data.recent.orders}
                    columns={recentOrderColumns}
                    pageSize={5}
                    getRowKey={(row) => row.id}
                    className="rounded-none border-0 border-t border-slate-100 shadow-none"
                  />
                )}
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
                  {data.breakdowns.low_stock.length === 0 ? (
                    <EmptyState title="No low-stock items" description="All tracked products are above their threshold." />
                  ) : (
                    data.breakdowns.low_stock.map((item) => (
                      <div key={`${item.product_id}-${item.sku ?? ""}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf9fe] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy-900">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Reorder at {item.low_stock_threshold}</p>
                        </div>
                        <span className={item.stock_status === "out_of_stock" ? "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700" : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"}>
                          {item.stock_status === "out_of_stock" ? "Out of stock" : `${item.available} left`}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <PanelHeader title="Top Selling Products" description="By units sold in the last 30 days." />
                <CardContent className="space-y-2 p-4 pt-0">
                  {data.breakdowns.top_products.length === 0 ? (
                    <EmptyState title="No sales yet" description="Top sellers appear once orders are recorded." />
                  ) : (
                    data.breakdowns.top_products.map((product, index) => (
                      <div key={product.id} className="flex items-center gap-3 rounded-xl bg-[#faf9fe] px-3 py-2.5">
                        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-navy-900">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity_sold.toLocaleString()} sold</p>
                        </div>
                        <p className="text-sm font-semibold text-brand-700">{formatMoney(product.revenue)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
