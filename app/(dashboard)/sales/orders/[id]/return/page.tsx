"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Upload, X } from "lucide-react";
import { ErrorState, LoadingState, Notice, SelectInput } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { StepperNav } from "@/components/stepper-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/admin/format";
import { parseApiError, fieldErrorList } from "@/lib/admin/errors";
import { useOrder } from "@/lib/hooks/orders";
import { useCreateReturn, useOrderReturns } from "@/lib/hooks/return-requests";
import {
  clampReturnQuantity, estimatedReturnAmount, remainingReturnQuantity, returnEligible,
  returnReasons, returnStateEligible, validateEvidence,
} from "@/lib/merchant-commerce";

const steps = [
  { id: 1, title: "Select items", description: "Choose quantities" },
  { id: 2, title: "Provide details", description: "Reason and photos" },
  { id: 3, title: "Refund method", description: "Preferred refund" },
  { id: 4, title: "Review", description: "Confirm and submit" },
];

function EvidencePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  return <li className="relative">
    {url && <Image src={url} alt={`Selected evidence: ${file.name}`} width={120} height={120} unoptimized className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />}
    <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}
      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <X aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
    <span className="mt-1 block w-24 truncate text-xs text-slate-500">{file.name}</span>
  </li>;
}

export default function RequestReturnPage() {
  const id = Number(useParams().id);
  const router = useRouter();
  const order = useOrder(id);
  const returns = useOrderReturns(id);
  const submit = useCreateReturn();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reasonChoice, setReasonChoice] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [refundMethod, setRefundMethod] = useState("original");
  if (!Number.isInteger(id) || id <= 0) return <Notice tone="error">Invalid order ID.</Notice>;
  if (order.isPending || returns.isPending) return <LoadingState />;
  if (order.isError || returns.isError) return <ErrorState error={order.error ?? returns.error} onRetry={() => { void order.refetch(); void returns.refetch(); }} />;
  const data = order.data;
  if (!returnStateEligible(data) || !data.customer_id) return <Notice tone="info">This order is not currently eligible for a return. The backend checks the configured return window, order and payment state.</Notice>;

  const available = (itemId: number, ordered: number) => remainingReturnQuantity(itemId, ordered, returns.data);
  const setQuantity = (itemId: number, value: number, max: number) =>
    setQuantities((current) => ({ ...current, [itemId]: clampReturnQuantity(value, max) }));
  const selected = data.items.filter((item) => quantities[item.id] > 0).map((item) => ({ order_item_id: item.id, quantity: quantities[item.id] }));
  const evidenceError = validateEvidence(files, true);
  const invalidQuantity = data.items.some((item) => {
    const quantity = quantities[item.id];
    return quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0 || quantity > available(item.id, item.quantity));
  });
  const reason = (reasonChoice === "Other" ? customReason : reasonChoice).trim();
  const estimatedTotal = selected.reduce((sum, line) => {
    const item = data.items.find((row) => row.id === line.order_item_id);
    return sum + (item ? estimatedReturnAmount(item, line.quantity) : 0);
  }, 0);
  const error = submit.isError ? parseApiError(submit.error) : null;

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return;
    const next = [...files, ...incoming];
    const issue = validateEvidence(next);
    setFileError(issue);
    if (!issue) setFiles(next);
  };

  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title={`Request return · ${data.order_number}`} description="Merchant/staff workflow: select items, add a reason and evidence, then review." actions={<Button asChild variant="outline"><Link href={`/sales/orders/${id}`}>Back to order</Link></Button>} />
    {!returnEligible(data) && <Notice tone="info">This order is outside the default 30-day return window. Your backend configuration may differ; the server decides eligibility on submission.</Notice>}
    <StepperNav steps={steps} currentStep={step} className="rounded-2xl bg-white p-5 shadow-soft" />
    <p className="text-sm font-medium" role="status">Step {step} of {steps.length}: {steps[step - 1].title}</p>
    {error && <Notice tone="error">{error.message}{fieldErrorList(error).map((message, index) => <p key={index}>{message}</p>)}</Notice>}

    {step === 1 && <section className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="font-semibold">Select items and return quantities</h2>
      <ul className="divide-y divide-slate-100">{data.items.map((item) => {
        const max = available(item.id, item.quantity);
        const quantity = quantities[item.id] ?? 0;
        const inputId = `return-quantity-${item.id}`;
        return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{item.product_name}</p>
            <p className="text-sm text-slate-500">{item.sku ?? "No SKU"}{item.product_variant_id ? ` · variant #${item.product_variant_id}` : ""}</p>
            <p className="text-sm text-slate-500">Ordered {item.quantity} · {formatMoney(item.unit_price)} each · returnable {max}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500" htmlFor={inputId}>Return quantity</label>
            <Button type="button" variant="outline" size="icon" aria-label={`Decrease return quantity for ${item.product_name}`}
              disabled={quantity <= 0} onClick={() => setQuantity(item.id, quantity - 1, max)}><Minus aria-hidden="true" className="h-4 w-4" /></Button>
            <Input id={inputId} className="w-20 text-center" type="number" min={0} max={max} disabled={!max} value={quantity}
              onChange={(event) => setQuantity(item.id, Number(event.target.value), max)} />
            <Button type="button" variant="outline" size="icon" aria-label={`Increase return quantity for ${item.product_name}`}
              disabled={quantity >= max} onClick={() => setQuantity(item.id, quantity + 1, max)}><Plus aria-hidden="true" className="h-4 w-4" /></Button>
            <span className="w-24 text-right text-sm font-semibold">{formatMoney(estimatedReturnAmount(item, quantity))}</span>
          </div>
        </li>;
      })}</ul>
      {invalidQuantity && <p role="alert" className="text-sm text-red-700">Return quantities must be whole numbers within the remaining quantity.</p>}
      <p className="text-sm text-slate-600">Estimated return value: <span className="font-semibold">{formatMoney(estimatedTotal)}</span>. The backend recalculates the authoritative amount.</p>
      <Button disabled={!selected.length || invalidQuantity} onClick={() => setStep(2)}>Continue</Button>
    </section>}

    {step === 2 && <section className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="font-semibold">Provide details</h2>
      <div>
        <label className="text-sm font-medium" htmlFor="return-reason">Reason <span className="text-red-600">*</span></label>
        <SelectInput className="mt-1 w-full" id="return-reason" required aria-required="true" value={reasonChoice} onChange={(event) => setReasonChoice(event.target.value)}>
          <option value="">Select a reason</option>
          {returnReasons.map((value) => <option key={value} value={value}>{value}</option>)}
        </SelectInput>
      </div>
      {reasonChoice === "Other" && <div>
        <label className="text-sm font-medium" htmlFor="return-reason-other">Describe the reason <span className="text-red-600">*</span></label>
        <Input id="return-reason-other" className="mt-1" maxLength={255} required aria-required="true" value={customReason} onChange={(event) => setCustomReason(event.target.value)} />
      </div>}
      <div>
        <label className="text-sm font-medium" htmlFor="return-notes">Additional details <span className="text-red-600">*</span></label>
        <Textarea id="return-notes" className="mt-1" maxLength={5000} rows={4} required aria-required="true" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <p className="mt-1 text-xs text-slate-500">Add details to help review your request. This field is required.</p>
      </div>
      <div>
        <p className="text-sm font-medium" id="return-evidence-label">Upload at least one photo <span className="text-red-600">*</span></p>
        <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }}
          className="mt-1 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
          <Upload aria-hidden="true" className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">Drag and drop images here, or</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => fileInput.current?.click()}>Choose files</Button>
          <p className="mt-2 text-xs text-slate-500">Required · PNG, JPG, WebP (max 5 MB each, up to 5 photos)</p>
          <input ref={fileInput} id="return-evidence" className="sr-only" aria-labelledby="return-evidence-label" aria-required="true" required type="file" multiple
            accept="image/jpeg,image/png,image/webp" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        </div>
        {!!files.length && <ul className="mt-3 flex flex-wrap gap-4">{files.map((file, index) =>
          <EvidencePreview key={`${file.name}-${index}`} file={file} onRemove={() => { setFiles(files.filter((_, position) => position !== index)); setFileError(null); }} />)}</ul>}
        {files.length >= 4 && !fileError && <p className="mt-2 text-sm text-amber-800">{files.length} of 5 photos selected.</p>}
        {(fileError || (step >= 2 && evidenceError)) && <p role="alert" className="mt-2 text-sm text-red-700">{fileError ?? evidenceError}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(1)}>Previous</Button>
        <Button disabled={!reason || !notes.trim() || !!fileError || !!evidenceError} onClick={() => setStep(3)}>Continue</Button>
      </div>
    </section>}

    {step === 3 && <section className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="font-semibold">Preferred refund method</h2>
      <fieldset className="space-y-2">
        <legend className="sr-only">Preferred refund method</legend>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <input type="radio" name="refund-method" value="original" checked={refundMethod === "original"} onChange={() => setRefundMethod("original")} />
          <span><span className="font-medium">Original payment method</span><span className="block text-sm text-slate-500">A processed refund is recorded in Finance &gt; Refunds before the return is marked processed.</span></span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 opacity-60">
          <input type="radio" name="refund-method" value="credit" disabled checked={refundMethod === "credit"} onChange={() => setRefundMethod("credit")} />
          <span><span className="font-medium">Store credit</span><span className="block text-sm text-slate-500">Not supported by the backend yet, so it cannot be selected.</span></span>
        </label>
      </fieldset>
      <p className="text-sm text-slate-600">The preference is not part of the return request payload; it only guides the refund you record afterwards.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(2)}>Previous</Button>
        <Button onClick={() => setStep(4)}>Continue</Button>
      </div>
    </section>}

    {step === 4 && <section className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="font-semibold">Review return request</h2>
      <p className="text-sm">Order {data.order_number} · Customer {data.customer?.name ?? `#${data.customer_id}`}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h3 className="font-medium">Items to return</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>Edit items</Button>
      </div>
      <ul className="space-y-1 text-sm">{selected.map((line) => {
        const item = data.items.find((row) => row.id === line.order_item_id);
        return <li key={line.order_item_id} className="flex flex-wrap justify-between gap-3">
          <span>{item?.product_name} · {line.quantity} of {item?.quantity}</span>
          <span>{item ? formatMoney(estimatedReturnAmount(item, line.quantity)) : "—"}</span>
        </li>;
      })}</ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 pt-2">
        <h3 className="font-medium">Reason and evidence</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)}>Edit details</Button>
      </div>
      <p className="text-sm">Reason: <span className="font-medium">{reason}</span></p>
      <p className="whitespace-pre-wrap text-sm">Additional details: {notes}</p>
      <p className="text-sm text-slate-600">{files.length} evidence photo{files.length === 1 ? "" : "s"} attached.</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 pt-2">
        <h3 className="font-medium">Refund preference</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setStep(3)}>Edit preference</Button>
      </div>
      <p className="text-sm">Preferred refund: Original payment method</p>
      {files.length ? <ul className="flex flex-wrap gap-4">{files.map((file, index) =>
        <EvidencePreview key={`${file.name}-${index}`} file={file} onRemove={() => setFiles(files.filter((_, position) => position !== index))} />)}</ul> :
        <p role="alert" className="text-sm text-red-700">Add at least one evidence photo before submitting.</p>}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <h3 className="font-semibold">Important notes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The backend enforces its configured return window (30 days by default) and only accepts completed, paid or partially refunded orders.</li>
          <li>Items must be returned in their original condition; quantities already covered by pending or approved returns are not available again.</li>
          <li>The return amount shown here is an estimate; the server recalculates it from the stored order item totals.</li>
          <li>Processing a return requires a matching processed refund recorded in Finance &gt; Refunds; no gateway refund or store credit is issued automatically.</li>
        </ul>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(3)}>Previous</Button>
        <Button disabled={submit.isPending || invalidQuantity || !selected.length || !reason || !notes.trim() || !!evidenceError} onClick={async () => {
          submit.reset();
          try {
            const result = await submit.mutateAsync({ order_id: id, customer_id: data.customer_id!, reason, notes: notes.trim(), items: selected, evidence: files });
            router.push(`/sales/returns/${result.id}`);
          } catch { /* API field errors are shown above. */ }
        }}>{submit.isPending ? "Submitting…" : "Submit return request"}</Button>
      </div>
    </section>}
  </div>;
}
