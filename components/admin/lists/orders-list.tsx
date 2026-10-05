"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Notice,
  Pagination,
  SearchField,
  SelectInput,
  StatusPill,
  statusLabel,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchOrder, fetchOrders, updateOrderStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS, ORDER_STATUS_TRANSITIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import type { AdminOrder, OrderStatus } from "@/types/admin";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "out_for_delivery", "completed", "cancelled"];
export const ORDER_PAYMENT_STATUSES = ["unpaid", "paid", "partially_refunded", "refunded"];

const EMPTY_FILTERS = { search: "", merchant_id: "", status: "", payment_status: "", date_from: "", date_to: "" };

// Platform-wide orders (GET /api/admin/orders). Pass `merchantId` to scope to one merchant.
export function OrdersList({ merchantId, customerId }: { merchantId?: number; customerId?: number }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);
  const invalidRange = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const params = {
    ...filters,
    search: debouncedSearch,
    merchant_id: merchantId ?? filters.merchant_id,
    customer_id: customerId,
    page,
    per_page: 10,
  };

  const query = useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: () => fetchOrders(params),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <FilterBar bare>
        <SearchField id="order-search" value={filters.search} onChange={(value) => update("search", value)} placeholder="Order number or customer name…" />
        {merchantId ? null : <MerchantFilter id="order-merchant" value={filters.merchant_id} onChange={(value) => update("merchant_id", value)} />}
        <Field label="Order status" htmlFor="order-status">
          <SelectInput id="order-status" value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">All</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Payment" htmlFor="order-payment-status">
          <SelectInput id="order-payment-status" value={filters.payment_status} onChange={(event) => update("payment_status", event.target.value)}>
            <option value="">All</option>
            {ORDER_PAYMENT_STATUSES.map((value) => (
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
          <Input id="order-to" type="date" value={filters.date_to} hasError={invalidRange} onChange={(event) => update("date_to", event.target.value)} />
        </Field>
        <Button variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </FilterBar>
      {invalidRange ? <p className="mb-3 text-sm text-red-600">The end date must be on or after the start date.</p> : null}

      {query.isPending && !invalidRange ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No orders match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption="Orders"
            rows={query.data.data}
            rowKey={(row) => row.id}
            selectedKey={openId}
            columns={[
              { key: "number", header: "Order No.", className: "whitespace-nowrap", render: (row) => <span className="font-semibold text-brand-700">{row.order_number}</span> },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminOrder) => <MerchantCell merchant={row.merchant} merchantId={row.merchant_id} /> }]),
              { key: "customer", header: "Customer", render: (row) => row.customer?.name ?? "—" },
              { key: "items", header: "Items", render: (row) => row.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? "—" },
              { key: "total", header: "Total", className: "whitespace-nowrap", render: (row) => <span className="font-semibold text-navy-900">{formatMoney(row.total_amount)}</span> },
              { key: "payment", header: "Payment", className: "whitespace-nowrap", render: (row) => <StatusPill status={row.payment_status} /> },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "ordered", header: "Ordered", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.ordered_at)}</span> },
              {
                key: "actions",
                header: <span className="sr-only">Actions</span>,
                render: (row) => <IconAction icon={Eye} label={`View order ${row.order_number}`} onClick={() => setOpenId(row.id)} />,
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="orders" />
        </>
      ) : null}

      <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function OrderDrawer({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const order = useQuery({
    queryKey: ["admin", "orders", "detail", orderId],
    queryFn: () => fetchOrder(orderId!),
    enabled: orderId !== null,
  });
  const data = order.data;

  return (
    <Drawer
      open={orderId !== null}
      onClose={onClose}
      title={data ? `Order ${data.order_number}` : "Order details"}
      subtitle={
        data ? (
          <span className="flex flex-wrap gap-2">
            <StatusPill status={data.status} />
            <StatusPill status={data.payment_status} />
          </span>
        ) : undefined
      }
    >
      {order.isPending ? <LoadingState /> : null}
      {order.isError ? <ErrorState error={order.error} onRetry={() => void order.refetch()} /> : null}
      {data ? <OrderDetail order={data} /> : null}
    </Drawer>
  );
}

function OrderDetail({ order }: { order: AdminOrder }) {
  return (
    <>
      <DetailList
        items={[
          { label: "Merchant", value: <MerchantCell merchant={order.merchant} merchantId={order.merchant_id} /> },
          { label: "Customer", value: order.customer ? `${order.customer.name}${order.customer.email ? ` · ${order.customer.email}` : ""}` : "—" },
          { label: "Ordered", value: formatDateTime(order.ordered_at) },
          { label: "Last updated", value: formatDateTime(order.updated_at) },
          { label: "Shipping address", value: order.shipping_address ?? "—" },
          { label: "Stock restored", value: order.inventory_restored ? "Yes" : "No" },
        ]}
      />

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-navy-900">Items</h3>
        {order.items && order.items.length > 0 ? (
          <AdminTable
            caption="Order items"
            rows={order.items}
            rowKey={(item) => item.id}
            columns={[
              { key: "product", header: "Product", render: (item) => <div><p className="font-medium text-navy-900">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.sku ?? "—"}</p></div> },
              { key: "qty", header: "Qty", render: (item) => item.quantity },
              { key: "unit", header: "Unit price", render: (item) => formatMoney(item.unit_price) },
              { key: "total", header: "Total", className: "whitespace-nowrap", render: (item) => formatMoney(item.total_price) },
            ]}
          />
        ) : (
          <EmptyState title="No items" />
        )}
        <dl className="ml-auto max-w-xs space-y-1 text-sm">
          {[
            ["Subtotal", order.subtotal],
            ["Discount", order.discount_amount],
            ["Shipping", order.shipping_amount],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{formatMoney(value as string)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-navy-900">
            <dt>Total</dt>
            <dd>{formatMoney(order.total_amount)}</dd>
          </div>
        </dl>
      </section>

      {order.notes ? (
        <section className="space-y-1">
          <h3 className="text-sm font-bold text-navy-900">Notes</h3>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{order.notes}</p>
        </section>
      ) : null}

      <Can permission={ADMIN_PERMISSIONS.ORDERS_MANAGE}>
        <OrderStatusAction order={order} />
      </Can>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-navy-900">Payments</h3>
        {order.payments && order.payments.length > 0 ? (
          <ul className="space-y-2">
            {order.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium">{payment.reference}</span>
                <span className="text-muted-foreground">{humanize(payment.method ?? payment.gateway ?? "—")}</span>
                <span>{formatMoney(payment.amount)}</span>
                <StatusPill status={payment.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-navy-900">Refunds</h3>
        {order.refunds && order.refunds.length > 0 ? (
          <ul className="space-y-2">
            {order.refunds.map((refund) => (
              <li key={refund.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium">{refund.reference}</span>
                <span className="text-muted-foreground">{refund.reason ?? "—"}</span>
                <span>{formatMoney(refund.amount)}</span>
                <StatusPill status={refund.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No refunds recorded.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-navy-900">Return requests</h3>
        {order.return_requests && order.return_requests.length > 0 ? (
          <ul className="space-y-2">
            {order.return_requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium">Return #{request.id}</span>
                <span className="text-muted-foreground">{request.reason}</span>
                <span>{formatMoney(request.amount)}</span>
                <StatusPill status={request.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No return requests.</p>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        The API does not keep a per-status order timeline; status changes made here are recorded in System Logs.
      </p>
    </>
  );
}

function OrderStatusAction({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const transitions = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  const [choice, setChoice] = useState(transitions[0] ?? "");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const next = transitions.includes(choice) ? choice : (transitions[0] ?? "");
  const mutation = useMutation({
    mutationFn: () => updateOrderStatus(order.id, next as OrderStatus),
    onSuccess: async (updated) => {
      setNotice({ tone: "success", text: `Order ${updated.order_number} is now ${statusLabel(updated.status)}.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <section className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <h3 className="text-sm font-bold text-navy-900">Update order status</h3>
      {transitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{statusLabel(order.status)} is a final status.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="New status" htmlFor={`order-next-${order.id}`}>
            <SelectInput id={`order-next-${order.id}`} value={next} onChange={(event) => setChoice(event.target.value)}>
              {transitions.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Save status"}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Orders must go out for delivery before they can be completed, and completing requires a paid order; cancelling requires an unpaid or fully refunded order (enforced by the API).</p>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}
