"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AccessDenied, ErrorState, LoadingState } from "@/components/admin/ui";
import { ProductForm } from "@/components/merchant/product-form";
import { getStoredAuth } from "@/lib/auth";
import { useProduct } from "@/lib/hooks/products";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [auth] = useState(() => getStoredAuth());
  const productId = Number(params.id);
  // `show` eager loads category, variants and imageRecords, so the form always has the full record.
  const product = useProduct(Number.isFinite(productId) && productId > 0 ? productId : null);

  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Product management is available to merchant accounts linked to a store." />;
  }
  if (!Number.isFinite(productId) || productId <= 0) {
    return <ErrorState error={new Error("That product reference is not valid.")} title="Product not found" />;
  }
  if (product.isPending) return <LoadingState label="Loading product…" />;
  if (product.isError) {
    return <ErrorState error={product.error} title="Unable to load product" onRetry={() => void product.refetch()} />;
  }

  return (
    <ProductForm
      product={product.data}
      onCancel={() => router.push("/sales/products")}
      onSaved={(saved) => router.push(`/sales/products?saved=${saved.id}&action=updated`)}
    />
  );
}
