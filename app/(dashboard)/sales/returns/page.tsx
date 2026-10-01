"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { useReturnRequests } from "@/lib/hooks/return-requests";
import type { ReturnStatus } from "@/types/commerce";

export default function ReturnsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReturnStatus | "">("");
  const [orderId, setOrderId] = useState("");
  const returns = useReturnRequests({ page, per_page: 15, status: status || undefined, order_id: orderId ? Number(orderId) : undefined });
  return <div className="space-y-5">
    <PageIntro eyebrow="Sales" title="Return requests" description="Physical item returns and inventory review. Financial refunds are tracked separately in Finance > Refunds." />
    <FilterBar>
      <Field label="Order ID" htmlFor="returns-order"><Input id="returns-order" type="number" min={1} value={orderId} onChange={(e) => { setOrderId(e.target.value); setPage(1); }} /></Field>
      <Field label="Status" htmlFor="returns-status"><SelectInput id="returns-status" value={status} onChange={(e) => { setStatus(e.target.value as ReturnStatus | ""); setPage(1); }}>
        <option value="">All statuses</option>{(["pending", "approved", "rejected", "processed"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
      </SelectInput></Field>
    </FilterBar>
    {returns.isPending ? <LoadingState /> : returns.isError ? <ErrorState error={returns.error} onRetry={() => void returns.refetch()} /> :
      !returns.data.data.length ? <EmptyState title="No return requests found" /> :
      <AdminTable caption="Return requests" rows={returns.data.data} rowKey={(row) => row.id} columns={[
        { key: "id", header: "Request", render: (row) => <Link className="text-brand-700 underline" href={`/sales/returns/${row.id}`}>#{row.id}</Link> },
        { key: "order", header: "Order", render: (row) => <Link className="text-brand-700 underline" href={`/sales/orders/${row.order_id}`}>#{row.order_id}</Link> },
        { key: "reason", header: "Reason", render: (row) => row.reason },
        { key: "amount", header: "Return amount", render: (row) => formatMoney(row.amount) },
        { key: "date", header: "Requested", render: (row) => formatDateTime(row.created_at) },
        { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
      ]} />}
    {!returns.isError && <Pagination meta={returns.data?.meta} onPageChange={setPage} />}
  </div>;
}
