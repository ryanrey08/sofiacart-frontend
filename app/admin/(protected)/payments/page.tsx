"use client";

import { CreditCard } from "lucide-react";
import { FinanceOverview } from "@/components/admin/lists/finance-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { PageHeader } from "@/components/admin/ui";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminPaymentsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.PAYMENTS_VIEW}>
      <div className="space-y-5">
        <PageHeader icon={CreditCard} title="Payments" description="Payments, ledger transactions and refunds across all merchants. Summary cards cover the current month." />
        <FinanceOverview />
      </div>
    </RequirePermission>
  );
}
