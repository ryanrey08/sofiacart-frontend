"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Package, PackageX, Pencil, Plus, ShoppingBag, SlidersHorizontal, Trash2, X } from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Notice,
  Pagination,
  SelectInput,
  StatusPill,
} from "@/components/admin/ui";
import { InventoryAdjustForm } from "@/components/merchant/inventory-adjust-form";
import { PageIntro } from "@/components/merchant/page-intro";
import { ProductDetails } from "@/components/merchant/product-details";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, humanize } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import {
  useDeleteProduct,
  useProductCategories,
  useProductMetrics,
  useProducts,
  useUpdateProductStatus,
} from "@/lib/hooks/products";
import { describeApiError, primaryProductImage } from "@/lib/merchant-products";
import { PRODUCT_STATUSES, PRODUCT_STOCK_STATUSES } from "@/lib/validation/product";
import { cn } from "@/lib/utils";
import type { ProductResource, ProductStatus, ProductStockStatus } from "@/types";

type NoticeState = { tone: "success" | "error"; text: string };

export default function ProductsPage() {
  // The backend scopes /api/v1/products to the token's merchant; admins must use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Product management is available to merchant accounts linked to a store." />;
  }
  return (
    <Suspense fallback={<LoadingState label="Loading products…" />}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  // Category pages link here with ?category_id=<id> to show that category's products.
  const [categoryId, setCategoryId] = useState(() => {
    const value = searchParams.get("category_id") ?? "";
    return /^\d+$/.test(value) ? value : "";
  });
  const [stockStatus, setStockStatus] = useState<ProductStockStatus | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  // A save redirects back here with ?saved=<id>, so the saved product opens in the preview panel.
  const [previewId, setPreviewId] = useState<number | null>(() => {
    const saved = Number(searchParams.get("saved"));
    return Number.isInteger(saved) && saved > 0 ? saved : null;
  });
  const [adjusting, setAdjusting] = useState<ProductResource | null>(null);
  // A save redirects back here with ?action=, which seeds the confirmation banner once.
  const [notice, setNotice] = useState<NoticeState | null>(() => {
    const action = searchParams.get("action");
    if (!action) return null;
    return { tone: "success", text: action === "updated" ? "Your product was updated." : "Your product was created." };
  });
  const debouncedSearch = useDebouncedValue(search);

  const products = useProducts({
    search: debouncedSearch || undefined,
    status: status || undefined,
    category_id: categoryId ? Number(categoryId) : undefined,
    stock_status: stockStatus || undefined,
    page,
    per_page: 15,
  });
  const metrics = useProductMetrics();
  const categories = useProductCategories();
  const statusMutation = useUpdateProductStatus();
  const deleteMutation = useDeleteProduct();
  const rows = useMemo(() => products.data?.data ?? [], [products.data]);
  const busy = statusMutation.isPending || deleteMutation.isPending;
  const hasFilters = Boolean(search || status || categoryId || stockStatus);
  // Selections for rows that left the page (filters, pagination, deletion) are simply ignored.
  const selectedRows = useMemo(() => rows.filter((row) => selected.includes(row.id)), [rows, selected]);

  const resetPage = () => setPage(1);
  const toggleRow = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));

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
      onSuccess: () => {
        setPreviewId((current) => (current === product.id ? null : current));
        setNotice({ tone: "success", text: `${product.name} was deleted.` });
      },
      onError: (error) => setNotice({ tone: "error", text: describeApiError(error, "The product could not be deleted.") }),
    });
  };

  const bulkArchive = async () => {
    setNotice(null);
    const targets = selectedRows.filter((row) => row.status !== "archived");
    if (!targets.length) return;
    try {
      for (const target of targets) await statusMutation.mutateAsync({ id: target.id, status: "archived" });
      setSelected([]);
      setNotice({ tone: "success", text: `${targets.length} product${targets.length === 1 ? "" : "s"} archived.` });
    } catch (error) {
      setNotice({ tone: "error", text: describeApiError(error, "Some products could not be archived.") });
    }
  };

  const bulkDelete = async () => {
    const ids = selectedRows.map((row) => row.id);
    const count = ids.length;
    if (!count || !window.confirm(`Delete ${count} product${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setNotice(null);
    try {
      for (const id of ids) await deleteMutation.mutateAsync(id);
      setPreviewId((current) => (current && ids.includes(current) ? null : current));
      setSelected([]);
      setNotice({ tone: "success", text: `${count} product${count === 1 ? "" : "s"} deleted.` });
    } catch (error) {
      setNotice({ tone: "error", text: describeApiError(error, "Some products could not be deleted.") });
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Catalogue"
        title="Products"
        description="Create and manage your store's products, pricing, images and stock."
        actions={
          <Button onClick={() => router.push("/sales/products/new")}>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total products" value={metrics.total} icon={<ShoppingBag className="h-4 w-4" />} isPending={metrics.isPending} />
        <MetricCard label="Active" value={metrics.active} icon={<Package className="h-4 w-4" />} isPending={metrics.isPending} tone="success" />
        <MetricCard
          label="Low stock"
          value={metrics.low_stock}
          icon={<AlertTriangle className="h-4 w-4" />}
          isPending={metrics.isPending}
          tone="warning"
        />
        <MetricCard
          label="Out of stock"
          value={metrics.out_of_stock}
          icon={<PackageX className="h-4 w-4" />}
          isPending={metrics.isPending}
          tone="danger"
        />
      </div>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-none bg-white/95">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <Field label="Search" htmlFor="product-search" className="min-w-56 flex-1">
                <Input
                  id="product-search"
                  placeholder="Name, slug, SKU or description"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Category" htmlFor="product-category-filter">
                <SelectInput
                  id="product-category-filter"
                  className="w-full lg:w-44"
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    resetPage();
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
              <Field label="Status" htmlFor="product-status-filter">
                <SelectInput
                  id="product-status-filter"
                  className="w-full lg:w-40"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as ProductStatus | "");
                    resetPage();
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
              <Field label="Stock" htmlFor="product-stock-filter">
                <SelectInput
                  id="product-stock-filter"
                  className="w-full lg:w-40"
                  value={stockStatus}
                  onChange={(event) => {
                    setStockStatus(event.target.value as ProductStockStatus | "");
                    resetPage();
                  }}
                >
                  <option value="">All stock levels</option>
                  {PRODUCT_STOCK_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value === "active" ? "In stock" : humanize(value)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setCategoryId("");
                    setStockStatus("");
                    resetPage();
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Clear filters
                </Button>
              ) : null}
            </div>

            {selectedRows.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
                <span className="font-semibold">{selectedRows.length} selected</span>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void bulkArchive()}>
                  Archive
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={() => void bulkDelete()}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                  Clear selection
                </Button>
              </div>
            ) : null}

            {products.isPending ? <LoadingState label="Loading products…" /> : null}
            {products.isError ? (
              <ErrorState error={products.error} title="Unable to load products" onRetry={() => void products.refetch()} />
            ) : null}
            {products.data && rows.length === 0 ? (
              <EmptyState
                title="No products found"
                description={hasFilters ? "No products match these filters." : "Add your first product to start selling."}
              />
            ) : null}

            {rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <caption className="sr-only">Products</caption>
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th scope="col" className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-600"
                            aria-label="Select all products on this page"
                            checked={allSelected}
                            onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])}
                          />
                        </th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Product
                        </th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Category
                        </th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Price
                        </th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Stock
                        </th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => {
                        const image = primaryProductImage(row);
                        const onSale = row.sale_price !== null && row.sale_price !== undefined && row.sale_price !== "";
                        return (
                          <tr
                            key={row.id}
                            className={cn("align-middle hover:bg-slate-50/70", previewId === row.id && "bg-brand-50/60")}
                          >
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-brand-600"
                                aria-label={`Select ${row.name}`}
                                checked={selected.includes(row.id)}
                                onChange={() => toggleRow(row.id)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="flex items-center gap-3 text-left"
                                onClick={() => setPreviewId(row.id)}
                                aria-label={`Preview ${row.name}`}
                              >
                                {image ? (
                                  <ProductImage path={image} alt={row.name} className="h-10 w-10 shrink-0" />
                                ) : (
                                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" aria-hidden />
                                )}
                                <span>
                                  <span className="block font-semibold text-slate-900">{row.name}</span>
                                  <span className="block text-xs text-muted-foreground">SKU {row.sku}</span>
                                </span>
                              </button>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{row.category?.name ?? "—"}</td>
                            <td className="px-3 py-3 text-slate-700">
                              {onSale ? (
                                <span>
                                  <span className="font-semibold text-slate-900">{formatMoney(row.sale_price)}</span>{" "}
                                  <span className="text-xs text-muted-foreground line-through">{formatMoney(row.regular_price ?? row.price)}</span>
                                </span>
                              ) : (
                                formatMoney(row.regular_price ?? row.price)
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span className="block text-slate-700">{row.stock_quantity}</span>
                              <StockPill stockStatus={row.stock_status} />
                            </td>
                            <td className="px-3 py-3">
                              <StatusPill status={row.status} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <Button size="sm" variant="outline" onClick={() => router.push(`/sales/products/${row.id}/edit`)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setAdjusting(row)}>
                                  Stock
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => changeStatus(row, row.status === "archived" ? "draft" : "archived")}
                                >
                                  {row.status === "archived" ? "Restore" : "Archive"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  aria-label={`Delete ${row.name}`}
                                  disabled={busy}
                                  onClick={() => remove(row)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={products.data?.meta} onPageChange={setPage} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-6 xl:h-fit" aria-label="Product preview">
          <Card className="border-none bg-white/95">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-navy-900">Preview</h2>
                {previewId ? (
                  <Button variant="ghost" size="icon" aria-label="Close preview" onClick={() => setPreviewId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {previewId ? (
                <ProductDetails productId={previewId} onEdit={() => router.push(`/sales/products/${previewId}/edit`)} />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                  Select a product to preview its images, pricing and stock history.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {adjusting ? (
        <Modal open title="Adjust stock" onClose={() => setAdjusting(null)}>
          <InventoryAdjustForm
            product={adjusting}
            onCancel={() => setAdjusting(null)}
            onSaved={(response) => {
              setAdjusting(null);
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

function MetricCard({
  label,
  value,
  icon,
  isPending,
  tone = "brand",
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  isPending: boolean;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  } as const;

  return (
    <Card className="border-none bg-white/95">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-bold text-navy-900">{isPending && value === null ? "…" : (value ?? "—")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StockPill({ stockStatus }: { stockStatus: ProductStockStatus | undefined }) {
  if (!stockStatus) return null;
  const labels: Record<ProductStockStatus, string> = { active: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" };
  const tones: Record<ProductStockStatus, string> = {
    active: "bg-green-50 text-green-700",
    low_stock: "bg-amber-50 text-amber-800",
    out_of_stock: "bg-red-50 text-red-700",
  };
  return <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", tones[stockStatus])}>{labels[stockStatus]}</span>;
}
