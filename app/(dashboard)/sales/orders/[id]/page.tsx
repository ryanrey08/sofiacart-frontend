"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminTable, ErrorState, LoadingState, Notice, StatusPill } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { parseApiError, fieldErrorList } from "@/lib/admin/errors";
import { useChangeOrderStatus, useOrder } from "@/lib/hooks/orders";
import { allowedOrderTransitions, returnStateEligible } from "@/lib/merchant-commerce";

export default function OrderDetailPage() {
  const id = Number(useParams().id);
  const order = useOrder(id);
  const change = useChangeOrderStatus(id);
  const [notice, setNotice] = useState("");
  if (!Number.isInteger(id) || id <= 0) return <Notice tone="error">Invalid order ID.</Notice>;
  if (order.isPending) return <LoadingState />;
  if (order.isError) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;
  const data = order.data;
  const error = change.isError ? parseApiError(change.error) : null;
  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title={`Order ${data.order_number}`} description={`Placed ${formatDateTime(data.ordered_at)}`} actions={<Button variant="outline" asChild><Link href="/sales/orders">All orders</Link></Button>} />
    {notice && <Notice tone="success">{notice}</Notice>}
    {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}
    <div className="grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2">
      <div className="space-y-2"><h2 className="font-semibold">Customer &amp; shipping snapshot</h2>
        <p>{data.customer?.name ?? "No customer record"}</p>
        {data.customer?.email && <p>{data.customer.email}</p>}
        {data.customer?.phone && <p>{data.customer.phone}</p>}
        <p>Shipping address: {data.shipping_address ?? "Not provided"}</p>
      </div>
      <div className="space-y-2"><h2 className="font-semibold">Fulfillment &amp; payment</h2>
        <p>Order: <StatusPill status={data.status} /></p>
        <p>Payment: <StatusPill status={data.payment_status} /></p>
        {data.inventory_restored && <p>Reserved inventory restored.</p>}
        <div className="flex flex-wrap gap-2">{allowedOrderTransitions(data).map((status) =>
          <Button key={status} variant="outline" disabled={change.isPending} onClick={async () => {
            change.reset();
            setNotice("");
            try { await change.mutateAsync(status); setNotice(`Order is now ${humanize(status)}.`); }
            catch { /* API validation is shown above. */ }
          }}>{humanize(status)}</Button>)}</div>
        {data.status === "processing" && data.payment_status !== "paid" && <p className="text-sm text-amber-800">Completion requires a paid order. Payment status is updated by the backend payment workflow, not here.</p>}
        {returnStateEligible(data) && <Button asChild><Link href={`/sales/orders/${id}/return`}>Request return</Link></Button>}
      </div>
    </div>
    <AdminTable caption="Order items" rows={data.items} rowKey={(item) => item.id} columns={[
      { key: "product", header: "Item", render: (item) => item.product_name },
      { key: "sku", header: "SKU / variant", render: (item) => <span>{item.sku ?? "—"}{item.product_variant_id ? ` · variant #${item.product_variant_id}` : ""}</span> },
      { key: "quantity", header: "Quantity", render: (item) => item.quantity },
      { key: "unit", header: "Unit price", render: (item) => formatMoney(item.unit_price) },
      { key: "subtotal", header: "Line total", render: (item) => formatMoney(item.total_price) },
    ]} />
    <section className="rounded-2xl bg-white p-5"><h2 className="font-semibold">Totals</h2>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        <dt>Subtotal</dt><dd>{formatMoney(data.subtotal)}</dd>
        <dt>Discount</dt><dd>{formatMoney(data.discount_amount)}</dd>
        <dt>Shipping</dt><dd>{formatMoney(data.shipping_amount)}</dd>
        <dt className="font-bold">Total</dt><dd className="font-bold">{formatMoney(data.total_amount)}</dd>
      </dl>
      {data.notes && <div className="mt-4"><h3 className="font-semibold">Notes</h3><p className="whitespace-pre-wrap">{data.notes}</p></div>}
      <p className="mt-4 text-sm text-slate-500">The merchant API does not provide a separate order history or payment ledger on this response.</p>
    </section>
  </div>;
}
