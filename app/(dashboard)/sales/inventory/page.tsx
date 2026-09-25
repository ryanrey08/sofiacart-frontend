"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useInventory } from "@/lib/hooks/inventory";
import { formatDate } from "@/lib/utils";
import type { InventoryItem } from "@/types";

export default function InventoryPage() {
  const { data } = useInventory();
  return (
    <ResourcePage<InventoryItem>
      title="Inventory"
      description="Stay ahead of stockouts with reorder thresholds and inventory health checks."
      data={data}
      searchKeys={["product", "sku", "status"]}
      columns={[
        { key: "product", header: "Product", sortable: true },
        { key: "sku", header: "SKU", sortable: true },
        { key: "stock", header: "On Hand", sortable: true },
        { key: "threshold", header: "Threshold", sortable: true },
        { key: "updatedAt", header: "Updated", sortable: true, render: (item) => formatDate(item.updatedAt) },
        { key: "status", header: "Status", render: (item) => <StatusBadge status={item.status} /> },
      ]}
    />
  );
}
