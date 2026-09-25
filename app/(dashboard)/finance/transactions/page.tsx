"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useTransactions } from "@/lib/hooks/transactions";
import { mockTransactions } from "@/lib/mocks";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const { data = mockTransactions } = useTransactions();
  return (
    <ResourcePage<Transaction>
      title="Transactions"
      description="Review settlements, adjustments, and payout transactions for your merchants."
      data={data}
      searchKeys={["reference", "type", "status"]}
      columns={[
        { key: "reference", header: "Reference", sortable: true },
        { key: "type", header: "Type", sortable: true },
        { key: "amount", header: "Amount", sortable: true, render: (transaction) => formatCurrency(transaction.amount) },
        { key: "date", header: "Date", sortable: true, render: (transaction) => formatDate(transaction.date) },
        { key: "status", header: "Status", render: (transaction) => <StatusBadge status={transaction.status} /> },
      ]}
    />
  );
}
