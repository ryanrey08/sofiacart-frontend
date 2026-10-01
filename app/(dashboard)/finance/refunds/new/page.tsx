"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { ErrorState, LoadingState, Notice } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseApiError, fieldErrorList } from "@/lib/admin/errors";
import { merchantPage } from "@/lib/merchant-resource";
import type { AdminPayment, AdminRefund, Paginated } from "@/types/admin";

export default function NewRefundPage() {
  return <Suspense fallback={<LoadingState />}><RefundForm /></Suspense>;
}

function RefundForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("order_id") ?? "");
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [paymentId, setPaymentId] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const client = useQueryClient();
  const payments = useQuery({
    queryKey: ["merchant", "payments", "refund-options", orderId],
    enabled: Number.isInteger(Number(orderId)) && Number(orderId) > 0,
    queryFn: async () => {
      const items: AdminPayment[] = [];
      for (let page = 1; ; page++) {
        const result = merchantPage((await api.get<Paginated<AdminPayment>>("/api/v1/payments", {
          params: { order_id: Number(orderId), page, per_page: 100 },
        })).data);
        items.push(...result.data);
        if (page >= result.meta.last_page) return items.filter((item) =>
          item.order_id === Number(orderId) && ["completed", "partially_refunded", "refunded"].includes(item.status));
      }
    },
  });
  const create = useMutation({
    mutationFn: async () => (await api.post<{ data: AdminRefund }>("/api/v1/refunds", {
      order_id: Number(orderId), payment_id: Number(paymentId), amount: Number(amount),
      reference: reference.trim(), reason: reason.trim(), status: "processed",
    })).data.data,
    onSuccess: async () => {
      for (const resource of ["refunds", "payments", "orders", "return-requests"]) await client.invalidateQueries({ queryKey: ["merchant", resource] });
      router.push("/finance/refunds");
    },
  });
  const error = create.isError ? parseApiError(create.error) : null;
  return <div className="space-y-5">
    <PageIntro eyebrow="Finance" title="Record processed refund" description="Manual financial record only. This does not send money through a payment gateway or process a physical return." actions={<Button variant="outline" asChild><Link href="/finance/refunds">Back to refunds</Link></Button>} />
    <form className="space-y-4 rounded-2xl bg-white p-5" onSubmit={(event) => { event.preventDefault(); if (confirmed) create.mutate(); }}>
      <label className="block" htmlFor="refund-order">Order ID<Input id="refund-order" type="number" min={1} required value={orderId} onChange={(event) => { setOrderId(event.target.value); setPaymentId(""); }} /></label>
      {payments.isPending && orderId ? <LoadingState /> : payments.isError ? <ErrorState error={payments.error} onRetry={() => void payments.refetch()} /> : null}
      <label className="block" htmlFor="refund-payment">Payment for this order
        <select id="refund-payment" className="ml-2 rounded-lg border p-2" required value={paymentId} onChange={(event) => setPaymentId(event.target.value)}>
          <option value="">Select a completed payment</option>
          {payments.data?.map((payment) => <option key={payment.id} value={payment.id}>{payment.reference} · #{payment.id}</option>)}
        </select>
      </label>
      <label className="block" htmlFor="refund-reference">Unique refund reference<Input id="refund-reference" required maxLength={255} value={reference} onChange={(event) => setReference(event.target.value)} /></label>
      <label className="block" htmlFor="refund-amount">Amount<Input id="refund-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <label className="block" htmlFor="refund-reason">Reason (optional)<Input id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>I confirm the refund was handled outside SofiaCart. Recording it here does not execute a gateway refund.</span>
      </label>
      {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}
      <Button type="submit" disabled={!confirmed || !paymentId || !Number(amount) || create.isPending || payments.isError}>{create.isPending ? "Recording…" : "Record processed refund"}</Button>
    </form>
  </div>;
}
