"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorState, LoadingState, Notice } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/admin/format";
import { parseApiError, fieldErrorList } from "@/lib/admin/errors";
import { useOrder } from "@/lib/hooks/orders";
import { useCreateReturn, useOrderReturns } from "@/lib/hooks/return-requests";
import { remainingReturnQuantity, returnEligible, returnStateEligible, validateEvidence } from "@/lib/merchant-commerce";

export default function RequestReturnPage() {
  const id = Number(useParams().id);
  const router = useRouter();
  const order = useOrder(id);
  const returns = useOrderReturns(id);
  const submit = useCreateReturn();
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  if (!Number.isInteger(id) || id <= 0) return <Notice tone="error">Invalid order ID.</Notice>;
  if (order.isPending || returns.isPending) return <LoadingState />;
  if (order.isError || returns.isError) return <ErrorState error={order.error ?? returns.error} onRetry={() => { void order.refetch(); void returns.refetch(); }} />;
  const data = order.data;
  if (!returnStateEligible(data) || !data.customer_id) return <Notice tone="info">This order is not currently eligible for a return. The backend checks the configured return window, order and payment state.</Notice>;
  const selected = data.items.filter((item) => quantities[item.id] > 0).map((item) => ({ order_item_id: item.id, quantity: quantities[item.id] }));
  const invalidQuantity = data.items.some((item) => quantities[item.id] && (!Number.isInteger(quantities[item.id]) ||
    quantities[item.id] < 0 || quantities[item.id] > remainingReturnQuantity(item.id, item.quantity, returns.data)));
  const error = submit.isError ? parseApiError(submit.error) : null;
  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title={`Request return · ${data.order_number}`} description="Merchant/staff workflow: select items, add a reason and optional evidence, then review." actions={<Button asChild variant="outline"><Link href={`/sales/orders/${id}`}>Back to order</Link></Button>} />
    {!returnEligible(data) && <Notice tone="info">This order is outside the default 30-day return window. Your backend configuration may differ; the server decides eligibility on submission.</Notice>}
    <p className="text-sm font-medium">Step {step + 1} of 3: {["Items", "Reason & evidence", "Review"][step]}</p>
    {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}
    {step === 0 && <section className="space-y-3 rounded-2xl bg-white p-5"><h2 className="font-semibold">Select items and quantities</h2>
      {data.items.map((item) => {
        const available = remainingReturnQuantity(item.id, item.quantity, returns.data);
        return <label key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
          <span>{item.product_name} {item.sku ? `(${item.sku})` : ""} · ordered {item.quantity} · available {available}</span>
          <span>Return quantity <Input aria-label={`Return quantity for ${item.product_name}`} className="w-24" type="number" min={0} max={available} disabled={!available}
            value={quantities[item.id] ?? 0} onChange={(e) => setQuantities((current) => ({ ...current, [item.id]: Number(e.target.value) }))} /></span>
        </label>;
      })}
      {invalidQuantity && <p role="alert" className="text-red-700">Return quantities must be whole numbers within the remaining quantity.</p>}
      <Button disabled={!selected.length || invalidQuantity} onClick={() => setStep(1)}>Continue</Button>
    </section>}
    {step === 1 && <section className="space-y-4 rounded-2xl bg-white p-5">
      <label className="block font-medium" htmlFor="return-reason">Reason <Input id="return-reason" maxLength={255} required value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <label className="block font-medium" htmlFor="return-notes">Notes (optional) <textarea id="return-notes" className="w-full rounded-lg border p-2" maxLength={5000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <label className="block font-medium" htmlFor="return-evidence">Evidence (optional, up to 5 JPG/PNG/WebP files, 5 MB each)
        <Input id="return-evidence" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => {
          const next = Array.from(e.target.files ?? []);
          const issue = validateEvidence(next);
          setFileError(issue);
          setFiles(issue ? [] : next);
        }} /></label>
      {fileError && <p role="alert" className="text-red-700">{fileError}</p>}
      <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(0)}>Back</Button><Button disabled={!reason.trim() || !!fileError} onClick={() => setStep(2)}>Review</Button></div>
    </section>}
    {step === 2 && <section className="space-y-4 rounded-2xl bg-white p-5"><h2 className="font-semibold">Review return request</h2>
      <p>Order: {data.order_number} · Customer: {data.customer?.name ?? `#${data.customer_id}`}</p>
      <ul>{selected.map((item) => {
        const original = data.items.find((row) => row.id === item.order_item_id);
        return <li key={item.order_item_id}>{original?.product_name}: {item.quantity} of {original?.quantity} · order line {original ? formatMoney(original.total_price) : "—"}</li>;
      })}</ul>
      <p>Reason: {reason}</p>{notes ? <p className="whitespace-pre-wrap">Notes: {notes}</p> :
        <p className="text-sm text-slate-600">No additional notes; the reason is also sent as notes because the API requires a non-empty notes field.</p>}
      <p>Evidence: {files.map((file) => file.name).join(", ") || "None"}</p>
      <p className="text-sm text-slate-600">The backend determines the actual return amount from order item totals; this review does not estimate a refund.</p>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Back</Button>
        <Button disabled={submit.isPending || invalidQuantity || !selected.length || !reason.trim()} onClick={async () => {
          submit.reset();
          try {
            const result = await submit.mutateAsync({ order_id: id, customer_id: data.customer_id!, reason: reason.trim(), notes: notes.trim(), items: selected, evidence: files });
            router.push(`/sales/returns/${result.id}`);
          } catch { /* API field errors are shown above. */ }
        }}>{submit.isPending ? "Submitting…" : "Submit request"}</Button>
      </div>
    </section>}
  </div>;
}
