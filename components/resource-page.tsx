"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/admin/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageIntro, SampleDataBadge } from "@/components/merchant/page-intro";

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
  currentPage,
  statusFilterEnabled = true,
  actions,
  eyebrow,
  isSample = false,
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
  currentPage?: number;
  statusFilterEnabled?: boolean;
  actions?: ReactNode;
  eyebrow?: string;
  isSample?: boolean;
}) {
  const pathname = usePathname();
  const section = pathname?.split("/")[1];
  const sectionLabel = eyebrow ?? (section ? section.charAt(0).toUpperCase() + section.slice(1) : "Merchant");
  const searchId = useId();
  const statusId = useId();
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
    <div className="space-y-5">
      <PageIntro
        eyebrow={sectionLabel}
        title={title}
        description={description}
        actions={actions}
        badge={isSample ? <SampleDataBadge /> : null}
      />
      {isSample ? (
        <p className="rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The merchant API did not return records for this page, so sample preview rows are shown. They are not live store data.
        </p>
      ) : null}
      <Card>
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor={searchId} className="sr-only">{meta ? `Search ${title} on this page` : `Search ${title}`}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={meta ? "Search this page" : "Search records"}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </div>
          {statusFilterEnabled ? <><label htmlFor={statusId} className="sr-only">
            Filter records by status
          </label>
          <select
            id={statusId}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="attention">Needs attention</option>
          </select></> : null}
        </CardContent>
      </Card>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={onRetry} /> :
        filteredData.length === 0 ? <EmptyState /> :
        <DataTable key={tableKey} data={filteredData} columns={columns} pageSize={meta ? 15 : 6} />}
      {error && currentPage && currentPage > 1 && onPageChange ?
        <Button variant="outline" onClick={() => onPageChange(1)}>Return to first page</Button> : null}
      {!loading && !error && meta && onPageChange ? <Pagination meta={meta} onPageChange={onPageChange} /> : null}
    </div>
  );
}
