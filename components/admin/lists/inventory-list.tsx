"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, Lock, PackageX, RotateCcw } from "lucide-react";
import { MerchantFilter, useMerchantNames } from "@/components/admin/merchant-filter";
import {
  AdminTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  LoadingState,
  MerchantCell,
  Pagination,
  SearchField,
  SelectInput,
  StatCard,
  StatGrid,
  StatusPill,
  Tabs,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchInventoryItems, fetchInventoryLogs, fetchInventorySummary } from "@/lib/api/admin";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { cn } from "@/lib/utils";
import type { AdminInventoryItem, AdminInventoryLog } from "@/types/admin";

const STOCK_LABELS: Record<string, string> = { active: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" };
const SORTS = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "available_asc", label: "Least available" },
  { value: "available_desc", label: "Most available" },
  { value: "reserved_desc", label: "Most reserved" },
  { value: "updated_desc", label: "Recently updated" },
];

type View = "stock" | "movements";

// Platform-wide stock pools and movements (InventoryController). Figures (on hand, reserved,
// available, stock status) are computed by the backend InventoryService, not in the browser.
export function InventoryOverview({ merchantId }: { merchantId?: number }) {
  const [view, setView] = useState<View>("stock");
  const [merchantFilter, setMerchantFilter] = useState("");
  const scopedMerchant = merchantId ? String(merchantId) : merchantFilter;
  const summary = useQuery({
    queryKey: ["admin", "inventory", "summary", scopedMerchant],
    queryFn: () => fetchInventorySummary({ merchant_id: scopedMerchant }),
  });

  return (
    <div className="space-y-5">
      <StatGrid>
        <StatCard icon={Boxes} tone="purple" label="Stock items" value={summary.data?.total_items.toLocaleString() ?? "—"} hint={summary.data ? `${summary.data.total_available.toLocaleString()} units available` : undefined} loading={summary.isPending} />
        <StatCard icon={Lock} tone="blue" label="Reserved units" value={summary.data?.total_reserved.toLocaleString() ?? "—"} hint="Held by pending / processing orders" loading={summary.isPending} />
        <StatCard icon={AlertTriangle} tone="amber" label="Low stock" value={summary.data?.low_stock.toLocaleString() ?? "—"} loading={summary.isPending} />
        <StatCard icon={PackageX} tone="red" label="Out of stock" value={summary.data?.out_of_stock.toLocaleString() ?? "—"} loading={summary.isPending} />
      </StatGrid>
      {summary.isError ? <ErrorState error={summary.error} title="Inventory totals unavailable" onRetry={() => void summary.refetch()} /> : null}

      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <div className="px-4 sm:px-5">
          <Tabs
            label="Inventory views"
            tabs={[
              { id: "stock", label: "Stock levels", icon: Boxes },
              { id: "movements", label: "Movement history", icon: RotateCcw },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
        <div className="p-4 sm:p-5">
          {view === "stock" ? (
            <StockTable merchantId={merchantId} merchantFilter={merchantFilter} onMerchantChange={setMerchantFilter} />
          ) : (
            <MovementTable merchantId={merchantId} merchantFilter={merchantFilter} onMerchantChange={setMerchantFilter} />
          )}
        </div>
      </div>
    </div>
  );
}

function StockTable({ merchantId, merchantFilter, onMerchantChange }: { merchantId?: number; merchantFilter: string; onMerchantChange: (value: string) => void }) {
  const [filters, setFilters] = useState({ search: "", stock_status: "", type: "", sort: "name_asc" });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search);
  const merchantName = useMerchantNames();
  const params = { ...filters, search: debouncedSearch, merchant_id: merchantId ?? merchantFilter, page, per_page: 15 };
  const query = useQuery({ queryKey: ["admin", "inventory", "items", params], queryFn: () => fetchInventoryItems(params), placeholderData: keepPreviousData });

  const update = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <FilterBar bare>
        <SearchField id="inventory-search" value={filters.search} onChange={(value) => update("search", value)} placeholder="Product, SKU, brand, category, color or size…" />
        {merchantId ? null : (
          <MerchantFilter
            id="inventory-merchant"
            value={merchantFilter}
            onChange={(value) => {
              onMerchantChange(value);
              setPage(1);
            }}
          />
        )}
        <Field label="Stock" htmlFor="inventory-stock">
          <SelectInput id="inventory-stock" value={filters.stock_status} onChange={(event) => update("stock_status", event.target.value)}>
            <option value="">All</option>
            {Object.entries(STOCK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Type" htmlFor="inventory-type">
          <SelectInput id="inventory-type" value={filters.type} onChange={(event) => update("type", event.target.value)}>
            <option value="">Products & variants</option>
            <option value="product">Products</option>
            <option value="variant">Variants</option>
          </SelectInput>
        </Field>
        <Field label="Sort" htmlFor="inventory-sort">
          <SelectInput id="inventory-sort" value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No stock items match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption="Inventory stock levels"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "item",
                header: "Item",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-navy-900">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.sku}
                      {row.variant ? ` · ${[row.variant.color, row.variant.size].filter(Boolean).join(" / ")}` : ""}
                    </p>
                  </div>
                ),
              },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminInventoryItem) => <MerchantCell merchant={merchantName(row.merchant_id)} merchantId={row.merchant_id} /> }]),
              { key: "category", header: "Category", render: (row) => row.category?.name ?? "—" },
              { key: "on_hand", header: "On hand", render: (row) => row.on_hand },
              { key: "reserved", header: "Reserved", render: (row) => row.reserved },
              { key: "available", header: "Available", render: (row) => <span className={cn("font-semibold", row.available <= 0 ? "text-red-600" : "text-navy-900")}>{row.available}</span> },
              { key: "threshold", header: "Low at", render: (row) => (row.track_inventory ? row.low_stock_threshold : "Not tracked") },
              { key: "status", header: "Stock status", render: (row) => <StatusPill status={row.stock_status === "active" ? "in_stock" : row.stock_status} label={STOCK_LABELS[row.stock_status]} /> },
              { key: "value", header: "Value", render: (row) => (row.inventory_value ? formatMoney(row.inventory_value) : "—") },
              { key: "updated", header: "Updated", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.updated_at)}</span> },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="items" />
        </>
      ) : null}
    </>
  );
}

function MovementTable({ merchantId, merchantFilter, onMerchantChange }: { merchantId?: number; merchantFilter: string; onMerchantChange: (value: string) => void }) {
  const [filters, setFilters] = useState({ search: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search);
  const merchantName = useMerchantNames();
  const invalidRange = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const params = { ...filters, search: debouncedSearch, merchant_id: merchantId ?? merchantFilter, page, per_page: 15 };
  const query = useQuery({
    queryKey: ["admin", "inventory", "logs", params],
    queryFn: () => fetchInventoryLogs(params),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });

  const update = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <FilterBar bare>
        <SearchField id="movement-search" value={filters.search} onChange={(value) => update("search", value)} placeholder="Product, SKU or reference…" />
        {merchantId ? null : (
          <MerchantFilter
            id="movement-merchant"
            value={merchantFilter}
            onChange={(value) => {
              onMerchantChange(value);
              setPage(1);
            }}
          />
        )}
        <Field label="From" htmlFor="movement-from">
          <Input id="movement-from" type="date" value={filters.date_from} onChange={(event) => update("date_from", event.target.value)} />
        </Field>
        <Field label="To" htmlFor="movement-to">
          <Input id="movement-to" type="date" value={filters.date_to} hasError={invalidRange} onChange={(event) => update("date_to", event.target.value)} />
        </Field>
        <Button variant="outline" onClick={() => { setFilters({ search: "", date_from: "", date_to: "" }); setPage(1); }}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </FilterBar>
      {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}

      {query.isPending && !invalidRange ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No stock movements match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption="Inventory movements"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              { key: "date", header: "Date", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
              {
                key: "product",
                header: "Product",
                render: (row) => (
                  <div>
                    <p className="font-medium text-navy-900">{row.product?.name ?? `Product #${row.product_id}`}</p>
                    <p className="text-xs text-muted-foreground">{row.variant?.sku ?? row.product?.sku ?? "—"}</p>
                  </div>
                ),
              },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminInventoryLog) => <MerchantCell merchant={merchantName(row.merchant_id)} merchantId={row.merchant_id} /> }]),
              { key: "type", header: "Type", render: (row) => humanize(row.type ?? "adjustment") },
              {
                key: "change",
                header: "Change",
                render: (row) => (
                  <span className={cn("font-semibold", row.quantity_change >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
                  </span>
                ),
              },
              { key: "result", header: "Resulting stock", render: (row) => row.resulting_stock },
              { key: "reason", header: "Reason", render: (row) => humanize(row.reason) },
              { key: "reference", header: "Reference", render: (row) => row.reference_number ?? "—" },
              { key: "user", header: "By", render: (row) => row.user?.name ?? "System" },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="movements" />
        </>
      ) : null}
    </>
  );
}
