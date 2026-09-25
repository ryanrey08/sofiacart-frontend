"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | Date | null | undefined;
}

export function DataTable<T extends object>({
  data,
  columns,
  pageSize = 5,
  getRowKey,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  getRowKey?: (row: T, index: number) => string | number;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((left, right) => {
      const column = columns.find((entry) => String(entry.key) === sortKey);
      const a = column?.sortValue ? column.sortValue(left) : (left as Record<string, unknown>)[sortKey];
      const b = column?.sortValue ? column.sortValue(right) : (right as Record<string, unknown>)[sortKey];
      if (a === b) return 0;
      if (a === undefined || a === null) return 1;
      if (b === undefined || b === null) return -1;

      let comparison = 0;
      if (typeof a === "number" && typeof b === "number") {
        comparison = a - b;
      } else if (a instanceof Date && b instanceof Date) {
        comparison = a.getTime() - b.getTime();
      } else {
        const parsedA = Date.parse(String(a));
        const parsedB = Date.parse(String(b));
        comparison =
          !Number.isNaN(parsedA) && !Number.isNaN(parsedB)
            ? parsedA - parsedB
            : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [columns, data, sortDirection, sortKey]);

  const pages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(page, pages);
  const paginated = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;
    const key = String(column.key);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <Card className="border-none bg-white/90">
      <CardContent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/90">
              <tr>
                {columns.map((column) => (
                  <th key={String(column.key)} className={cn("px-4 py-3 text-left font-semibold text-slate-600", column.className)}>
                    <button type="button" onClick={() => handleSort(column)} className="inline-flex items-center gap-1">
                      {column.header}
                      {column.sortable ? (
                        sortKey === String(column.key) ? sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginated.map((row, index) => (
                <tr
                  key={
                    getRowKey?.(row, index) ??
                    (row as Record<string, string | number>).id ??
                    (row as Record<string, string | number>).orderNumber ??
                    (row as Record<string, string | number>).paymentId ??
                    (row as Record<string, string | number>).reference ??
                    index
                  }
                  className="hover:bg-slate-50/70"
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className={cn("px-4 py-3 text-slate-700", column.className)}>
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[String(column.key)] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4">
          <p className="text-sm text-muted-foreground">Page {currentPage} of {pages}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
              disabled={currentPage === pages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
