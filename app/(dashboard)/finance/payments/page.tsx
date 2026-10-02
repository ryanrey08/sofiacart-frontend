"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Plus, SlidersHorizontal, Wallet, X, XCircle } from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Notice,
  Pagination,
  SelectInput,
} from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { RecordPaymentForm } from "@/components/merchant/record-payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import {
  usePayment,
  usePayments,
  usePaymentSummary,
  useUpdatePaymentStatus,
  type PaymentStatusChange,
} from "@/lib/hooks/payments";
import { parseApiError } from "@/lib/admin/errors";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_STATUSES, PAYMENT_STATUS_META, paymentMethodLabel } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { MerchantPaymentStatus, PaymentMethod, PaymentSort } from "@/types/payments";

type NoticeState = { tone: "success" | "error"; text: string };

const SORT_OPTIONS: Array<{ value: PaymentSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Amount (high–low)" },
  { value: "amount_asc", label: "Amount (low–high)" },
  { value: "paid_at_desc", label: "Paid date (newest)" },
  { value: "paid_at_asc", label: "Paid date (oldest)" },
];

export default function PaymentsPage() {
  // The backend scopes /api/v1/payments to the token's merchant; admins use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Payment management is available to merchant accounts linked to a store." />;
  }
  return <PaymentsContent />;
}

function PaymentsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MerchantPaymentStatus | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<PaymentSort>("newest");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const payments = usePayments({
    search: debouncedSearch || undefined,
    status: status || undefined,
    method: method || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sort,
    page,
    per_page: 15,
  });
  const summary = usePaymentSummary();
  const rows = useMemo(() => payments.data?.data ?? [], [payments.data]);
  const hasFilters = Boolean(search || status || method || dateFrom || dateTo);
  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Finance"
        title="Payments"
        description="Manage customer payments for orders, track payment status, and reconcile transactions."
        actions={
          <Button onClick={() => setRecording(true)}>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Collected this month"
          value={summary.data ? formatMoney(summary.data.collected_amount) : undefined}
          sub={changeLabel(summary.data?.collected_change_percent)}
          icon={<Wallet className="h-4 w-4" />}
          isPending={summary.isPending}
        />
        <MetricCard
          label="Completed"
          value={summary.data?.completed_payments}
          sub={percentOf(summary.data?.completed_payments, summary.data?.total_payments)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="success"
        />
        <MetricCard
          label="Pending"
          value={summary.data?.by_status.pending}
          sub={percentOf(summary.data?.by_status.pending, summary.data?.total_payments)}
          icon={<Clock className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="warning"
        />
        <MetricCard
          label="Failed"
          value={summary.data?.by_status.failed}
          sub={percentOf(summary.data?.by_status.failed, summary.data?.total_payments)}
          icon={<XCircle className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="danger"
        />
      </div>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="border-none bg-white/95">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <Field label="Search" htmlFor="payment-search" className="min-w-56 flex-1">
                <Input
                  id="payment-search"
                  placeholder="Order number, customer or reference"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Method" htmlFor="payment-method">
                <SelectInput
                  id="payment-method"
                  className="w-full lg:w-44"
                  value={method}
                  onChange={(event) => {
                    setMethod(event.target.value as PaymentMethod | "");
                    resetPage();
                  }}
                >
                  <option value="">All methods</option>
                  {PAYMENT_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {PAYMENT_METHOD_LABELS[value]}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Status" htmlFor="payment-status">
                <SelectInput
                  id="payment-status"
                  className="w-full lg:w-44"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as MerchantPaymentStatus | "");
                    resetPage();
                  }}
                >
                  <option value="">All statuses</option>
                  {PAYMENT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {PAYMENT_STATUS_META[value].label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="From" htmlFor="payment-date-from">
                <Input
                  id="payment-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="To" htmlFor="payment-date-to">
                <Input
                  id="payment-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Sort" htmlFor="payment-sort">
                <SelectInput
                  id="payment-sort"
                  className="w-full lg:w-48"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as PaymentSort);
                    resetPage();
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setMethod("");
                    setDateFrom("");
                    setDateTo("");
                    resetPage();
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Clear filters
                </Button>
              ) : null}
            </div>

            {payments.isPending ? <LoadingState label="Loading payments…" /> : null}
            {payments.isError ? (
              <ErrorState error={payments.error} title="Unable to load payments" onRetry={() => void payments.refetch()} />
            ) : null}
            {payments.data && rows.length === 0 ? (
              <EmptyState
                title="No payments found"
                description={hasFilters ? "No payments match these filters." : "Record a payment to get started."}
              />
            ) : null}

            {rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <caption className="sr-only">Payments</caption>
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Date &amp; Time</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Order #</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Customer</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Method</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Amount</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Status</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Reference</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className={cn("align-middle hover:bg-slate-50/70", selectedId === row.id && "bg-brand-50/60")}
                        >
                          <td className="px-3 py-3 text-slate-700">{formatDateTime(row.paid_at ?? row.created_at)}</td>
                          <td className="px-3 py-3 text-slate-700">{row.order?.order_number ?? (row.order_id ? `#${row.order_id}` : "—")}</td>
                          <td className="px-3 py-3 text-slate-700">{row.order?.customer?.name ?? "—"}</td>
                          <td className="px-3 py-3 text-slate-700">{paymentMethodLabel(row.method)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatMoney(row.amount)}</td>
                          <td className="px-3 py-3"><PaymentStatusBadge status={row.status} /></td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">{row.reference}</td>
                          <td className="px-3 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={payments.data?.meta} onPageChange={setPage} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-6 xl:h-fit" aria-label="Payment details">
          <Card className="border-none bg-white/95">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-navy-900">Payment Details</h2>
                {selectedId ? (
                  <Button variant="ghost" size="icon" aria-label="Close details" onClick={() => setSelectedId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {selectedId ? (
                <PaymentDetails
                  paymentId={selectedId}
                  onNotice={setNotice}
                />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                  Select a payment to view its order, customer, transactions and refunds.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {recording ? (
        <Modal open wide title="Record Payment" onClose={() => setRecording(false)}>
          <RecordPaymentForm
            onCancel={() => setRecording(false)}
            onSaved={(payment) => {
              setRecording(false);
              setSelectedId(payment.id);
              setNotice({ tone: "success", text: `Payment ${payment.reference} recorded for ${formatMoney(payment.amount)}.` });
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: MerchantPaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

function changeLabel(percent: number | null | undefined): string | undefined {
  if (percent === null || percent === undefined) return undefined;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent}% vs last period`;
}

function percentOf(value: number | undefined, total: number | undefined): string | undefined {
  if (value === undefined || !total) return undefined;
  return `${Math.round((value / total) * 100)}% of total`;
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  isPending,
  tone = "brand",
}: {
  label: string;
  value: number | string | undefined;
  sub?: string;
  icon: React.ReactNode;
  isPending: boolean;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  } as const;
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="truncate text-xl font-bold text-navy-900">{isPending && value === undefined ? "…" : (value ?? "—")}</p>
          {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentDetails({ paymentId, onNotice }: { paymentId: number; onNotice: (notice: NoticeState) => void }) {
  const detail = usePayment(paymentId);
  const statusMutation = useUpdatePaymentStatus(paymentId);

  if (detail.isPending) return <LoadingState label="Loading payment…" />;
  if (detail.isError) return <ErrorState error={detail.error} title="Unable to load payment" onRetry={() => void detail.refetch()} />;
  if (!detail.data) return <EmptyState title="Payment not found" />;

  const payment = detail.data.data;
  const balance = detail.data.meta.order_balance;
  const order = payment.order;
  const transactionId = payment.gateway_reference ?? payment.transactions?.find((tx) => tx.type === "payment")?.reference ?? null;
  const canTransition = payment.status === "pending";

  const changeStatus = (change: PaymentStatusChange, successText: string) => {
    statusMutation.mutate(change, {
      onSuccess: () => onNotice({ tone: "success", text: successText }),
      onError: (error) => onNotice({ tone: "error", text: parseApiError(error, "The payment status could not be updated.").message }),
    });
  };

  const verify = () => changeStatus({ status: "completed" }, `Payment ${payment.reference} marked as received.`);
  const cancel = () => {
    if (!window.confirm("Cancel this pending payment?")) return;
    changeStatus({ status: "cancelled" }, `Payment ${payment.reference} cancelled.`);
  };
  const fail = () => {
    const reason = window.prompt("Reason this payment failed:");
    if (!reason) return;
    changeStatus({ status: "failed", reason }, `Payment ${payment.reference} marked as failed.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-900">{payment.reference}</p>
          <p className="text-xs text-muted-foreground">{paymentMethodLabel(payment.method)}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <dl className="space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        <DetailRow label="Order" value={order ? <Link href={`/sales/orders/${order.id}`} className="font-semibold text-brand-700 hover:text-brand-800">{order.order_number}</Link> : "—"} />
        <DetailRow label="Payment date" value={formatDateTime(payment.paid_at ?? payment.created_at)} />
        <DetailRow label="Customer" value={order?.customer?.name ?? "—"} />
        {order?.customer?.email ? <DetailRow label="Email" value={order.customer.email} /> : null}
        <DetailRow label="Amount" value={<span className="font-semibold text-slate-900">{formatMoney(payment.amount)} {payment.currency}</span>} />
        <DetailRow label="Reference no." value={<span className="font-mono text-xs">{payment.reference}</span>} />
        {transactionId ? <DetailRow label="Transaction ID" value={<span className="font-mono text-xs">{transactionId}</span>} /> : null}
        {payment.verified_by?.name ? <DetailRow label="Verified by" value={payment.verified_by.name} /> : null}
        {payment.failure_reason ? <DetailRow label="Failure reason" value={payment.failure_reason} /> : null}
      </dl>

      {canTransition ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={statusMutation.isPending} onClick={verify}>
            Mark as received
          </Button>
          <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={fail}>
            Mark failed
          </Button>
          <Button size="sm" variant="outline" className="text-red-600" disabled={statusMutation.isPending} onClick={cancel}>
            Cancel
          </Button>
        </div>
      ) : null}

      {order?.items && order.items.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Items purchased</h3>
          <ul className="space-y-1.5">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {item.product_name} <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="shrink-0 font-medium text-slate-900">{formatMoney(item.total_price)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {order ? (
        <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <DetailRow label="Subtotal" value={formatMoney(order.subtotal)} />
          {Number(order.discount_amount) > 0 ? <DetailRow label="Discount" value={`- ${formatMoney(order.discount_amount)}`} /> : null}
          <DetailRow label="Shipping" value={formatMoney(order.shipping_amount)} />
          <DetailRow label="Order total" value={<span className="font-semibold text-slate-900">{formatMoney(order.total_amount)}</span>} />
        </dl>
      ) : null}

      {balance ? (
        <dl className="space-y-1 rounded-2xl bg-brand-50/60 px-4 py-3 text-sm">
          <DetailRow label="Amount paid" value={formatMoney(balance.amount_paid)} />
          {Number(balance.amount_refunded) > 0 ? <DetailRow label="Refunded" value={`- ${formatMoney(balance.amount_refunded)}`} /> : null}
          <DetailRow label="Outstanding" value={<span className="font-semibold text-slate-900">{formatMoney(balance.outstanding_balance)}</span>} />
        </dl>
      ) : null}

      {payment.refunds && payment.refunds.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Refunds</h3>
          <ul className="space-y-1.5">
            {payment.refunds.map((refund) => (
              <li key={refund.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block font-mono text-xs text-slate-700">{refund.reference}</span>
                  <span className="text-xs text-muted-foreground">{humanize(refund.status)}{refund.reason ? ` · ${refund.reason}` : ""}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{formatMoney(refund.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {order ? (
        <Link href={`/sales/orders/${order.id}`} className="inline-flex text-sm font-medium text-brand-700 hover:text-brand-800">
          View order →
        </Link>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  );
}
