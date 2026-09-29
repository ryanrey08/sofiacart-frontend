"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Notice, PageHeader, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchOrders, updateOrderStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS, ORDER_STATUS_TRANSITIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminOrder, OrderStatus } from "@/types/admin";

const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "completed", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "paid", "partially_refunded", "refunded"];

export default function AdminOrdersPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.ORDERS_VIEW}>
      <OrdersContent />
    </RequirePermission>
  );
}

function OrdersContent() {
  const [filters, setFilters] = useState({ search: "", status: "", payment_status: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);
  const invalidRange = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const params = { ...filters, search: debouncedSearch, page, per_page: 15 };

  const query = useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: () => fetchOrders(params),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });

  const update = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Orders across every merchant storefront." />
      <FilterBar>
        <Field label="Search" htmlFor="order-search" className="min-w-56 flex-1">
          <Input id="order-search" placeholder="Order number or customer name" value={filters.search} onChange={(event) => update("search", event.target.value)} />
        </Field>
        <Field label="Status" htmlFor="order-status">
          <SelectInput id="order-status" value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">All</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Payment" htmlFor="order-payment-status">
          <SelectInput id="order-payment-status" value={filters.payment_status} onChange={(event) => update("payment_status", event.target.value)}>
            <option value="">All</option>
            {PAYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="From" htmlFor="order-from">
          <Input id="order-from" type="date" value={filters.date_from} onChange={(event) => update("date_from", event.target.value)} />
        </Field>
        <Field label="To" htmlFor="order-to">
          <Input id="order-to" type="date" value={filters.date_to} onChange={(event) => update("date_to", event.target.value)} />
        </Field>
      </FilterBar>
      {invalidRange ? <Notice tone="error">The end date must be on or after the start date.</Notice> : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No orders match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            caption="Orders"
            rows={query.data.data}
            rowKey={(row) => row.id}
            columns={[
              { key: "number", header: "Order #", render: (row) => <span className="font-semibold">{row.order_number}</span> },
              { key: "merchant", header: "Merchant ID", render: (row) => row.merchant_id },
              { key: "customer", header: "Customer", render: (row) => row.customer?.name ?? "—" },
              { key: "items", header: "Items", render: (row) => row.items?.length ?? "—" },
              { key: "total", header: "Total", render: (row) => formatMoney(row.total_amount) },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "payment", header: "Payment", render: (row) => <StatusPill status={row.payment_status} /> },
              { key: "ordered", header: "Ordered", render: (row) => formatDateTime(row.ordered_at) },
              {
                key: "actions",
                header: "Update status",
                render: (row) => (
                  <Can permission={ADMIN_PERMISSIONS.ORDERS_MANAGE} fallback={<span className="text-xs text-slate-400">View only</span>}>
                    <OrderStatusAction order={row} onResult={setNotice} />
                  </Can>
                ),
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function OrderStatusAction({ order, onResult }: { order: AdminOrder; onResult: (notice: { tone: "success" | "error"; text: string }) => void }) {
  const queryClient = useQueryClient();
  const transitions = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  const [choice, setChoice] = useState(transitions[0] ?? "");
  const next = transitions.includes(choice) ? choice : (transitions[0] ?? "");
  const mutation = useMutation({
    mutationFn: () => updateOrderStatus(order.id, next as OrderStatus),
    onSuccess: async (updated) => {
      onResult({ tone: "success", text: `Order ${updated.order_number} is now ${humanize(updated.status)}.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => onResult({ tone: "error", text: parseApiError(error).message }),
  });

  if (transitions.length === 0) return <span className="text-xs text-slate-400">Final status</span>;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`order-next-${order.id}`} className="sr-only">
        New status for order {order.order_number}
      </label>
      <SelectInput id={`order-next-${order.id}`} className="h-9" value={next} onChange={(event) => setChoice(event.target.value)}>
        {transitions.map((value) => (
          <option key={value} value={value}>
            {humanize(value)}
          </option>
        ))}
      </SelectInput>
      <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        Save
      </Button>
    </div>
  );
}
