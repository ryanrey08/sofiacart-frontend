"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AlertTriangle, ArrowLeftRight, Boxes, CheckCircle2, Download, PackageX, Layers, SlidersHorizontal } from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Pagination,
  SelectInput,
} from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import {
  useInventoryItems,
  useInventoryLogs,
  useInventoryProduct,
  useInventorySummary,
  type InventoryItemSort,
} from "@/lib/hooks/inventory";
import { useProductCategories } from "@/lib/hooks/products";
import { cn } from "@/lib/utils";
import type { InventoryItemResource, InventoryLogResource, ProductStockStatus } from "@/types";


const STOCK_STATUS_META: Record<ProductStockStatus, { label: string; className: string }> = {
  active: { label: "In Stock", className: "bg-green-50 text-green-700" },
  low_stock: { label: "Low Stock", className: "bg-amber-50 text-amber-800" },
  out_of_stock: { label: "Out of Stock", className: "bg-red-50 text-red-700" },
};

const MOVEMENT_META: Record<string, { label: string; className: string }> = {
  stock_in: { label: "Stock In", className: "bg-green-50 text-green-700" },
  stock_out: { label: "Stock Out", className: "bg-red-50 text-red-700" },
  adjustment: { label: "Adjustment", className: "bg-slate-100 text-slate-600" },
  sale: { label: "Sale", className: "bg-blue-50 text-blue-700" },
  cancellation: { label: "Cancellation", className: "bg-amber-50 text-amber-800" },
  return: { label: "Return", className: "bg-brand-50 text-brand-700" },
};

const SORT_OPTIONS: Array<{ value: InventoryItemSort; label: string }> = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "available_desc", label: "Available (high–low)" },
  { value: "available_asc", label: "Available (low–high)" },
  { value: "stock_desc", label: "On hand (high–low)" },
  { value: "stock_asc", label: "On hand (low–high)" },
  { value: "reserved_desc", label: "Reserved (high–low)" },
];

export default function InventoryPage() {
  // The backend scopes /api/v1/inventory to the token's merchant; admins use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Inventory management is available to merchant accounts linked to a store." />;
  }
  return <InventoryContent />;
}

function InventoryContent() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState<ProductStockStatus | "">("");
  const [type, setType] = useState<"" | "product" | "variant">("");
  const [sort, setSort] = useState<InventoryItemSort>("name_asc");
  const [page, setPage] = useState(1);
  const [detailProductId, setDetailProductId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  // The Update Stock screen lives at its own route (Canva "← Back to Inventory" page).
  const goToUpdate = (item: InventoryItemResource) =>
    router.push(`/sales/inventory/update?product=${item.product_id}${item.product_variant_id ? `&variant=${item.product_variant_id}` : ""}`);

  const items = useInventoryItems({
    search: debouncedSearch || undefined,
    category_id: categoryId ? Number(categoryId) : undefined,
    stock_status: stockStatus || undefined,
    type: type || undefined,
    sort,
    page,
    per_page: 15,
  });
  const summary = useInventorySummary();
  const categories = useProductCategories();
  const lowStock = useInventoryItems({ stock_status: "low_stock", sort: "available_asc", per_page: 5 });
  const movements = useInventoryLogs({ sort: "newest", per_page: 5 });

  const rows = useMemo(() => items.data?.data ?? [], [items.data]);
  const hasFilters = Boolean(search || categoryId || stockStatus || type);
  const resetPage = () => setPage(1);

  const exportCsv = () => {
    if (!rows.length) return;
    const header = ["Name", "SKU", "Type", "Category", "On hand", "Reserved", "Available", "Status"];
    const body = rows.map((row) => [
      row.name,
      row.sku,
      row.item_type,
      row.category?.name ?? "",
      row.on_hand,
      row.reserved,
      row.available,
      STOCK_STATUS_META[row.stock_status].label,
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Catalogue"
        title="Inventory"
        description="Manage your stock levels, track inventory movements, and ensure product availability."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total items"
          value={summary.data?.total_items}
          sub={summary.data ? `${summary.data.total_skus} SKUs` : undefined}
          icon={<Boxes className="h-4 w-4" />}
          isPending={summary.isPending}
        />
        <MetricCard
          label="In stock"
          value={summary.data?.in_stock}
          sub={percentOf(summary.data?.in_stock, summary.data?.total_items)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="success"
        />
        <MetricCard
          label="Low stock"
          value={summary.data?.low_stock}
          sub={percentOf(summary.data?.low_stock, summary.data?.total_items)}
          icon={<AlertTriangle className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="warning"
        />
        <MetricCard
          label="Out of stock"
          value={summary.data?.out_of_stock}
          sub={percentOf(summary.data?.out_of_stock, summary.data?.total_items)}
          icon={<PackageX className="h-4 w-4" />}
          isPending={summary.isPending}
          tone="danger"
        />
      </div>


      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-none bg-white/95">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <Field label="Search" htmlFor="inventory-search" className="min-w-56 flex-1">
                <Input
                  id="inventory-search"
                  placeholder="Name, SKU, brand or colour"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </Field>
              <Field label="Category" htmlFor="inventory-category">
                <SelectInput
                  id="inventory-category"
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
              <Field label="Stock status" htmlFor="inventory-stock-status">
                <SelectInput
                  id="inventory-stock-status"
                  className="w-full lg:w-40"
                  value={stockStatus}
                  onChange={(event) => {
                    setStockStatus(event.target.value as ProductStockStatus | "");
                    resetPage();
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </SelectInput>
              </Field>
              <Field label="Type" htmlFor="inventory-type">
                <SelectInput
                  id="inventory-type"
                  className="w-full lg:w-36"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as "" | "product" | "variant");
                    resetPage();
                  }}
                >
                  <option value="">All items</option>
                  <option value="product">Products</option>
                  <option value="variant">Variants</option>
                </SelectInput>
              </Field>
              <Field label="Sort" htmlFor="inventory-sort">
                <SelectInput
                  id="inventory-sort"
                  className="w-full lg:w-48"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as InventoryItemSort);
                    resetPage();
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setCategoryId("");
                    setStockStatus("");
                    setType("");
                    resetPage();
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Clear filters
                </Button>
              ) : null}
            </div>

            {items.isPending ? <LoadingState label="Loading inventory…" /> : null}
            {items.isError ? (
              <ErrorState error={items.error} title="Unable to load inventory" onRetry={() => void items.refetch()} />
            ) : null}
            {items.data && rows.length === 0 ? (
              <EmptyState
                title="No inventory items found"
                description={hasFilters ? "No items match these filters." : "Add products to start tracking stock."}
              />
            ) : null}

            {rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <caption className="sr-only">Inventory items</caption>
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Product</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">SKU</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Category</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Stock</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Reserved</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Available</th>
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">Status</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr key={row.id} className="align-middle hover:bg-slate-50/70">
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left"
                              onClick={() => setDetailProductId(row.product_id)}
                              aria-label={`View inventory details for ${row.name}`}
                            >
                              {row.image ? (
                                <ProductImage path={row.image} alt={row.name} className="h-10 w-10 shrink-0" />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" aria-hidden />
                              )}
                              <span className="min-w-0">
                                <span className="block font-semibold text-slate-900">{row.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {row.item_type === "variant" && row.variant
                                    ? [row.variant.color, row.variant.size].filter(Boolean).join(" / ") || "Variant"
                                    : row.brand ?? "Base product"}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{row.sku}</td>
                          <td className="px-3 py-3 text-slate-700">{row.category?.name ?? "—"}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">{row.on_hand}</td>
                          <td className="px-3 py-3 text-right text-amber-700">{row.reserved}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">{row.available}</td>
                          <td className="px-3 py-3">
                            <StockStatusPill status={row.stock_status} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setDetailProductId(row.product_id)}>
                                Details
                              </Button>
                              <Button size="sm" onClick={() => goToUpdate(row)}>
                                Update
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={items.data?.meta} onPageChange={setPage} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className="space-y-6" aria-label="Inventory overview">
          <InventoryOverview summary={summary.data} isPending={summary.isPending} />
          <LowStockPanel query={lowStock} onUpdate={goToUpdate} />
          <RecentMovementsPanel query={movements} />
        </aside>
      </div>

      {detailProductId ? (
        <Modal open wide title="Inventory details" onClose={() => setDetailProductId(null)}>
          <InventoryDetails
            productId={detailProductId}
            onUpdate={(item) => {
              setDetailProductId(null);
              goToUpdate(item);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function StockStatusPill({ status }: { status: ProductStockStatus }) {
  const meta = STOCK_STATUS_META[status];
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

function MovementBadge({ type }: { type: string | null | undefined }) {
  const meta = (type && MOVEMENT_META[type]) || { label: humanize(type), className: "bg-slate-100 text-slate-600" };
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

function percentOf(value: number | undefined, total: number | undefined): string | undefined {
  if (value === undefined || !total) return undefined;
  return `${Math.round((value / total) * 100)}% of total`;
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  isPending,
  tone = "brand",
}: {
  label: string;
  value: number | undefined;
  sub?: string;
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
          <p className="text-xl font-bold text-navy-900">{isPending && value === undefined ? "…" : (value ?? "—")}</p>
          {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryOverview({ summary, isPending }: { summary: ReturnType<typeof useInventorySummary>["data"]; isPending: boolean }) {
  const segments = summary
    ? [
        { key: "in_stock", label: "In Stock", value: summary.in_stock, color: "#16a34a" },
        { key: "low_stock", label: "Low Stock", value: summary.low_stock, color: "#f59e0b" },
        { key: "out_of_stock", label: "Out of Stock", value: summary.out_of_stock, color: "#dc2626" },
        { key: "reserved", label: "Reserved items", value: summary.reserved_items, color: "#7c3aed" },
      ]
    : [];
  const hasData = segments.some((segment) => segment.value > 0);

  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-navy-900">Inventory overview</h2>
        {isPending && !summary ? (
          <LoadingState label="Loading overview…" />
        ) : !summary ? (
          <p className="mt-4 text-sm text-muted-foreground">No overview data.</p>
        ) : (
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0">
              {hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={segments} dataKey="value" nameKey="label" innerRadius={44} outerRadius={60} paddingAngle={2} stroke="none">
                      {segments.map((segment) => (
                        <Cell key={segment.key} fill={segment.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border-8 border-slate-100" aria-hidden />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-navy-900">{summary.total_items}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm">
              {segments.map((segment) => (
                <li key={segment.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden />
                    {segment.label}
                  </span>
                  <span className="font-semibold text-slate-900">{segment.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary ? (
          <p className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">Inventory value</span>
            <span className="font-semibold text-slate-900">{formatMoney(summary.inventory_value)}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LowStockPanel({
  query,
  onUpdate,
}: {
  query: ReturnType<typeof useInventoryItems>;
  onUpdate: (item: InventoryItemResource) => void;
}) {
  const rows = query.data?.data ?? [];
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Low stock items
        </h2>
        {query.isPending ? (
          <LoadingState label="Loading…" />
        ) : rows.length === 0 ? (
          <p className="mt-3 rounded-xl bg-green-50 px-3 py-4 text-center text-sm text-green-700">All items are above their thresholds.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.sku} · {row.available} left / {row.low_stock_threshold} min
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onUpdate(row)}>
                  Restock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentMovementsPanel({ query }: { query: ReturnType<typeof useInventoryLogs> }) {
  const rows = query.data?.data ?? [];
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <ArrowLeftRight className="h-4 w-4 text-brand-600" />
          Recent stock movements
        </h2>
        {query.isPending ? (
          <LoadingState label="Loading…" />
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No stock movements yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((log) => (
              <li key={log.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{log.product?.name ?? `Product #${log.product_id}`}</p>
                  <span className={cn("font-semibold", log.quantity_change > 0 ? "text-green-700" : "text-red-700")}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <MovementBadge type={log.type} />
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InventoryDetails({ productId, onUpdate }: { productId: number; onUpdate: (item: InventoryItemResource) => void }) {
  const detail = useInventoryProduct(productId);

  if (detail.isPending) return <LoadingState label="Loading inventory details…" />;
  if (detail.isError) return <ErrorState error={detail.error} title="Unable to load details" onRetry={() => void detail.refetch()} />;
  if (!detail.data) return <EmptyState title="No details available" />;

  const { product, items, recent_movements: movements } = detail.data;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        {product.images?.[0] ? (
          <ProductImage path={product.images[0]} alt={product.name} className="h-16 w-16 shrink-0" />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-900">{product.name}</p>
          <p className="text-sm text-muted-foreground">
            SKU {product.sku}
            {product.category?.name ? ` · ${product.category.name}` : ""}
            {product.brand ? ` · ${product.brand}` : ""}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Layers className="h-4 w-4 text-brand-600" />
          Stock pools
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/90">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-600">Pool</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-600">SKU</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">On hand</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Reserved</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Available</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-slate-700">
                    {item.item_type === "variant" && item.variant
                      ? [item.variant.color, item.variant.size].filter(Boolean).join(" / ") || "Variant"
                      : "Base product"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{item.sku}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{item.on_hand}</td>
                  <td className="px-3 py-2 text-right text-amber-700">{item.reserved}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{item.available}</td>
                  <td className="px-3 py-2"><StockStatusPill status={item.stock_status} /></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => onUpdate(item)}>
                      Update
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent movements</h3>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock movements recorded for this product.</p>
        ) : (
          <ul className="space-y-2">
            {movements.map((log: InventoryLogResource) => (
              <li key={log.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MovementBadge type={log.type} />
                    <span className="text-slate-700">{log.reason}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.variant ? `${log.variant.sku} · ` : ""}
                    Stock {log.resulting_stock}
                    {log.reference_number ? ` · ${log.reference_number}` : ""}
                    {log.user?.name ? ` · ${log.user.name}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={cn("font-semibold", log.quantity_change > 0 ? "text-green-700" : "text-red-700")}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </span>
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
