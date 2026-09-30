"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AccessDenied, AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, Notice, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { InventoryAdjustForm } from "@/components/merchant/inventory-adjust-form";
import { ProductDetails } from "@/components/merchant/product-details";
import { ProductForm } from "@/components/merchant/product-form";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, humanize } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import { useDeleteProduct, useProductCategories, useProducts, useUpdateProductStatus } from "@/lib/hooks/products";
import { describeApiError } from "@/lib/merchant-products";
import { PRODUCT_STATUSES } from "@/lib/validation/product";
import type { ProductResource, ProductStatus } from "@/types";

type Dialog =
  | { type: "create" }
  | { type: "view"; product: ProductResource }
  | { type: "edit"; product: ProductResource }
  | { type: "adjust"; product: ProductResource };
type NoticeState = { tone: "success" | "error"; text: string };

export default function ProductsPage() {
  // The backend scopes /api/v1/products to the token's merchant; admins must use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Product management is available to merchant accounts linked to a store." />;
  }
  return <ProductsContent />;
}

function ProductsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const products = useProducts({
    search: debouncedSearch || undefined,
    status: status || undefined,
    category_id: categoryId ? Number(categoryId) : undefined,
    page,
    per_page: 15,
  });
  const categories = useProductCategories();
  const statusMutation = useUpdateProductStatus();
  const deleteMutation = useDeleteProduct();
  const busyId = (statusMutation.isPending && statusMutation.variables?.id) || (deleteMutation.isPending && deleteMutation.variables) || null;

  const closeDialog = () => setDialog(null);
  const changeStatus = (product: ProductResource, next: ProductStatus) => {
    setNotice(null);
    statusMutation.mutate(
      { id: product.id, status: next },
      {
        onSuccess: (updated) => setNotice({ tone: "success", text: `${updated.name} is now ${humanize(updated.status)}.` }),
        onError: (error) => setNotice({ tone: "error", text: describeApiError(error, "The product status could not be updated.") }),
      },
    );
  };
  const remove = (product: ProductResource) => {
    if (!window.confirm(`Delete ${product.name}? This permanently removes the product.`)) return;
    setNotice(null);
    deleteMutation.mutate(product.id, {
      onSuccess: () => setNotice({ tone: "success", text: `${product.name} was deleted.` }),
      onError: (error) => setNotice({ tone: "error", text: describeApiError(error, "The product could not be deleted.") }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-muted-foreground">Create and manage your store&apos;s products, pricing, images and stock.</p>
        </div>
        <Button onClick={() => setDialog({ type: "create" })}>
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

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
        <Field label="Status" htmlFor="product-status-filter">
          <SelectInput
            id="product-status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ProductStatus | "");
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
        <Field label="Category" htmlFor="product-category-filter">
          <SelectInput
            id="product-category-filter"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {(categories.data?.data ?? []).map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {products.isPending ? <LoadingState label="Loading products…" /> : null}
      {products.isError ? <ErrorState error={products.error} title="Unable to load products" onRetry={() => void products.refetch()} /> : null}
      {products.data && products.data.data.length === 0 ? (
        <EmptyState
          title="No products found"
          description={search || status || categoryId ? "No products match these filters." : "Add your first product to start selling."}
        />
      ) : null}
      {products.data && products.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Products"
            rows={products.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "product",
                header: "Product",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    {row.images?.[0] ? (
                      <ProductImage path={row.images[0]} alt={row.name} className="h-10 w-10" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-slate-100" aria-hidden />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="text-xs text-muted-foreground">SKU {row.sku}</p>
                    </div>
                  </div>
                ),
              },
              { key: "category", header: "Category", render: (row) => row.category?.name ?? "—" },
              { key: "price", header: "Price", render: (row) => formatMoney(row.price) },
              { key: "stock", header: "Stock", render: (row) => row.stock_quantity },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDialog({ type: "view", product: row })}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialog({ type: "edit", product: row })}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialog({ type: "adjust", product: row })}>
                      Adjust stock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => changeStatus(row, row.status === "archived" ? "draft" : "archived")}
                    >
                      {row.status === "archived" ? "Restore as draft" : "Archive"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" disabled={busyId === row.id} onClick={() => remove(row)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination meta={products.data.meta} onPageChange={setPage} />
        </>
      ) : null}

      <Modal open={dialog?.type === "create"} title="Add product" onClose={closeDialog} wide>
        <ProductForm
          onCancel={closeDialog}
          onSaved={(product) => {
            closeDialog();
            setPage(1);
            setNotice({ tone: "success", text: `${product.name} (SKU ${product.sku}) was created as ${humanize(product.status)}.` });
          }}
        />
      </Modal>
      {dialog?.type === "edit" ? (
        <Modal open title={`Edit ${dialog.product.name}`} onClose={closeDialog} wide>
          <ProductForm
            key={dialog.product.id}
            product={dialog.product}
            onCancel={closeDialog}
            onSaved={(product) => {
              closeDialog();
              setNotice({ tone: "success", text: `${product.name} was updated.` });
            }}
          />
        </Modal>
      ) : null}
      {dialog?.type === "view" ? (
        <Modal open title={dialog.product.name} onClose={closeDialog} wide>
          <ProductDetails productId={dialog.product.id} />
        </Modal>
      ) : null}
      {dialog?.type === "adjust" ? (
        <Modal open title="Adjust stock" onClose={closeDialog}>
          <InventoryAdjustForm
            product={dialog.product}
            onCancel={closeDialog}
            onSaved={(response) => {
              closeDialog();
              setNotice({
                tone: "success",
                text: `${response.message} ${response.product.name} now has ${response.product.stock_quantity} in stock.`,
              });
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
