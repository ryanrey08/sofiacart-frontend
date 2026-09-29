"use client";

import { ArrowUpRight, Package, ShoppingBag, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDashboard } from "@/lib/mocks";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types";

const metricIcons = [ShoppingBag, ArrowUpRight, Users, Package];

const recentOrderColumns: DataTableColumn<Order>[] = [
  { key: "orderNumber", header: "Order #", sortable: true },
  { key: "customer", header: "Customer", sortable: true },
  { key: "items", header: "Items", sortable: true },
  { key: "total", header: "Total", sortable: true, render: (order: Order) => formatCurrency(order.total) },
  { key: "status", header: "Status", render: (order: Order) => <StatusBadge status={order.status} /> },
];

export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Dashboard overview</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Welcome back, Sofia 👋</h1>
          <p className="text-sm text-muted-foreground">Monitor orders, customers, products, and merchant performance in one place.</p>
        </div>
        <div className="flex gap-3">
          <select className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-brand-400">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <Button variant="outline">Export report</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockDashboard.metrics.map((metric, index) => {
          const Icon = metricIcons[index];
          return <MetricCard key={metric.label} icon={Icon} {...metric} />;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card className="border-none bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sales Overview</CardTitle>
              <p className="text-sm text-muted-foreground">Weekly performance across your storefront.</p>
            </div>
            <select className="h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400">
              <option>Revenue</option>
              <option>Orders</option>
            </select>
          </CardHeader>
          <CardContent className="grid gap-6 pt-0 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockDashboard.salesChart}>
                  <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDashboard.salesChart}>
                  <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="value" fill="#ff8f3d" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none bg-white/90">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              {[
                "Add Product",
                "View Orders",
                "Manage Customers",
                "View Reports",
              ].map((action) => (
                <Button key={action} variant="outline" className="justify-start">{action}</Button>
              ))}
            </CardContent>
          </Card>
          <Card className="border-none bg-white/90">
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {mockDashboard.topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales}</p>
                  </div>
                  <p className="font-semibold text-brand-700">{product.revenue}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-none bg-white/90">
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {mockDashboard.lowStockItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.stock} left • Reorder at {item.threshold}</p>
                  </div>
                  <Button size="sm">Reorder</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Recent Orders</h2>
          <p className="text-sm text-muted-foreground">Live order snapshot from your multi-merchant dashboard.</p>
        </div>
        <DataTable<Order> data={mockDashboard.recentOrders} columns={recentOrderColumns} pageSize={5} />
      </section>
    </div>
  );
}
