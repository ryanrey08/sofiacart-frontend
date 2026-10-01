"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccessDenied } from "@/components/admin/ui";
import { CategoryForm } from "@/components/merchant/category-form";
import { getStoredAuth } from "@/lib/auth";

export default function NewCategoryPage() {
  const router = useRouter();
  const [auth] = useState(() => getStoredAuth());

  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Category management is available to merchant accounts linked to a store." />;
  }

  return (
    <CategoryForm
      onCancel={() => router.push("/sales/categories")}
      onSaved={(category) => router.push(`/sales/categories?saved=${category.id}&action=created`)}
    />
  );
}
