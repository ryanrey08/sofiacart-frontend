"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/admin/errors";
import { formatMoney } from "@/lib/admin/format";
import { useOrderPaymentBalance, useRecordPayment } from "@/lib/hooks/payments";
import { PAYMENT_METHOD_LABELS, RECORDABLE_PAYMENT_METHODS } from "@/lib/payments";
import {
  mapRecordPaymentErrorField,
  recordPaymentSchema,
  type RecordPaymentValues,
  type ValidatedRecordPayment,
} from "@/lib/validation/payment";
import type { PaymentDetail, PaymentMethod } from "@/types/payments";

export function RecordPaymentForm({
  defaultOrderId,
  onSaved,
  onCancel,
}: {
  defaultOrderId?: number | null;
  onSaved: (payment: PaymentDetail) => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useRecordPayment();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentValues, unknown, ValidatedRecordPayment>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      orderId: defaultOrderId ? String(defaultOrderId) : "",
      method: "gcash",
      amount: "",
      markReceived: true,
      reference: "",
      gatewayReference: "",
      notes: "",
    },
  });

  const orderIdRaw = useWatch({ control, name: "orderId" });
  const orderId = /^\d+$/.test(orderIdRaw ?? "") ? Number(orderIdRaw) : null;
  const balance = useOrderPaymentBalance(orderId);

  const onSubmit = async (values: ValidatedRecordPayment) => {
    setFormError(null);
    try {
      const payment = await mutation.mutateAsync({
        order_id: Number(values.orderId),
        method: values.method as PaymentMethod,
        amount: Number(values.amount),
        status: values.markReceived ? "completed" : "pending",
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.gatewayReference ? { gateway_reference: values.gatewayReference } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      });
      onSaved(payment);
    } catch (error) {
      const details = parseApiError(error, "The payment could not be recorded.");
      let mapped = false;
      for (const [apiField, messages] of Object.entries(details.fieldErrors)) {
        const field = mapRecordPaymentErrorField(apiField);
        if (field && messages[0]) {
          setError(field, { type: "server", message: messages[0] });
          mapped = true;
        }
      }
      if (!mapped) setFormError(details.message);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order ID *" htmlFor="record-order" error={errors.orderId?.message}>
          <Input id="record-order" inputMode="numeric" placeholder="e.g. 42" hasError={!!errors.orderId} {...register("orderId")} />
        </Field>
        <Field label="Amount *" htmlFor="record-amount" error={errors.amount?.message}>
          <Input id="record-amount" inputMode="decimal" placeholder="0.00" hasError={!!errors.amount} {...register("amount")} />
        </Field>
      </div>

      {orderId && balance.data ? (
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <p className="font-semibold text-slate-900">
            {balance.data.order_number}
            {balance.data.payments?.[0]?.order?.customer?.name ? ` · ${balance.data.payments[0].order?.customer?.name}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Outstanding balance: <span className="font-semibold text-slate-700">{formatMoney(balance.data.outstanding_balance)}</span> · Paid{" "}
            {formatMoney(balance.data.amount_paid)} of {formatMoney(balance.data.total_amount)}
          </p>
        </div>
      ) : orderId && balance.isError ? (
        <p className="text-xs text-red-600">That order could not be found for your store.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payment method *" htmlFor="record-method" error={errors.method?.message}>
          <SelectInput id="record-method" className="w-full" {...register("method")}>
            {RECORDABLE_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Reference no." htmlFor="record-reference" error={errors.reference?.message}>
          <Input id="record-reference" placeholder="Auto-generated if blank" hasError={!!errors.reference} {...register("reference")} />
        </Field>
      </div>

      <Field label="Transaction ID" htmlFor="record-gateway-reference" error={errors.gatewayReference?.message}>
        <Input id="record-gateway-reference" placeholder="Gateway transaction ID (optional)" hasError={!!errors.gatewayReference} {...register("gatewayReference")} />
      </Field>

      <Field label="Remarks" htmlFor="record-notes" error={errors.notes?.message}>
        <Textarea id="record-notes" className="min-h-20" placeholder="Optional notes for this payment" hasError={!!errors.notes} {...register("notes")} />
      </Field>

      <label className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" {...register("markReceived")} />
        <span>
          <span className="font-medium text-slate-900">Mark as received</span>
          <span className="block text-xs text-muted-foreground">
            Records the payment as completed now. Uncheck to log it as pending until you verify it.
          </span>
        </span>
      </label>

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Saving…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
