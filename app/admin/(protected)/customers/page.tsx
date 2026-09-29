"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, DetailList, EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, Pagination, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCustomer, fetchCustomers } from "@/lib/api/admin";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";

export default function AdminCustomersPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.CUSTOMERS_VIEW}>
      <CustomersContent />
    </RequirePermission>
  );
}

function CustomersContent() {
  const [search, setSearch] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const debouncedMerchant = useDebouncedValue(merchantId);
  const merchantInvalid = merchantId !== "" && !/^\d+$/.test(merchantId);
  const params = { search: debouncedSearch, merchant_id: /^\d+$/.test(debouncedMerchant) ? debouncedMerchant : "", page, per_page: 15 };

  const query = useQuery({
    queryKey: ["admin", "customers", params],
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Customers across all merchants. Contact details are masked by the API." />
      <FilterBar>
        <Field label="Search" htmlFor="customer-search" className="min-w-64 flex-1">
          <Input
            id="customer-search"
            placeholder="Name, email or phone"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Merchant ID" htmlFor="customer-merchant" error={merchantInvalid ? "Enter a numeric merchant ID" : undefined}>
          <Input
            id="customer-merchant"
            inputMode="numeric"
            value={merchantId}
            hasError={merchantInvalid}
            onChange={(event) => {
              setMerchantId(event.target.value.trim());
              setPage(1);
            }}
          />
        </Field>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No customers match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Customers"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              { key: "name", header: "Name", render: (row) => <span className="font-semibold">{row.name}</span> },
              { key: "merchant", header: "Merchant ID", render: (row) => row.merchant_id },
              { key: "email", header: "Email", render: (row) => row.email_masked ?? "—" },
              { key: "phone", header: "Phone", render: (row) => row.phone_masked ?? "—" },
              { key: "orders", header: "Orders", render: (row) => row.orders_count ?? "—" },
              { key: "created", header: "Created", render: (row) => formatDateTime(row.created_at) },
              {
                key: "view",
                header: "",
                render: (row) => (
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
                    View
                  </Button>
                ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}

      <Modal open={selectedId !== null} title="Customer details" onClose={() => setSelectedId(null)} wide>
        {selectedId !== null ? <CustomerDetail id={selectedId} /> : null}
      </Modal>
    </div>
  );
}

function CustomerDetail({ id }: { id: number }) {
  const query = useQuery({ queryKey: ["admin", "customers", "detail", id], queryFn: () => fetchCustomer(id) });

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const customer = query.data;
  return (
    <div className="space-y-4">
      <DetailList
        items={[
          { label: "Name", value: customer.name },
          { label: "Merchant ID", value: customer.merchant_id },
          { label: "Email", value: customer.email_masked },
          { label: "Phone", value: customer.phone_masked },
          { label: "Orders", value: customer.orders_count ?? 0 },
          { label: "Created", value: formatDateTime(customer.created_at) },
        ]}
      />
      <h3 className="text-lg font-semibold text-slate-900">Recent orders</h3>
      {customer.recent_orders.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <AdminTable
          caption="Recent customer orders"
          rows={customer.recent_orders}
          rowKey={(row) => row.id}
          columns={[
            { key: "number", header: "Order #", render: (row) => row.order_number },
            { key: "total", header: "Total", render: (row) => formatMoney(row.total_amount) },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "payment", header: "Payment", render: (row) => <StatusPill status={row.payment_status} /> },
            { key: "ordered", header: "Ordered", render: (row) => formatDateTime(row.ordered_at) },
          ]}
        />
      )}
    </div>
  );
}
