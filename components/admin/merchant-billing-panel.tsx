"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, CircleDollarSign, Undo2, Wallet } from "lucide-react";
import { AdminTable, EmptyState, ErrorState, LoadingState, StatCard, StatusPill } from "@/components/admin/ui";
import { fetchMerchantBilling } from "@/lib/api/admin";
import { formatDateTime, formatMoney } from "@/lib/admin/format";

// GET /api/admin/merchants/{id}/billing: collected payments, processed refunds and net totals.
// The backend has no subscription plans, invoices or platform fees, so none are shown.
export function MerchantBillingPanel({ merchantId }: { merchantId: number }) {
  const query = useQuery({
    queryKey: ["admin", "merchants", merchantId, "billing"],
    queryFn: () => fetchMerchantBilling(merchantId),
  });

  if (query.isPending) return <LoadingState label="Loading billing summary…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const billing = query.data;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={CircleDollarSign} tone="green" label="Collected payments" value={formatMoney(billing.payments_total)} hint={`${billing.payments_count} payments`} />
        <StatCard icon={Undo2} tone="red" label="Processed refunds" value={formatMoney(billing.refunds_total)} hint={`${billing.refunds_count} refunds`} />
        <StatCard icon={Wallet} tone="purple" label="Net total" value={formatMoney(billing.net_total)} />
        <StatCard icon={ArrowLeftRight} tone="blue" label="Ledger transactions" value={billing.transactions_count.toLocaleString()} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-navy-900">Recent payments</h3>
        {billing.recent_payments.length === 0 ? (
          <EmptyState title="No payments recorded" />
        ) : (
          <AdminTable
            caption="Recent merchant payments"
            rows={billing.recent_payments}
            rowKey={(row) => row.id}
            columns={[
              { key: "date", header: "Date & Time", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.paid_at ?? row.created_at)}</span> },
              { key: "reference", header: "Reference No.", render: (row) => <span className="font-semibold text-brand-700">{row.reference}</span> },
              { key: "gateway", header: "Gateway", render: (row) => row.gateway ?? "—" },
              { key: "amount", header: "Amount", render: (row) => formatMoney(row.amount) },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
