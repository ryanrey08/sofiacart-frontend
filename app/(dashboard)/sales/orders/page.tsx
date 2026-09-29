"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useOrders } from "@/lib/hooks/orders";
import { mockOrders } from "@/lib/mocks";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrdersPage() {
  const { data = mockOrders } = useOrders();
  return (
    <ResourcePage<Order>
      title="Orders"
      description="Track order volume, shipping progress, and payment status across merchants."
      data={data}
      searchKeys={["orderNumber", "customer", "status"]}
      columns={[
        { key: "orderNumber", header: "Order #", sortable: true },
        { key: "customer", header: "Customer", sortable: true },
        { key: "items", header: "Items", sortable: true },
        { key: "total", header: "Total", sortable: true, render: (order) => formatCurrency(order.total) },
        { key: "createdAt", header: "Date", sortable: true, render: (order) => formatDate(order.createdAt) },
        { key: "status", header: "Status", render: (order) => <StatusBadge status={order.status} /> },
      ]}
    />
  );
}
