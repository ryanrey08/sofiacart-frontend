"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { AccessDenied, EmptyState, ErrorState, Field, LoadingState, Modal, SelectInput } from "@/components/admin/ui";
import { CategoryActionsMenu, CategoryDetailsPanel, CategoryStatusBadge } from "@/components/merchant/category-details";
import { CategoryThumb } from "@/components/merchant/category-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toast, type ToastMessage } from "@/components/ui/toast";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { getStoredAuth } from "@/lib/auth";
import {
  useBulkCategoryAction,
  useCategoryList,
  useCategoryOptions,
  useCategoryStats,
  useDeleteCategory,
  useUpdateCategoryStatus,
} from "@/lib/hooks/categories";
import {
  CATEGORY_PER_PAGE_OPTIONS,
  CATEGORY_SORT_OPTIONS,
  describeCategoryError,
  isCategoryActive,
  nextSort,
  paginationPages,
  showingRange,
} from "@/lib/merchant-categories";
import { richTextToPlainText } from "@/lib/validation/category";
import { cn, formatDate } from "@/lib/utils";
import type { CategoryBulkAction, CategoryResource, CategorySortDirection, CategorySortField, CategoryStatusFilter } from "@/types";

type Confirmation = { title: string; message: string; confirmLabel: string; onConfirm: () => Promise<void> };

export default function CategoriesPage() {
  // The backend scopes /api/v1/categories to the token's merchant; admins must use /admin.
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Category management is available to merchant accounts linked to a store." />;
  }
  return (
    <Suspense fallback={<LoadingState label="Loading categories…" />}>
      <CategoriesContent />
    </Suspense>
  );
}

function CategoriesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CategoryStatusFilter | "">("");
  const [parentId, setParentId] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [sort, setSort] = useState<{ sort: CategorySortField; direction: CategorySortDirection }>({ sort: "created_at", direction: "desc" });
  const [perPage, setPerPage] = useState<number>(CATEGORY_PER_PAGE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<number[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirming, setConfirming] = useState(false);
  // A save redirects back here with ?saved=<id>&action=created|updated: open that category and toast once.
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const saved = Number(searchParams.get("saved"));
    return Number.isInteger(saved) && saved > 0 ? saved : null;
  });
  const [toast, setToast] = useState<ToastMessage | null>(() => {
    const action = searchParams.get("action");
    if (!action) return null;
    return { id: Date.now(), tone: "success", text: action === "updated" ? "Category updated successfully." : "Category created successfully." };
  });
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (searchParams.get("action") || searchParams.get("saved")) router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const notify = useCallback((tone: "success" | "error", text: string) => setToast({ id: Date.now(), tone, text }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const list = useCategoryList({
    search: debouncedSearch,
    status,
    parentId: parentId ? Number(parentId) : null,
    sort: sort.sort,
    direction: sort.direction,
    page,
    perPage,
  });
  const stats = useCategoryStats();
  const parentOptions = useCategoryOptions();
  const statusMutation = useUpdateCategoryStatus();
  const deleteMutation = useDeleteCategory();
  const bulkMutation = useBulkCategoryAction();
  const busy = statusMutation.isPending || deleteMutation.isPending || bulkMutation.isPending;

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const meta = list.data?.meta;
  const hasFilters = Boolean(search || status || parentId);
  const checkedRows = useMemo(() => rows.filter((row) => checked.includes(row.id)), [rows, checked]);
  const allChecked = rows.length > 0 && rows.every((row) => checked.includes(row.id));
  const someChecked = !allChecked && rows.some((row) => checked.includes(row.id));

  // Deleting every row on a later page steps back so the user doesn't land on an empty page.
  const stepBackIfEmptied = (removed: number) => {
    if (removed >= rows.length && page > 1) setPage(page - 1);
  };

  const resetPage = () => setPage(1);
  const toggleRow = (id: number) => setChecked((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  const applySort = (next: { sort: CategorySortField; direction: CategorySortDirection }) => {
    setSort(next);
    resetPage();
  };

  const toggleStatus = (category: CategoryResource) => {
    const next = !isCategoryActive(category);
    statusMutation.mutate(
      { id: category.id, isActive: next },
      {
        onSuccess: (updated) => notify("success", `${updated.name} is now ${next ? "active" : "inactive"}.`),
        onError: (error) => notify("error", describeCategoryError(error, "The category status could not be updated.")),
      },
    );
  };

  const askDelete = (category: CategoryResource) =>
    setConfirmation({
      title: "Delete category",
      message: `Delete “${category.name}”? This cannot be undone.${category.products_count ? ` ${category.products_count} product(s) are assigned to it.` : ""}`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(category.id);
          if (rows.some((row) => row.id === category.id)) stepBackIfEmptied(1);
          setSelectedId((current) => (current === category.id ? null : current));
          setChecked((current) => current.filter((id) => id !== category.id));
          notify("success", `${category.name} was deleted.`);
        } catch (error) {
          notify("error", describeCategoryError(error, "The category could not be deleted."));
        }
      },
    });

  const runBulk = async (action: CategoryBulkAction) => {
    const ids = checkedRows.map((row) => row.id);
    if (!ids.length) return;
    const label = `${ids.length} categor${ids.length === 1 ? "y" : "ies"}`;
    try {
      await bulkMutation.mutateAsync({ action, ids });
      if (action === "delete") {
        setSelectedId((current) => (current && ids.includes(current) ? null : current));
        stepBackIfEmptied(ids.length);
      }
      setChecked([]);
      notify("success", `${label} ${action === "delete" ? "deleted" : action === "activate" ? "activated" : "deactivated"}.`);
    } catch (error) {
      notify("error", describeCategoryError(error, `The ${label} could not be updated.`));
    }
  };

  const askBulkDelete = () =>
    setConfirmation({
      title: "Delete categories",
      message: `Delete ${checkedRows.length} selected categor${checkedRows.length === 1 ? "y" : "ies"}? This cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: () => runBulk("delete"),
    });

  const editCategory = (category: CategoryResource) => router.push(`/sales/categories/${category.id}/edit`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and organize your product categories.</p>
        </div>
        <Button onClick={() => router.push("/sales/categories/new")}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Categories" value={stats.data?.total} icon={<FolderTree className="h-5 w-5" />} pending={stats.isPending} error={stats.isError} tone="brand" />
        <StatCard label="Active" value={stats.data?.active} icon={<CheckCircle2 className="h-5 w-5" />} pending={stats.isPending} error={stats.isError} tone="success" />
        <StatCard label="Inactive" value={stats.data?.inactive} icon={<XCircle className="h-5 w-5" />} pending={stats.isPending} error={stats.isError} tone="danger" />
        <StatCard label="Total Products" value={stats.data?.total_products} icon={<Package className="h-5 w-5" />} pending={stats.isPending} error={stats.isError} tone="info" />
      </div>

      <div className={cn("grid gap-6", selectedId !== null && "xl:grid-cols-[minmax(0,1fr)_23rem]")}>
        <Card className="min-w-0 border-none bg-white/95">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="relative min-w-56 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Search categories"
                  placeholder="Search categories…"
                  className="pl-9"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                />
              </div>
              <SelectInput
                aria-label="Status"
                className="h-10 w-full lg:w-40"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as CategoryStatusFilter | "");
                  resetPage();
                }}
              >
                <option value="">Status: All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
              <SelectInput
                aria-label="Sort by"
                className="h-10 w-full lg:w-48"
                value={`${sort.sort}:${sort.direction}`}
                onChange={(event) => {
                  const option = CATEGORY_SORT_OPTIONS.find((item) => item.value === event.target.value);
                  if (option) applySort({ sort: option.sort, direction: option.direction });
                }}
              >
                {CATEGORY_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort by: {option.label}
                  </option>
                ))}
              </SelectInput>
              <Button variant="outline" aria-expanded={moreFilters} aria-controls="category-more-filters" onClick={() => setMoreFilters((value) => !value)}>
                <SlidersHorizontal className="h-4 w-4" />
                More Filters
              </Button>
            </div>

            {moreFilters ? (
              <div id="category-more-filters" className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-end">
                <Field label="Parent category" htmlFor="category-parent-filter" className="sm:w-64">
                  <SelectInput
                    id="category-parent-filter"
                    className="h-10 w-full"
                    value={parentId}
                    onChange={(event) => {
                      setParentId(event.target.value);
                      resetPage();
                    }}
                  >
                    <option value="">Any parent</option>
                    {(parentOptions.data?.data ?? []).map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {option.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                {hasFilters ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                      setParentId("");
                      resetPage();
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : null}

            {checkedRows.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
                <span className="font-semibold">{checkedRows.length} selected</span>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void runBulk("activate")}>
                  Activate
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void runBulk("deactivate")}>
                  Deactivate
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={askBulkDelete}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setChecked([])}>
                  Clear selection
                </Button>
              </div>
            ) : null}

            {list.isError ? <ErrorState error={list.error} title="Unable to load categories" onRetry={() => void list.refetch()} /> : null}

            {!list.isError ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <caption className="sr-only">Categories</caption>
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th scope="col" className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-600"
                          aria-label="Select all categories on this page"
                          checked={allChecked}
                          ref={(element) => {
                            if (element) element.indeterminate = someChecked;
                          }}
                          disabled={!rows.length}
                          onChange={(event) => setChecked(event.target.checked ? rows.map((row) => row.id) : [])}
                        />
                      </th>
                      <SortableHeader label="Category" field="name" sort={sort} onSort={(field) => applySort(nextSort(sort, field))} />
                      <th scope="col" className="hidden px-3 py-3 text-left font-semibold text-slate-600 md:table-cell">
                        Description
                      </th>
                      <SortableHeader label="Products" field="products_count" sort={sort} onSort={(field) => applySort(nextSort(sort, field))} />
                      <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600">
                        Status
                      </th>
                      <SortableHeader
                        label="Date Created"
                        field="created_at"
                        sort={sort}
                        className="hidden sm:table-cell"
                        onSort={(field) => applySort(nextSort(sort, field))}
                      />
                      <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y divide-slate-100 bg-white", list.isFetching && !list.isPending && "opacity-70")}>
                    {list.isPending ? <SkeletonRows /> : null}
                    {rows.map((row) => {
                      const description = richTextToPlainText(row.description);
                      return (
                        <tr key={row.id} className={cn("align-middle hover:bg-slate-50/70", selectedId === row.id && "bg-brand-50/60 hover:bg-brand-50/60")}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-brand-600"
                              aria-label={`Select ${row.name}`}
                              checked={checked.includes(row.id)}
                              onChange={() => toggleRow(row.id)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                              onClick={() => setSelectedId(row.id)}
                              aria-label={`View ${row.name}`}
                            >
                              <CategoryThumb category={row} className="h-10 w-10" />
                              <span className="min-w-0">
                                <span className="block font-semibold text-slate-900">{row.name}</span>
                                {row.parent?.name ? <span className="block text-xs text-muted-foreground">in {row.parent.name}</span> : null}
                              </span>
                            </button>
                          </td>
                          <td className="hidden max-w-xs px-3 py-3 text-slate-600 md:table-cell">
                            <span className="line-clamp-2">{description || "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{row.products_count ?? "—"}</td>
                          <td className="px-3 py-3">
                            <CategoryStatusBadge category={row} />
                          </td>
                          <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 sm:table-cell">{row.created_at ? formatDate(row.created_at) : "—"}</td>
                          <td className="px-3 py-3 text-right">
                            <CategoryActionsMenu
                              category={row}
                              disabled={busy}
                              onView={() => setSelectedId(row.id)}
                              onEdit={() => editCategory(row)}
                              onToggleStatus={() => toggleStatus(row)}
                              onDelete={() => askDelete(row)}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${row.name}`}>
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
                title="No categories found"
                description={hasFilters ? "No categories match these filters." : "Add your first category to organize your products."}
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
          <aside className="min-w-0 xl:sticky xl:top-6 xl:h-fit" aria-label="Category details">
            <CategoryDetailsPanel
              key={selectedId}
              categoryId={selectedId}
              busy={busy}
              onClose={() => setSelectedId(null)}
              onEdit={editCategory}
              onToggleStatus={toggleStatus}
              onDelete={askDelete}
              onNotify={notify}
            />
          </aside>
        ) : null}
      </div>

      <Modal open={confirmation !== null} title={confirmation?.title ?? ""} onClose={() => (confirming ? undefined : setConfirmation(null))}>
        <p className="text-sm text-slate-700">{confirmation?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={confirming} onClick={() => setConfirmation(null)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 bg-none hover:bg-red-700"
            disabled={confirming}
            onClick={async () => {
              if (!confirmation) return;
              setConfirming(true);
              await confirmation.onConfirm();
              setConfirming(false);
              setConfirmation(null);
            }}
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmation?.confirmLabel}
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
  error,
  tone,
}: {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  pending: boolean;
  error: boolean;
  tone: "brand" | "success" | "danger" | "info";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-green-50 text-green-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
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
            <p className="text-xl font-bold text-navy-900" title={error ? "Statistics are unavailable" : undefined}>
              {error || value === undefined ? "—" : value.toLocaleString("en-PH")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SortableHeader({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: CategorySortField;
  sort: { sort: CategorySortField; direction: CategorySortDirection };
  onSort: (field: CategorySortField) => void;
  className?: string;
}) {
  const active = sort.sort === field;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-3 text-left font-semibold text-slate-600", className)}
    >
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
        {label}
        <Icon aria-hidden="true" className={cn("h-3.5 w-3.5", active ? "text-brand-600" : "text-slate-400")} />
      </button>
    </th>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index} aria-hidden="true">
          <td className="px-3 py-3">
            <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            </div>
          </td>
          <td className="hidden px-3 py-3 md:table-cell">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
          </td>
          <td className="hidden px-3 py-3 sm:table-cell">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="ml-auto h-6 w-6 animate-pulse rounded bg-slate-100" />
          </td>
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
        Showing {range.from} to {range.to} of {range.total} categor{range.total === 1 ? "y" : "ies"}
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
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="Next page"
            disabled={page >= meta.last_page}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="sr-only">Categories per page</span>
          <SelectInput className="h-9" value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))}>
            {CATEGORY_PER_PAGE_OPTIONS.map((value) => (
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
