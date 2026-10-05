"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AdminTable, ErrorState, LoadingState, Notice, StatusPill, statusLabel } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { parseApiError, fieldErrorList } from "@/lib/admin/errors";
import { useChangeOrderStatus, useOrder } from "@/lib/hooks/orders";
import { useOrderReturns } from "@/lib/hooks/return-requests";
import { allowedOrderTransitions, orderTimeline, returnStateEligible } from "@/lib/merchant-commerce";
import { formatCustomerAddress } from "@/lib/merchant-customers";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl bg-white p-5 shadow-soft">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
    <div className="mt-3 space-y-2 text-sm text-slate-900">{children}</div>
  </section>;
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return <p className="flex flex-wrap justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-right">{value ?? "—"}</span></p>;
}

const timelineDot: Record<string, string> = {
  done: "bg-brand-600", current: "bg-sunset-500", cancelled: "bg-red-500", upcoming: "bg-slate-200",
};

export default function OrderDetailPage() {
  const id = Number(useParams().id);
  const order = useOrder(id);
  const returns = useOrderReturns(id);
  const change = useChangeOrderStatus(id);
  const [notice, setNotice] = useState("");
  if (!Number.isInteger(id) || id <= 0) return <Notice tone="error">Invalid order ID.</Notice>;
  if (order.isPending) return <LoadingState />;
  if (order.isError) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;
  const data = order.data;
  const error = change.isError ? parseApiError(change.error) : null;
  const eligible = returnStateEligible(data);
  const transitions = allowedOrderTransitions(data);
  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title={`Order ${data.order_number}`} description={`Placed ${formatDateTime(data.ordered_at)}`} actions={
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><Link href="/sales/orders">All orders</Link></Button>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
        {eligible && <Button asChild><Link href={`/sales/orders/${id}/return`}>Request return</Link></Button>}
      </div>} />
    <section aria-label="Order summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-none bg-white/90 shadow-soft"><CardContent className="p-4">
        <p className="text-sm text-slate-500">Order total</p>
        <p className="mt-1 text-xl font-bold text-navy-900">{formatMoney(data.total_amount)}</p>
      </CardContent></Card>
      <Card className="border-none bg-white/90 shadow-soft"><CardContent className="p-4">
        <p className="text-sm text-slate-500">Items</p>
        <p className="mt-1 text-xl font-bold text-navy-900">{data.items.length} line{data.items.length === 1 ? "" : "s"} · {data.items.reduce((sum, item) => sum + item.quantity, 0)} units</p>
      </CardContent></Card>
      <Card className="border-none bg-white/90 shadow-soft"><CardContent className="p-4">
        <p className="text-sm text-slate-500">Payment status</p>
        <div className="mt-2"><StatusPill status={data.payment_status} /></div>
      </CardContent></Card>
      <Card className="border-none bg-white/90 shadow-soft"><CardContent className="p-4">
        <p className="text-sm text-slate-500">Order status</p>
        <div className="mt-2"><StatusPill status={data.status} /></div>
      </CardContent></Card>
    </section>
    {data.inventory_restored && <p className="text-sm text-slate-600">Reserved inventory restored.</p>}
    {notice && <Notice tone="success">{notice}</Notice>}
    {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}

    <AdminTable caption="Order items" rows={data.items} rowKey={(item) => item.id} columns={[
      { key: "product", header: "Item", render: (item) => item.product_name },
      { key: "sku", header: "SKU / variant", render: (item) => <span>{item.sku ?? "—"}{item.product_variant_id ? ` · variant #${item.product_variant_id}` : ""}</span> },
      { key: "quantity", header: "Quantity", render: (item) => item.quantity },
      { key: "unit", header: "Unit price", render: (item) => formatMoney(item.unit_price) },
      { key: "subtotal", header: "Subtotal", render: (item) => formatMoney(item.total_price) },
    ]} />

    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Totals</h2>
      <dl className="mt-3 space-y-2 text-sm sm:ml-auto sm:w-80">
        <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatMoney(data.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Shipping fee</dt><dd>{formatMoney(data.shipping_amount)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd>{formatMoney(data.discount_amount)}</dd></div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total amount</dt><dd>{formatMoney(data.total_amount)}</dd></div>
      </dl>
      {data.notes && <div className="mt-4 text-sm"><h3 className="font-semibold">Notes</h3><p className="whitespace-pre-wrap">{data.notes}</p></div>}
    </section>

    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Customer information">
        <Line label="Name" value={data.customer?.name ?? "No customer record"} />
        <Line label="Email" value={data.customer?.email ?? "Not provided"} />
        <Line label="Phone" value={data.customer?.phone ?? "Not provided"} />
      </Panel>
      <Panel title="Shipping information">
        <Line label="Recipient" value={data.customer?.name ?? "—"} />
        <Line label="Address" value={data.shipping_address || formatCustomerAddress(data.customer?.address) || "Not provided"} />
        <p className="pt-1 text-xs text-slate-500">The merchant API exposes no shipping method or tracking number on this order, so none is shown.</p>
      </Panel>
      <Panel title="Payment information">
        <Line label="Payment status" value={<StatusPill status={data.payment_status} />} />
        <Line label="Order total" value={formatMoney(data.total_amount)} />
        <p className="pt-1 text-xs text-slate-500">Payment method and gateway metadata live in <Link className="text-brand-700 underline" href="/finance/payments">Finance &gt; Payments</Link>; no card data is rendered here.</p>
      </Panel>
    </div>

    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Order timeline</h2>
      <ol className="mt-3 space-y-3">
        {orderTimeline(data).map((step) => <li key={step.key} className="flex items-start gap-3 text-sm">
          <span aria-hidden="true" className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${timelineDot[step.state]}`} />
          <span>
            <span className="font-medium text-slate-900">{step.label}</span>
            <span className="block text-xs text-slate-500">{step.at ? formatDateTime(step.at) : step.state === "done" ? "Reached (the API returns no timestamp for this step)" : humanize(step.state)}</span>
          </span>
        </li>)}
      </ol>
    </section>

    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Fulfillment actions</h2>
      {transitions.length ? <div className="flex flex-wrap gap-2">{transitions.map((status) =>
        <Button key={status} variant="outline" disabled={change.isPending} onClick={async () => {
          change.reset();
          setNotice("");
          try { await change.mutateAsync(status); setNotice(`Order is now ${statusLabel(status)}.`); }
          catch { /* API validation is shown above. */ }
        }}>{statusLabel(status)}</Button>)}</div> : <p className="text-sm text-slate-600">No further status change is allowed for this order.</p>}
      {data.status === "processing" && <p className="text-sm text-slate-600">Mark the order out for delivery once it ships; it can be completed after that.</p>}
      {data.status === "out_for_delivery" && data.payment_status !== "paid" && <p className="text-sm text-amber-800">Completion requires a paid order. Payment status is updated by the backend payment workflow, not here.</p>}
    </section>

    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Return requests</h2>
      {returns.isPending ? <LoadingState /> : returns.isError ? <ErrorState error={returns.error} onRetry={() => void returns.refetch()} /> :
        !returns.data.length ? <p className="text-sm text-slate-600">No return request has been raised for this order.</p> :
        <ul className="space-y-2 text-sm">{returns.data.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <Link className="text-brand-700 underline" href={`/sales/returns/${request.id}`}>Request #{request.id}</Link>
          <span>{request.reason}</span>
          <span>{formatMoney(request.amount)}</span>
          <StatusPill status={request.status} />
        </li>)}</ul>}
      {eligible ? <Button asChild><Link href={`/sales/orders/${id}/return`}>Request return</Link></Button> :
        <p className="text-sm text-slate-600">A return needs a completed, paid or partially refunded order with a linked customer.</p>}
    </section>
  </div>;
}
