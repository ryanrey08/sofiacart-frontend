"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { AdminTable, EmptyState, ErrorState, Field, FilterBar, LoadingState, Notice, PageHeader, Pagination, SelectInput, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { exportPlatformReport, fetchPlatformReport } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { PlatformReportType } from "@/types/admin";

// Report types and columns mirror PlatformReportsController in sofiacart-backend.
const REPORTS: Array<{ type: PlatformReportType; label: string; columns: string[] }> = [
  { type: "merchant_sales", label: "Merchant sales", columns: ["id", "store_name", "status", "total_sales", "orders_count"] },
  { type: "payment_status", label: "Payments by status", columns: ["status", "payments_count", "total_amount"] },
  { type: "order_status", label: "Orders by status", columns: ["status", "payment_status", "orders_count", "total_amount"] },
];
type ReportRow = { row: Record<string, string | number | null>; index: number };
const MONEY_COLUMNS = new Set(["total_sales", "total_amount"]);
const STATUS_COLUMNS = new Set(["status", "payment_status"]);

export default function AdminReportsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.REPORTS_VIEW}>
      <ReportsContent />
    </RequirePermission>
  );
}

function ReportsContent() {
  const [type, setType] = useState<PlatformReportType>("merchant_sales");
  const [page, setPage] = useState(1);
  const report = REPORTS.find((item) => item.type === type) ?? REPORTS[0];

  const query = useQuery({
    queryKey: ["admin", "reports", type, page],
    queryFn: () => fetchPlatformReport({ type, page, per_page: 15 }),
    placeholderData: keepPreviousData,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportPlatformReport(type),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Platform-wide sales, payment, and order reports."
        actions={
          <Can permission={ADMIN_PERMISSIONS.REPORTS_EXPORT}>
            <Button variant="outline" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? "Exporting…" : "Export CSV"}
            </Button>
          </Can>
        }
      />
      <FilterBar>
        <Field label="Report" htmlFor="report-type">
          <SelectInput
            id="report-type"
            value={type}
            onChange={(event) => {
              setType(event.target.value as PlatformReportType);
              setPage(1);
            }}
          >
            {REPORTS.map((item) => (
              <option key={item.type} value={item.type}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>
      {exportMutation.isError ? <Notice tone="error">{parseApiError(exportMutation.error, "Export failed.").message}</Notice> : null}

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState title="No report data yet" /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable<ReportRow>
            caption={report.label}
            rows={query.data.data.map((row, index) => ({ row, index }))}
            rowKey={({ row, index }) => `${type}-${row.id ?? ""}-${row.status ?? ""}-${row.payment_status ?? ""}-${index}`}
            columns={report.columns.map((column) => ({
              key: column,
              header: humanize(column),
              render: ({ row }) => {
                const value = row[column];
                if (MONEY_COLUMNS.has(column)) return formatMoney(value);
                if (STATUS_COLUMNS.has(column)) return <StatusPill status={value === null ? null : String(value)} />;
                return value ?? "—";
              },
            }))}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
