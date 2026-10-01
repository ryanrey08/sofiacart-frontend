"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Eye, MapPin, Pencil, ShoppingBag, Trash2, X } from "lucide-react";
import { ErrorState } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { useCustomer, useCustomerOrders } from "@/lib/hooks/customers";
import {
  customerAddresses,
  customerDisplayName,
  customerInitials,
  formatCustomerAddress,
  toAmount,
} from "@/lib/merchant-customers";
import { cn } from "@/lib/utils";
import type { CustomerRecentOrder, CustomerResource, CustomerStatus, CustomerType } from "@/types/commerce";

const TYPE_VARIANT: Record<CustomerType, "info" | "warning" | "default"> = {
  regular: "default",
  vip: "warning",
  wholesale: "info",
};

export function CustomerTypeBadge({ type }: { type: CustomerType | null | undefined }) {
  if (!type) return <span className="text-slate-400">—</span>;
  return <Badge variant={TYPE_VARIANT[type] ?? "default"}>{type === "vip" ? "VIP" : humanize(type)}</Badge>;
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus | null | undefined }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const variant = status === "active" ? "success" : status === "blocked" ? "destructive" : "muted";
  return (
    <Badge variant={variant} className="gap-1.5">
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-green-600" : status === "blocked" ? "bg-red-600" : "bg-slate-500")} />
      {humanize(status)}
    </Badge>
  );
}

export function CustomerAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700", className)}>
      {customerInitials(name)}
    </span>
  );
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700";

export function CustomerActionsMenu({
  trigger,
  disabled,
  onView,
  onEdit,
  onDelete,
}: {
  trigger: ReactNode;
  disabled?: boolean;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-soft">
          {onView ? (
            <DropdownMenu.Item className={itemClass} onSelect={onView}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item className={itemClass} onSelect={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item
            className={cn(itemClass, "text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700")}
            disabled={disabled}
            onSelect={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const TABS = ["overview", "orders", "addresses", "notes"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { overview: "Overview", orders: "Orders", addresses: "Addresses", notes: "Notes" };

export function CustomerDetailsPanel({
  customerId,
  busy,
  onClose,
  onEdit,
  onDelete,
}: {
  customerId: number;
  busy: boolean;
  onClose: () => void;
  onEdit: (customer: CustomerResource) => void;
  onDelete: (customer: CustomerResource) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const query = useCustomer(customerId);
  // Real order history, only requested when the loaded customer carries no order aggregates.
  const ordersEnabled = query.isSuccess && (query.data.recent_orders == null || query.data.orders_count == null);
  const orders = useCustomerOrders(customerId, 5, ordersEnabled);

  if (query.isPending) return <DetailsSkeleton />;
  if (query.isError) {
    return (
      <Card className="border-none bg-white/95">
        <CardContent className="p-4">
          <ErrorState error={query.error} title="Unable to load customer" onRetry={() => void query.refetch()} />
        </CardContent>
      </Card>
    );
  }

  const customer = query.data;
  const name = customerDisplayName(customer);
  const recentOrders: CustomerRecentOrder[] =
    customer.recent_orders ??
    (orders.data?.data ?? []).map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      ordered_at: order.ordered_at ?? order.created_at,
    }));
  const ordersCount = customer.orders_count ?? orders.data?.meta.total ?? null;
  const totalSpent = toAmount(customer.total_spent);
  const lastOrderAt = customer.last_order_at ?? recentOrders[0]?.ordered_at ?? null;
  const ordersUnavailable = customer.recent_orders == null && orders.isError;
  const addresses = customerAddresses(customer);

  return (
    <div className="space-y-4">
      <Card className="border-none bg-white/95">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CustomerAvatar name={name} className="h-14 w-14 text-base" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate text-lg font-semibold text-navy-900">{name}</h2>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" aria-label="Close customer details" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="truncate text-sm text-muted-foreground">{customer.email ?? customer.phone ?? "No contact details"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CustomerTypeBadge type={customer.customer_type} />
                <CustomerStatusBadge status={customer.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onEdit(customer)}>
              <Pencil className="h-4 w-4" />
              Edit Customer
            </Button>
            <CustomerActionsMenu
              disabled={busy}
              onEdit={() => onEdit(customer)}
              onDelete={() => onDelete(customer)}
              trigger={
                <Button variant="outline">
                  Actions
                  <ChevronDown className="h-4 w-4" />
                </Button>
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Total Orders" value={ordersCount === null ? "—" : ordersCount.toLocaleString("en-PH")} />
            <Metric label="Total Spent" value={totalSpent === null ? "—" : formatMoney(totalSpent)} />
          </div>
          {totalSpent === null ? (
            <p className="text-xs text-muted-foreground">Lifetime spend is reported by the API and is not available for this customer yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-none bg-white/95">
        <CardContent className="p-4 sm:p-5">
          <div role="tablist" aria-label="Customer details sections" className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
            {TABS.map((item, index) => (
              <button
                key={item}
                type="button"
                role="tab"
                id={`customer-tab-${item}`}
                aria-selected={tab === item}
                aria-controls={`customer-panel-${item}`}
                tabIndex={tab === item ? 0 : -1}
                onClick={() => setTab(item)}
                onKeyDown={(event) => {
                  const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                  if (!offset) return;
                  event.preventDefault();
                  const next = TABS[(index + offset + TABS.length) % TABS.length];
                  setTab(next);
                  document.getElementById(`customer-tab-${next}`)?.focus();
                }}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
                  tab === item ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {TAB_LABELS[item]}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`customer-panel-${tab}`} aria-labelledby={`customer-tab-${tab}`} tabIndex={0}>
            {tab === "overview" ? (
              <dl className="space-y-2.5 text-sm">
                <InfoRow label="Name" value={name} />
                <InfoRow label="Email" value={customer.email ?? "—"} />
                <InfoRow label="Phone" value={customer.phone ?? "—"} />
                <InfoRow label="Birthday" value={formatBirthday(customer.birthday)} />
                <InfoRow label="Gender" value={customer.gender ? humanize(customer.gender) : "—"} />
                <InfoRow label="TIN" value={customer.tin ?? "—"} />
                <InfoRow label="Customer Type" value={<CustomerTypeBadge type={customer.customer_type} />} />
                <InfoRow label="Status" value={<CustomerStatusBadge status={customer.status} />} />
                <InfoRow label="Customer Since" value={formatDateTime(customer.created_at)} />
                <InfoRow label="Last Order" value={lastOrderAt ? formatDateTime(lastOrderAt) : "—"} />
                {customer.tags?.length ? (
                  <InfoRow
                    label="Tags"
                    value={
                      <span className="flex flex-wrap gap-1.5">
                        {customer.tags.map((tag) => (
                          <Badge key={tag} variant="muted">
                            {tag}
                          </Badge>
                        ))}
                      </span>
                    }
                  />
                ) : null}
              </dl>
            ) : null}

            {tab === "orders" ? (
              <div className="space-y-3">
                {ordersEnabled && orders.isPending ? <p className="text-sm text-muted-foreground">Loading orders…</p> : null}
                {ordersUnavailable ? (
                  <ErrorState error={orders.error} title="Unable to load orders" onRetry={() => void orders.refetch()} />
                ) : null}
                {!ordersUnavailable && recentOrders.length === 0 && !(ordersEnabled && orders.isPending) ? (
                  <p className="text-sm text-muted-foreground">This customer has no orders yet.</p>
                ) : null}
                <ul className="space-y-2">
                  {recentOrders.map((order) => {
                    const orderTotal = toAmount(order.total_amount);
                    return (
                      <li key={order.id} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/sales/orders/${order.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                            {order.order_number}
                          </Link>
                          <span className="text-sm font-semibold text-navy-900">{orderTotal === null ? "—" : formatMoney(orderTotal)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {order.ordered_at ? formatDateTime(order.ordered_at) : "Not yet placed"} · {humanize(order.status)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {ordersCount !== null && ordersCount > recentOrders.length ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShoppingBag aria-hidden="true" className="h-4 w-4" />
                    Showing the {recentOrders.length} most recent of {ordersCount.toLocaleString("en-PH")} orders.
                  </p>
                ) : null}
              </div>
            ) : null}

            {tab === "addresses" ? (
              <div className="space-y-2">
                {addresses.length === 0 ? <p className="text-sm text-muted-foreground">No address on file.</p> : null}
                {addresses.map((address, index) => {
                  const formatted = formatCustomerAddress(address);
                  const label = typeof address === "object" ? address.label : null;
                  const isDefault = typeof address === "object" ? address.is_default : index === 0;
                  return (
                    <div key={typeof address === "object" ? address.id ?? index : index} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-center gap-2">
                        <MapPin aria-hidden="true" className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-800">{label || "Address"}</span>
                        {isDefault ? <Badge variant="info">Default</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{formatted || "—"}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tab === "notes" ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{customer.notes?.trim() || "No notes for this customer."}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Birthdays carry no time component, so they are rendered as a date only. */
function formatBirthday(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-navy-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-slate-900">{value}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <Card className="border-none bg-white/95" aria-busy="true" aria-label="Loading customer details">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="h-14 w-14 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-3 w-full animate-pulse rounded bg-slate-100" />
        ))}
      </CardContent>
    </Card>
  );
}
