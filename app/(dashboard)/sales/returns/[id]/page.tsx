"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminTable, ErrorState, LoadingState, Notice, StatusPill } from "@/components/admin/ui";
import { PrivateEvidence } from "@/components/merchant/private-evidence";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { fieldErrorList, parseApiError } from "@/lib/admin/errors";
import { useOrder } from "@/lib/hooks/orders";
import { useChangeReturnStatus, useProcessedOrderRefunds, useReturnRequest } from "@/lib/hooks/return-requests";
import { returnTransitions } from "@/lib/merchant-commerce";

export default function ReturnDetailPage() {
  const id = Number(useParams().id);
  const request = useReturnRequest(id);
  const order = useOrder(request.data?.order_id ?? 0);
  const refunds = useProcessedOrderRefunds(request.data?.order_id ?? 0);
  const change = useChangeReturnStatus(id);
  const [refundId, setRefundId] = useState("");
  const [notice, setNotice] = useState("");
  if (!Number.isInteger(id) || id <= 0) return <Notice tone="error">Invalid return request ID.</Notice>;
  if (request.isPending || (request.data && order.isPending)) return <LoadingState />;
  if (request.isError || order.isError) return <ErrorState error={request.error ?? order.error} onRetry={() => { void request.refetch(); void order.refetch(); }} />;
  const data = request.data;
  const positive = Number(data.amount) > 0;
  const candidates = (refunds.data ?? []).filter((refund) =>
    refund.order_id === data.order_id && refund.status === "processed" &&
    Math.round(Number(refund.amount) * 100) === Math.round(Number(data.amount) * 100));
  const error = change.isError ? parseApiError(change.error) : null;
  const transition = async (status: "approved" | "rejected" | "processed") => {
    change.reset();
    setNotice("");
    try {
      await change.mutateAsync({ status, ...(status === "processed" && positive ? { refund_id: Number(refundId) } : {}) });
      setNotice(`Return request ${humanize(status)}.`);
    } catch { /* Backend validation appears below. */ }
  };
  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title={`Return request #${data.id}`} description={`Created ${formatDateTime(data.created_at)} · Order #${data.order_id}`} actions={<Button asChild variant="outline"><Link href="/sales/returns">All returns</Link></Button>} />
    {notice && <Notice tone="success">{notice}</Notice>}
    {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}
    <section className="space-y-3 rounded-2xl bg-white p-5">
      <h2 className="font-semibold">Review</h2>
      <p>Status: <StatusPill status={data.status} /></p>
      <p>Order: <Link className="text-brand-700 underline" href={`/sales/orders/${data.order_id}`}>{order.data?.order_number ?? `#${data.order_id}`}</Link></p>
      <p>Customer: {order.data?.customer?.name ?? `#${data.customer_id}`}</p>
      <p>Reason: {data.reason}</p>
      {data.notes && <p className="whitespace-pre-wrap">Notes: {data.notes}</p>}
      <p>Return amount (server-calculated): {formatMoney(data.amount)}</p>
      {data.refund_id && <p>Linked processed refund: #{data.refund_id}</p>}
      <div className="flex flex-wrap gap-2">{returnTransitions[data.status].filter((status): status is "approved" | "rejected" => status === "approved" || status === "rejected").map((status) =>
        <Button key={status} variant="outline" disabled={change.isPending} onClick={() => void transition(status)}>{humanize(status)}</Button>)}</div>
      {data.status === "approved" && <div className="space-y-3">
        <p>Processing restocks returned items. For a positive-value return, first record a matching processed refund for this order in <Link className="text-brand-700 underline" href={`/finance/refunds/new?order_id=${data.order_id}&amount=${encodeURIComponent(String(data.amount))}`}>Finance &gt; Refunds</Link>. Recording a refund does not itself restock items or execute a gateway refund.</p>
        {positive && (refunds.isPending ? <LoadingState /> : refunds.isError ? <ErrorState error={refunds.error} onRetry={() => void refunds.refetch()} /> :
          <label className="block" htmlFor="return-refund">Matching processed refund
            <select className="ml-2 rounded-lg border p-2" id="return-refund" value={refundId} onChange={(event) => setRefundId(event.target.value)}>
              <option value="">Select a matching refund</option>
              {candidates.map((refund) => <option key={refund.id} value={refund.id}>{refund.reference} · {formatMoney(refund.amount)} (#{refund.id})</option>)}
            </select>
          </label>)}
        <Button disabled={change.isPending || (positive && (!refundId || refunds.isPending || refunds.isError))} onClick={() => void transition("processed")}>Process return</Button>
        {positive && !candidates.length && !refunds.isPending && !refunds.isError && <p role="status">No matching processed refund was found for this order and amount.</p>}
      </div>}
    </section>
    <AdminTable caption="Returned items" rows={data.items} rowKey={(item) => item.id} columns={[
      { key: "item", header: "Order item", render: (item) => order.data?.items.find((original) => original.id === item.order_item_id)?.product_name ?? `#${item.order_item_id}` },
      { key: "quantity", header: "Quantity", render: (item) => item.quantity },
      { key: "amount", header: "Amount", render: (item) => formatMoney(item.amount) },
    ]} />
    {!!data.evidence.length && <section className="space-y-3 rounded-2xl bg-white p-5"><h2 className="font-semibold">Private evidence</h2>
      <div className="grid gap-3 sm:grid-cols-2">{data.evidence.map((file, index) => <PrivateEvidence key={index} requestId={id} index={index} name={file.name} mime={file.mime} />)}</div>
    </section>}
  </div>;
}
