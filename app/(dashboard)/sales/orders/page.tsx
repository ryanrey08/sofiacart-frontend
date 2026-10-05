"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ClipboardList, Clock3, PackageCheck, Search, Truck } from "lucide-react";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { useOrderSummary, useOrders } from "@/lib/hooks/orders";
import type { MerchantOrderStatus, MerchantPaymentStatus } from "@/types/commerce";

const statusTabs: Array<{ value: MerchantOrderStatus | ""; label: string }> = [
  { value: "", label: "All orders" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MerchantOrderStatus | "">("");
  const [payment, setPayment] = useState<MerchantPaymentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const summary = useOrderSummary({
    search: debouncedSearch || undefined,
    date_from: from || undefined,
    date_to: to || undefined,
  });
  const invalidRange = !!(from && to && from > to);
  const orders = useOrders({
    page, per_page: 15, search: debouncedSearch || undefined,
    status: status || undefined, payment_status: payment || undefined,
    date_from: from || undefined, date_to: to || undefined,
  });
  const reset = () => setPage(1);
  const metrics = [
    { label: "Total orders", value: summary.data?.total, icon: ClipboardList, tone: "bg-brand-50 text-brand-700", detail: "Across all statuses" },
    { label: "Pending", value: summary.data?.pending, icon: Clock3, tone: "bg-amber-50 text-amber-700", detail: "Awaiting fulfillment" },
    { label: "Processing", value: summary.data?.processing, icon: PackageCheck, tone: "bg-blue-50 text-blue-700", detail: "Being prepared" },
    { label: "Out for Delivery", value: summary.data?.out_for_delivery, icon: Truck, tone: "bg-indigo-50 text-indigo-700", detail: "On the way to the customer" },
    { label: "Completed", value: summary.data?.completed, icon: ArrowUpRight, tone: "bg-emerald-50 text-emerald-700", detail: "Successfully fulfilled" },
  ];

  return <div className="space-y-5">
    <PageIntro title="Orders" eyebrow="Sales" description="Track customer orders, payment status, and fulfillment." actions={<Button asChild><Link href="/sales/orders/new">Create order</Link></Button>} />

    {summary.isPending ? <LoadingState label="Loading order summary…" /> :
      summary.isError ? <ErrorState title="Unable to load order summary" error={summary.error} onRetry={() => void summary.refetch()} /> :
      <section aria-label="Order summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, tone, detail }) => <Card key={label} className="border-none bg-white/90 shadow-soft">
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-navy-900">{value?.toLocaleString() ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-500">{detail}</p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
          </CardContent>
        </Card>)}
      </section>}

    <section aria-label="Filter orders" className="space-y-3">
      <div role="group" aria-label="Filter orders by status" className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => {
          const selected = status === tab.value;
          const count = tab.value ? summary.data?.[tab.value] : summary.data?.total;
          return <button key={tab.value || "all"} type="button" aria-pressed={selected}
            onClick={() => { setStatus(tab.value); reset(); }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700"}`}>
            {tab.label}<span className={selected ? "rounded-full bg-white/20 px-2 py-0.5 text-xs" : "rounded-full bg-slate-100 px-2 py-0.5 text-xs"}>{count?.toLocaleString() ?? "—"}</span>
          </button>;
        })}
      </div>

      <FilterBar>
        <Field className="min-w-[min(100%,17rem)] flex-1" label="Search order or customer" htmlFor="order-search">
          <span className="relative mt-1 block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input id="order-search" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} placeholder="Order number, name, or email" />
          </span>
        </Field>
        <Field className="min-w-36" label="Payment status" htmlFor="order-payment"><SelectInput id="order-payment" value={payment} onChange={(e) => { setPayment(e.target.value as MerchantPaymentStatus | ""); reset(); }}>
          <option value="">All payments</option>{(["unpaid", "paid", "partially_refunded", "refunded"] as const).map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </SelectInput></Field>
        <Field className="min-w-36" label="From" htmlFor="order-from"><Input id="order-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} /></Field>
        <Field className="min-w-36" label="To" htmlFor="order-to"><Input id="order-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} /></Field>
      </FilterBar>
    </section>

    {invalidRange ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">The end date must not precede the start date.</p> :
      orders.isPending ? <LoadingState /> : orders.isError ? <ErrorState error={orders.error} onRetry={() => void orders.refetch()} /> :
      !orders.data.data.length ? <EmptyState title="No orders found" description="Try changing your search or filters." /> :
      <AdminTable caption="Merchant orders" rows={orders.data.data} rowKey={(row) => row.id} columns={[
        { key: "number", header: "Order", render: (row) => <Link className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-700" href={`/sales/orders/${row.id}`}>{row.order_number}</Link> },
        { key: "customer", header: "Customer", render: (row) => <span className="font-medium text-slate-900">{row.customer?.name ?? "—"}</span> },
        { key: "items", header: "Items", render: (row) => row.items?.reduce((sum, item) => sum + item.quantity, 0) ?? "—" },
        { key: "total", header: "Total", render: (row) => <span className="font-semibold text-slate-900">{formatMoney(row.total_amount)}</span> },
        { key: "date", header: "Ordered", render: (row) => formatDateTime(row.ordered_at) },
        { key: "payment", header: "Payment", render: (row) => <StatusPill status={row.payment_status} /> },
        { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
        { key: "actions", header: "Actions", className: "whitespace-nowrap", render: (row) => <Button variant="outline" size="sm" asChild><Link aria-label={`View order ${row.order_number}`} href={`/sales/orders/${row.id}`}>View order</Link></Button> },
      ]} />}
    {!invalidRange && !orders.isError && <Pagination meta={orders.data?.meta} onPageChange={setPage} />}
  </div>;
}
