"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { useEffect, useId } from "react";
import { AlertTriangle, Inbox, Loader2, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { parseApiError } from "@/lib/admin/errors";
import { humanize } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Super Admin</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 rounded-2xl bg-white/80 px-4 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Unable to load data" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const details = parseApiError(error);
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-5 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p>{details.message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title = "No records found", description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 px-4 py-10 text-center text-sm text-muted-foreground">
      <Inbox className="h-6 w-6 text-slate-400" />
      <p className="font-semibold text-slate-700">{title}</p>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function AccessDenied({ message = "Your admin role does not grant access to this page." }: { message?: string }) {
  return (
    <Card className="border-none bg-white/90">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert className="h-8 w-8 text-amber-500" />
        <h2 className="text-xl font-semibold text-slate-900">Access restricted</h2>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        tone === "success" && "bg-green-50 text-green-800",
        tone === "error" && "bg-red-50 text-red-800",
        tone === "info" && "bg-blue-50 text-blue-800",
      )}
    >
      {children}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  caption?: string;
}) {
  return (
    <Card className="border-none bg-white/90">
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-slate-50/90">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn("px-4 py-3 text-left font-semibold text-slate-600", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 text-slate-700", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function Pagination({
  meta,
  onPageChange,
}: {
  meta?: { current_page: number; last_page: number; total: number } | null;
  onPageChange: (page: number) => void;
}) {
  if (!meta) return null;
  const { current_page: page, last_page: lastPage, total } = meta;

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {Math.max(lastPage, 1)} · {total} record{total === 1 ? "" : "s"}
      </p>
      <nav aria-label="Pagination" className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          Next
        </Button>
      </nav>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="border-none bg-white/80">
      <CardContent className="flex flex-wrap items-end gap-3 p-4">{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "info" | "muted" | "default"> = {
  active: "success",
  verified: "success",
  completed: "success",
  paid: "success",
  processed: "success",
  approved: "info",
  credit: "info",
  processing: "info",
  pending: "warning",
  pending_approval: "warning",
  information_requested: "warning",
  unpaid: "warning",
  partially_refunded: "warning",
  draft: "muted",
  archived: "muted",
  inactive: "muted",
  refunded: "muted",
  debit: "muted",
  failed: "destructive",
  cancelled: "destructive",
  rejected: "destructive",
  suspended: "destructive",
};

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return <Badge variant={statusVariant[status] ?? "default"}>{humanize(status)}</Badge>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-10">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("w-full rounded-3xl bg-white p-6 shadow-soft", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold text-slate-900">
            {title}
          </h2>
          <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}
