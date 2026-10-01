"use client";
import { useState } from "react";
import { ResourcePage } from "@/components/resource-page";
import { StatusPill } from "@/components/admin/ui";
import { useOrders } from "@/lib/hooks/orders";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import type { AdminOrder } from "@/types/admin";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const orders = useOrders(page);
  return (
    <ResourcePage<AdminOrder>
      title="Orders"
      description="Track your store's orders and payment status."
      data={orders.data?.data ?? []}
      loading={orders.isPending}
      error={orders.isError ? orders.error : null}
      onRetry={() => void orders.refetch()}
      meta={orders.data?.meta}
      currentPage={page}
      onPageChange={setPage}
      statusFilterEnabled={false}
      searchKeys={["order_number", "status", "payment_status"]}
      columns={[
        { key: "order_number", header: "Order #", sortable: true },
        { key: "customer", header: "Customer", render: (order) => order.customer?.name ?? "—" },
        { key: "items", header: "Items", render: (order) => order.items?.reduce((count, item) => count + (item.quantity ?? 0), 0) ?? "—" },
        { key: "total_amount", header: "Total", render: (order) => formatMoney(order.total_amount) },
        { key: "ordered_at", header: "Date", render: (order) => formatDateTime(order.ordered_at) },
        { key: "payment_status", header: "Payment", render: (order) => <StatusPill status={order.payment_status} /> },
        { key: "status", header: "Status", render: (order) => <StatusPill status={order.status} /> },
      ]}
    />
  );
}
