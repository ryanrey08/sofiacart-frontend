import { isAxiosError } from "axios";
import type { ProductResource } from "../types/index";
import type {
  InventoryAdjustValues,
  ProductFormValues,
  ProductVariantValues,
  ValidatedInventoryAdjust,
  ValidatedProductForm,
} from "./validation/product";

export type ProductFormField = keyof ProductFormValues;
export type ProductFormErrorPath = ProductFormField | `variants.${number}.${keyof ProductVariantValues}`;
export type InventoryAdjustField = keyof InventoryAdjustValues;

// Laravel request keys → product form fields. `merchant_id` is never sent: the backend
// derives the merchant from the authenticated token (InteractsWithMerchantScope).
const PRODUCT_FIELD_MAP: Record<string, ProductFormField> = {
  name: "name",
  slug: "slug",
  sku: "sku",
  description: "fullDescription",
  short_description: "shortDescription",
  full_description: "fullDescription",
  category_id: "categoryId",
  status: "status",
  price: "regularPrice",
  regular_price: "regularPrice",
  sale_price: "salePrice",
  cost_price: "costPrice",
  brand: "brand",
  condition: "condition",
  weight: "weight",
  tags: "tags",
  length: "length",
  width: "width",
  height: "height",
  track_inventory: "trackInventory",
  stock_quantity: "stockQuantity",
  low_stock_threshold: "lowStockThreshold",
  images: "images",
  main_image_index: "images",
  image_ids: "existingImages",
  main_image_id: "existingImages",
  variants: "variants",
};

const VARIANT_FIELD_MAP: Record<string, keyof ProductVariantValues> = {
  sku: "sku",
  color: "color",
  size: "size",
  price: "price",
  stock: "stock",
};

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  fullDescription: "",
  categoryId: "",
  status: "draft",
  regularPrice: "",
  salePrice: "",
  costPrice: "",
  brand: "",
  condition: "new",
  weight: "",
  tags: [],
  length: "",
  width: "",
  height: "",
  trackInventory: true,
  stockQuantity: "0",
  lowStockThreshold: "0",
  variants: [],
  existingImages: [],
  images: [],
  primaryImage: "",
};

export const emptyProductVariant: ProductVariantValues = { sku: "", color: "", size: "", price: "", stock: "0" };

export function parseTags(value: string) {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

export function formatTags(tags: string[]) {
  return tags.join(", ");
}

export function buildProductFormData(values: ValidatedProductForm, options: { update?: boolean } = {}) {
  const formData = new FormData();
  // PHP only parses multipart bodies on POST, so updates use Laravel method spoofing.
  if (options.update) formData.append("_method", "PATCH");

  formData.append("name", values.name);
  formData.append("slug", values.slug);
  formData.append("sku", values.sku);
  // `short_description` is `sometimes|required` on update, so an empty value is omitted instead of cleared.
  if (values.shortDescription) formData.append("short_description", values.shortDescription);
  // The controller copies `full_description` into `description`, so only the former is sent.
  formData.append("full_description", values.fullDescription);
  formData.append("category_id", values.categoryId);
  formData.append("status", values.status);
  formData.append("regular_price", values.regularPrice);
  formData.append("sale_price", values.salePrice);
  formData.append("cost_price", values.costPrice);
  formData.append("brand", values.brand);
  formData.append("condition", values.condition);
  formData.append("weight", values.weight);
  formData.append("length", values.length);
  formData.append("width", values.width);
  formData.append("height", values.height);
  formData.append("track_inventory", values.trackInventory ? "1" : "0");
  formData.append("stock_quantity", values.stockQuantity);
  formData.append("low_stock_threshold", values.lowStockThreshold);
  // Empty strings are converted to null by Laravel, which clears the nullable `tags` column.
  if (values.tags.length) values.tags.forEach((tag) => formData.append("tags[]", tag));
  else formData.append("tags", "");
  // Multipart cannot carry nested arrays, so the FormRequest json_decodes a `variants` string.
  formData.append(
    "variants",
    JSON.stringify(
      values.variants.map((variant, index) => ({
        sku: variant.sku,
        color: variant.color || null,
        size: variant.size || null,
        price: variant.price,
        stock: Number(variant.stock),
        sort_order: index,
      })),
    ),
  );

  if (values.images.length) {
    // Uploading files replaces the whole gallery; the primary is picked by upload index.
    values.images.forEach((file) => formData.append("images[]", file));
    const index = parsePrimaryImage(values.primaryImage, "new");
    formData.append("main_image_index", String(index !== null && index < values.images.length ? index : 0));
  } else if (options.update) {
    // Without new uploads the gallery is maintained by id: order = sort_order, omissions are deleted.
    values.existingImages.forEach((image) => formData.append("image_ids[]", String(image.id)));
    const mainId = parsePrimaryImage(values.primaryImage, "existing");
    if (mainId !== null && values.existingImages.some((image) => image.id === mainId)) {
      formData.append("main_image_id", String(mainId));
    }
  }

  return formData;
}

function parsePrimaryImage(value: string, kind: "new" | "existing") {
  const match = new RegExp(`^${kind}:(\\d+)$`).exec(value);
  return match ? Number(match[1]) : null;
}

export function buildInventoryAdjustPayload(productId: number, values: ValidatedInventoryAdjust) {
  return {
    product_id: productId,
    quantity_change: Number(values.quantityChange),
    reason: values.reason,
    notes: values.notes.trim() || null,
  };
}

function decimalToInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

export function productToFormValues(product: ProductResource): ProductFormValues {
  const existingImages = (product.image_items ?? []).map((image) => ({ id: image.id, path: image.path }));
  const main = (product.image_items ?? []).find((image) => image.is_main);

  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.short_description ?? "",
    fullDescription: product.full_description ?? product.description ?? "",
    categoryId: product.category_id ? String(product.category_id) : "",
    status: product.status,
    regularPrice: decimalToInput(product.regular_price ?? product.price),
    salePrice: decimalToInput(product.sale_price),
    costPrice: decimalToInput(product.cost_price),
    brand: product.brand ?? "",
    condition: product.condition ?? "",
    weight: decimalToInput(product.weight),
    tags: product.tags ?? [],
    length: decimalToInput(product.dimensions?.length),
    width: decimalToInput(product.dimensions?.width),
    height: decimalToInput(product.dimensions?.height),
    trackInventory: product.track_inventory ?? true,
    stockQuantity: String(product.stock_quantity),
    lowStockThreshold: String(product.low_stock_threshold ?? 0),
    variants: (product.variants ?? []).map((variant) => ({
      sku: variant.sku,
      color: variant.color ?? "",
      size: variant.size ?? "",
      price: decimalToInput(variant.price),
      stock: String(variant.stock),
    })),
    existingImages,
    images: [],
    primaryImage: main ? `existing:${main.id}` : existingImages[0] ? `existing:${existingImages[0].id}` : "",
  };
}

// Product images are stored on Laravel's `public` disk and returned as relative paths,
// served from APP_URL/storage after `php artisan storage:link`.
export function productImageUrl(path: string, apiBaseUrl: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl.replace(/\/+$/, "")}/storage/${path.replace(/^\/+/, "")}`;
}

export function primaryProductImage(product: ProductResource) {
  const main = product.image_items?.find((image) => image.is_main) ?? product.image_items?.[0];
  return main?.path ?? product.images?.[0] ?? null;
}

export interface ProductApiErrorResult {
  status: number | null;
  fieldErrors: Partial<Record<ProductFormErrorPath, string>>;
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
    const fieldErrors: Partial<Record<ProductFormErrorPath, string>> = {};
    const unmapped: string[] = [];

    Object.entries(errors).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value[0] : value;
      if (!text) return;
      const imageMatch = /^images\.(\d+)$/.exec(key);
      const variantMatch = /^variants\.(\d+)\.(\w+)$/.exec(key);
      let field: ProductFormErrorPath | undefined;
      if (imageMatch) field = "images";
      else if (/^tags\.\d+$/.test(key)) field = "tags";
      else if (variantMatch && VARIANT_FIELD_MAP[variantMatch[2]]) {
        field = `variants.${Number(variantMatch[1])}.${VARIANT_FIELD_MAP[variantMatch[2]]}` as ProductFormErrorPath;
      } else field = PRODUCT_FIELD_MAP[key];
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
  if (/^variants\.\d+\.sku$/.test(key) && taken) {
    return "This variant SKU is already in use. Variant SKUs must be unique across SofiaCart.";
  }
  if (imageIndex !== null) {
    const label = `Image ${imageIndex + 1}`;
    if (/failed to upload/i.test(message)) return `${label} failed to upload. The server may limit upload size; try a smaller file.`;
    return `${label}: ${message.replace(/^The images\.\d+ (field )?/i, "")}`;
  }
  return message;
}
