"use client";

import { Package } from "lucide-react";
import { ProductsList } from "@/components/admin/lists/products-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminProductsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.PRODUCTS_VIEW}>
      <div className="space-y-5">
        <PageHeader icon={Package} title="Products" description="Product listings across all merchants, including pricing, variants and stock." />
        <Panel icon={Package} title="All Products" description="Filter by merchant, status or stock level. Open a product for details and moderation.">
          <ProductsList />
        </Panel>
      </div>
    </RequirePermission>
  );
}
