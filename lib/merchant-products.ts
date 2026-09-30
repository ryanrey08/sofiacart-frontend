import { isAxiosError } from "axios";
import type { ProductResource } from "../types/index";
import type { InventoryAdjustValues, ProductFormValues, ValidatedInventoryAdjust, ValidatedProductForm } from "./validation/product";

export type ProductFormField = keyof ProductFormValues;
export type InventoryAdjustField = keyof InventoryAdjustValues;

// Laravel request keys → product form fields. `merchant_id` is never sent: the backend
// derives the merchant from the authenticated token (InteractsWithMerchantScope).
const PRODUCT_FIELD_MAP: Record<string, ProductFormField> = {
  name: "name",
  slug: "slug",
  sku: "sku",
  description: "description",
  category_id: "categoryId",
  status: "status",
  price: "price",
  stock_quantity: "stockQuantity",
  images: "images",
};

export function buildProductFormData(values: ValidatedProductForm, options: { update?: boolean } = {}) {
  const formData = new FormData();
  // PHP only parses multipart bodies on POST, so updates use Laravel method spoofing.
  if (options.update) formData.append("_method", "PATCH");

  formData.append("name", values.name);
  formData.append("slug", values.slug);
  formData.append("sku", values.sku);
  formData.append("description", values.description.trim());
  formData.append("category_id", values.categoryId);
  formData.append("status", values.status);
  formData.append("price", values.price);
  formData.append("stock_quantity", values.stockQuantity);
  values.images.forEach((file) => formData.append("images[]", file));

  return formData;
}

export function buildInventoryAdjustPayload(productId: number, values: ValidatedInventoryAdjust) {
  return {
    product_id: productId,
    quantity_change: Number(values.quantityChange),
    reason: values.reason,
    notes: values.notes.trim() || null,
  };
}

export function productToFormValues(product: ProductResource): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description ?? "",
    categoryId: product.category_id ? String(product.category_id) : "",
    status: product.status,
    price: String(product.price),
    stockQuantity: String(product.stock_quantity),
    images: [],
  };
}

// Product images are stored on Laravel's `public` disk and returned as relative paths,
// served from APP_URL/storage after `php artisan storage:link`.
export function productImageUrl(path: string, apiBaseUrl: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl.replace(/\/+$/, "")}/storage/${path.replace(/^\/+/, "")}`;
}

export interface ProductApiErrorResult {
  status: number | null;
  fieldErrors: Partial<Record<ProductFormField, string>>;
  formError: string | null;
}

export function describeApiError(error: unknown, fallback = "Something went wrong. Please try again.") {
  return mapProductApiError(error, fallback).formError ?? fallback;
}

export function mapProductApiError(error: unknown, fallback = "Something went wrong. Please try again."): ProductApiErrorResult {
  if (!isAxiosError(error)) return { status: null, fieldErrors: {}, formError: fallback };
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
    const fieldErrors: Partial<Record<ProductFormField, string>> = {};
    const unmapped: string[] = [];

    Object.entries(errors).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value[0] : value;
      if (!text) return;
      const imageMatch = /^images\.(\d+)$/.exec(key);
      const field = imageMatch ? "images" : PRODUCT_FIELD_MAP[key];
      if (!field) {
        unmapped.push(text);
        return;
      }
      if (fieldErrors[field]) return;
      fieldErrors[field] = friendlyFieldMessage(key, text, imageMatch ? Number(imageMatch[1]) : null);
    });

    const formError =
      unmapped[0] ??
      (Object.keys(fieldErrors).length ? "Please fix the highlighted fields and try again." : message ?? "The product could not be saved.");
    return { status, fieldErrors, formError };
  }

  if (status === 404 && message?.includes("Category")) {
    return { status, fieldErrors: { categoryId: "This category is not available for your store." }, formError: "Choose one of your store's categories." };
  }

  if (status === 413) {
    return {
      status,
      fieldErrors: { images: "The upload is too large for the server. Use smaller images or upload fewer at once." },
      formError: "The upload was rejected because it is too large.",
    };
  }

  const formError =
    status === 401
      ? "Your session has expired. Please sign in again."
      : status === 403
        ? "You are not allowed to manage this product."
        : status === 404
          ? "This product no longer exists or doesn't belong to your store."
          : message ?? fallback;

  return { status, fieldErrors: {}, formError };
}

const INVENTORY_FIELD_MAP: Record<string, InventoryAdjustField> = {
  quantity_change: "quantityChange",
  reason: "reason",
  notes: "notes",
};

export function mapInventoryApiError(error: unknown): {
  fieldErrors: Partial<Record<InventoryAdjustField, string>>;
  formError: string | null;
} {
  const errors =
    isAxiosError(error) && error.response?.status === 422
      ? ((error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors ?? {})
      : {};
  const fieldErrors: Partial<Record<InventoryAdjustField, string>> = {};
  Object.entries(errors).forEach(([key, value]) => {
    const field = INVENTORY_FIELD_MAP[key];
    if (field && value?.[0] && !fieldErrors[field]) fieldErrors[field] = value[0];
  });

  if (Object.keys(fieldErrors).length) return { fieldErrors, formError: "Please fix the highlighted fields and try again." };
  return { fieldErrors, formError: describeApiError(error, "Stock could not be adjusted.") };
}

function friendlyFieldMessage(key: string, message: string, imageIndex: number | null) {
  const taken = /already been taken/i.test(message);
  if (key === "sku" && taken) return "This SKU is already used by another product. SKUs must be unique across SofiaCart.";
  if (key === "slug" && taken) return "This slug is already used by another product. Choose a different slug.";
  if (imageIndex !== null) {
    const label = `Image ${imageIndex + 1}`;
    if (/failed to upload/i.test(message)) return `${label} failed to upload. The server may limit upload size; try a smaller file.`;
    return `${label}: ${message.replace(/^The images\.\d+ (field )?/i, "")}`;
  }
  return message;
}
