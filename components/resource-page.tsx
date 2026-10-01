"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/admin/ui";
import { Card, CardContent } from "@/components/ui/card";

export function ResourcePage<T extends object>({
  title,
  description,
  data,
  columns,
  searchKeys,
  loading = false,
  error,
  onRetry,
  meta,
  onPageChange,
  statusFilterEnabled = true,
  actions,
}: {
  title: string;
  description: string;
  data: T[];
  columns: DataTableColumn<T>[];
  searchKeys: (keyof T)[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  meta?: { current_page: number; last_page: number; total: number };
  onPageChange?: (page: number) => void;
  statusFilterEnabled?: boolean;
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredData = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.filter((item) => {
      const matchesQuery =
        !normalized ||
        searchKeys.some((key) =>
          String((item as Record<string, unknown>)[String(key)] ?? "")
            .toLowerCase()
            .includes(normalized),
        );

      const status = String((item as Record<string, unknown>).status ?? "").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? ["active", "completed", "paid", "shipped", "in-stock"].includes(status) : ["pending", "processing", "failed", "cancelled", "rejected", "inactive", "draft", "low"].includes(status));

      return matchesQuery && matchesStatus;
    });
  }, [data, query, searchKeys, statusFilter]);

  const tableKey = useMemo(
    () =>
      [
        query,
        statusFilter,
        ...filteredData.map((item) =>
          String(
            (item as Record<string, unknown>).id ??
              (item as Record<string, unknown>).orderNumber ??
              (item as Record<string, unknown>).paymentId ??
              (item as Record<string, unknown>).reference ??
              JSON.stringify(item),
          ),
        ),
      ].join("|"),
    [filteredData, query, statusFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
        <Card className="border-none bg-white/80">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="relative min-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={meta ? "Search this page" : "Search records"}
                className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
            {statusFilterEnabled ? <><label htmlFor="status-filter" className="sr-only">
              Filter records by status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="attention">Needs attention</option>
            </select></> : null}
          </CardContent>
        </Card>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={onRetry} /> :
        filteredData.length === 0 ? <EmptyState /> :
        <DataTable key={tableKey} data={filteredData} columns={columns} pageSize={meta ? 15 : 6} />}
      {!loading && !error && meta && onPageChange ? <Pagination meta={meta} onPageChange={onPageChange} /> : null}
    </div>
  );
}
