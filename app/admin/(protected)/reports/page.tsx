"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Boxes, CreditCard, Download, Package, RotateCcw, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import { MerchantFilter } from "@/components/admin/merchant-filter";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Notice, PageHeader, Pagination, Panel, StatCard, StatGrid, StatusPill, Tabs } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportPlatformReport, fetchCustomerReport, fetchInventoryReport, fetchPlatformReport, fetchProductReport, fetchSalesReport } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { PlatformReportType } from "@/types/admin";

type ReportTab = PlatformReportType | "sales" | "products" | "customers" | "inventory";

// Platform report types/columns mirror PlatformReportsController; the other tabs use ReportsController,
// which is unscoped for admins (all merchants) and supports date ranges but not a merchant filter.
const PLATFORM_REPORTS: Record<PlatformReportType, { label: string; columns: string[] }> = {
  merchant_sales: { label: "Merchant performance", columns: ["id", "store_name", "status", "orders_count", "total_sales"] },
  order_status: { label: "Orders by status", columns: ["status", "payment_status", "orders_count", "total_amount"] },
  payment_status: { label: "Payments by status", columns: ["status", "payments_count", "total_amount"] },
};
const MONEY_COLUMNS = new Set(["total_sales", "total_amount"]);
const STATUS_COLUMNS = new Set(["status", "payment_status"]);
const isPlatform = (tab: ReportTab): tab is PlatformReportType => tab in PLATFORM_REPORTS;

export default function AdminReportsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.REPORTS_VIEW}>
      <ReportsContent />
    </RequirePermission>
  );
}

function ReportsContent() {
  const [tab, setTab] = useState<ReportTab>("merchant_sales");
  const [draft, setDraft] = useState({ date_from: "", date_to: "", merchant_id: "" });
  const [filters, setFilters] = useState(draft);
  const invalidRange = Boolean(draft.date_from && draft.date_to && draft.date_to < draft.date_from);

  return (
    <div className="space-y-5">
      <PageHeader icon={BarChart3} title="Reports" description="Platform-wide sales, orders, payments, products, customers and inventory." />
      <Panel bodyClassName="pt-0">
        <Tabs
          label="Report type"
          tabs={[
            { id: "merchant_sales", label: "Merchant performance", icon: Store },
            { id: "order_status", label: "Orders", icon: ShoppingCart },
            { id: "payment_status", label: "Payments", icon: CreditCard },
            { id: "sales", label: "Sales trend", icon: TrendingUp },
            { id: "products", label: "Products", icon: Package },
            { id: "customers", label: "Customers", icon: Users },
            { id: "inventory", label: "Inventory", icon: Boxes },
          ]}
          value={tab}
          onChange={setTab}
        />
        <form
          className="pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalidRange) setFilters(draft);
          }}
        >
          <FilterBar bare>
            <Field label="From" htmlFor="report-from">
              <Input id="report-from" type="date" value={draft.date_from} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value }))} />
            </Field>
            <Field label="To" htmlFor="report-to">
              <Input id="report-to" type="date" value={draft.date_to} hasError={invalidRange} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value }))} />
            </Field>
            {isPlatform(tab) ? <MerchantFilter id="report-merchant" value={draft.merchant_id} onChange={(value) => setDraft((current) => ({ ...current, merchant_id: value }))} /> : null}
            <Button type="submit" disabled={invalidRange}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const empty = { date_from: "", date_to: "", merchant_id: "" };
                setDraft(empty);
                setFilters(empty);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </FilterBar>
          {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}
        </form>
        {isPlatform(tab) ? (
          <PlatformReport key={tab} type={tab} filters={filters} />
        ) : (
          <SummaryReport tab={tab} filters={{ date_from: filters.date_from, date_to: filters.date_to }} />
        )}
      </Panel>
    </div>
  );
}

function PlatformReport({ type, filters }: { type: PlatformReportType; filters: { date_from: string; date_to: string; merchant_id: string } }) {
  const [page, setPage] = useState(1);
  const report = PLATFORM_REPORTS[type];
  const query = useQuery({
    queryKey: ["admin", "reports", type, filters, page],
    queryFn: () => fetchPlatformReport({ type, ...filters, page, per_page: 15 }),
    placeholderData: keepPreviousData,
  });
  const exportMutation = useMutation({
    mutationFn: () => exportPlatformReport({ type, ...filters }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-navy-900">{report.label}</h2>
        <Can permission={ADMIN_PERMISSIONS.REPORTS_EXPORT}>
          <Button variant="outline" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            <Download className="h-4 w-4" />
            {exportMutation.isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </Can>
      </div>
      {exportMutation.isError ? <Notice tone="error">{parseApiError(exportMutation.error, "Export failed.").message}</Notice> : null}
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState title="No report data for these filters" /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable<{ row: Record<string, string | number | null>; index: number }>
            bare
            caption={report.label}
            rows={query.data.data.map((row, index) => ({ row, index }))}
            rowKey={({ row, index }) => `${type}-${row.id ?? ""}-${row.status ?? ""}-${row.payment_status ?? ""}-${index}`}
            columns={report.columns.map((column) => ({
              key: column,
              header: column === "id" ? "Merchant ID" : humanize(column),
              render: ({ row }) => {
                const value = row[column];
                if (MONEY_COLUMNS.has(column)) return <span className="font-semibold">{formatMoney(value)}</span>;
                if (STATUS_COLUMNS.has(column)) return <StatusPill status={value === null ? null : String(value)} />;
                return value ?? "—";
              },
            }))}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="rows" />
        </>
      ) : null}
    </div>
  );
}

function SummaryReport({ tab, filters }: { tab: Exclude<ReportTab, PlatformReportType>; filters: { date_from: string; date_to: string } }) {
  const sales = useQuery({ queryKey: ["admin", "reports", "sales", filters], queryFn: () => fetchSalesReport(filters), enabled: tab === "sales" });
  const products = useQuery({ queryKey: ["admin", "reports", "products", filters], queryFn: () => fetchProductReport({ ...filters, limit: 10 }), enabled: tab === "products" });
  const customers = useQuery({ queryKey: ["admin", "reports", "customers", filters], queryFn: () => fetchCustomerReport({ ...filters, limit: 10 }), enabled: tab === "customers" });
  const inventory = useQuery({ queryKey: ["admin", "reports", "inventory", filters], queryFn: () => fetchInventoryReport(filters), enabled: tab === "inventory" });
  const active = { sales, products, customers, inventory }[tab];

  if (active.isPending) return <LoadingState />;
  if (active.isError) return <ErrorState error={active.error} onRetry={() => void active.refetch()} />;

  if (tab === "sales" && sales.data) {
    const points = sales.data.map((row) => ({ date: row.report_date, sales: Number(row.total_sales), orders: Number(row.orders_count) }));
    const totalSales = points.reduce((sum, point) => sum + point.sales, 0);
    const totalOrders = points.reduce((sum, point) => sum + point.orders, 0);
    return (
      <div className="space-y-5">
        <StatGrid className="xl:grid-cols-3">
          <StatCard icon={TrendingUp} tone="green" label="Sales" value={formatMoney(totalSales)} />
          <StatCard icon={ShoppingCart} tone="purple" label="Orders" value={totalOrders.toLocaleString()} />
          <StatCard icon={CreditCard} tone="blue" label="Average order" value={formatMoney(totalOrders ? totalSales / totalOrders : 0)} />
        </StatGrid>
        {points.length === 0 ? (
          <EmptyState title="No sales in this range" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#eee7ff" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} minTickGap={16} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} width={72} tickFormatter={(value: number) => formatMoney(value).replace(".00", "")} />
                <Tooltip formatter={(value) => [formatMoney(Number(value)), "Sales"]} />
                <Bar dataKey="sales" name="Sales" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (tab === "products" && products.data) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-bold text-navy-900">Top selling products (all time)</h3>
          {products.data.top_selling.length === 0 ? (
            <EmptyState title="No sales yet" />
          ) : (
            <AdminTable
              caption="Top selling products"
              rows={products.data.top_selling}
              rowKey={(row) => row.id}
              columns={[
                { key: "name", header: "Product", render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.sku}</p></div> },
                { key: "sold", header: "Units sold", render: (row) => Number(row.total_quantity_sold).toLocaleString() },
              ]}
            />
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-navy-900">Lowest stock (≤ 10 units)</h3>
          {products.data.low_stock.length === 0 ? (
            <EmptyState title="No low-stock products" />
          ) : (
            <AdminTable
              caption="Low stock products"
              rows={products.data.low_stock}
              rowKey={(row) => row.id}
              columns={[
                { key: "name", header: "Product", render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.sku}</p></div> },
                { key: "stock", header: "Stock", render: (row) => row.stock_quantity },
              ]}
            />
          )}
        </div>
      </div>
    );
  }

  if (tab === "customers" && customers.data) {
    return (
      <div className="space-y-5">
        <StatGrid className="xl:grid-cols-3">
          <StatCard icon={Users} tone="purple" label="New customers in range" value={customers.data.new_customers_count.toLocaleString()} />
        </StatGrid>
        <h3 className="text-sm font-bold text-navy-900">Top customers by spend (all time)</h3>
        {customers.data.top_customers.length === 0 ? (
          <EmptyState title="No customer orders yet" />
        ) : (
          <AdminTable
            caption="Top customers"
            rows={customers.data.top_customers}
            rowKey={(row) => row.id}
            columns={[
              { key: "name", header: "Customer", render: (row) => row.name },
              { key: "spent", header: "Total spent", render: (row) => formatMoney(row.total_spent) },
            ]}
          />
        )}
      </div>
    );
  }

  if (tab === "inventory" && inventory.data) {
    return (
      <div className="space-y-5">
        <StatGrid className="xl:grid-cols-3">
          <StatCard icon={Boxes} tone="purple" label="Stock movements" value={inventory.data.total_logs.toLocaleString()} />
          <StatCard icon={TrendingUp} tone={inventory.data.net_quantity_change >= 0 ? "green" : "red"} label="Net quantity change" value={inventory.data.net_quantity_change.toLocaleString()} />
        </StatGrid>
        {inventory.data.by_reason.length === 0 ? (
          <EmptyState title="No stock movements in this range" />
        ) : (
          <AdminTable
            caption="Stock movements by reason"
            rows={inventory.data.by_reason}
            rowKey={(row) => row.reason}
            columns={[
              { key: "reason", header: "Reason", render: (row) => humanize(row.reason) },
              { key: "logs", header: "Movements", render: (row) => row.total_logs },
              { key: "net", header: "Net change", render: (row) => Number(row.net_quantity_change).toLocaleString() },
            ]}
          />
        )}
      </div>
    );
  }

  return null;
}
