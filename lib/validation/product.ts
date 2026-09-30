import { z } from "zod";

// Mirrors sofiacart-backend StoreProductRequest / UpdateProductRequest and AdjustInventoryRequest.
export const PRODUCT_STATUSES = ["pending_approval", "active", "draft", "archived", "rejected"] as const;
// `rejected` is a moderation outcome; merchants only keep it when the product already has it.
export const MERCHANT_SELECTABLE_PRODUCT_STATUSES = ["draft", "pending_approval", "active", "archived"] as const;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const PRODUCT_IMAGE_MAX_KB = 5120;
// products.price is decimal(12,2); products.stock_quantity is an unsigned integer.
export const PRODUCT_PRICE_MAX = 9999999999.99;
export const PRODUCT_STOCK_MAX = 4294967295;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isFile = (value: unknown): value is File => typeof File !== "undefined" && value instanceof File;

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(255, "Product name may not be longer than 255 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255, "Slug may not be longer than 255 characters")
    .regex(slugPattern, "Use lowercase letters, numbers, and single hyphens (e.g. fresh-apples)"),
  sku: z.string().trim().min(1, "SKU is required").max(255, "SKU may not be longer than 255 characters"),
  description: z.string(),
  categoryId: z.string().regex(/^\d*$/, "Select a valid category"),
  status: z.enum(PRODUCT_STATUSES, { message: "Select a valid status" }),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .regex(/^\d+(?:\.\d{1,2})?$/, "Enter a price of 0 or more with up to 2 decimal places")
    .refine((value) => Number(value) <= PRODUCT_PRICE_MAX, "Price is too large"),
  stockQuantity: z
    .string()
    .trim()
    .min(1, "Stock quantity is required")
    .regex(/^\d+$/, "Stock quantity must be a whole number of 0 or more")
    .refine((value) => Number(value) <= PRODUCT_STOCK_MAX, "Stock quantity is too large"),
  images: z
    .array(z.custom<File>(isFile, "Upload image files only"))
    .refine((files) => files.every((file) => PRODUCT_IMAGE_TYPES.includes(file.type)), "Images must be JPG or PNG files")
    .refine(
      (files) => files.every((file) => file.size <= PRODUCT_IMAGE_MAX_KB * 1024),
      `Each image must be no larger than ${PRODUCT_IMAGE_MAX_KB} KB (5 MB)`,
    ),
});

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ValidatedProductForm = z.output<typeof productFormSchema>;

export const inventoryAdjustSchema = z.object({
  quantityChange: z
    .string()
    .trim()
    .regex(/^-?\d+$/, "Enter a whole number, e.g. 5 to add or -3 to remove")
    .refine((value) => Number(value) !== 0, "Quantity change cannot be 0"),
  reason: z.string().trim().min(1, "Reason is required").max(255, "Reason may not be longer than 255 characters"),
  notes: z.string(),
});

export type InventoryAdjustValues = z.input<typeof inventoryAdjustSchema>;
export type ValidatedInventoryAdjust = z.output<typeof inventoryAdjustSchema>;
