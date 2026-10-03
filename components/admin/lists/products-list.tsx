"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Package, RotateCcw } from "lucide-react";
import { ProductImage } from "@/components/merchant/product-image";
import { MerchantFilter } from "@/components/admin/merchant-filter";
import { Can } from "@/components/admin/require-permission";
import {
  AdminTable,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconAction,
  LoadingState,
  MerchantCell,
  Notice,
  Pagination,
  SearchField,
  SelectInput,
  StatusPill,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { deleteProduct, fetchProduct, fetchProducts, updateProductStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminProduct, ProductStatus } from "@/types/admin";

export const PRODUCT_STATUSES: ProductStatus[] = ["pending_approval", "active", "draft", "archived", "rejected"];
const STOCK_STATUSES = [
  { value: "active", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];
const EMPTY_FILTERS = { search: "", merchant_id: "", status: "", stock_status: "" };

const mainImage = (product: AdminProduct) => product.image_items?.find((image) => image.is_main)?.path ?? product.images?.[0] ?? null;

export function ProductsList({ merchantId, initialStatus = "" }: { merchantId?: number; initialStatus?: string }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: initialStatus });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);
  const params = { ...filters, search: debouncedSearch, merchant_id: merchantId ?? filters.merchant_id, page, per_page: 10 };

  const query = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <FilterBar bare>
        <SearchField id="product-search" value={filters.search} onChange={(value) => update("search", value)} placeholder="Name, slug, SKU or description…" />
        {merchantId ? null : <MerchantFilter id="product-merchant" value={filters.merchant_id} onChange={(value) => update("merchant_id", value)} />}
        <Field label="Status" htmlFor="product-status">
          <SelectInput id="product-status" value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">All statuses</option>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Stock" htmlFor="product-stock">
          <SelectInput id="product-stock" value={filters.stock_status} onChange={(event) => update("stock_status", event.target.value)}>
            <option value="">All stock levels</option>
            {STOCK_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Button variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No products match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption="Products"
            rows={query.data.data}
            rowKey={(row) => row.id}
            selectedKey={openId}
            columns={[
              {
                key: "name",
                header: "Product",
                render: (row) => {
                  const image = mainImage(row);
                  return (
                    <div className="flex items-center gap-3">
                      {image ? (
                        <ProductImage path={image} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                      ) : (
                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <Package className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900">{row.name}</p>
                        <p className="text-xs text-muted-foreground">SKU {row.sku}</p>
                      </div>
                    </div>
                  );
                },
              },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminProduct) => <MerchantCell merchant={row.merchant} merchantId={row.merchant_id} /> }]),
              { key: "category", header: "Category", render: (row) => row.category?.name ?? "—" },
              {
                key: "price",
                header: "Price",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-navy-900">{formatMoney(row.sale_price ?? row.price)}</p>
                    {row.sale_price ? <p className="text-xs text-muted-foreground line-through">{formatMoney(row.regular_price)}</p> : null}
                  </div>
                ),
              },
              { key: "variants", header: "Variants", render: (row) => row.variants?.length ?? 0 },
              {
                key: "stock",
                header: "Stock",
                render: (row) => (
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{row.stock_quantity}</span>
                    <StatusPill status={row.stock_status === "active" ? "in_stock" : row.stock_status} label={STOCK_STATUSES.find((option) => option.value === row.stock_status)?.label} />
                  </div>
                ),
              },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "actions", header: <span className="sr-only">Actions</span>, render: (row) => <IconAction icon={Eye} label={`View ${row.name}`} onClick={() => setOpenId(row.id)} /> },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="products" />
        </>
      ) : null}

      <ProductDrawer productId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ProductDrawer({ productId, onClose }: { productId: number | null; onClose: () => void }) {
  const product = useQuery({ queryKey: ["admin", "products", "detail", productId], queryFn: () => fetchProduct(productId!), enabled: productId !== null });
  const data = product.data;

  return (
    <Drawer open={productId !== null} onClose={onClose} title={data?.name ?? "Product details"} subtitle={data ? <StatusPill status={data.status} /> : undefined}>
      {product.isPending ? <LoadingState /> : null}
      {product.isError ? <ErrorState error={product.error} onRetry={() => void product.refetch()} /> : null}
      {data ? (
        <>
          {data.image_items && data.image_items.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {data.image_items.map((image) => (
                <ProductImage key={image.id} path={image.path} alt={data.name} className="h-20 w-20 shrink-0" />
              ))}
            </div>
          ) : null}
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={data.merchant} merchantId={data.merchant_id} /> },
              { label: "SKU", value: data.sku },
              { label: "Category", value: data.category?.name ?? "—" },
              { label: "Brand", value: data.brand ?? "—" },
              { label: "Regular price", value: formatMoney(data.regular_price ?? data.price) },
              { label: "Sale price", value: data.sale_price ? formatMoney(data.sale_price) : "—" },
              { label: "Stock", value: `${data.stock_quantity}${data.track_inventory ? ` (low at ${data.low_stock_threshold})` : " · not tracked"}` },
              { label: "Condition", value: humanize(data.condition) },
              { label: "Tags", value: data.tags.length ? data.tags.join(", ") : "—" },
              { label: "Updated", value: formatDateTime(data.updated_at) },
            ]}
          />
          {data.short_description ?? data.description ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{data.short_description ?? data.description}</p>
          ) : null}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-navy-900">Variants</h3>
            {data.variants && data.variants.length > 0 ? (
              <AdminTable
                caption="Product variants"
                rows={data.variants}
                rowKey={(variant) => variant.id}
                columns={[
                  { key: "sku", header: "SKU", render: (variant) => variant.sku },
                  {
                    key: "attributes",
                    header: "Attributes",
                    render: (variant) =>
                      [variant.color, variant.size, ...Object.entries(variant.attributes ?? {}).map(([key, value]) => `${humanize(key)}: ${String(value)}`)]
                        .filter(Boolean)
                        .join(" · ") || "—",
                  },
                  { key: "price", header: "Price", render: (variant) => formatMoney(variant.price) },
                  { key: "stock", header: "Stock", render: (variant) => variant.stock },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">This product has a single SKU without variants.</p>
            )}
          </section>
          <Can permission={ADMIN_PERMISSIONS.PRODUCTS_MANAGE}>
            <ProductActions key={data.id} product={data} onDeleted={onClose} />
          </Can>
        </>
      ) : null}
    </Drawer>
  );
}

function ProductActions({ product, onDeleted }: { product: AdminProduct; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

  const statusMutation = useMutation({
    mutationFn: () => updateProductStatus(product.id, status),
    onSuccess: async (updated) => {
      setNotice({ tone: "success", text: `${updated.name} is now ${humanize(updated.status)}.` });
      await refresh();
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: async () => {
      await refresh();
      onDeleted();
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <section className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <h3 className="text-sm font-bold text-navy-900">Moderation</h3>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Status" htmlFor={`product-status-${product.id}`}>
          <SelectInput id={`product-status-${product.id}`} value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)}>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Button disabled={status === product.status || statusMutation.isPending} onClick={() => statusMutation.mutate()}>
          Save status
        </Button>
        <Button
          variant="outline"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm(`Delete ${product.name}? This cannot be undone.`)) deleteMutation.mutate();
          }}
        >
          Delete
        </Button>
      </div>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}
