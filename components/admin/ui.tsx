"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, Search, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseApiError } from "@/lib/admin/errors";
import { humanize } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

// Visual language follows the Super Admin frames in the SofiaCart Canva design: white rounded
// panels on a soft lavender canvas, tinted icon tiles, purple primary actions and dot status pills.

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-4">
        {Icon ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon aria-hidden="true" className="h-6 w-6" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">{title}</h1>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200/70 bg-white shadow-card", className)}>
      {title || actions ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="text-base font-bold text-navy-900">{title}</h2> : null}
              {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const statTones = {
  purple: "bg-brand-100 text-brand-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-600",
  blue: "bg-sky-100 text-sky-700",
  slate: "bg-slate-100 text-slate-600",
} as const;

export type StatTone = keyof typeof statTones;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "purple",
  loading = false,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card">
      <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", statTones[tone])}>
        <Icon aria-hidden="true" className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-600">{label}</p>
        {loading ? (
          <span className="mt-1 block h-7 w-20 animate-pulse rounded-md bg-slate-100" aria-hidden="true" />
        ) : (
          <p className="mt-0.5 truncate text-2xl font-bold text-navy-900">{value}</p>
        )}
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  return (
    <div role="tablist" aria-label={label} className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") focusTab(index + 1);
              if (event.key === "ArrowLeft") focusTab(index - 1);
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              selected ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-brand-700",
            )}
          >
            {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px]", selected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Unable to load data" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const details = parseApiError(error);
  const forbidden = details.status === 403;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between",
        forbidden ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-100 bg-red-50 text-red-800",
      )}
    >
      <div className="flex items-start gap-3">
        {forbidden ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>
          <p className="font-semibold">{forbidden ? "Access restricted" : title}</p>
          <p>{details.message}</p>
        </div>
      </div>
      {onRetry && !forbidden ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title = "No records found", description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white px-4 py-10 text-center text-sm text-muted-foreground">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
        <Inbox className="h-6 w-6 text-brand-500" />
      </span>
      <p className="font-semibold text-slate-700">{title}</p>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function AccessDenied({ message = "Your admin role does not grant access to this page." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-card">
      <ShieldAlert className="h-8 w-8 text-amber-500" />
      <h2 className="text-xl font-semibold text-navy-900">Access restricted</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "error" && "border-red-200 bg-red-50 text-red-800",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {children}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  bare = false,
  selectedKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  caption?: string;
  // `bare` renders only the table, for use inside a Panel that already provides the card.
  bare?: boolean;
  selectedKey?: string | number | null;
}) {
  const table = (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn("whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-slate-600", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr key={key} className={cn("align-middle transition hover:bg-brand-50/40", selectedKey === key && "bg-brand-50/70")}>
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 text-slate-700", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (bare) return <div className="-mx-4 sm:-mx-5">{table}</div>;
  return <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">{table}</div>;
}

function pageWindow(page: number, lastPage: number): Array<number | "gap"> {
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, index) => index + 1);
  const pages = new Set([1, lastPage, page - 1, page, page + 1].filter((value) => value >= 1 && value <= lastPage));
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= lastPage - 2) [lastPage - 3, lastPage - 2, lastPage - 1].forEach((value) => pages.add(value));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function Pagination({
  meta,
  onPageChange,
  noun = "records",
}: {
  meta?: { current_page: number; last_page: number; total: number; from?: number | null; to?: number | null; per_page?: number } | null;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  if (!meta) return null;
  const { current_page: page, total } = meta;
  const lastPage = Math.max(meta.last_page, 1);
  const from = meta.from ?? (total === 0 ? 0 : (page - 1) * (meta.per_page ?? 0) + 1);
  const to = meta.to ?? Math.min(total, page * (meta.per_page ?? total));

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0 ? `No ${noun}` : `Showing ${from} to ${to} of ${total.toLocaleString()} ${noun}`}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous page" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageWindow(page, lastPage).map((value, index) =>
          value === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={value}
              type="button"
              aria-current={value === page ? "page" : undefined}
              aria-label={`Page ${value}`}
              onClick={() => onPageChange(value)}
              className={cn(
                "h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                value === page ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50",
              )}
            >
              {value}
            </button>
          ),
        )}
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next page" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

export function FilterBar({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  if (bare) return <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>;
  return <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card">{children}</div>;
}

export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  label = "Search",
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-56 flex-1", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        />
      </div>
    </div>
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
      <Label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </Label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
}

const statusTone: Record<string, "green" | "amber" | "red" | "blue" | "slate" | "purple"> = {
  active: "green",
  verified: "green",
  completed: "green",
  paid: "green",
  processed: "green",
  success: "green",
  in_stock: "green",
  approved: "blue",
  credit: "blue",
  processing: "blue",
  payment: "blue",
  pending: "amber",
  pending_approval: "amber",
  information_requested: "amber",
  unpaid: "amber",
  partially_refunded: "amber",
  low_stock: "amber",
  draft: "slate",
  archived: "slate",
  inactive: "slate",
  refunded: "purple",
  refund: "purple",
  debit: "slate",
  expired: "slate",
  failed: "red",
  cancelled: "red",
  rejected: "red",
  suspended: "red",
  out_of_stock: "red",
};

const pillStyles = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-brand-50 text-brand-700 ring-brand-200",
};

const dotStyles = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  slate: "bg-slate-400",
  purple: "bg-brand-500",
};

// Display labels for backend values whose raw wording differs from the Canva copy.
const statusLabels: Record<string, string> = {
  verified: "Approved",
  information_requested: "Info requested",
  pending_approval: "Pending approval",
  active: "Active",
};

export function StatusPill({ status, label }: { status: string | null | undefined; label?: string }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const tone = statusTone[status] ?? "purple";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", pillStyles[tone])}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", dotStyles[tone])} />
      {label ?? statusLabels[status] ?? humanize(status)}
    </span>
  );
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 backdrop-blur-sm sm:p-10">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("w-full rounded-2xl bg-white p-6 shadow-soft", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-navy-900">
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

// Right-hand details panel (Canva "User Details" / "Log Details"), full screen on small viewports.
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close details" className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-bold text-navy-900">
              {title}
            </h2>
            {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function IconAction({ label, icon: Icon, onClick, href, tone = "default" }: { label: string; icon: LucideIcon; onClick?: () => void; href?: string; tone?: "default" | "danger" }) {
  const className = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
    tone === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        <Icon aria-hidden="true" className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={className}>
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

export function DetailList({ items, columns = 2 }: { items: Array<{ label: string; value: ReactNode }>; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 2 && "sm:grid-cols-2")}>
      {items.map((item) => (
        <div key={item.label} className="border-b border-slate-100 pb-2.5">
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-navy-900">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-xl bg-navy-900 p-4 text-xs text-slate-100">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

export function MerchantCell({ merchant, merchantId }: { merchant?: { id: number; store_name: string } | null; merchantId: number }) {
  const name = merchant?.store_name ?? `Merchant #${merchantId}`;
  return (
    <Link href={`/admin/merchants/${merchantId}`} className="inline-flex items-center gap-2 font-medium text-navy-900 hover:text-brand-700">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span className="truncate">{name}</span>
    </Link>
  );
}
