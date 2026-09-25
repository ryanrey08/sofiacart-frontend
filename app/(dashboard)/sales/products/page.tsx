"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useProducts } from "@/lib/hooks/products";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { data } = useProducts();
  return (
    <ResourcePage<Product>
      title="Products"
      description="Manage SKUs, pricing, stock availability, and sales performance."
      data={data}
      searchKeys={["name", "sku", "category", "status"]}
      columns={[
        { key: "name", header: "Product", sortable: true },
        { key: "sku", header: "SKU", sortable: true },
        { key: "category", header: "Category", sortable: true },
        { key: "price", header: "Price", sortable: true, render: (product) => formatCurrency(product.price) },
        { key: "stock", header: "Stock", sortable: true },
        { key: "status", header: "Status", render: (product) => <StatusBadge status={product.status} /> },
      ]}
    />
  );
}
