"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Notice, PageHeader, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPayments, fetchRefunds, fetchTransactions, updateRefundStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { cn } from "@/lib/utils";
import type { AdminRefund, RefundStatus } from "@/types/admin";

const TABS = [
  { id: "payments", label: "Payments" },
  { id: "transactions", label: "Transactions" },
  { id: "refunds", label: "Refunds" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const STATUS_OPTIONS: Record<Tab, string[]> = {
  payments: ["pending", "completed", "failed", "partially_refunded", "refunded"],
  transactions: ["pending", "completed", "failed"],
  refunds: ["pending", "approved", "rejected", "processed"],
};
const REFUND_STATUSES: RefundStatus[] = ["pending", "approved", "rejected", "processed"];
type NoticeState = { tone: "success" | "error"; text: string };

export default function AdminPaymentsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.PAYMENTS_VIEW}>
      <PaymentsContent />
    </RequirePermission>
  );
}

function PaymentsContent() {
  const [tab, setTab] = useState<Tab>("payments");

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Payments, ledger transactions, and refunds across all merchants." />
      <div role="tablist" aria-label="Payment records" className="inline-flex gap-1 rounded-2xl bg-white/80 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn("rounded-xl px-4 py-2 text-sm font-semibold", tab === item.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50")}
          >
            {item.label}
          </button>
        ))}
      </div>
      <PaymentRecords key={tab} tab={tab} />
    </div>
  );
}

function PaymentRecords({ tab }: { tab: Tab }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [extra, setExtra] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const debouncedExtra = useDebouncedValue(extra);
  const params = {
    search: debouncedSearch,
    status,
    page,
    per_page: 15,
    ...(tab === "payments" ? { gateway: debouncedExtra } : {}),
    ...(tab === "transactions" ? { type: extra } : {}),
  };

  const query = useQuery({
    queryKey: ["admin", tab, params],
    queryFn: async () => {
      if (tab === "payments") return { kind: "payments" as const, page: await fetchPayments(params) };
      if (tab === "transactions") return { kind: "transactions" as const, page: await fetchTransactions(params) };
      return { kind: "refunds" as const, page: await fetchRefunds(params) };
    },
    placeholderData: keepPreviousData,
  });

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const result = query.data;
  const rows = result?.page.data ?? [];

  return (
    <div className="space-y-4">
      <FilterBar>
        <Field label="Reference" htmlFor={`${tab}-search`} className="min-w-56 flex-1">
          <Input id={`${tab}-search`} placeholder="Search by reference" value={search} onChange={(event) => resetPage(setSearch)(event.target.value)} />
        </Field>
        <Field label="Status" htmlFor={`${tab}-status`}>
          <SelectInput id={`${tab}-status`} value={status} onChange={(event) => resetPage(setStatus)(event.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS[tab].map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        {tab === "payments" ? (
          <Field label="Gateway" htmlFor="payments-gateway">
            <Input id="payments-gateway" placeholder="e.g. gcash" value={extra} onChange={(event) => resetPage(setExtra)(event.target.value)} />
          </Field>
        ) : null}
        {tab === "transactions" ? (
          <Field label="Type" htmlFor="transactions-type">
            <SelectInput id="transactions-type" value={extra} onChange={(event) => resetPage(setExtra)(event.target.value)}>
              <option value="">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </SelectInput>
          </Field>
        ) : null}
      </FilterBar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {result && rows.length === 0 ? <EmptyState description="No records match these filters." /> : null}

      {result?.kind === "payments" && rows.length > 0 ? (
        <AdminTable
          caption="Payments"
          rows={result.page.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "reference", header: "Reference", render: (row) => <span className="font-semibold">{row.reference}</span> },
            { key: "merchant", header: "Merchant ID", render: (row) => row.merchant_id },
            { key: "order", header: "Order ID", render: (row) => row.order_id ?? "—" },
            { key: "gateway", header: "Gateway", render: (row) => row.gateway ?? "—" },
            { key: "amount", header: "Amount", render: (row) => formatMoney(row.amount) },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "paid", header: "Paid at", render: (row) => formatDateTime(row.paid_at) },
          ]}
        />
      ) : null}

      {result?.kind === "transactions" && rows.length > 0 ? (
        <AdminTable
          caption="Transactions"
          rows={result.page.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "reference", header: "Reference", render: (row) => <span className="font-semibold">{row.reference}</span> },
            { key: "merchant", header: "Merchant ID", render: (row) => row.merchant_id },
            { key: "type", header: "Type", render: (row) => <StatusPill status={row.type} /> },
            { key: "amount", header: "Amount", render: (row) => formatMoney(row.amount) },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "description", header: "Description", render: (row) => row.description ?? "—" },
            { key: "date", header: "Date", render: (row) => formatDateTime(row.transacted_at ?? row.created_at) },
          ]}
        />
      ) : null}

      {result?.kind === "refunds" && rows.length > 0 ? (
        <AdminTable
          caption="Refunds"
          rows={result.page.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "reference", header: "Reference", render: (row) => <span className="font-semibold">{row.reference}</span> },
            { key: "merchant", header: "Merchant ID", render: (row) => row.merchant_id },
            { key: "payment", header: "Payment ID", render: (row) => row.payment_id },
            { key: "amount", header: "Amount", render: (row) => formatMoney(row.amount) },
            { key: "reason", header: "Reason", render: (row) => row.reason ?? "—" },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            {
              key: "actions",
              header: "Update",
              render: (row) => (
                <Can permission={ADMIN_PERMISSIONS.PAYMENTS_REFUND} fallback={<span className="text-xs text-slate-400">View only</span>}>
                  <RefundStatusAction refund={row} onResult={setNotice} />
                </Can>
              ),
            },
          ]}
        />
      ) : null}

      {result ? <Pagination meta={result.page.meta} onPageChange={setPage} /> : null}
    </div>
  );
}

function RefundStatusAction({ refund, onResult }: { refund: AdminRefund; onResult: (notice: NoticeState) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RefundStatus>(refund.status);
  const mutation = useMutation({
    mutationFn: () => updateRefundStatus(refund.id, status),
    onSuccess: async (updated) => {
      onResult({ tone: "success", text: `Refund ${updated.reference} is now ${humanize(updated.status)}.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
    },
    onError: (error) => onResult({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`refund-status-${refund.id}`} className="sr-only">
        Status for refund {refund.reference}
      </label>
      <SelectInput id={`refund-status-${refund.id}`} className="h-9" value={status} onChange={(event) => setStatus(event.target.value as RefundStatus)}>
        {REFUND_STATUSES.map((value) => (
          <option key={value} value={value}>
            {humanize(value)}
          </option>
        ))}
      </SelectInput>
      <Button size="sm" disabled={status === refund.status || mutation.isPending} onClick={() => mutation.mutate()}>
        Save
      </Button>
    </div>
  );
}
