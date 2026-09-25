"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useCustomers } from "@/lib/hooks/customers";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const { data } = useCustomers();
  return (
    <ResourcePage<Customer>
      title="Customers"
      description="Review customer engagement, lifetime value, and order frequency."
      data={data}
      searchKeys={["name", "email", "phone", "status"]}
      columns={[
        { key: "name", header: "Customer", sortable: true },
        { key: "email", header: "Email", sortable: true },
        { key: "phone", header: "Phone" },
        { key: "totalOrders", header: "Orders", sortable: true },
        { key: "totalSpent", header: "Total Spent", sortable: true, render: (customer) => formatCurrency(customer.totalSpent) },
        { key: "status", header: "Status", render: (customer) => <StatusBadge status={customer.status} /> },
      ]}
    />
  );
}
