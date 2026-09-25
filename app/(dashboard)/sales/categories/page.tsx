"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useCategories } from "@/lib/hooks/categories";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { data } = useCategories();
  return (
    <ResourcePage<Category>
      title="Categories"
      description="Organize the merchant catalog into customer-friendly storefront groupings."
      data={data}
      searchKeys={["name", "slug", "status"]}
      columns={[
        { key: "name", header: "Category", sortable: true },
        { key: "slug", header: "Slug", sortable: true },
        { key: "productsCount", header: "Products", sortable: true },
        { key: "status", header: "Status", render: (category) => <StatusBadge status={category.status} /> },
      ]}
    />
  );
}
