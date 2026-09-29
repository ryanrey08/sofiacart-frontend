"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminTable, DetailList, EmptyState, ErrorState, LoadingState, StatusPill } from "@/components/admin/ui";
import { fetchMerchantBilling } from "@/lib/api/admin";
import { formatDateTime, formatMoney } from "@/lib/admin/format";

export function MerchantBillingPanel({ merchantId }: { merchantId: number }) {
  const query = useQuery({
    queryKey: ["admin", "merchants", merchantId, "billing"],
    queryFn: () => fetchMerchantBilling(merchantId),
  });

  if (query.isPending) return <LoadingState label="Loading billing summary…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const billing = query.data;
  return (
    <div className="space-y-4">
      <DetailList
        items={[
          { label: "Collected payments", value: `${formatMoney(billing.payments_total)} (${billing.payments_count})` },
          { label: "Processed refunds", value: `${formatMoney(billing.refunds_total)} (${billing.refunds_count})` },
          { label: "Net total", value: formatMoney(billing.net_total) },
          { label: "Transactions", value: billing.transactions_count },
        ]}
      />
      <h3 className="text-lg font-semibold text-slate-900">Recent payments</h3>
      {billing.recent_payments.length === 0 ? (
        <EmptyState title="No payments recorded" />
      ) : (
        <AdminTable
          caption="Recent merchant payments"
          rows={billing.recent_payments}
          rowKey={(row) => row.id}
          columns={[
            { key: "reference", header: "Reference", render: (row) => row.reference },
            { key: "gateway", header: "Gateway", render: (row) => row.gateway ?? "—" },
            { key: "amount", header: "Amount", render: (row) => formatMoney(row.amount) },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "paid", header: "Paid at", render: (row) => formatDateTime(row.paid_at) },
          ]}
        />
      )}
    </div>
  );
}
