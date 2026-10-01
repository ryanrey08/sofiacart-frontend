"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, MoreVertical, Plus, Repeat, Search, ShoppingBag, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { AccessDenied, EmptyState, ErrorState, Field, LoadingState, Modal, Notice, SelectInput } from "@/components/admin/ui";
import { CustomerActionsMenu, CustomerAvatar, CustomerDetailsPanel, CustomerStatusBadge, CustomerTypeBadge } from "@/components/merchant/customer-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toast, type ToastMessage } from "@/components/ui/toast";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import { useCustomerList, useCustomerSummary, useDeleteCustomer } from "@/lib/hooks/customers";
// Shared pagination helpers, first written for the category list.
import { paginationPages, showingRange } from "@/lib/merchant-categories";
import {
  CUSTOMER_PER_PAGE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  customerDisplayName,
  describeCustomerError,
  supportsCustomerSegments,
  toAmount,
} from "@/lib/merchant-customers";
import { cn } from "@/lib/utils";
import type { CustomerResource, CustomerStatus, CustomerType } from "@/types/commerce";

export default function CustomersPage() {
  // The backend scopes /api/v1/customers to the token's merchant; admins must use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Customer management is available to merchant accounts linked to a store." />;
  }
  return (
    <Suspense fallback={<LoadingState label="Loading customers…" />}>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType | "">("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [perPage, setPerPage] = useState<number>(CUSTOMER_PER_PAGE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState<CustomerResource | null>(null);
  const [confirming, setConfirming] = useState(false);
  // A save redirects back here with ?saved=<id>&action=created|updated: open that customer and toast once.
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const saved = Number(searchParams.get("saved"));
    return Number.isInteger(saved) && saved > 0 ? saved : null;
  });
  const [toast, setToast] = useState<ToastMessage | null>(() => {
    const action = searchParams.get("action");
    if (!action) return null;
    return { id: Date.now(), tone: "success", text: action === "updated" ? "Customer updated successfully." : "Customer created successfully." };
  });
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (searchParams.get("action") || searchParams.get("saved")) router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const notify = useCallback((tone: "success" | "error", text: string) => setToast({ id: Date.now(), tone, text }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const list = useCustomerList({
    search: debouncedSearch,
    customerType,
    status,
    dateFrom: invalidRange ? "" : dateFrom,
    dateTo: invalidRange ? "" : dateTo,
    page,
    perPage,
  });
  const summary = useCustomerSummary();
  const deleteMutation = useDeleteCustomer();

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const meta = list.data?.meta;
  const hasFilters = Boolean(search || customerType || status || dateFrom || dateTo);
  // Type/status controls are only offered when the API actually returns those fields.
  const segmented = supportsCustomerSegments(rows);

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setSearch("");
    setCustomerType("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    resetPage();
  };

  const editCustomer = (customer: CustomerResource) => router.push(`/sales/customers/${customer.id}/edit`);

  const confirmDelete = async () => {
    if (!confirmation) return;
    setConfirming(true);
    try {
      await deleteMutation.mutateAsync(confirmation.id);
      if (rows.length === 1 && page > 1) setPage(page - 1);
      setSelectedId((current) => (current === confirmation.id ? null : current));
      notify("success", `${customerDisplayName(confirmation)} was deleted.`);
    } catch (error) {
      notify("error", describeCustomerError(error, "The customer could not be deleted."));
    } finally {
      setConfirming(false);
      setConfirmation(null);
    }
  };

  // Total customers falls back to the real list total; the other metrics stay blank without the summary endpoint.
  const totalCustomers = summary.data?.total_customers ?? meta?.total ?? null;
  const metricsUnavailable = summary.isError || (summary.data ? summary.data.new_customers === null && summary.data.returning_customers === null : false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your customer records, contact details and order history.</p>
        </div>
        <Button onClick={() => router.push("/sales/customers/new")}>
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={totalCustomers} icon={<Users className="h-5 w-5" />} pending={summary.isPending && list.isPending} tone="brand" />
        <StatCard label="New Customers" value={summary.data?.new_customers ?? null} icon={<UserPlus className="h-5 w-5" />} pending={summary.isPending} tone="success" />
        <StatCard label="Returning Customers" value={summary.data?.returning_customers ?? null} icon={<Repeat className="h-5 w-5" />} pending={summary.isPending} tone="info" />
        <StatCard label="Total Orders" value={summary.data?.total_orders ?? null} icon={<ShoppingBag className="h-5 w-5" />} pending={summary.isPending} tone="warning" />
      </div>
      {metricsUnavailable ? (
        <Notice tone="info">
          Only the total customer count is available from this API version. New, returning and order totals appear once
          <code className="mx-1 rounded bg-white/60 px-1">GET /api/v1/customers/summary</code> is deployed; no estimated figures are shown.
        </Notice>
      ) : null}

      <div className={cn("grid gap-6", selectedId !== null && "xl:grid-cols-[minmax(0,1fr)_23rem]")}>
        <Card className="min-w-0 border-none bg-white/95">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="relative min-w-56 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Search customers"
                  placeholder="Search by name, email or phone…"
                  className="pl-9"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </div>
              {segmented ? (
                <>
                  <SelectInput
                    aria-label="Customer type"
                    className="h-10 w-full lg:w-44"
                    value={customerType}
                    onChange={(event) => {
                      setCustomerType(event.target.value as CustomerType | "");
                      resetPage();
                    }}
                  >
                    <option value="">Type: All</option>
                    {CUSTOMER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectInput>
                  <SelectInput
                    aria-label="Status"
                    className="h-10 w-full lg:w-40"
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value as CustomerStatus | "");
                      resetPage();
                    }}
                  >
                    <option value="">Status: All</option>
                    {CUSTOMER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectInput>
                </>
              ) : null}
              <Button variant="outline" aria-expanded={moreFilters} aria-controls="customer-more-filters" onClick={() => setMoreFilters((value) => !value)}>
                <SlidersHorizontal className="h-4 w-4" />
                More Filters
              </Button>
            </div>

            {moreFilters ? (
              <div id="customer-more-filters" className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-end">
                <Field label="Registered from" htmlFor="customer-date-from" className="sm:w-48">
                  <Input
                    id="customer-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      resetPage();
                    }}
                  />
                </Field>
                <Field label="Registered to" htmlFor="customer-date-to" className="sm:w-48">
                  <Input
                    id="customer-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      resetPage();
                    }}
                  />
                </Field>
                {hasFilters ? (
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : null}

            {invalidRange ? <Notice tone="error">The “registered from” date must be on or before the “registered to” date.</Notice> : null}
            {!segmented && rows.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                This API version returns no customer type or status, so those filters and columns are hidden instead of shown as inactive controls.
              </p>
            ) : null}

            {list.isError ? <ErrorState error={list.error} title="Unable to load customers" onRetry={() => void list.refetch()} /> : null}

            {!list.isError ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <caption className="sr-only">Customers</caption>
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                        Customer
                      </th>
                      <th scope="col" className="hidden px-3 py-3 text-left font-semibold text-slate-600 md:table-cell">
                        Contact
                      </th>
                      {segmented ? (
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Type
                        </th>
                      ) : null}
                      <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                        Orders
                      </th>
                      <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                        Total Spent
                      </th>
                      {segmented ? (
                        <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                          Status
                        </th>
                      ) : null}
                      <th scope="col" className="hidden px-3 py-3 text-left font-semibold text-slate-600 sm:table-cell">
                        Joined
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y divide-slate-100 bg-white", list.isFetching && !list.isPending && "opacity-70")}>
                    {list.isPending ? <SkeletonRows columns={segmented ? 8 : 6} /> : null}
                    {rows.map((row) => {
                      const name = customerDisplayName(row);
                      const spent = toAmount(row.total_spent);
                      return (
                        <tr key={row.id} className={cn("align-middle hover:bg-slate-50/70", selectedId === row.id && "bg-brand-50/60 hover:bg-brand-50/60")}>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                              onClick={() => setSelectedId(row.id)}
                              aria-label={`View ${name}`}
                            >
                              <CustomerAvatar name={name} />
                              <span className="min-w-0">
                                <span className="block font-semibold text-slate-900">{name}</span>
                                <span className="block text-xs text-muted-foreground md:hidden">{row.email ?? row.phone ?? "No contact details"}</span>
                              </span>
                            </button>
                          </td>
                          <td className="hidden px-3 py-3 text-slate-600 md:table-cell">
                            <span className="block">{row.email ?? "—"}</span>
                            <span className="block text-xs text-muted-foreground">{row.phone ?? "—"}</span>
                          </td>
                          {segmented ? (
                            <td className="px-3 py-3">
                              <CustomerTypeBadge type={row.customer_type} />
                            </td>
                          ) : null}
                          <td className="px-3 py-3 text-slate-700">{row.orders_count ?? "—"}</td>
                          <td className="px-3 py-3 text-slate-700">{spent === null ? "—" : formatMoney(spent)}</td>
                          {segmented ? (
                            <td className="px-3 py-3">
                              <CustomerStatusBadge status={row.status} />
                            </td>
                          ) : null}
                          <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 sm:table-cell">{formatDateTime(row.created_at)}</td>
                          <td className="px-3 py-3 text-right">
                            <CustomerActionsMenu
                              disabled={deleteMutation.isPending}
                              onView={() => setSelectedId(row.id)}
                              onEdit={() => editCustomer(row)}
                              onDelete={() => setConfirmation(row)}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${name}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {list.data && rows.length === 0 ? (
              <EmptyState
                title="No customers found"
                description={hasFilters ? "No customers match these filters." : "Add your first customer to start recording orders."}
              />
            ) : null}

            {meta && meta.total > 0 ? (
              <TableFooter
                meta={meta}
                perPage={perPage}
                onPerPageChange={(value) => {
                  setPerPage(value);
                  resetPage();
                }}
                onPageChange={setPage}
              />
            ) : null}
          </CardContent>
        </Card>

        {selectedId !== null ? (
          <aside className="min-w-0 xl:sticky xl:top-6 xl:h-fit" aria-label="Customer details">
            <CustomerDetailsPanel
              key={selectedId}
              customerId={selectedId}
              busy={deleteMutation.isPending}
              onClose={() => setSelectedId(null)}
              onEdit={editCustomer}
              onDelete={setConfirmation}
            />
          </aside>
        ) : null}
      </div>

      <Modal open={confirmation !== null} title="Delete customer" onClose={() => (confirming ? undefined : setConfirmation(null))}>
        <p className="text-sm text-slate-700">
          Delete “{confirmation ? customerDisplayName(confirmation) : ""}”? This cannot be undone. Customers linked to existing orders may be
          rejected by the server.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={confirming} onClick={() => setConfirmation(null)}>
            Cancel
          </Button>
          <Button className="bg-red-600 bg-none hover:bg-red-700" disabled={confirming} onClick={confirmDelete}>
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </div>
      </Modal>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  pending,
  tone,
}: {
  label: string;
  value: number | null;
  icon: ReactNode;
  pending: boolean;
  tone: "brand" | "success" | "info" | "warning";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-green-50 text-green-700",
    info: "bg-sky-50 text-sky-700",
    warning: "bg-amber-50 text-amber-700",
  } as const;
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {pending ? (
            <div className="mt-1 h-6 w-12 animate-pulse rounded bg-slate-100" aria-label="Loading" />
          ) : (
            <p className="text-xl font-bold text-navy-900" title={value === null ? "This metric is not reported by the API" : undefined}>
              {value === null ? "—" : value.toLocaleString("en-PH")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index} aria-hidden="true">
          {Array.from({ length: columns }, (_, cell) => (
            <td key={cell} className="px-3 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableFooter({
  meta,
  perPage,
  onPerPageChange,
  onPageChange,
}: {
  meta: { current_page: number; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null };
  perPage: number;
  onPerPageChange: (value: number) => void;
  onPageChange: (page: number) => void;
}) {
  const range = showingRange(meta);
  const page = meta.current_page;
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm lg:flex-row lg:items-center lg:justify-between">
      <p className="text-muted-foreground" aria-live="polite">
        Showing {range.from} to {range.to} of {range.total} customer{range.total === 1 ? "" : "s"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {paginationPages(page, meta.last_page).map((item, index) =>
            item === "…" ? (
              <span key={`gap-${index}`} className="px-1.5 text-slate-400">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next page" disabled={page >= meta.last_page} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="sr-only">Customers per page</span>
          <SelectInput className="h-9" value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))}>
            {CUSTOMER_PER_PAGE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} / page
              </option>
            ))}
          </SelectInput>
        </label>
      </div>
    </div>
  );
}
