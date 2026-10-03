"use client";

import { ShoppingCart } from "lucide-react";
import { OrdersList } from "@/components/admin/lists/orders-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminOrdersPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.ORDERS_VIEW}>
      <div className="space-y-5">
        <PageHeader icon={ShoppingCart} title="Orders" description="Orders across every merchant storefront, with items, payments, refunds and returns." />
        <Panel icon={ShoppingCart} title="All Orders" description="Filter by merchant, status, payment status or date. Open an order to see its full details.">
          <OrdersList />
        </Panel>
      </div>
    </RequirePermission>
  );
}
