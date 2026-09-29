"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MerchantBillingPanel } from "@/components/admin/merchant-billing-panel";
import { RequirePermission } from "@/components/admin/require-permission";
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, PageHeader, Pagination, StatusPill } from "@/components/admin/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchMerchants } from "@/lib/api/admin";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { cn } from "@/lib/utils";

export default function AdminMerchantBillingPage() {
  return (
    <RequirePermission permission={{ allOf: [ADMIN_PERMISSIONS.MERCHANTS_VIEW, ADMIN_PERMISSIONS.MERCHANTS_BILLING_VIEW] }}>
      <BillingContent />
    </RequirePermission>
  );
}

function BillingContent() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, page, per_page: 10 };

  const query = useQuery({
    queryKey: ["admin", "merchants", "list", params],
    queryFn: () => fetchMerchants(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Merchant billing" description="Collected payments, processed refunds, and net totals per merchant." />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <FilterBar>
            <Field label="Find merchant" htmlFor="billing-search" className="w-full">
              <Input
                id="billing-search"
                value={search}
                placeholder="Store, business, slug or TIN"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
          </FilterBar>
          {query.isPending ? <LoadingState /> : null}
          {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
          {query.data && query.data.data.length === 0 ? <EmptyState /> : null}
          {query.data && query.data.data.length > 0 ? (
            <>
              <ul className="space-y-2">
                {query.data.data.map((merchant) => (
                  <li key={merchant.id}>
                    <button
                      type="button"
                      aria-pressed={selected?.id === merchant.id}
                      onClick={() => setSelected({ id: merchant.id, name: merchant.store_name })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                        selected?.id === merchant.id ? "border-brand-400 bg-brand-50" : "border-transparent bg-white/90 hover:bg-brand-50",
                      )}
                    >
                      <span className="font-semibold text-slate-900">{merchant.store_name}</span>
                      <StatusPill status={merchant.status} />
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination meta={query.data.meta} onPageChange={setPage} />
            </>
          ) : null}
        </div>
        <Card className="border-none bg-white/90">
          <CardHeader>
            <CardTitle>{selected ? selected.name : "Select a merchant"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {selected ? <MerchantBillingPanel merchantId={selected.id} /> : <EmptyState title="No merchant selected" description="Choose a merchant to view its billing summary." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
