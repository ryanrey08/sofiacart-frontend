"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AccessDenied, ErrorState, LoadingState } from "@/components/admin/ui";
import { CustomerForm } from "@/components/merchant/customer-form";
import { getStoredAuth } from "@/lib/auth";
import { useCustomer } from "@/lib/hooks/customers";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const [auth] = useState(() => getStoredAuth());
  const customer = useCustomer(validId ? id : null);

  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Customer management is available to merchant accounts linked to a store." />;
  }
  if (!validId) return <ErrorState error={null} title="This customer link is invalid." />;
  if (customer.isPending) return <LoadingState label="Loading customer…" />;
  if (customer.isError) {
    return <ErrorState error={customer.error} title="Unable to load customer" onRetry={() => void customer.refetch()} />;
  }

  return (
    <CustomerForm
      key={customer.data.id}
      customer={customer.data}
      onCancel={() => router.push("/sales/customers")}
      onSaved={(saved) => router.push(`/sales/customers?saved=${saved.id}&action=updated`)}
    />
  );
}
