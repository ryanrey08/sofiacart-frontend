"use client";

import { RotateCcw } from "lucide-react";
import { ReturnsList } from "@/components/admin/lists/returns-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

export default function AdminReturnsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.ORDERS_VIEW}>
      <div className="space-y-5">
        <PageHeader icon={RotateCcw} title="Returns" description="Return requests raised against merchant orders, with evidence and linked refunds." />
        <Panel icon={RotateCcw} title="Return Requests" description="Review decisions follow the existing return workflow: pending → approved/rejected → processed.">
          <ReturnsList />
        </Panel>
      </div>
    </RequirePermission>
  );
}
