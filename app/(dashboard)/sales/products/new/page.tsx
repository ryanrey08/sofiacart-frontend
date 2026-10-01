"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccessDenied } from "@/components/admin/ui";
import { ProductForm } from "@/components/merchant/product-form";
import { getStoredAuth } from "@/lib/auth";

export default function NewProductPage() {
  const router = useRouter();
  const [auth] = useState(() => getStoredAuth());

  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Product management is available to merchant accounts linked to a store." />;
  }

  return (
    <ProductForm
      onCancel={() => router.push("/sales/products")}
      onSaved={(product) => router.push(`/sales/products?saved=${product.id}&action=created`)}
    />
  );
}
