"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Eye, RotateCcw } from "lucide-react";
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
  Pagination,
  SearchField,
  SelectInput,
  StatusPill,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fetchCustomer, fetchCustomers, fetchPayments, fetchRefunds } from "@/lib/api/admin";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminCustomer } from "@/types/admin";

const EMPTY_FILTERS = { search: "", merchant_id: "", status: "" };

// Customers belong to merchants; the admin API masks email/phone and exposes only account-level fields.
export function CustomersList({ merchantId }: { merchantId?: number }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);
  const params = { ...filters, search: debouncedSearch, merchant_id: merchantId ?? filters.merchant_id, page, per_page: 10 };

  const query = useQuery({
    queryKey: ["admin", "customers", params],
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <FilterBar bare>
        <SearchField id="customer-search" value={filters.search} onChange={(value) => update("search", value)} placeholder="Name, email or phone…" />
        {merchantId ? null : <MerchantFilter id="customer-merchant" value={filters.merchant_id} onChange={(value) => update("merchant_id", value)} />}
        <Field label="Account status" htmlFor="customer-status">
          <SelectInput id="customer-status" value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectInput>
        </Field>
        <Button variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No customers match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption="Customers"
            rows={query.data.data}
            rowKey={(row) => row.id}
            selectedKey={openId}
            columns={[
              {
                key: "name",
                header: "Customer",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {row.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-semibold text-navy-900">{row.name}</span>
                  </div>
                ),
              },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminCustomer) => <MerchantCell merchant={row.merchant} merchantId={row.merchant_id} /> }]),
              { key: "email", header: "Email", render: (row) => row.email_masked ?? "—" },
              { key: "phone", header: "Phone", render: (row) => row.phone_masked ?? "—" },
              { key: "type", header: "Type", render: (row) => humanize(row.customer_type ?? "—") },
              { key: "orders", header: "Orders", render: (row) => row.orders_count ?? "—" },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "created", header: "Created", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
              { key: "actions", header: <span className="sr-only">Actions</span>, render: (row) => <IconAction icon={Eye} label={`View ${row.name}`} onClick={() => setOpenId(row.id)} /> },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="customers" />
        </>
      ) : null}

      <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CustomerDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin", "customers", "detail", id], queryFn: () => fetchCustomer(id!), enabled: id !== null });
  const customer = detail.data;

  return (
    <Drawer open={id !== null} onClose={onClose} title={customer?.name ?? "Customer"} subtitle={customer ? <StatusPill status={customer.status} /> : undefined}>
      {detail.isPending ? <LoadingState /> : null}
      {detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : null}
      {customer ? (
        <>
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={customer.merchant} merchantId={customer.merchant_id} /> },
              { label: "Type", value: humanize(customer.customer_type ?? "—") },
              { label: "Email", value: customer.email_masked },
              { label: "Phone", value: customer.phone_masked },
              { label: "Orders", value: customer.orders_count ?? 0 },
              { label: "Customer since", value: formatDateTime(customer.created_at) },
            ]}
          />
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-navy-900">Recent orders</h3>
            {customer.recent_orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="space-y-2">
                {customer.recent_orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-medium">{order.order_number}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(order.ordered_at)}</span>
                    <span>{formatMoney(order.total_amount)}</span>
                    <StatusPill status={order.status} />
                    <StatusPill status={order.payment_status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Can permission={ADMIN_PERMISSIONS.PAYMENTS_VIEW}>
            <CustomerFinance customerId={customer.id} />
          </Can>
          <p className="text-xs text-muted-foreground">Contact details are masked by the API. Product reviews are not part of the current backend.</p>
        </>
      ) : null}
    </Drawer>
  );
}

function CustomerFinance({ customerId }: { customerId: number }) {
  const payments = useQuery({ queryKey: ["admin", "payments", "customer", customerId], queryFn: () => fetchPayments({ customer_id: customerId, per_page: 5 }) });
  const refunds = useQuery({ queryKey: ["admin", "refunds", "customer", customerId], queryFn: () => fetchRefunds({ customer_id: customerId, per_page: 5 }) });

  return (
    <>
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-navy-900">Payments {payments.data ? `(${payments.data.meta.total})` : ""}</h3>
        {payments.isPending ? <LoadingState /> : null}
        {payments.isError ? <ErrorState error={payments.error} /> : null}
        {payments.data?.data.length === 0 ? <p className="text-sm text-muted-foreground">No payments.</p> : null}
        <ul className="space-y-2">
          {payments.data?.data.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium">{payment.reference}</span>
              <span className="text-muted-foreground">{humanize(payment.method ?? "—")}</span>
              <span>{formatMoney(payment.amount)}</span>
              <StatusPill status={payment.status} />
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-navy-900">Refunds {refunds.data ? `(${refunds.data.meta.total})` : ""}</h3>
        {refunds.isPending ? <LoadingState /> : null}
        {refunds.isError ? <ErrorState error={refunds.error} /> : null}
        {refunds.data?.data.length === 0 ? <p className="text-sm text-muted-foreground">No refunds.</p> : null}
        <ul className="space-y-2">
          {refunds.data?.data.map((refund) => (
            <li key={refund.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium">{refund.reference}</span>
              <span className="text-muted-foreground">{refund.reason ?? "—"}</span>
              <span>{formatMoney(refund.amount)}</span>
              <StatusPill status={refund.status} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
