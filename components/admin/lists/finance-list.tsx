"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CircleDollarSign, CreditCard, Eye, ReceiptText, RotateCcw, Undo2 } from "lucide-react";
import { MerchantFilter } from "@/components/admin/merchant-filter";
import { Can } from "@/components/admin/require-permission";
import {
  AdminTable,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconAction,
  LoadingState,
  MerchantCell,
  Notice,
  Pagination,
  SearchField,
  SelectInput,
  StatCard,
  StatGrid,
  StatusPill,
  Tabs,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchPayment,
  fetchPayments,
  fetchPaymentSummary,
  fetchRefund,
  fetchRefunds,
  fetchRefundSummary,
  fetchTransaction,
  fetchTransactions,
  fetchTransactionSummary,
  updateRefundStatus,
} from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS, REFUND_STATUS_TRANSITIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminPayment, AdminRefund, RefundStatus } from "@/types/admin";

export type FinanceTab = "payments" | "transactions" | "refunds";

const PAYMENT_METHODS = ["card", "gcash", "maya", "bank_transfer", "cod", "cash", "paypal", "other"];
const STATUS_OPTIONS: Record<FinanceTab, string[]> = {
  payments: ["pending", "completed", "failed", "cancelled", "expired", "partially_refunded", "refunded"],
  transactions: ["pending", "completed", "failed"],
  refunds: ["pending", "approved", "rejected", "processing", "processed", "failed", "cancelled"],
};
const SEARCH_HINTS: Record<FinanceTab, string> = {
  payments: "Reference, gateway reference, order number or customer…",
  transactions: "Reference, payment/refund reference, order, customer or amount…",
  refunds: "Refund reference, order number or customer…",
};

const EMPTY_FILTERS = { search: "", merchant_id: "", status: "", method: "", type: "", date_from: "", date_to: "" };

// Payments, ledger transactions and refunds across merchants. Payment credentials and gateway
// secrets are never returned: the API redacts sensitive metadata keys before responding.
export function FinanceOverview({ merchantId, initialTab = "payments" }: { merchantId?: number; initialTab?: FinanceTab }) {
  const [tab, setTab] = useState<FinanceTab>(initialTab);

  return (
    <div className="space-y-5">
      <FinanceSummary tab={tab} merchantId={merchantId} />
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <div className="px-4 sm:px-5">
          <Tabs
            label="Finance records"
            tabs={[
              { id: "payments", label: "Payments", icon: CreditCard },
              { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
              { id: "refunds", label: "Refunds", icon: Undo2 },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-4 sm:p-5">
          <FinanceRecords key={tab} tab={tab} merchantId={merchantId} />
        </div>
      </div>
    </div>
  );
}

function FinanceSummary({ tab, merchantId }: { tab: FinanceTab; merchantId?: number }) {
  const params = { merchant_id: merchantId };
  const payments = useQuery({ queryKey: ["admin", "payments", "summary", params], queryFn: () => fetchPaymentSummary(params), enabled: tab === "payments" });
  const transactions = useQuery({ queryKey: ["admin", "transactions", "summary", params], queryFn: () => fetchTransactionSummary(params), enabled: tab === "transactions" });
  const refunds = useQuery({ queryKey: ["admin", "refunds", "summary", params], queryFn: () => fetchRefundSummary(params), enabled: tab === "refunds" });
  const period = (from?: string, to?: string) => (from && to ? `${formatDateTime(from).split(",")[0]} – ${formatDateTime(to).split(",")[0]}` : undefined);

  if (tab === "payments") {
    const data = payments.data;
    return (
      <StatGrid>
        <StatCard icon={CircleDollarSign} tone="green" label="Collected this period" value={data ? formatMoney(data.collected_amount) : "—"} hint={period(data?.date_from, data?.date_to)} loading={payments.isPending} />
        <StatCard icon={CreditCard} tone="purple" label="Payments" value={data?.total_payments.toLocaleString() ?? "—"} hint={data ? `${data.completed_payments} completed` : undefined} loading={payments.isPending} />
        <StatCard icon={ReceiptText} tone="amber" label="Pending" value={data?.by_status.pending?.toLocaleString() ?? "—"} loading={payments.isPending} />
        <StatCard icon={Undo2} tone="red" label="Refunded" value={data ? formatMoney(data.refunded_amount) : "—"} loading={payments.isPending} />
      </StatGrid>
    );
  }
  if (tab === "transactions") {
    const data = transactions.data;
    return (
      <StatGrid>
        <StatCard icon={ArrowLeftRight} tone="purple" label="Transactions" value={data?.total_transactions.toLocaleString() ?? "—"} hint={period(data?.date_from, data?.date_to)} loading={transactions.isPending} />
        <StatCard icon={CircleDollarSign} tone="green" label="Collected" value={data ? formatMoney(data.collected_amount) : "—"} loading={transactions.isPending} />
        <StatCard icon={Undo2} tone="red" label="Refunded" value={data ? formatMoney(data.refunded_amount) : "—"} loading={transactions.isPending} />
        <StatCard icon={ReceiptText} tone="blue" label="Net" value={data ? formatMoney(data.net_amount) : "—"} loading={transactions.isPending} />
      </StatGrid>
    );
  }
  const data = refunds.data;
  return (
    <StatGrid>
      <StatCard icon={Undo2} tone="purple" label="Refund requests" value={data?.total_refunds.toLocaleString() ?? "—"} hint={period(data?.date_from, data?.date_to)} loading={refunds.isPending} />
      <StatCard icon={ReceiptText} tone="amber" label="Pending" value={data?.by_status.pending?.toLocaleString() ?? "—"} loading={refunds.isPending} />
      <StatCard icon={CircleDollarSign} tone="green" label="Processed amount" value={data ? formatMoney(data.refunded_amount) : "—"} loading={refunds.isPending} />
      <StatCard icon={RotateCcw} tone="red" label="Rejected / failed" value={data ? ((data.by_status.rejected ?? 0) + (data.by_status.failed ?? 0)).toLocaleString() : "—"} loading={refunds.isPending} />
    </StatGrid>
  );
}

function FinanceRecords({ tab, merchantId }: { tab: FinanceTab; merchantId?: number }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);
  const invalidRange = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const params = {
    search: debouncedSearch,
    merchant_id: merchantId ?? filters.merchant_id,
    status: filters.status,
    date_from: filters.date_from,
    date_to: filters.date_to,
    ...(tab === "payments" ? { method: filters.method } : { payment_method: filters.method }),
    ...(tab === "transactions" ? { type: filters.type } : {}),
    page,
    per_page: 10,
  };

  const query = useQuery({
    queryKey: ["admin", tab, "list", params],
    queryFn: async () => {
      if (tab === "payments") return { kind: "payments" as const, page: await fetchPayments(params) };
      if (tab === "transactions") return { kind: "transactions" as const, page: await fetchTransactions(params) };
      return { kind: "refunds" as const, page: await fetchRefunds(params) };
    },
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const result = query.data;
  const merchantColumn = merchantId
    ? []
    : [{ key: "merchant", header: "Merchant", render: (row: { merchant?: AdminPayment["merchant"]; merchant_id: number }) => <MerchantCell merchant={row.merchant} merchantId={row.merchant_id} /> }];

  return (
    <>
      <FilterBar bare>
        <SearchField id={`${tab}-search`} value={filters.search} onChange={(value) => update("search", value)} placeholder={SEARCH_HINTS[tab]} />
        {merchantId ? null : <MerchantFilter id={`${tab}-merchant`} value={filters.merchant_id} onChange={(value) => update("merchant_id", value)} />}
        <Field label="Status" htmlFor={`${tab}-status`}>
          <SelectInput id={`${tab}-status`} value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS[tab].map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Method" htmlFor={`${tab}-method`}>
          <SelectInput id={`${tab}-method`} value={filters.method} onChange={(event) => update("method", event.target.value)}>
            <option value="">All</option>
            {PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        {tab === "transactions" ? (
          <Field label="Type" htmlFor="transactions-type">
            <SelectInput id="transactions-type" value={filters.type} onChange={(event) => update("type", event.target.value)}>
              <option value="">All</option>
              {["payment", "refund", "credit", "debit"].map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="From" htmlFor={`${tab}-from`}>
          <Input id={`${tab}-from`} type="date" value={filters.date_from} onChange={(event) => update("date_from", event.target.value)} />
        </Field>
        <Field label="To" htmlFor={`${tab}-to`}>
          <Input id={`${tab}-to`} type="date" value={filters.date_to} hasError={invalidRange} onChange={(event) => update("date_to", event.target.value)} />
        </Field>
        <Button variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </FilterBar>
      {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}

      {query.isPending && !invalidRange ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {result && result.page.data.length === 0 ? <EmptyState description="No records match these filters." /> : null}

      {result?.kind === "payments" && result.page.data.length > 0 ? (
        <AdminTable
          bare
          caption="Payments"
          rows={result.page.data}
          rowKey={(row) => row.id}
          selectedKey={openId}
          columns={[
            { key: "reference", header: "Reference", className: "whitespace-nowrap", render: (row) => <span className="font-semibold text-brand-700">{row.reference}</span> },
            ...merchantColumn,
            { key: "order", header: "Order", className: "whitespace-nowrap", render: (row) => row.order?.order_number ?? (row.order_id ? `#${row.order_id}` : "—") },
            { key: "customer", header: "Customer", render: (row) => row.order?.customer?.name ?? "—" },
            { key: "method", header: "Method", render: (row) => humanize(row.method ?? row.gateway ?? "—") },
            { key: "amount", header: "Amount", className: "whitespace-nowrap", render: (row) => <span className="font-semibold">{formatMoney(row.amount)} <span className="text-xs text-muted-foreground">{row.currency}</span></span> },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "paid", header: "Paid at", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.paid_at)}</span> },
            { key: "actions", header: <span className="sr-only">Actions</span>, render: (row) => <IconAction icon={Eye} label={`View payment ${row.reference}`} onClick={() => setOpenId(row.id)} /> },
          ]}
        />
      ) : null}

      {result?.kind === "transactions" && result.page.data.length > 0 ? (
        <AdminTable
          bare
          caption="Transactions"
          rows={result.page.data}
          rowKey={(row) => row.id}
          selectedKey={openId}
          columns={[
            { key: "reference", header: "Transaction ID", className: "whitespace-nowrap", render: (row) => <span className="font-semibold text-brand-700">{row.reference}</span> },
            ...merchantColumn,
            { key: "type", header: "Type", render: (row) => <StatusPill status={row.type} /> },
            {
              key: "related",
              header: "Related",
              render: (row) => (
                <div className="text-xs">
                  {row.order ? <p>Order {row.order.order_number}</p> : null}
                  {row.payment ? <p className="text-muted-foreground">Payment {row.payment.reference}</p> : null}
                  {row.refund ? <p className="text-muted-foreground">Refund {row.refund.reference}</p> : null}
                </div>
              ),
            },
            { key: "amount", header: "Amount", className: "whitespace-nowrap", render: (row) => <span className="font-semibold">{formatMoney(row.amount)}</span> },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "date", header: "Date", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.transacted_at ?? row.created_at)}</span> },
            { key: "actions", header: <span className="sr-only">Actions</span>, render: (row) => <IconAction icon={Eye} label={`View transaction ${row.reference}`} onClick={() => setOpenId(row.id)} /> },
          ]}
        />
      ) : null}

      {result?.kind === "refunds" && result.page.data.length > 0 ? (
        <AdminTable
          bare
          caption="Refunds"
          rows={result.page.data}
          rowKey={(row) => row.id}
          selectedKey={openId}
          columns={[
            { key: "reference", header: "Reference", className: "whitespace-nowrap", render: (row) => <span className="font-semibold text-brand-700">{row.reference}</span> },
            ...merchantColumn,
            { key: "order", header: "Order", className: "whitespace-nowrap", render: (row) => row.order?.order_number ?? (row.order_id ? `#${row.order_id}` : "—") },
            { key: "payment", header: "Payment", className: "whitespace-nowrap", render: (row) => row.payment?.reference ?? (row.payment_id ? `#${row.payment_id}` : "—") },
            { key: "reason", header: "Reason", className: "max-w-48", render: (row) => <span className="line-clamp-2">{row.reason ?? "—"}</span> },
            { key: "amount", header: "Amount", className: "whitespace-nowrap", render: (row) => <span className="font-semibold">{formatMoney(row.amount)}</span> },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "date", header: "Requested", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
            { key: "actions", header: <span className="sr-only">Actions</span>, render: (row) => <IconAction icon={Eye} label={`View refund ${row.reference}`} onClick={() => setOpenId(row.id)} /> },
          ]}
        />
      ) : null}

      {result ? <Pagination meta={result.page.meta} onPageChange={setPage} noun={tab} /> : null}

      {tab === "payments" ? <PaymentDrawer id={openId} onClose={() => setOpenId(null)} /> : null}
      {tab === "transactions" ? <TransactionDrawer id={openId} onClose={() => setOpenId(null)} /> : null}
      {tab === "refunds" ? <RefundDrawer id={openId} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

function PaymentDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin", "payments", "detail", id], queryFn: () => fetchPayment(id!), enabled: id !== null });
  const data = detail.data?.data;
  const balance = detail.data?.meta.order_balance;

  return (
    <Drawer open={id !== null} onClose={onClose} title={data ? `Payment ${data.reference}` : "Payment"} subtitle={data ? <StatusPill status={data.status} /> : undefined}>
      {detail.isPending ? <LoadingState /> : null}
      {detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : null}
      {data ? (
        <>
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={data.merchant} merchantId={data.merchant_id} /> },
              { label: "Amount", value: `${formatMoney(data.amount)} ${data.currency}` },
              { label: "Method", value: humanize(data.method ?? "—") },
              { label: "Gateway", value: data.gateway ?? "—" },
              { label: "Gateway reference", value: data.gateway_reference ?? "—" },
              { label: "Order", value: data.order?.order_number ?? "—" },
              { label: "Customer", value: data.order?.customer?.name ?? "—" },
              { label: "Paid at", value: formatDateTime(data.paid_at) },
              { label: "Verified by", value: data.verified_by?.name ?? "—" },
              { label: "Failure reason", value: data.failure_reason ?? "—" },
            ]}
          />
          {balance ? (
            <DetailList
              items={[
                { label: "Order total", value: formatMoney(balance.total_amount) },
                { label: "Paid", value: formatMoney(balance.amount_paid) },
                { label: "Refunded", value: formatMoney(balance.amount_refunded) },
                { label: "Outstanding", value: formatMoney(balance.outstanding_balance) },
              ]}
            />
          ) : null}
          <HistoryList
            title="Ledger transactions"
            rows={(data.transactions ?? []).map((row) => ({ id: row.id, label: `${row.reference} · ${humanize(row.type ?? "")}`, amount: row.amount, status: row.status, date: row.transacted_at }))}
          />
          <HistoryList
            title="Refunds"
            rows={(data.refunds ?? []).map((row) => ({ id: row.id, label: `${row.reference}${row.reason ? ` · ${row.reason}` : ""}`, amount: row.amount, status: row.status, date: row.refunded_at }))}
          />
        </>
      ) : null}
    </Drawer>
  );
}

function TransactionDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin", "transactions", "detail", id], queryFn: () => fetchTransaction(id!), enabled: id !== null });
  const data = detail.data?.data;

  return (
    <Drawer open={id !== null} onClose={onClose} title={data ? `Transaction ${data.reference}` : "Transaction"} subtitle={data ? <StatusPill status={data.status} /> : undefined}>
      {detail.isPending ? <LoadingState /> : null}
      {detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : null}
      {data ? (
        <>
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={data.merchant} merchantId={data.merchant_id} /> },
              { label: "Type", value: humanize(data.type ?? "—") },
              { label: "Amount", value: `${formatMoney(data.amount)} ${data.currency}` },
              { label: "Method", value: humanize(data.payment_method ?? "—") },
              { label: "Order", value: data.order?.order_number ?? "—" },
              { label: "Payment", value: data.payment?.reference ?? "—" },
              { label: "Refund", value: data.refund?.reference ?? "—" },
              { label: "Customer", value: data.customer?.name ?? "—" },
              { label: "Date", value: formatDateTime(data.transacted_at) },
              { label: "Description", value: data.description ?? "—" },
            ]}
          />
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-navy-900">Timeline</h3>
            {detail.data && detail.data.meta.timeline.length > 0 ? (
              <ol className="space-y-2 border-l-2 border-brand-100 pl-4">
                {detail.data.meta.timeline.map((event, index) => (
                  <li key={`${event.event}-${index}`} className="text-sm">
                    <p className="font-semibold text-navy-900">{event.title}</p>
                    <p className="text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(event.occurred_at)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No timeline events.</p>
            )}
          </section>
          <HistoryList
            title="Related ledger entries"
            rows={(detail.data?.meta.history ?? []).map((row) => ({ id: row.id, label: `${row.reference} · ${humanize(row.type ?? "")}`, amount: row.amount, status: row.status, date: row.transacted_at }))}
          />
        </>
      ) : null}
    </Drawer>
  );
}

function RefundDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin", "refunds", "detail", id], queryFn: () => fetchRefund(id!), enabled: id !== null });
  const data = detail.data;

  return (
    <Drawer open={id !== null} onClose={onClose} title={data ? `Refund ${data.reference}` : "Refund"} subtitle={data ? <StatusPill status={data.status} /> : undefined}>
      {detail.isPending ? <LoadingState /> : null}
      {detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : null}
      {data ? (
        <>
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={data.merchant} merchantId={data.merchant_id} /> },
              { label: "Amount", value: `${formatMoney(data.amount)} ${data.currency}` },
              { label: "Order", value: data.order?.order_number ?? "—" },
              { label: "Customer", value: data.order?.customer?.name ?? "—" },
              { label: "Payment", value: data.payment ? `${data.payment.reference} · ${humanize(data.payment.method ?? data.payment.gateway ?? "")}` : "—" },
              { label: "Return request", value: data.return_request_id ? `#${data.return_request_id}` : "—" },
              { label: "Reason", value: data.reason ?? "—" },
              { label: "Payout reference", value: data.payout_reference ?? "—" },
              { label: "Requested by", value: data.requested_by?.name ?? "—" },
              { label: "Reviewed by", value: data.reviewed_by?.name ?? "—" },
              { label: "Refunded at", value: formatDateTime(data.refunded_at) },
              { label: "Failure reason", value: data.failure_reason ?? "—" },
            ]}
          />
          {data.items && data.items.length > 0 ? (
            <HistoryList title="Refunded items" rows={data.items.map((item) => ({ id: item.id, label: `${item.product_name} × ${item.quantity}`, amount: item.amount }))} />
          ) : null}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-navy-900">Status history</h3>
            {data.history && data.history.length > 0 ? (
              <ol className="space-y-2 border-l-2 border-brand-100 pl-4 text-sm">
                {data.history.map((entry, index) => (
                  <li key={`${entry.to_status}-${index}`}>
                    <p className="font-semibold text-navy-900">
                      {entry.from_status ? `${humanize(entry.from_status)} → ` : ""}
                      {humanize(entry.to_status)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.user?.name ?? "System"} · {formatDateTime(entry.created_at)}
                    </p>
                    {entry.notes ? <p className="text-muted-foreground">{entry.notes}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No status changes recorded.</p>
            )}
          </section>
          <Can permission={ADMIN_PERMISSIONS.PAYMENTS_REFUND}>
            <RefundStatusAction key={data.id} refund={data} />
          </Can>
        </>
      ) : null}
    </Drawer>
  );
}

function RefundStatusAction({ refund }: { refund: AdminRefund }) {
  const queryClient = useQueryClient();
  const transitions = (REFUND_STATUS_TRANSITIONS[refund.status] ?? []) as RefundStatus[];
  const [choice, setChoice] = useState<RefundStatus | "">(transitions[0] ?? "");
  const status = choice && transitions.includes(choice) ? choice : (transitions[0] ?? "");
  const [failureReason, setFailureReason] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const mutation = useMutation({
    mutationFn: () => updateRefundStatus(refund.id, { status: status as RefundStatus, failure_reason: status === "failed" ? failureReason.trim() : undefined }),
    onSuccess: async (updated) => {
      setNotice({ tone: "success", text: `Refund ${updated.reference} is now ${humanize(updated.status)}.` });
      await Promise.all(["refunds", "payments", "orders", "transactions"].map((key) => queryClient.invalidateQueries({ queryKey: ["admin", key] })));
    },
    onError: (error) => {
      const details = parseApiError(error);
      setNotice({ tone: "error", text: details.fieldErrors.status?.[0] ?? details.fieldErrors.failure_reason?.[0] ?? details.message });
    },
  });

  if (transitions.length === 0) return <p className="text-sm text-muted-foreground">{humanize(refund.status)} refunds cannot change status.</p>;

  return (
    <section className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <h3 className="text-sm font-bold text-navy-900">Update refund</h3>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="New status" htmlFor={`refund-status-${refund.id}`}>
          <SelectInput id={`refund-status-${refund.id}`} value={status} onChange={(event) => setChoice(event.target.value as RefundStatus)}>
            {transitions.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        {status === "failed" ? (
          <Field label="Failure reason" htmlFor={`refund-failure-${refund.id}`} className="min-w-48 flex-1">
            <Input id={`refund-failure-${refund.id}`} value={failureReason} maxLength={255} onChange={(event) => setFailureReason(event.target.value)} />
          </Field>
        ) : null}
        <Button disabled={mutation.isPending || !status || (status === "failed" && !failureReason.trim())} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Allowed transitions, balance checks and gateway rules are enforced by the API; each refund can only be processed once.</p>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}

function HistoryList({ title, rows }: { title: string; rows: Array<{ id: number; label: string; amount: string | number; status?: string; date?: string | null }> }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-navy-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
              {row.date !== undefined ? <span className="text-xs text-muted-foreground">{formatDateTime(row.date)}</span> : null}
              <span>{formatMoney(row.amount)}</span>
              {row.status ? <StatusPill status={row.status} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

