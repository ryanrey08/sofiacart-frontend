import { z } from "zod";

// Mirrors sofiacart-backend StoreProductRequest / UpdateProductRequest and AdjustInventoryRequest.
export const PRODUCT_STATUSES = ["pending_approval", "active", "draft", "archived", "rejected"] as const;
// `rejected` is a moderation outcome; merchants only keep it when the product already has it.
export const MERCHANT_SELECTABLE_PRODUCT_STATUSES = ["draft", "pending_approval", "active", "archived"] as const;
export const PRODUCT_STOCK_STATUSES = ["active", "low_stock", "out_of_stock"] as const;
// images.* => ['image','mimes:jpg,jpeg,png,webp','max:5120']
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PRODUCT_IMAGE_MAX_KB = 5120;
// products.price/regular_price/sale_price/cost_price are decimal(12,2); stock columns are unsigned integers.
export const PRODUCT_PRICE_MAX = 9999999999.99;
export const PRODUCT_STOCK_MAX = 4294967295;
// weight is decimal(10,3); length/width/height are decimal(10,2).
export const PRODUCT_WEIGHT_MAX = 9999999.999;
export const PRODUCT_DIMENSION_MAX = 99999999.99;
export const PRODUCT_SHORT_DESCRIPTION_MAX = 200;
export const PRODUCT_FULL_DESCRIPTION_MAX = 2000;
// `condition` is free text (max 100) on the backend; these are the options the UI offers.
export const PRODUCT_CONDITIONS = ["new", "used", "refurbished"] as const;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isFile = (value: unknown): value is File => typeof File !== "undefined" && value instanceof File;

const decimalString = (label: string, max: number, decimals = 2) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^$|^\\d+(?:\\.\\d{1,${decimals}})?$`), `${label} must be 0 or more with up to ${decimals} decimal places`)
    .refine((value) => value === "" || Number(value) <= max, `${label} is too large`);

const integerString = (label: string, max: number) =>
  z
    .string()
    .trim()
    .regex(/^$|^\d+$/, `${label} must be a whole number of 0 or more`)
    .refine((value) => value === "" || Number(value) <= max, `${label} is too large`);

export const productVariantSchema = z.object({
  sku: z.string().trim().min(1, "Variant SKU is required").max(255, "Variant SKU may not be longer than 255 characters"),
  color: z.string().trim().max(100, "Colour may not be longer than 100 characters"),
  size: z.string().trim().max(100, "Size may not be longer than 100 characters"),
  price: decimalString("Variant price", PRODUCT_PRICE_MAX).refine((value) => value !== "", "Variant price is required"),
  stock: integerString("Variant stock", PRODUCT_STOCK_MAX).refine((value) => value !== "", "Variant stock is required"),
});

// Existing product_images rows kept by an update; the order of this list becomes `sort_order`.
export const productExistingImageSchema = z.object({
  id: z.number(),
  path: z.string(),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required").max(255, "Product name may not be longer than 255 characters"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .max(255, "Slug may not be longer than 255 characters")
      .regex(slugPattern, "Use lowercase letters, numbers, and single hyphens (e.g. fresh-apples)"),
    sku: z.string().trim().min(1, "SKU is required").max(255, "SKU may not be longer than 255 characters"),
    shortDescription: z
      .string()
      .trim()
      .max(PRODUCT_SHORT_DESCRIPTION_MAX, `Short description may not be longer than ${PRODUCT_SHORT_DESCRIPTION_MAX} characters`),
    fullDescription: z
      .string()
      .trim()
      .max(PRODUCT_FULL_DESCRIPTION_MAX, `Full description may not be longer than ${PRODUCT_FULL_DESCRIPTION_MAX} characters`),
    categoryId: z.string().regex(/^\d*$/, "Select a valid category"),
    status: z.enum(PRODUCT_STATUSES, { message: "Select a valid status" }),
    regularPrice: decimalString("Regular price", PRODUCT_PRICE_MAX).refine((value) => value !== "", "Regular price is required"),
    salePrice: decimalString("Sale price", PRODUCT_PRICE_MAX),
    costPrice: decimalString("Cost price", PRODUCT_PRICE_MAX),
    brand: z.string().trim().max(255, "Brand may not be longer than 255 characters"),
    condition: z.string().trim().max(100, "Condition may not be longer than 100 characters"),
    weight: decimalString("Weight", PRODUCT_WEIGHT_MAX, 3),
    tags: z.array(z.string().trim().min(1, "Tags cannot be empty").max(100, "Each tag may not be longer than 100 characters")),
    length: decimalString("Length", PRODUCT_DIMENSION_MAX),
    width: decimalString("Width", PRODUCT_DIMENSION_MAX),
    height: decimalString("Height", PRODUCT_DIMENSION_MAX),
    trackInventory: z.boolean(),
    stockQuantity: integerString("Stock quantity", PRODUCT_STOCK_MAX).refine((value) => value !== "", "Stock quantity is required"),
    lowStockThreshold: integerString("Low stock threshold", PRODUCT_STOCK_MAX).refine(
      (value) => value !== "",
      "Low stock threshold is required",
    ),
    variants: z.array(productVariantSchema),
    existingImages: z.array(productExistingImageSchema),
    images: z
      .array(z.custom<File>(isFile, "Upload image files only"))
      .refine((files) => files.every((file) => PRODUCT_IMAGE_TYPES.includes(file.type)), "Images must be JPG, PNG or WebP files")
      .refine(
        (files) => files.every((file) => file.size <= PRODUCT_IMAGE_MAX_KB * 1024),
        `Each image must be no larger than ${PRODUCT_IMAGE_MAX_KB} KB (5 MB)`,
      ),
    // "new:<index>" for an uploaded file, "existing:<id>" for a kept product_images row, "" for the first image.
    primaryImage: z.string(),
  })
  .superRefine((values, ctx) => {
    // Backend: 'sale_price' => ['nullable','numeric','min:0','lte:regular_price'].
    if (values.salePrice !== "" && values.regularPrice !== "" && Number(values.salePrice) > Number(values.regularPrice)) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be less than or equal to the regular price" });
    }
    // Backend: 'variants.*.sku' => [...,'distinct'] and product_variants.sku is unique.
    const seen = new Set<string>();
    values.variants.forEach((variant, index) => {
      const sku = variant.sku.trim().toLowerCase();
      if (!sku) return;
      if (seen.has(sku)) {
        ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "Each variant needs a unique SKU" });
      }
      seen.add(sku);
    });
  });

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ValidatedProductForm = z.output<typeof productFormSchema>;
export type ProductVariantValues = z.input<typeof productVariantSchema>;
export type ProductExistingImage = z.input<typeof productExistingImageSchema>;

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
