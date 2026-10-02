"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Receipt,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Pagination,
  SelectInput,
} from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, paymentMethodLabel } from "@/lib/payments";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_META,
  TRANSACTION_TYPES,
  isOutflow,
  transactionTypeMeta,
} from "@/lib/transactions";
import { useTransaction, useTransactions, useTransactionSummary } from "@/lib/hooks/transactions";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/payments";
import type { TransactionSort, TransactionStatus, TransactionType } from "@/types/transactions";

const SORT_OPTIONS: Array<{ value: TransactionSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Amount (high–low)" },
  { value: "amount_asc", label: "Amount (low–high)" },
];

export default function TransactionsPage() {
  // The backend scopes /api/v1/transactions to the token's merchant; admins use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Transaction management is available to merchant accounts linked to a store." />;
  }
  return <TransactionsContent />;
}

function TransactionsContent() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [status, setStatus] = useState<TransactionStatus | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<TransactionSort>("newest");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const transactions = useTransactions({
    search: debouncedSearch || undefined,
    type: type || undefined,
    status: status || undefined,
    payment_method: method || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sort,
    page,
    per_page: 15,
  });
  const summary = useTransactionSummary();
  const rows = useMemo(() => transactions.data?.data ?? [], [transactions.data]);
  const hasFilters = Boolean(search || type || status || method || dateFrom || dateTo);
  const resetPage = () => setPage(1);

  const exportCsv = () => {
    if (!rows.length) return;
    const header = ["Reference", "Type", "Order", "Customer", "Method", "Amount", "Currency", "Status", "Date"];
    const body = rows.map((row) => [
      row.reference,
      transactionTypeMeta(row.type).label,
      row.order?.order_number ?? "",
      row.customer?.name ?? "",
      paymentMethodLabel(row.payment_method),
      row.amount,
      row.currency,
      TRANSACTION_STATUS_META[row.status].label,
      row.transacted_at ?? "",
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Finance"
        title="Transactions"
        description="Review your store's money movements, trace each payment and refund to its order, and reconcile your ledger."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total transactions"
          value={summary.data?.total_transactions}
          sub={changeLabel(summary.data?.total_change_percent)}
          icon={<Receipt className="h-4 w-4" />}
          isPending={summary.isPending}
        />
        <MetricCard
          label="Sales orders"
          value={summary.data?.sales_orders}
          sub={summary.data ? "Orders placed this period" : undefined}
          icon={<ShoppingBag className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="brand"
        />
        <MetricCard
          label="Collected"
          value={summary.data ? formatMoney(summary.data.collected_amount) : undefined}
          sub={summary.data ? `Net ${formatMoney(summary.data.net_amount)}` : undefined}
          icon={<Wallet className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="success"
        />
        <MetricCard
          label="Refunded"
          value={summary.data ? formatMoney(summary.data.refunded_amount) : undefined}
          sub={summary.data ? `${summary.data.by_type.refund} refund transaction${summary.data.by_type.refund === 1 ? "" : "s"}` : undefined}
          icon={<RotateCcw className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="danger"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="border-none bg-white/95">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <Field label="Search" htmlFor="transaction-search" className="min-w-56 flex-1">
                <Input
                  id="transaction-search"
                  placeholder="Reference, order, customer or amount"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Type" htmlFor="transaction-type">
                <SelectInput
                  id="transaction-type"
                  className="w-full lg:w-40"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as TransactionType | "");
                    resetPage();
                  }}
                >
                  <option value="">All types</option>
                  {TRANSACTION_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {transactionTypeMeta(value).label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Status" htmlFor="transaction-status">
                <SelectInput
                  id="transaction-status"
                  className="w-full lg:w-40"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as TransactionStatus | "");
                    resetPage();
                  }}
                >
                  <option value="">All statuses</option>
                  {TRANSACTION_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {TRANSACTION_STATUS_META[value].label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Method" htmlFor="transaction-method">
                <SelectInput
                  id="transaction-method"
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
              <Field label="From" htmlFor="transaction-date-from">
                <Input
                  id="transaction-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="To" htmlFor="transaction-date-to">
                <Input
                  id="transaction-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Sort" htmlFor="transaction-sort">
                <SelectInput
                  id="transaction-sort"
                  className="w-full lg:w-48"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as TransactionSort);
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
                    setType("");
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

            {transactions.isPending ? <LoadingState label="Loading transactions…" /> : null}
            {transactions.isError ? (
              <ErrorState error={transactions.error} title="Unable to load transactions" onRetry={() => void transactions.refetch()} />
            ) : null}
            {transactions.data && rows.length === 0 ? (
              <EmptyState
                title="No transactions found"
                description={
                  hasFilters
                    ? "No transactions match these filters."
                    : "Payments and refunds will appear here as money moves through your store."
                }
              />
            ) : null}

            {rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <caption className="sr-only">Transactions</caption>
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Date &amp; Time</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Reference</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Type</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Order #</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Customer</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Method</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Amount</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Status</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className={cn(
                            "cursor-pointer align-middle hover:bg-slate-50/70",
                            selectedId === row.id && "bg-brand-50/60",
                          )}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <td className="px-3 py-3 text-slate-700">{formatDateTime(row.transacted_at ?? row.created_at)}</td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">{row.reference}</td>
                          <td className="px-3 py-3"><TransactionTypeBadge type={row.type} /></td>
                          <td className="px-3 py-3 text-slate-700">{row.order?.order_number ?? (row.order_id ? `#${row.order_id}` : "—")}</td>
                          <td className="px-3 py-3 text-slate-700">{row.customer?.name ?? "—"}</td>
                          <td className="px-3 py-3 text-slate-700">{paymentMethodLabel(row.payment_method)}</td>
                          <td className="px-3 py-3 text-right"><AmountCell amount={row.amount} type={row.type} /></td>
                          <td className="px-3 py-3"><TransactionStatusBadge status={row.status} /></td>
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
                <Pagination meta={transactions.data?.meta} onPageChange={setPage} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-6 xl:h-fit" aria-label="Transaction details">
          <Card className="border-none bg-white/95">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-navy-900">Transaction Details</h2>
                {selectedId ? (
                  <Button variant="ghost" size="icon" aria-label="Close details" onClick={() => setSelectedId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {selectedId ? (
                <TransactionDetails transactionId={selectedId} onSelect={setSelectedId} />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                  Select a transaction to view its order, customer, payment, refund and timeline.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TransactionTypeBadge({ type }: { type: TransactionType | null }) {
  const meta = transactionTypeMeta(type);
  const Icon = meta.direction === "out" ? ArrowUpRight : ArrowDownLeft;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const meta = TRANSACTION_STATUS_META[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

function AmountCell({ amount, type }: { amount: string | number; type: TransactionType | null }) {
  const outflow = isOutflow(type);
  return (
    <span className={cn("font-semibold", outflow ? "text-red-600" : "text-slate-900")}>
      {outflow ? "− " : ""}
      {formatMoney(amount)}
    </span>
  );
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

function TransactionDetails({ transactionId, onSelect }: { transactionId: number; onSelect: (id: number) => void }) {
  const detail = useTransaction(transactionId);

  if (detail.isPending) return <LoadingState label="Loading transaction…" />;
  if (detail.isError) return <ErrorState error={detail.error} title="Unable to load transaction" onRetry={() => void detail.refetch()} />;
  if (!detail.data) return <EmptyState title="Transaction not found" />;

  const transaction = detail.data.data;
  const { history, timeline } = detail.data.meta;
  const order = transaction.order;
  const customer = transaction.customer;
  const payment = transaction.payment;
  const refund = transaction.refund;
  const related = history.filter((row) => row.id !== transaction.id);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-900">{transaction.reference}</p>
          <div className="mt-1 flex items-center gap-2">
            <TransactionTypeBadge type={transaction.type} />
            <TransactionStatusBadge status={transaction.status} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <AmountCell amount={transaction.amount} type={transaction.type} />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{transaction.currency}</p>
        </div>
      </div>

      <dl className="space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        <DetailRow label="Date" value={formatDateTime(transaction.transacted_at ?? transaction.created_at)} />
        <DetailRow label="Method" value={paymentMethodLabel(transaction.payment_method)} />
        {transaction.description ? <DetailRow label="Description" value={transaction.description} /> : null}
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
        <DetailRow label="Customer" value={customer?.name ?? "—"} />
        {customer?.email ? <DetailRow label="Email" value={customer.email} /> : null}
        {customer?.phone ? <DetailRow label="Phone" value={customer.phone} /> : null}
      </dl>

      {order ? (
        <section>
          <SectionTitle icon={<ShoppingBag className="h-4 w-4 text-brand-600" />}>Order</SectionTitle>
          <dl className="space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <DetailRow label="Order number" value={order.order_number} />
            <DetailRow label="Order status" value={order.status ? <span className="capitalize">{order.status}</span> : "—"} />
            <DetailRow label="Payment status" value={order.payment_status ? <span className="capitalize">{order.payment_status.replace(/_/g, " ")}</span> : "—"} />
            <DetailRow label="Order total" value={<span className="font-semibold text-slate-900">{formatMoney(order.total_amount)}</span>} />
            <DetailRow label="Ordered" value={formatDateTime(order.ordered_at)} />
          </dl>
        </section>
      ) : null}

      {payment ? (
        <section>
          <SectionTitle icon={<Wallet className="h-4 w-4 text-brand-600" />}>Payment</SectionTitle>
          <dl className="space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <DetailRow label="Reference" value={<span className="font-mono text-xs">{payment.reference}</span>} />
            {payment.gateway ? <DetailRow label="Gateway" value={<span className="capitalize">{payment.gateway}</span>} /> : null}
            {payment.gateway_reference ? <DetailRow label="Gateway ref" value={<span className="font-mono text-xs">{payment.gateway_reference}</span>} /> : null}
            <DetailRow label="Method" value={paymentMethodLabel(payment.method)} />
            <DetailRow label="Status" value={<span className="capitalize">{payment.status.replace(/_/g, " ")}</span>} />
            <DetailRow label="Amount" value={<span className="font-semibold text-slate-900">{formatMoney(payment.amount)}</span>} />
            <DetailRow label="Paid" value={formatDateTime(payment.paid_at)} />
          </dl>
        </section>
      ) : null}

      {refund ? (
        <section>
          <SectionTitle icon={<RotateCcw className="h-4 w-4 text-orange-600" />}>Refund</SectionTitle>
          <dl className="space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <DetailRow label="Reference" value={<span className="font-mono text-xs">{refund.reference}</span>} />
            <DetailRow label="Status" value={<span className="capitalize">{refund.status.replace(/_/g, " ")}</span>} />
            {refund.reason ? <DetailRow label="Reason" value={refund.reason} /> : null}
            <DetailRow label="Amount" value={<span className="font-semibold text-slate-900">{formatMoney(refund.amount)}</span>} />
            <DetailRow label="Refunded" value={formatDateTime(refund.refunded_at)} />
          </dl>
        </section>
      ) : null}

      {timeline.length > 0 ? (
        <section>
          <SectionTitle icon={<Receipt className="h-4 w-4 text-brand-600" />}>Timeline</SectionTitle>
          <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {timeline.map((event, index) => (
              <li key={`${event.event}-${index}`} className="relative">
                <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" aria-hidden />
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.description}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(event.occurred_at)}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section>
          <SectionTitle icon={<ArrowDownLeft className="h-4 w-4 text-brand-600" />}>Related transactions</SectionTitle>
          <ul className="space-y-1.5">
            {related.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-slate-700">{row.reference}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {transactionTypeMeta(row.type).label} · {formatDateTime(row.transacted_at ?? row.created_at)}
                    </span>
                  </span>
                  <AmountCell amount={row.amount} type={row.type} />
                </button>
              </li>
            ))}
          </ul>
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

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
      {icon}
      {children}
    </h3>
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
