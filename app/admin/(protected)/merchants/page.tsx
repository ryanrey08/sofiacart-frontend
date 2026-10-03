"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Ban, Clock3, Eye, RotateCcw, Store, Users } from "lucide-react";
import { MERCHANT_STATUSES, merchantStatusLabel } from "@/components/admin/merchant-status-form";
import { RequirePermission } from "@/components/admin/require-permission";
import {
  AdminTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconAction,
  LoadingState,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  SelectInput,
  StatCard,
  StatGrid,
  StatusPill,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMerchants, fetchMerchantSummary } from "@/lib/api/admin";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "orders_desc", label: "Most orders" },
  { value: "products_desc", label: "Most products" },
  { value: "collected_desc", label: "Most collected" },
];

const EMPTY_FILTERS = { search: "", status: "", store_category: "", date_from: "", date_to: "", sort: "newest" };

export default function AdminMerchantsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.MERCHANTS_VIEW}>
      <MerchantList />
    </RequirePermission>
  );
}

function MerchantList() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search);
  const invalidRange = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const params = { ...filters, search: debouncedSearch, page, per_page: 10 };

  const summary = useQuery({ queryKey: ["admin", "merchants", "summary"], queryFn: fetchMerchantSummary });
  const query = useQuery({
    queryKey: ["admin", "merchants", "list", params],
    queryFn: () => fetchMerchants(params),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const counts = summary.data?.by_status;

  return (
    <div className="space-y-5">
      <PageHeader icon={Store} title="Merchants" description="View and manage all merchants registered on the platform." />

      <StatGrid>
        <StatCard icon={Store} tone="purple" label="Total Merchants" value={summary.data?.total.toLocaleString() ?? "—"} loading={summary.isPending} />
        <StatCard icon={Users} tone="green" label="Active (Approved)" value={counts?.verified.toLocaleString() ?? "—"} loading={summary.isPending} />
        <StatCard
          icon={Clock3}
          tone="amber"
          label="Pending Approval"
          value={counts ? (counts.pending + counts.information_requested).toLocaleString() : "—"}
          hint={counts ? `${counts.information_requested} awaiting merchant info` : undefined}
          loading={summary.isPending}
        />
        <StatCard icon={Ban} tone="red" label="Suspended" value={counts?.suspended.toLocaleString() ?? "—"} loading={summary.isPending} />
      </StatGrid>
      {summary.isError ? <ErrorState error={summary.error} title="Merchant totals unavailable" onRetry={() => void summary.refetch()} /> : null}

      <Panel icon={Store} title="Merchants List" description="Search, filter and sort merchants. Open a merchant to review its store, catalog and finances.">
        <FilterBar bare>
          <SearchField
            id="merchant-search"
            value={filters.search}
            onChange={(value) => update("search", value)}
            placeholder="Search store, business, owner, email or TIN…"
          />
          <Field label="Status" htmlFor="merchant-status-filter">
            <SelectInput id="merchant-status-filter" value={filters.status} onChange={(event) => update("status", event.target.value)}>
              <option value="">All Status</option>
              {MERCHANT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {merchantStatusLabel(value)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Category" htmlFor="merchant-category-filter">
            <SelectInput id="merchant-category-filter" value={filters.store_category} onChange={(event) => update("store_category", event.target.value)}>
              <option value="">All Categories</option>
              {summary.data?.store_categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Joined from" htmlFor="merchant-from">
            <Input id="merchant-from" type="date" value={filters.date_from} onChange={(event) => update("date_from", event.target.value)} />
          </Field>
          <Field label="Joined to" htmlFor="merchant-to">
            <Input id="merchant-to" type="date" value={filters.date_to} hasError={invalidRange} onChange={(event) => update("date_to", event.target.value)} />
          </Field>
          <Field label="Sort" htmlFor="merchant-sort">
            <SelectInput id="merchant-sort" value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Button
            variant="outline"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </FilterBar>
        {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}

        {query.isPending && !invalidRange ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
        {query.data && query.data.data.length === 0 ? <EmptyState description="Try adjusting the search or filters." /> : null}
        {query.data && query.data.data.length > 0 ? (
          <>
            <AdminTable
              bare
              caption="Merchants"
              rows={query.data.data}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: "index",
                  header: "#",
                  render: (row) => <span className="text-slate-500">{(query.data.meta.from ?? 1) + query.data.data.indexOf(row)}</span>,
                },
                {
                  key: "store",
                  header: "Merchant",
                  render: (row) => (
                    <Link href={`/admin/merchants/${row.id}`} className="flex items-center gap-3 whitespace-nowrap">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                        {row.store_name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy-900 hover:text-brand-700">{row.store_name}</span>
                        <span className="block max-w-40 truncate text-xs text-muted-foreground">{row.store_slug ?? "—"}</span>
                      </span>
                    </Link>
                  ),
                },
                { key: "category", header: "Category", render: (row) => <span className="whitespace-nowrap">{row.store_category ?? "—"}</span> },
                {
                  key: "owner",
                  header: "Owner / Contact",
                  render: (row) => (
                    <div className="whitespace-nowrap">
                      <p className="text-navy-900">{row.owner_name ?? row.user?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{row.contact_phone ?? row.owner_phone ?? "—"}</p>
                    </div>
                  ),
                },
                { key: "email", header: "Email", render: (row) => row.user?.email ?? row.contact_email ?? "—" },
                { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
                {
                  key: "activity",
                  header: "Products / Orders",
                  render: (row) => (
                    <span className="whitespace-nowrap">
                      {row.products_count ?? 0} / {row.orders_count ?? 0}
                    </span>
                  ),
                },
                { key: "collected", header: "Collected", render: (row) => formatMoney(row.payments_sum_amount) },
                { key: "created", header: "Joined Date", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
                {
                  key: "actions",
                  header: <span className="sr-only">Actions</span>,
                  render: (row) => <IconAction icon={Eye} label={`View ${row.store_name}`} href={`/admin/merchants/${row.id}`} />,
                },
              ]}
            />
            <Pagination meta={query.data.meta} onPageChange={setPage} noun="merchants" />
          </>
        ) : null}
      </Panel>
    </div>
  );
}
