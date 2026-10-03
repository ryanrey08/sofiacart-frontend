"use client";

import { Users } from "lucide-react";
import { CustomersList } from "@/components/admin/lists/customers-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminCustomersPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.CUSTOMERS_VIEW}>
      <div className="space-y-5">
        <PageHeader icon={Users} title="Customers" description="Customers of every merchant. Contact details are masked by the API." />
        <Panel icon={Users} title="All Customers" description="Open a customer to see orders, payments and refunds.">
          <CustomersList />
        </Panel>
      </div>
    </RequirePermission>
  );
}
