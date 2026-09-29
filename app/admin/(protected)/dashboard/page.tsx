"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Notice, PageHeader, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchAdminDashboard } from "@/lib/api/admin";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminDashboardPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.DASHBOARD_VIEW}>
      <DashboardContent />
    </RequirePermission>
  );
}

function DashboardContent() {
  const [draft, setDraft] = useState({ date_from: "", date_to: "" });
  const [range, setRange] = useState({ date_from: "", date_to: "" });
  const invalidRange = Boolean(draft.date_from && draft.date_to && draft.date_to < draft.date_from);

  const query = useQuery({
    queryKey: ["admin", "dashboard", range],
    queryFn: () => fetchAdminDashboard(range),
  });

  const data = query.data;
  const metrics = data
    ? [
        { label: "Orders", value: data.metrics.orders_count.toLocaleString() },
        { label: "Gross sales", value: formatMoney(data.metrics.gross_sales) },
        { label: "Payments collected", value: formatMoney(data.metrics.payments_collected) },
        { label: "New merchants", value: data.metrics.new_merchants.toLocaleString() },
        { label: "New customers", value: data.metrics.new_customers.toLocaleString() },
        { label: "New products", value: data.metrics.new_products.toLocaleString() },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Platform-wide performance across all merchants." />

      <FilterBar>
        <Field label="From" htmlFor="dashboard-from">
          <Input id="dashboard-from" type="date" value={draft.date_from} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value }))} />
        </Field>
        <Field label="To" htmlFor="dashboard-to">
          <Input id="dashboard-to" type="date" value={draft.date_to} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value }))} />
        </Field>
        <Button disabled={invalidRange} onClick={() => setRange(draft)}>
          Apply
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setDraft({ date_from: "", date_to: "" });
            setRange({ date_from: "", date_to: "" });
          }}
        >
          Last 30 days
        </Button>
      </FilterBar>
      {invalidRange ? <Notice tone="error">The end date must be on or after the start date.</Notice> : null}

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {data ? (
        <>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(data.date_range.from)} – {formatDateTime(data.date_range.to)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label} className="border-none bg-white/90">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-none bg-white/90">
              <CardHeader>
                <CardTitle>Orders by status</CardTitle>
              </CardHeader>
              <CardContent className="h-72 pt-0">
                {data.breakdowns.orders_by_status.length === 0 ? (
                  <EmptyState title="No orders in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.breakdowns.orders_by_status.map((row) => ({ label: humanize(row.status), total: Number(row.total) }))}>
                      <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#7c3aed" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none bg-white/90">
              <CardHeader>
                <CardTitle>New merchants by status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {data.breakdowns.merchant_statuses.length === 0 ? <EmptyState title="No new merchants in this range" /> : null}
                {data.breakdowns.merchant_statuses.map((row) => (
                  <div key={row.status} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <StatusPill status={row.status} />
                    <span className="font-semibold text-slate-900">{row.total}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Top merchants</h2>
            {data.breakdowns.top_merchants.length === 0 ? (
              <EmptyState title="No merchants yet" />
            ) : (
              <AdminTable
                caption="Top merchants by sales"
                rows={data.breakdowns.top_merchants}
                rowKey={(row) => row.id}
                columns={[
                  { key: "store", header: "Store", render: (row) => row.store_name },
                  { key: "sales", header: "Sales", render: (row) => formatMoney(row.total_sales) },
                ]}
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
