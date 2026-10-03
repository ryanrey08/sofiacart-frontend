"use client";

import { Boxes } from "lucide-react";
import { InventoryOverview } from "@/components/admin/lists/inventory-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { PageHeader } from "@/components/admin/ui";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminInventoryPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.PRODUCTS_INVENTORY}>
      <div className="space-y-5">
        <PageHeader icon={Boxes} title="Inventory" description="Platform-wide stock levels, reservations and movement history." />
        <InventoryOverview />
      </div>
    </RequirePermission>
  );
}
