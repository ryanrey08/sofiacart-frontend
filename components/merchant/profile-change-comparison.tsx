import { FileText } from "lucide-react";
import { PrivateFile } from "@/components/admin/private-file";
import { DOCUMENT_LABELS, fieldLabel, formatChangeValue, formatFileSize, isDocumentKey } from "@/lib/merchant-profile";
import { cn } from "@/lib/utils";
import type { ChangeValue, MerchantChangeRequest, MerchantDocumentKey } from "@/types/merchant-profile";

type Row = { field: string; before: ChangeValue; after: ChangeValue; changed: boolean; file: boolean; size?: number | null };

/**
 * Field-by-field comparison of a profile change request. While pending it compares the live
 * approved value with the requested value (from the backend comparison); once decided it compares
 * the value at submission time with the requested value. File rows show file names.
 */
export function ProfileChangeComparison({ request, className }: { request: MerchantChangeRequest; className?: string }) {
  const live = request.status === "pending" && request.comparison;
  const rows: Row[] = live
    ? request.comparison!.map((row) => ({
        field: row.field,
        before: row.current,
        after: row.requested,
        changed: row.changed,
        file: row.kind === "file",
        size: row.file?.size,
      }))
    : request.fields.map((field) => {
        const file = isDocumentKey(field) ? request.files[field] : undefined;
        const original = request.original[field] ?? null;
        return {
          field,
          before: file && typeof original === "string" ? original.split("/").pop() ?? original : original,
          after: file ? file.name : (request.changes[field as keyof typeof request.changes] ?? null),
          changed: true,
          file: Boolean(file),
          size: file?.size,
        };
      });
  const beforeLabel = live ? "Current approved" : "Previous value";

  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200", className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Requested profile changes</caption>
        <thead className="hidden bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-header-group">
          <tr>
            <th scope="col" className="px-3 py-2">Field</th>
            <th scope="col" className="px-3 py-2">{beforeLabel}</th>
            <th scope="col" className="px-3 py-2">Requested change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.field} className="block p-3 sm:table-row sm:p-0">
              <th scope="row" className="block pb-1 text-left font-semibold text-navy-900 sm:table-cell sm:px-3 sm:py-2.5 sm:align-top">
                {fieldLabel(row.field)}
                {!row.changed ? <span className="ml-2 text-xs font-normal text-muted-foreground">(already matches)</span> : null}
              </th>
              <td className="block whitespace-pre-line break-words text-slate-600 sm:table-cell sm:px-3 sm:py-2.5 sm:align-top">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:hidden">{beforeLabel}: </span>
                {row.file && !row.before ? "No file" : formatChangeValue(row.before)}
              </td>
              <td
                className={cn(
                  "mt-1 block whitespace-pre-line break-words rounded-lg sm:mt-0 sm:table-cell sm:rounded-none sm:px-3 sm:py-2.5 sm:align-top",
                  row.changed ? "bg-amber-50 px-2 py-1 font-medium text-amber-900 sm:bg-amber-50/70" : "text-slate-600",
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-700/70 sm:hidden">Requested: </span>
                {row.file ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    New file: {formatChangeValue(row.after)}
                    {row.size ? <span className="text-xs font-normal text-amber-800/70">({formatFileSize(row.size)})</span> : null}
                  </span>
                ) : (
                  formatChangeValue(row.after)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Side-by-side previews of each replacement document in a pending request: the approved file
 * currently on the store, and the uploaded file awaiting approval. Loaders are passed in so the
 * merchant and admin apps each use their own authenticated endpoints.
 */
export function ChangeRequestFilePreviews({
  request,
  hasCurrent,
  loadCurrent,
  loadRequested,
}: {
  request: MerchantChangeRequest;
  hasCurrent: (document: MerchantDocumentKey) => boolean;
  loadCurrent: (document: MerchantDocumentKey) => Promise<Blob>;
  loadRequested: (document: MerchantDocumentKey) => Promise<Blob>;
}) {
  const documents = Object.keys(request.files) as MerchantDocumentKey[];
  if (request.status !== "pending" || documents.length === 0) return null;

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <div key={document} className="grid gap-3 sm:grid-cols-2">
          {hasCurrent(document) ? (
            <PrivateFile label={`Current ${DOCUMENT_LABELS[document].toLowerCase()}`} name={`current-${document}`} load={() => loadCurrent(document)} />
          ) : (
            <div className="flex flex-col justify-center rounded-xl border border-dashed border-slate-200 p-3 text-sm text-muted-foreground">
              <p className="text-xs font-semibold text-slate-600">Current {DOCUMENT_LABELS[document].toLowerCase()}</p>
              <p className="mt-1">No file on record.</p>
            </div>
          )}
          <PrivateFile
            label={`Requested ${DOCUMENT_LABELS[document].toLowerCase()} — ${request.files[document]?.name ?? ""}`}
            name={request.files[document]?.name ?? `requested-${document}`}
            load={() => loadRequested(document)}
          />
        </div>
      ))}
    </div>
  );
}
