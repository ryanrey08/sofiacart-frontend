"use client";

import { ProductImage } from "@/components/merchant/product-image";
import { changeFieldLabel, formatChangeValue, visibleComparisonRows } from "@/lib/product-approval";
import { cn } from "@/lib/utils";
import type { ProductChangeComparisonRow, ProductChangeRequestResource } from "@/types";

/**
 * Current live value vs requested value for a pending edit to an approved product, as computed by
 * sofiacart-backend ProductApprovalService::comparison(). Falls back to `original`/`changes` when the
 * response carries no comparison (e.g. a request that is no longer pending).
 */
export function ProductChangeComparison({
  request,
  categoryName,
}: {
  request: ProductChangeRequestResource;
  categoryName?: (id: number) => string | undefined;
}) {
  const rows: ProductChangeComparisonRow[] =
    request.comparison ??
    Object.entries(request.changes).map(([field, requested]) => ({
      field,
      requested,
      current: request.original[field] ?? null,
      original: request.original[field] ?? null,
      changed: true,
    }));
  const visible = visibleComparisonRows(rows).filter((row) => row.field !== "images");

  return (
    <div className="space-y-3">
      {visible.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <caption className="sr-only">Requested product changes</caption>
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Field</th>
                <th scope="col" className="px-3 py-2">Live now</th>
                <th scope="col" className="px-3 py-2">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr key={row.field} className={cn(!row.changed && "text-slate-400")}>
                  <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-700">
                    {changeFieldLabel(row.field)}
                  </th>
                  <td className="max-w-xs break-words px-3 py-2 text-slate-600">{formatChangeValue(row.field, row.current, { categoryName })}</td>
                  <td className="max-w-xs break-words px-3 py-2 font-medium text-navy-900">
                    {formatChangeValue(row.field, row.requested, { categoryName })}
                    {!row.changed ? <span className="ml-1 text-xs font-normal">(already live)</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {request.images?.paths.length ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Replacement images</p>
          <div className="flex flex-wrap gap-2">
            {request.images.paths.map((path, index) => (
              <div key={path} className="relative">
                <ProductImage path={path} alt={`Requested image ${index + 1}`} className="h-20 w-20" />
                {index === (request.images?.main_index ?? 0) ? (
                  <span className="absolute left-1 top-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">These replace the whole gallery when approved.</p>
        </div>
      ) : null}
    </div>
  );
}
