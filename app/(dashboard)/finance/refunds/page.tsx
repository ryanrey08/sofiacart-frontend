"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Paperclip,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Notice,
  Pagination,
  SelectInput,
} from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { PrivateEvidence } from "@/components/merchant/private-evidence";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { parseApiError } from "@/lib/admin/errors";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, paymentMethodLabel } from "@/lib/payments";
import { REFUND_ALLOWED_TRANSITIONS, REFUND_STATUSES, REFUND_STATUS_META } from "@/lib/refunds";
import { useRefund, useRefunds, useRefundSummary, useUpdateRefundStatus } from "@/lib/hooks/refunds";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/payments";
import type { RefundSort, RefundStatus, RefundStatusChange } from "@/types/refunds";

type NoticeState = { tone: "success" | "error"; text: string };

const SORT_OPTIONS: Array<{ value: RefundSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Amount (high–low)" },
  { value: "amount_asc", label: "Amount (low–high)" },
];

// Forward (happy-path) transitions get a primary button; the rest are outline/destructive.
const TRANSITION_META: Record<RefundStatus, { label: string; intent: "primary" | "muted" | "danger" }> = {
  approved: { label: "Approve", intent: "primary" },
  processing: { label: "Mark processing", intent: "primary" },
  processed: { label: "Mark processed", intent: "primary" },
  failed: { label: "Mark failed", intent: "danger" },
  rejected: { label: "Reject", intent: "danger" },
  cancelled: { label: "Cancel refund", intent: "muted" },
  pending: { label: "Pending", intent: "muted" },
};

export default function RefundsPage() {
  // The backend scopes /api/v1/refunds to the token's merchant; admins use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Refund management is available to merchant accounts linked to a store." />;
  }
  return <RefundsContent />;
}

function RefundsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RefundStatus | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<RefundSort>("newest");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const refunds = useRefunds({
    search: debouncedSearch || undefined,
    status: status || undefined,
    payment_method: method || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sort,
    page,
    per_page: 15,
  });
  const summary = useRefundSummary();
  const rows = useMemo(() => refunds.data?.data ?? [], [refunds.data]);
  const hasFilters = Boolean(search || status || method || dateFrom || dateTo);
  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Finance"
        title="Refunds"
        description="Review refund requests, approve or reject them, and confirm payouts back to your customers."
        actions={
          <Button asChild variant="outline">
            <Link href="/finance/refunds/new">
              <Plus className="h-4 w-4" />
              Record processed refund
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total refunds"
          value={summary.data?.total_refunds}
          sub={summary.data ? "This period" : undefined}
          icon={<RotateCcw className="h-4 w-4" />}
          isPending={summary.isPending}
        />
        <MetricCard
          label="Refunded"
          value={summary.data ? formatMoney(summary.data.refunded_amount) : undefined}
          sub={changeLabel(summary.data?.refunded_change_percent)}
          icon={<Wallet className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="success"
        />
        <MetricCard
          label="Pending"
          value={summary.data?.by_status.pending}
          sub={summary.data ? `${summary.data.by_status.approved} approved` : undefined}
          icon={<Clock className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="warning"
        />
        <MetricCard
          label="Failed"
          value={summary.data?.by_status.failed}
          sub={summary.data ? `${summary.data.by_status.processing} processing` : undefined}
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
              <Field label="Search" htmlFor="refund-search" className="min-w-56 flex-1">
                <Input
                  id="refund-search"
                  placeholder="Reference, order or customer"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Status" htmlFor="refund-status">
                <SelectInput
                  id="refund-status"
                  className="w-full lg:w-44"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as RefundStatus | "");
                    resetPage();
                  }}
                >
                  <option value="">All statuses</option>
                  {REFUND_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {REFUND_STATUS_META[value].label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Method" htmlFor="refund-method">
                <SelectInput
                  id="refund-method"
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
              <Field label="From" htmlFor="refund-date-from">
                <Input
                  id="refund-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="To" htmlFor="refund-date-to">
                <Input
                  id="refund-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Sort" htmlFor="refund-sort">
                <SelectInput
                  id="refund-sort"
                  className="w-full lg:w-48"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as RefundSort);
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

            {refunds.isPending ? <LoadingState label="Loading refunds…" /> : null}
            {refunds.isError ? (
              <ErrorState error={refunds.error} title="Unable to load refunds" onRetry={() => void refunds.refetch()} />
            ) : null}
            {refunds.data && rows.length === 0 ? (
              <EmptyState
                title="No refunds found"
                description={hasFilters ? "No refunds match these filters." : "Refund requests will appear here as customers return items."}
              />
            ) : null}

            {rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <caption className="sr-only">Refunds</caption>
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Requested</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Reference</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Order #</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Customer</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Reason</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Amount</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Status</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className={cn("cursor-pointer align-middle hover:bg-slate-50/70", selectedId === row.id && "bg-brand-50/60")}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <td className="px-3 py-3 text-slate-700">{formatDateTime(row.created_at)}</td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">{row.reference}</td>
                          <td className="px-3 py-3 text-slate-700">{row.order?.order_number ?? (row.order_id ? `#${row.order_id}` : "—")}</td>
                          <td className="px-3 py-3 text-slate-700">{row.order?.customer?.name ?? "—"}</td>
                          <td className="px-3 py-3 text-slate-700">{row.reason ?? "—"}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatMoney(row.amount)}</td>
                          <td className="px-3 py-3"><RefundStatusBadge status={row.status} /></td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(row.id);
                              }}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={refunds.data?.meta} onPageChange={setPage} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-6 xl:h-fit" aria-label="Refund details">
          <Card className="border-none bg-white/95">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-navy-900">Refund Details</h2>
                {selectedId ? (
                  <Button variant="ghost" size="icon" aria-label="Close details" onClick={() => setSelectedId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {selectedId ? (
                <RefundDetails refundId={selectedId} onNotice={setNotice} />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                  Select a refund to view its items, order, payment, attachments and history.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const meta = REFUND_STATUS_META[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

function changeLabel(percent: number | null | undefined): string | undefined {
  if (percent === null || percent === undefined) return undefined;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent}% vs last period`;
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

function RefundDetails({ refundId, onNotice }: { refundId: number; onNotice: (notice: NoticeState) => void }) {
  const detail = useRefund(refundId);
  const statusMutation = useUpdateRefundStatus(refundId);

  if (detail.isPending) return <LoadingState label="Loading refund…" />;
  if (detail.isError) return <ErrorState error={detail.error} title="Unable to load refund" onRetry={() => void detail.refetch()} />;
  if (!detail.data) return <EmptyState title="Refund not found" />;

  const refund = detail.data;
  const order = refund.order;
  const payment = refund.payment;
  const ret = refund.return_request;
  const items = refund.items ?? [];
  const history = refund.history ?? [];
  const transactions = refund.transactions ?? [];
  const transitions = REFUND_ALLOWED_TRANSITIONS[refund.status] ?? [];

  const applyStatus = (change: RefundStatusChange, successText: string) => {
    statusMutation.mutate(change, {
      onSuccess: () => onNotice({ tone: "success", text: successText }),
      onError: (error) => onNotice({ tone: "error", text: parseApiError(error, "The refund could not be updated.").message }),
    });
  };

  const runTransition = (target: RefundStatus) => {
    const label = TRANSITION_META[target].label;
    if (target === "failed") {
      const reason = window.prompt("Reason the payout failed:");
      if (!reason) return;
      applyStatus({ status: "failed", failure_reason: reason }, `Refund ${refund.reference} marked as failed.`);
      return;
    }
    if (target === "processing") {
      const payoutReference = window.prompt("Payout reference (optional, e.g. GC-REFUND-0032):") ?? "";
      applyStatus(
        { status: "processing", ...(payoutReference.trim() ? { payout_reference: payoutReference.trim() } : {}) },
        `Refund ${refund.reference} marked as processing.`,
      );
      return;
    }
    if (target === "rejected" || target === "cancelled") {
      if (!window.confirm(`${label} refund ${refund.reference}?`)) return;
      const notes = window.prompt(`Add a note for this ${target === "rejected" ? "rejection" : "cancellation"} (optional):`) ?? "";
      applyStatus(
        { status: target, ...(notes.trim() ? { notes: notes.trim() } : {}) },
        `Refund ${refund.reference} ${target === "rejected" ? "rejected" : "cancelled"}.`,
      );
      return;
    }
    if (target === "processed") {
      if (!window.confirm(`Mark refund ${refund.reference} as processed (paid out)? This updates the payment, order and ledger.`)) return;
      applyStatus({ status: "processed" }, `Refund ${refund.reference} marked as processed.`);
      return;
    }
    // approved
    applyStatus({ status: target }, `Refund ${refund.reference} approved.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-900">{refund.reference}</p>
          <div className="mt-1"><RefundStatusBadge status={refund.status} /></div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-slate-900">{formatMoney(refund.amount)}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{refund.currency}</p>
        </div>
      </div>

      {transitions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {transitions.map((target) => {
            const meta = TRANSITION_META[target];
            return (
              <Button
                key={target}
                size="sm"
                variant={meta.intent === "primary" ? "default" : "outline"}
                className={meta.intent === "danger" ? "text-red-600" : undefined}
                disabled={statusMutation.isPending}
                onClick={() => runTransition(target)}
              >
                {meta.label}
              </Button>
            );
          })}
        </div>
      ) : null}

      <dl className="space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        <DetailRow label="Requested" value={formatDateTime(refund.created_at)} />
        <DetailRow label="Refund method" value={paymentMethodLabel(payment?.method)} />
        {refund.payout_reference ? <DetailRow label="Payout ref" value={<span className="font-mono text-xs">{refund.payout_reference}</span>} /> : null}
        <DetailRow label="Reason" value={refund.reason ?? "—"} />
        {refund.notes ? <DetailRow label="Notes" value={refund.notes} /> : null}
        {refund.failure_reason ? <DetailRow label="Failure reason" value={<span className="text-red-600">{refund.failure_reason}</span>} /> : null}
        <DetailRow
          label="Order"
          value={
            order ? (
              <Link href={`/sales/orders/${order.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                {order.order_number}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <DetailRow label="Customer" value={order?.customer?.name ?? "—"} />
        {order?.customer?.email ? <DetailRow label="Email" value={order.customer.email} /> : null}
        {refund.requested_by?.name ? <DetailRow label="Requested by" value={refund.requested_by.name} /> : null}
        {refund.reviewed_by?.name ? <DetailRow label="Reviewed by" value={refund.reviewed_by.name} /> : null}
        {refund.refunded_at ? <DetailRow label="Refunded" value={formatDateTime(refund.refunded_at)} /> : null}
      </dl>

      {items.length > 0 ? (
        <section>
          <SectionTitle>Refunded items</SectionTitle>
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{item.product_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.sku ? `${item.sku} · ` : ""}× {item.quantity} @ {formatMoney(item.unit_price)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{formatMoney(item.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {payment ? (
        <section>
          <SectionTitle>Payment</SectionTitle>
          <dl className="space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <DetailRow label="Reference" value={<span className="font-mono text-xs">{payment.reference}</span>} />
            <DetailRow label="Method" value={paymentMethodLabel(payment.method)} />
            <DetailRow label="Status" value={<span className="capitalize">{payment.status.replace(/_/g, " ")}</span>} />
            <DetailRow label="Payment amount" value={formatMoney(payment.amount)} />
          </dl>
        </section>
      ) : null}

      {ret ? (
        <section>
          <SectionTitle>Return request</SectionTitle>
          <dl className="space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <DetailRow label="Return" value={<span className="capitalize">{humanize(ret.status)}</span>} />
            {ret.reason ? <DetailRow label="Reason" value={ret.reason} /> : null}
            {ret.notes ? <DetailRow label="Notes" value={ret.notes} /> : null}
          </dl>
          {ret.evidence.length > 0 ? (
            <div className="mt-2">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
              </p>
              <div className="space-y-2">
                {ret.evidence.map((file) => (
                  <PrivateEvidence
                    key={file.index}
                    requestId={ret.id}
                    index={file.index}
                    name={file.name ?? `evidence-${file.index}`}
                    mime={file.mime ?? "application/octet-stream"}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {transactions.length > 0 ? (
        <section>
          <SectionTitle>Ledger</SectionTitle>
          <ul className="space-y-1.5">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block font-mono text-xs text-slate-700">{tx.reference}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {humanize(tx.type)} · {humanize(tx.status)} · {formatDateTime(tx.transacted_at ?? tx.created_at)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{formatMoney(tx.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section>
          <SectionTitle>History</SectionTitle>
          <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {history.map((entry, index) => (
              <li key={index} className="relative">
                <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" aria-hidden />
                <p className="text-sm font-semibold text-slate-900">
                  {entry.from_status ? `${REFUND_STATUS_META[entry.from_status]?.label ?? humanize(entry.from_status)} → ` : ""}
                  {REFUND_STATUS_META[entry.to_status]?.label ?? humanize(entry.to_status)}
                </p>
                {entry.notes ? <p className="text-xs text-muted-foreground">{entry.notes}</p> : null}
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDateTime(entry.created_at)}
                  {entry.user?.name ? ` · ${entry.user.name}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {order ? (
        <Link href={`/sales/orders/${order.id}`} className="inline-flex text-sm font-medium text-brand-700 hover:text-brand-800">
          View order →
        </Link>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-slate-700">{children}</h3>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  );
}
