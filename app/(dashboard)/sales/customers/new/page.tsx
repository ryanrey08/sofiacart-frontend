"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccessDenied } from "@/components/admin/ui";
import { CustomerForm } from "@/components/merchant/customer-form";
import { getStoredAuth } from "@/lib/auth";

export default function NewCustomerPage() {
  const router = useRouter();
  const [auth] = useState(() => getStoredAuth());

  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Customer management is available to merchant accounts linked to a store." />;
  }

  return (
    <CustomerForm
      onCancel={() => router.push("/sales/customers")}
      // "Save & Add Another" keeps the merchant on the empty form instead of returning to the list.
      onSaved={(customer, mode) => {
        if (mode === "close") router.push(`/sales/customers?saved=${customer.id}&action=created`);
      }}
    />
  );
}
