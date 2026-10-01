"use client";
import { useState } from "react";
import { ResourcePage } from "@/components/resource-page";
import { useInventory } from "@/lib/hooks/inventory";
import { formatDateTime } from "@/lib/admin/format";
import type { InventoryLogResource } from "@/types";

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const logs = useInventory(page);
  return (
    <ResourcePage<InventoryLogResource>
      title="Inventory"
      description="Review stock adjustment history. Adjust stock from the Products page."
      data={logs.data?.data ?? []}
      loading={logs.isPending}
      error={logs.isError ? logs.error : null}
      onRetry={() => void logs.refetch()}
      meta={logs.data?.meta}
      currentPage={page}
      onPageChange={setPage}
      statusFilterEnabled={false}
      searchKeys={["reason", "notes"]}
      columns={[
        { key: "product", header: "Product", render: (log) => log.product?.name ?? `Product #${log.product_id}` },
        { key: "reason", header: "Reason", sortable: true },
        { key: "quantity_change", header: "Change", sortable: true },
        { key: "resulting_stock", header: "On Hand", sortable: true },
        { key: "created_at", header: "Date", render: (log) => formatDateTime(log.created_at) },
      ]}
    />
  );
}
