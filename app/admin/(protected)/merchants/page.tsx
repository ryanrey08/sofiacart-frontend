"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MERCHANT_STATUSES } from "@/components/admin/merchant-status-form";
import { RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, PageHeader, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { fetchMerchants } from "@/lib/api/admin";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";

export default function AdminMerchantsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.MERCHANTS_VIEW}>
      <MerchantList />
    </RequirePermission>
  );
}

function MerchantList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, status, page, per_page: 15 };

  const query = useQuery({
    queryKey: ["admin", "merchants", "list", params],
    queryFn: () => fetchMerchants(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Merchants" description="All merchants registered on the platform." />
      <FilterBar>
        <Field label="Search" htmlFor="merchant-search" className="min-w-64 flex-1">
          <Input
            id="merchant-search"
            placeholder="Store, business, slug, TIN or owner email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Status" htmlFor="merchant-status-filter">
          <SelectInput
            id="merchant-status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {MERCHANT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="Try adjusting the search or status filter." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Merchants"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "store",
                header: "Store",
                render: (row) => (
                  <Link href={`/admin/merchants/${row.id}`} className="font-semibold text-brand-700 hover:underline">
                    {row.store_name}
                  </Link>
                ),
              },
              { key: "business", header: "Business", render: (row) => row.business_name ?? "—" },
              { key: "owner", header: "Owner", render: (row) => row.user?.email ?? row.owner_email ?? "—" },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "orders", header: "Orders", render: (row) => row.orders_count ?? "—" },
              { key: "products", header: "Products", render: (row) => row.products_count ?? "—" },
              { key: "collected", header: "Collected", render: (row) => formatMoney(row.payments_sum_amount) },
              { key: "created", header: "Registered", render: (row) => formatDateTime(row.created_at) },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
