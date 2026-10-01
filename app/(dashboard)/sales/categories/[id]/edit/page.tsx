"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AccessDenied, ErrorState, LoadingState } from "@/components/admin/ui";
import { CategoryForm } from "@/components/merchant/category-form";
import { getStoredAuth } from "@/lib/auth";
import { useCategory } from "@/lib/hooks/categories";

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const [auth] = useState(() => getStoredAuth());
  const category = useCategory(validId ? id : null);

  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Category management is available to merchant accounts linked to a store." />;
  }
  if (!validId) return <ErrorState error={null} title="This category link is invalid." />;
  if (category.isPending) return <LoadingState label="Loading category…" />;
  if (category.isError) {
    return <ErrorState error={category.error} title="Unable to load category" onRetry={() => void category.refetch()} />;
  }

  return (
    <CategoryForm
      key={category.data.id}
      category={category.data}
      onCancel={() => router.push("/sales/categories")}
      onSaved={(saved) => router.push(`/sales/categories?saved=${saved.id}&action=updated`)}
    />
  );
}
