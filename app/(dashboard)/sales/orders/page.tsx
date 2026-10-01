"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { useOrders } from "@/lib/hooks/orders";
import type { MerchantOrderStatus, MerchantPaymentStatus } from "@/types/commerce";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MerchantOrderStatus | "">("");
  const [payment, setPayment] = useState<MerchantPaymentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidRange = !!(from && to && from > to);
  const orders = useOrders({
    page, per_page: 15, search: useDebouncedValue(search) || undefined,
    status: status || undefined, payment_status: payment || undefined,
    date_from: from || undefined, date_to: to || undefined,
  });
  const reset = () => setPage(1);
  return <div className="space-y-5">
    <PageIntro title="Orders" eyebrow="Sales" description="Merchant orders and fulfillment." actions={<Button asChild><Link href="/sales/orders/new">Create order</Link></Button>} />
    <FilterBar>
      <Field label="Search order or customer" htmlFor="order-search"><Input id="order-search" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} /></Field>
      <Field label="Order status" htmlFor="order-status"><SelectInput id="order-status" value={status} onChange={(e) => { setStatus(e.target.value as MerchantOrderStatus | ""); reset(); }}>
        <option value="">All</option>{(["pending", "processing", "completed", "cancelled"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
      </SelectInput></Field>
      <Field label="Payment status" htmlFor="order-payment"><SelectInput id="order-payment" value={payment} onChange={(e) => { setPayment(e.target.value as MerchantPaymentStatus | ""); reset(); }}>
        <option value="">All</option>{(["unpaid", "paid", "partially_refunded", "refunded"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
      </SelectInput></Field>
      <Field label="From" htmlFor="order-from"><Input id="order-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} /></Field>
      <Field label="To" htmlFor="order-to"><Input id="order-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} /></Field>
    </FilterBar>
    {invalidRange ? <p role="alert">The end date must not precede the start date.</p> :
      orders.isPending ? <LoadingState /> : orders.isError ? <ErrorState error={orders.error} onRetry={() => void orders.refetch()} /> :
      !orders.data.data.length ? <EmptyState title="No orders found" /> :
      <AdminTable caption="Merchant orders" rows={orders.data.data} rowKey={(row) => row.id} columns={[
        { key: "number", header: "Order", render: (row) => <Link className="text-brand-700 underline" href={`/sales/orders/${row.id}`}>{row.order_number}</Link> },
        { key: "customer", header: "Customer", render: (row) => row.customer?.name ?? "—" },
        { key: "items", header: "Items", render: (row) => row.items?.reduce((sum, item) => sum + item.quantity, 0) ?? "—" },
        { key: "total", header: "Total", render: (row) => formatMoney(row.total_amount) },
        { key: "date", header: "Ordered", render: (row) => formatDateTime(row.ordered_at) },
        { key: "payment", header: "Payment", render: (row) => <StatusPill status={row.payment_status} /> },
        { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
      ]} />}
    {!invalidRange && !orders.isError && <Pagination meta={orders.data?.meta} onPageChange={setPage} />}
  </div>;
}
