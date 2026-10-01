import { isAxiosError } from "axios";
import type {
  CategoryResource,
  CategorySortDirection,
  CategorySortField,
  CategoryStats,
  CategoryStatusFilter,
} from "../types/index";
import type { CategoryFormValues, ValidatedCategoryForm } from "./validation/category";

// Pure category helpers (no `@/` imports) so tests/merchant-categories.test.mjs can import them directly.

export type CategoryFormField = keyof CategoryFormValues;

// Laravel request keys → category form fields. `merchant_id` is never sent: the backend scopes by token.
const CATEGORY_FIELD_MAP: Record<string, CategoryFormField> = {
  name: "name",
  slug: "slug",
  parent_id: "parentId",
  sort_order: "sortOrder",
  description: "description",
  meta_title: "metaTitle",
  meta_description: "metaDescription",
  image: "image",
  is_active: "isActive",
  show_in_nav: "showInNav",
};

export const CATEGORY_PER_PAGE_OPTIONS = [10, 20, 50] as const;

export const CATEGORY_SORT_OPTIONS: ReadonlyArray<{ value: string; label: string; sort: CategorySortField; direction: CategorySortDirection }> = [
  { value: "created_at:desc", label: "Newest first", sort: "created_at", direction: "desc" },
  { value: "created_at:asc", label: "Oldest first", sort: "created_at", direction: "asc" },
  { value: "name:asc", label: "Name (A-Z)", sort: "name", direction: "asc" },
  { value: "name:desc", label: "Name (Z-A)", sort: "name", direction: "desc" },
  { value: "products_count:desc", label: "Most products", sort: "products_count", direction: "desc" },
  { value: "products_count:asc", label: "Fewest products", sort: "products_count", direction: "asc" },
];

export interface CategoryListFilters {
  search?: string;
  status?: CategoryStatusFilter | "";
  parentId?: number | null;
  sort?: CategorySortField;
  direction?: CategorySortDirection;
  page?: number;
  perPage?: number;
}

export interface CategoryListParams {
  page: number;
  per_page: number;
  search?: string;
  status?: CategoryStatusFilter;
  parent_id?: number;
  sort?: CategorySortParam;
}

export type CategorySortParam = "name_asc" | "name_desc" | "products_asc" | "products_desc" | "oldest" | "newest";

const CATEGORY_SORT_PARAMS: Record<CategorySortField, Record<CategorySortDirection, CategorySortParam>> = {
  name: { asc: "name_asc", desc: "name_desc" },
  products_count: { asc: "products_asc", desc: "products_desc" },
  created_at: { asc: "oldest", desc: "newest" },
};

// `GET /api/v1/categories?search=&status=active|inactive&parent_id=&sort=name_asc|name_desc|products_asc|products_desc|oldest|newest&page=&per_page=`
export function buildCategoryListParams(filters: CategoryListFilters): CategoryListParams {
  const params: CategoryListParams = { page: Math.max(1, filters.page ?? 1), per_page: filters.perPage ?? 10 };
  const search = filters.search?.trim();
  if (search) params.search = search;
  if (filters.status) params.status = filters.status;
  if (filters.parentId) params.parent_id = filters.parentId;
  if (filters.sort) {
    params.sort = CATEGORY_SORT_PARAMS[filters.sort][filters.direction ?? "asc"];
  }
  return params;
}

// Clicking a sortable header sorts ascending first (descending for counts/dates), then flips direction.
export function nextSort(
  current: { sort: CategorySortField; direction: CategorySortDirection },
  field: CategorySortField,
): { sort: CategorySortField; direction: CategorySortDirection } {
  if (current.sort === field) return { sort: field, direction: current.direction === "asc" ? "desc" : "asc" };
  return { sort: field, direction: field === "name" ? "asc" : "desc" };
}

export const emptyCategoryFormValues: CategoryFormValues = {
  name: "",
  slug: "",
  parentId: "",
  sortOrder: "0",
  description: "",
  metaTitle: "",
  metaDescription: "",
  image: null,
  isActive: true,
  showInNav: true,
};

export function categoryToFormValues(category: CategoryResource): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id ? String(category.parent_id) : "",
    sortOrder: String(category.sort_order ?? 0),
    description: category.description ?? "",
    metaTitle: category.meta_title ?? "",
    metaDescription: category.meta_description ?? "",
    image: null,
    isActive: isCategoryActive(category),
    showInNav: category.show_in_nav ?? true,
  };
}

// JSON body for `POST /categories` and `PUT /categories/{id}`; the image is uploaded separately.
export function buildCategoryPayload(values: ValidatedCategoryForm, hasDescriptionText: boolean) {
  return {
    name: values.name,
    slug: values.slug,
    parent_id: values.parentId ? Number(values.parentId) : null,
    sort_order: values.sortOrder ? Number(values.sortOrder) : 0,
    description: hasDescriptionText ? values.description : null,
    meta_title: values.metaTitle || null,
    meta_description: values.metaDescription || null,
    is_active: values.isActive,
    show_in_nav: values.showInNav,
  };
}

export type CategoryPayload = ReturnType<typeof buildCategoryPayload>;

export function buildCategoryImageFormData(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  return formData;
}

// Categories created before status support have no `is_active`, and are treated as active.
export function isCategoryActive(category: Pick<CategoryResource, "is_active">) {
  return category.is_active ?? true;
}

export function categoryImagePath(category: Pick<CategoryResource, "image_path" | "image_url">) {
  return category.image_url || category.image_path || null;
}

// Accepts `{ data: { … } }` or a bare stats object; missing counts become 0.
export function normalizeCategoryStats(payload: unknown): CategoryStats {
  const source = (payload && typeof payload === "object" && "data" in payload ? (payload as { data: unknown }).data : payload) as
    | Partial<Record<keyof CategoryStats, unknown>>
    | null
    | undefined;
  const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);
  return {
    total: count(source?.total),
    active: count(source?.active),
    inactive: count(source?.inactive),
    total_products: count(source?.total_products),
  };
}

export function showingRange(meta: { current_page: number; per_page: number; total: number; from?: number | null; to?: number | null }) {
  if (meta.total === 0) return { from: 0, to: 0, total: 0 };
  const from = meta.from ?? (meta.current_page - 1) * meta.per_page + 1;
  const to = meta.to ?? Math.min(meta.current_page * meta.per_page, meta.total);
  return { from, to, total: meta.total };
}

// Page buttons with gaps, e.g. [1, "…", 4, 5, 6, "…", 10].
export function paginationPages(current: number, last: number): Array<number | "…"> {
  if (last <= 7) return Array.from({ length: Math.max(last, 1) }, (_, index) => index + 1);
  const pages = new Set([1, last, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("…");
    result.push(page);
  });
  return result;
}

export interface CategoryApiErrorResult {
  status: number | null;
  fieldErrors: Partial<Record<CategoryFormField, string>>;
  formError: string | null;
}

export function mapCategoryApiError(error: unknown, fallback = "Something went wrong. Please try again."): CategoryApiErrorResult {
  if (!isAxiosError(error)) return { status: null, fieldErrors: {}, formError: error instanceof Error && error.message ? error.message : fallback };
  if (!error.response) {
    return {
      status: null,
      fieldErrors: {},
      formError: "We couldn't reach the SofiaCart API. Check your connection and that the backend is running.",
    };
  }

  const { status } = error.response;
  const data = (error.response.data ?? {}) as { message?: unknown; errors?: unknown };
  const message = typeof data.message === "string" && data.message ? data.message : null;

  if (status === 422) {
    const errors = data.errors && typeof data.errors === "object" ? (data.errors as Record<string, string[] | string>) : {};
    const fieldErrors: Partial<Record<CategoryFormField, string>> = {};
    const unmapped: string[] = [];
    Object.entries(errors).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value[0] : value;
      if (!text) return;
      const field = CATEGORY_FIELD_MAP[key];
      if (!field) unmapped.push(text);
      else if (!fieldErrors[field]) fieldErrors[field] = text;
    });
    const formError =
      unmapped[0] ?? (Object.keys(fieldErrors).length ? "Please fix the highlighted fields and try again." : message ?? fallback);
    return { status, fieldErrors, formError };
  }

  if (status === 413) {
    return { status, fieldErrors: { image: "The image is too large for the server. Use an image under 2MB." }, formError: "The upload was rejected because it is too large." };
  }

  const formError =
    status === 401
      ? "Your session has expired. Please sign in again."
      : status === 403
        ? "You are not allowed to manage this category."
        : status === 404
          ? "This category no longer exists or doesn't belong to your store."
          : message ?? fallback;
  return { status, fieldErrors: {}, formError };
}

export function describeCategoryError(error: unknown, fallback?: string) {
  return mapCategoryApiError(error, fallback).formError ?? fallback ?? "Something went wrong. Please try again.";
}
