"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Notice, PageHeader, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProduct, fetchProducts, updateProductStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminProduct, ProductStatus } from "@/types/admin";

const PRODUCT_STATUSES: ProductStatus[] = ["pending_approval", "active", "draft", "archived", "rejected"];
type NoticeState = { tone: "success" | "error"; text: string };

export default function AdminProductsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.PRODUCTS_VIEW}>
      <ProductsContent />
    </RequirePermission>
  );
}

function ProductsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, status, page, per_page: 15 };

  const query = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Moderate product listings across all merchants." />
      <FilterBar>
        <Field label="Search" htmlFor="product-search" className="min-w-64 flex-1">
          <Input
            id="product-search"
            placeholder="Name, slug, SKU or description"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Status" htmlFor="product-status">
          <SelectInput
            id="product-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No products match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Products"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "name",
                header: "Product",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <p className="text-xs text-muted-foreground">SKU {row.sku}</p>
                  </div>
                ),
              },
              { key: "merchant", header: "Merchant ID", render: (row) => row.merchant_id },
              { key: "category", header: "Category", render: (row) => row.category?.name ?? "—" },
              { key: "price", header: "Price", render: (row) => formatMoney(row.price) },
              { key: "stock", header: "Stock", render: (row) => row.stock_quantity },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <Can permission={ADMIN_PERMISSIONS.PRODUCTS_MANAGE} fallback={<span className="text-xs text-slate-400">View only</span>}>
                    <ProductActions product={row} onResult={setNotice} />
                  </Can>
                ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function ProductActions({ product, onResult }: { product: AdminProduct; onResult: (notice: NoticeState) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

  const statusMutation = useMutation({
    mutationFn: () => updateProductStatus(product.id, status),
    onSuccess: async (updated) => {
      onResult({ tone: "success", text: `${updated.name} is now ${humanize(updated.status)}.` });
      await refresh();
    },
    onError: (error) => onResult({ tone: "error", text: parseApiError(error).message }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: async () => {
      onResult({ tone: "success", text: `${product.name} was deleted.` });
      await refresh();
    },
    onError: (error) => onResult({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`product-status-${product.id}`} className="sr-only">
        Status for {product.name}
      </label>
      <SelectInput id={`product-status-${product.id}`} className="h-9" value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)}>
        {PRODUCT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {humanize(value)}
          </option>
        ))}
      </SelectInput>
      <Button size="sm" disabled={status === product.status || statusMutation.isPending} onClick={() => statusMutation.mutate()}>
        Save
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600"
        disabled={deleteMutation.isPending}
        onClick={() => {
          if (window.confirm(`Delete ${product.name}? This cannot be undone.`)) deleteMutation.mutate();
        }}
      >
        Delete
      </Button>
    </div>
  );
}
