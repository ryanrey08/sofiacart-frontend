"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Package } from "lucide-react";
import { ProductsList } from "@/components/admin/lists/products-list";
import { RequirePermission } from "@/components/admin/require-permission";
import { LoadingState, PageHeader, Panel, Tabs } from "@/components/admin/ui";
import { fetchProducts } from "@/lib/api/admin";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";

type ProductTab = "review" | "all";

export default function AdminProductsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.PRODUCTS_VIEW}>
      <Suspense fallback={<LoadingState />}>
        <AdminProductsContent />
      </Suspense>
    </RequirePermission>
  );
}

function AdminProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Review notifications link here with ?review=pending&product=<id>.
  const [tab, setTab] = useState<ProductTab>(() => (searchParams.get("review") === "pending" ? "review" : "all"));
  const [openId] = useState<number | null>(() => {
    const id = Number(searchParams.get("product"));
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const queue = useQuery({
    queryKey: ["admin", "products", "review-count"],
    queryFn: () => fetchProducts({ review: "pending", per_page: 1 }),
  });

  const changeTab = (next: ProductTab) => {
    setTab(next);
    router.replace(next === "review" ? "/admin/products?review=pending" : "/admin/products", { scroll: false });
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Package} title="Products" description="Product listings across all merchants. New products and edits to live products need approval before customers see them." />
      <Tabs<ProductTab>
        label="Product views"
        value={tab}
        onChange={changeTab}
        tabs={[
          { id: "review", label: "Awaiting approval", icon: ClipboardCheck, count: queue.data?.meta.total },
          { id: "all", label: "All products", icon: Package },
        ]}
      />
      {tab === "review" ? (
        <Panel icon={ClipboardCheck} title="Awaiting approval" description="New submissions and edits to approved products, oldest first. Open one to review and approve or reject it.">
          <ProductsList review initialOpenId={openId} />
        </Panel>
      ) : (
        <Panel icon={Package} title="All Products" description="Filter by merchant, status or stock level. Open a product for details, review history and management.">
          <ProductsList initialOpenId={openId} />
        </Panel>
      )}
    </div>
  );
}
