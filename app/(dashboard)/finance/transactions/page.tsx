"use client";
import { useState } from "react";
import { ResourcePage } from "@/components/resource-page";
import { StatusPill } from "@/components/admin/ui";
import { useTransactions } from "@/lib/hooks/transactions";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import type { AdminTransaction } from "@/types/admin";

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const transactions = useTransactions(page);
  return (
    <ResourcePage<AdminTransaction>
      title="Transactions"
      description="Review your store's payment transactions."
      data={transactions.data?.data ?? []}
      loading={transactions.isPending}
      error={transactions.isError ? transactions.error : null}
      onRetry={() => void transactions.refetch()}
      meta={transactions.data?.meta}
      currentPage={page}
      onPageChange={setPage}
      statusFilterEnabled={false}
      searchKeys={["reference", "type", "status"]}
      columns={[
        { key: "reference", header: "Reference", sortable: true },
        { key: "type", header: "Type", sortable: true },
        { key: "amount", header: "Amount", render: (transaction) => formatMoney(transaction.amount) },
        { key: "transacted_at", header: "Date", render: (transaction) => formatDateTime(transaction.transacted_at) },
        { key: "status", header: "Status", render: (transaction) => <StatusPill status={transaction.status} /> },
      ]}
    />
  );
}
