"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CircleDollarSign, CreditCard, Receipt, Store, Undo2 } from "lucide-react";
import { MerchantBillingPanel } from "@/components/admin/merchant-billing-panel";
import { RequirePermission } from "@/components/admin/require-permission";
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination, Panel, SearchField, StatCard, StatGrid, StatusPill } from "@/components/admin/ui";
import { fetchMerchants, fetchMerchantSummary, fetchPaymentSummary, fetchPlatformReport } from "@/lib/api/admin";
import { formatMoney } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { useAdminSession } from "@/components/admin/admin-session";
import { cn } from "@/lib/utils";

export default function AdminMerchantBillingPage() {
  return (
    <RequirePermission permission={{ allOf: [ADMIN_PERMISSIONS.MERCHANTS_VIEW, ADMIN_PERMISSIONS.MERCHANTS_BILLING_VIEW] }}>
      <BillingContent />
    </RequirePermission>
  );
}

function BillingContent() {
  const { can } = useAdminSession();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, page, per_page: 8, sort: "collected_desc" };

  const merchants = useQuery({ queryKey: ["admin", "merchants", "list", params], queryFn: () => fetchMerchants(params), placeholderData: keepPreviousData });
  const merchantSummary = useQuery({ queryKey: ["admin", "merchants", "summary"], queryFn: fetchMerchantSummary });
  const payments = useQuery({
    queryKey: ["admin", "payments", "summary", {}],
    queryFn: () => fetchPaymentSummary({}),
    enabled: can(ADMIN_PERMISSIONS.PAYMENTS_VIEW),
  });
  const byMerchant = useQuery({
    queryKey: ["admin", "reports", "merchant_sales", "billing-top"],
    queryFn: () => fetchPlatformReport({ type: "merchant_sales", per_page: 5 }),
    enabled: can(ADMIN_PERMISSIONS.REPORTS_VIEW),
  });
  const topRows = byMerchant.data?.data ?? [];
  const topMax = Math.max(1, ...topRows.map((row) => Number(row.total_sales ?? 0)));

  return (
    <div className="space-y-5">
      <PageHeader icon={Receipt} title="Merchant Billing" description="Collected payments, processed refunds and net totals per merchant." />

      <StatGrid>
        <StatCard icon={CreditCard} tone="purple" label="Payments this month" value={payments.data?.total_payments.toLocaleString() ?? "—"} loading={payments.isPending && payments.fetchStatus !== "idle"} hint={can(ADMIN_PERMISSIONS.PAYMENTS_VIEW) ? undefined : "Requires payments.view"} />
        <StatCard icon={CircleDollarSign} tone="green" label="Collected this month" value={payments.data ? formatMoney(payments.data.collected_amount) : "—"} loading={payments.isPending && payments.fetchStatus !== "idle"} />
        <StatCard icon={Store} tone="amber" label="Active merchants" value={merchantSummary.data?.by_status.verified.toLocaleString() ?? "—"} loading={merchantSummary.isPending} />
        <StatCard icon={Undo2} tone="red" label="Refunded this month" value={payments.data ? formatMoney(payments.data.refunded_amount) : "—"} loading={payments.isPending && payments.fetchStatus !== "idle"} />
      </StatGrid>

      {can(ADMIN_PERMISSIONS.REPORTS_VIEW) ? (
        <Panel icon={Store} title="Sales by merchant" description="Top merchants by order totals (all time), from the merchant sales report.">
          {byMerchant.isPending ? <LoadingState /> : null}
          {byMerchant.isError ? <ErrorState error={byMerchant.error} onRetry={() => void byMerchant.refetch()} /> : null}
          {byMerchant.data && topRows.length === 0 ? <EmptyState title="No sales yet" /> : null}
          <ul className="space-y-3">
            {topRows.map((row) => (
              <li key={String(row.id)} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate font-medium text-navy-900">{row.store_name}</span>
                <span className="h-3 overflow-hidden rounded-full bg-brand-50">
                  <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(Number(row.total_sales ?? 0) / topMax) * 100}%` }} />
                </span>
                <span className="whitespace-nowrap text-slate-600">
                  {row.orders_count} orders · {formatMoney(row.total_sales)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Merchants" description="Sorted by collected payments.">
          <SearchField id="billing-search" className="mb-3" value={search} placeholder="Store, business, slug or TIN…" onChange={(value) => { setSearch(value); setPage(1); }} />
          {merchants.isPending ? <LoadingState /> : null}
          {merchants.isError ? <ErrorState error={merchants.error} onRetry={() => void merchants.refetch()} /> : null}
          {merchants.data && merchants.data.data.length === 0 ? <EmptyState /> : null}
          {merchants.data && merchants.data.data.length > 0 ? (
            <>
              <ul className="space-y-2">
                {merchants.data.data.map((merchant) => (
                  <li key={merchant.id}>
                    <button
                      type="button"
                      aria-pressed={selected?.id === merchant.id}
                      onClick={() => setSelected({ id: merchant.id, name: merchant.store_name })}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                        selected?.id === merchant.id ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white hover:bg-brand-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-navy-900">{merchant.store_name}</span>
                        <span className="block text-xs text-muted-foreground">{formatMoney(merchant.payments_sum_amount)} collected</span>
                      </span>
                      <StatusPill status={merchant.status} />
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination meta={merchants.data.meta} onPageChange={setPage} noun="merchants" />
            </>
          ) : null}
        </Panel>
        <Panel icon={Receipt} title={selected ? selected.name : "Select a merchant"} description="Billing figures are derived from recorded payments and processed refunds.">
          {selected ? <MerchantBillingPanel merchantId={selected.id} /> : <EmptyState title="No merchant selected" description="Choose a merchant to view its billing summary." />}
        </Panel>
      </div>
    </div>
  );
}
