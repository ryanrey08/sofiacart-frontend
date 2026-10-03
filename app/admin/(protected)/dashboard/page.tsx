"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Undo2,
  Users,
} from "lucide-react";
import { merchantStatusLabel } from "@/components/admin/merchant-status-form";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, LoadingState, Notice, PageHeader, Panel, StatCard, StatGrid, StatusPill, Tabs } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminDashboard, fetchMerchants, fetchSystemLogs } from "@/lib/api/admin";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { AdminDashboard, MerchantStatus } from "@/types/admin";

// Validated with the dataviz palette script (light surface); identity is also carried by the labeled legend.
const STATUS_COLORS: Record<MerchantStatus, string> = {
  verified: "#10b981",
  pending: "#f59e0b",
  information_requested: "#0ea5e9",
  suspended: "#ef4444",
  rejected: "#7c3aed",
};
const STATUS_ORDER: MerchantStatus[] = ["verified", "pending", "information_requested", "suspended", "rejected"];

const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }).format(value);

// Daily rows are grouped into months when the range is long enough that daily bars become unreadable.
function bucketSeries(series: AdminDashboard["series"]) {
  const monthly = series.length > 62;
  const buckets = new Map<string, { label: string; new_merchants: number; orders: number; collected: number }>();
  for (const row of series) {
    const date = new Date(`${row.date}T00:00:00`);
    const key = monthly ? row.date.slice(0, 7) : row.date;
    const label = monthly
      ? new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit" }).format(date)
      : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(date);
    const bucket = buckets.get(key) ?? { label, new_merchants: 0, orders: 0, collected: 0 };
    bucket.new_merchants += row.new_merchants;
    bucket.orders += row.orders_count;
    bucket.collected += Number(row.payments_collected);
    buckets.set(key, bucket);
  }
  return { monthly, points: [...buckets.values()] };
}

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

  const query = useQuery({ queryKey: ["admin", "dashboard", range], queryFn: () => fetchAdminDashboard(range) });
  const data = query.data;
  const chart = useMemo(() => (data ? bucketSeries(data.series) : null), [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Super Admin Dashboard"
        description="Manage merchants, onboarding, billing and platform operations."
        actions={
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!invalidRange) setRange(draft);
            }}
          >
            <Field label="From" htmlFor="dashboard-from">
              <Input id="dashboard-from" type="date" value={draft.date_from} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value }))} />
            </Field>
            <Field label="To" htmlFor="dashboard-to">
              <Input id="dashboard-to" type="date" value={draft.date_to} hasError={invalidRange} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value }))} />
            </Field>
            <Button type="submit" disabled={invalidRange}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft({ date_from: "", date_to: "" });
                setRange({ date_from: "", date_to: "" });
              }}
            >
              Last 30 days
            </Button>
          </form>
        }
      />
      {invalidRange ? <Notice tone="error">The end date must be on or after the start date.</Notice> : null}

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {data && chart ? (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {formatDateTime(data.date_range.from)} – {formatDateTime(data.date_range.to)}. Merchant, customer and product totals are all-time.
          </p>
          <StatGrid>
            <StatCard icon={Store} tone="purple" label="Total Merchants" value={data.totals.merchants.toLocaleString()} hint={`${data.metrics.new_merchants} new in range`} />
            <StatCard icon={Users} tone="green" label="Active Merchants" value={data.totals.merchants_by_status.verified.toLocaleString()} hint="Approved (verified)" />
            <StatCard icon={ClipboardList} tone="amber" label="Pending Onboarding" value={data.totals.pending_onboarding.toLocaleString()} hint="Pending + information requested" />
            <StatCard icon={CircleDollarSign} tone="blue" label="Payments Collected" value={formatMoney(data.metrics.payments_collected)} hint={`${data.metrics.payments_count} payments in range`} />
          </StatGrid>
          <StatGrid>
            <StatCard icon={ShoppingCart} tone="purple" label="Orders" value={data.metrics.orders_count.toLocaleString()} hint={`Gross sales ${formatMoney(data.metrics.gross_sales)}`} />
            <StatCard icon={Undo2} tone="red" label="Refunds processed" value={formatMoney(data.metrics.refunds_processed)} hint={`${data.metrics.refunds_count} refunds · ${data.metrics.transactions_count} transactions`} />
            <StatCard icon={Package} tone="blue" label="Products" value={data.totals.products.toLocaleString()} hint={`${data.totals.customers.toLocaleString()} customers platform-wide`} />
            <StatCard
              icon={AlertTriangle}
              tone="amber"
              label="Low / out of stock"
              value={`${data.totals.inventory.low_stock} / ${data.totals.inventory.out_of_stock}`}
              hint={`${data.totals.inventory.total_available.toLocaleString()} units available`}
            />
          </StatGrid>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel icon={BarChart3} title="Merchant Growth" description={`New merchant registrations per ${chart.monthly ? "month" : "day"}`}>
              <div className="h-64">
                {chart.points.every((point) => point.new_merchants === 0) ? (
                  <EmptyState title="No new merchants in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} minTickGap={16} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} fontSize={11} />
                      <Tooltip cursor={{ fill: "#f7f5ff" }} formatter={(value) => [value, "New merchants"]} />
                      <Bar dataKey="new_merchants" name="New merchants" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel icon={Store} title="Merchant Status" description="All merchants by onboarding status">
              <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
                <div className="relative h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={STATUS_ORDER.map((status) => ({ status, label: merchantStatusLabel(status), value: data.totals.merchants_by_status[status] }))}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="62%"
                        outerRadius="100%"
                        paddingAngle={1}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {STATUS_ORDER.map((status) => (
                          <Cell key={status} fill={STATUS_COLORS[status]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-navy-900">{data.totals.merchants}</span>
                    <span className="text-xs text-muted-foreground">Merchants</span>
                  </div>
                </div>
                <ul className="w-full space-y-2 text-sm">
                  {STATUS_ORDER.map((status) => (
                    <li key={status} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                        {merchantStatusLabel(status)}
                      </span>
                      <span className="font-semibold text-navy-900">{data.totals.merchants_by_status[status]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel icon={CircleDollarSign} title="Payments Collected" description={`Completed or refunded payments per ${chart.monthly ? "month" : "day"}`}>
              <div className="h-64">
                {chart.points.every((point) => point.collected === 0) ? (
                  <EmptyState title="No collected payments in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} minTickGap={16} />
                      <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={(value: number) => compactMoney(value)} width={64} />
                      <Tooltip formatter={(value) => [formatMoney(Number(value)), "Collected"]} />
                      <Area type="monotone" dataKey="collected" name="Collected" stroke="#7c3aed" strokeWidth={2} fill="url(#collectedFill)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <MerchantShortcuts />
            <Panel icon={BarChart3} title="Top merchants" description="By order totals in the selected range">
              {data.breakdowns.top_merchants.length === 0 ? (
                <EmptyState title="No merchants yet" />
              ) : (
                <ul className="space-y-3">
                  {data.breakdowns.top_merchants.map((row, index) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/admin/merchants/${row.id}`} className="flex min-w-0 items-center gap-3 hover:text-brand-700">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{index + 1}</span>
                        <span className="truncate font-medium text-navy-900">{row.store_name}</span>
                      </Link>
                      <span className="font-semibold">{formatMoney(row.total_sales)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="mb-2 mt-5 text-sm font-bold text-navy-900">Orders by status</h3>
              {data.breakdowns.orders_by_status.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders in this range.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {data.breakdowns.orders_by_status.map((row) => (
                    <li key={row.status} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                      <StatusPill status={row.status} />
                      <span className="font-semibold">{row.total}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Can permission={ADMIN_PERMISSIONS.LOGS_VIEW}>
            <RecentActivity />
          </Can>
        </>
      ) : null}
    </div>
  );
}

type ShortcutTab = "merchants" | "onboarding";

function MerchantShortcuts() {
  const [tab, setTab] = useState<ShortcutTab>("merchants");
  const params = tab === "merchants" ? { per_page: 5, sort: "newest" } : { per_page: 5, status: "pending", sort: "oldest" };
  const query = useQuery({ queryKey: ["admin", "merchants", "list", "dashboard", tab], queryFn: () => fetchMerchants(params) });

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card">
      <div className="px-4 sm:px-5">
        <Tabs
          label="Merchant shortcuts"
          tabs={[
            { id: "merchants", label: "Latest Merchants", icon: Store },
            { id: "onboarding", label: "Awaiting Review", icon: ClipboardList },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="p-4 sm:p-5">
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
        {query.data && query.data.data.length === 0 ? <EmptyState title={tab === "merchants" ? "No merchants yet" : "No applications awaiting review"} /> : null}
        {query.data && query.data.data.length > 0 ? (
          <AdminTable
            bare
            caption={tab === "merchants" ? "Latest merchants" : "Applications awaiting review"}
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "store",
                header: "Merchant",
                render: (row) => (
                  <Link href={`/admin/merchants/${row.id}`} className="font-semibold text-navy-900 hover:text-brand-700">
                    {row.store_name}
                  </Link>
                ),
              },
              { key: "owner", header: "Owner", render: (row) => row.owner_name ?? row.user?.name ?? "—" },
              { key: "email", header: "Email", render: (row) => row.user?.email ?? row.contact_email ?? "—" },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "joined", header: "Joined", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
            ]}
          />
        ) : null}
        <div className="mt-3 text-right">
          <Link href={tab === "merchants" ? "/admin/merchants" : "/admin/merchants/onboarding"} className="text-sm font-semibold text-brand-700 hover:underline">
            View all →
          </Link>
        </div>
      </div>
    </section>
  );
}

function RecentActivity() {
  const logs = useQuery({ queryKey: ["admin", "logs", "recent"], queryFn: () => fetchSystemLogs({ per_page: 6 }) });

  return (
    <Panel
      icon={FileText}
      title="Recent activity"
      description="Latest administrative actions from the audit log"
      actions={
        <Link href="/admin/logs" className="text-sm font-semibold text-brand-700 hover:underline">
          View logs →
        </Link>
      }
    >
      {logs.isPending ? <LoadingState /> : null}
      {logs.isError ? <ErrorState error={logs.error} onRetry={() => void logs.refetch()} /> : null}
      {logs.data && logs.data.data.length === 0 ? <EmptyState title="No activity recorded yet" /> : null}
      <ul className="divide-y divide-slate-100">
        {logs.data?.data.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <ArrowLeftRight aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="truncate">
                <span className="font-medium text-navy-900">{entry.actor?.name ?? "System"}</span> · {entry.description ?? humanize(entry.action)}
                {entry.subject_type ? ` · ${entry.subject_type.split("\\").pop()} #${entry.subject_id}` : ""}
              </span>
            </span>
            <time className="text-xs text-muted-foreground" dateTime={entry.created_at ?? undefined}>
              {formatDateTime(entry.created_at)}
            </time>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
