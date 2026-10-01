import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError } from "axios";
import {
  buildInventoryAdjustPayload,
  buildProductFormData,
  emptyProductFormValues,
  formatTags,
  mapInventoryApiError,
  mapProductApiError,
  parseTags,
  primaryProductImage,
  productImageUrl,
  productToFormValues,
} from "../lib/merchant-products.ts";
import { inventoryAdjustSchema, productFormSchema } from "../lib/validation/product.ts";

const validValues = () => ({
  ...emptyProductFormValues,
  name: "Fresh Apples",
  slug: "fresh-apples",
  sku: "SKU-APPLE-001",
  shortDescription: "Crisp and sweet",
  fullDescription: "Crisp and sweet apples",
  categoryId: "3",
  status: "active",
  regularPrice: "99.50",
  salePrice: "79.50",
  costPrice: "40.00",
  brand: "Sofia Farms",
  condition: "new",
  weight: "1.250",
  tags: ["fruit", "fresh"],
  length: "10.00",
  width: "8.50",
  height: "6.00",
  trackInventory: true,
  stockQuantity: "25",
  lowStockThreshold: "5",
  images: [new File(["img"], "apple.jpg", { type: "image/jpeg" })],
});

const apiProduct = (overrides = {}) => ({
  id: 1,
  merchant_id: 2,
  category_id: null,
  name: "Tea",
  slug: "tea",
  sku: "TEA-1",
  description: "Loose leaf tea",
  short_description: "Loose leaf",
  full_description: "Loose leaf tea",
  status: "draft",
  price: "120.00",
  regular_price: "120.00",
  sale_price: null,
  cost_price: null,
  brand: null,
  condition: null,
  weight: null,
  tags: [],
  track_inventory: true,
  stock_quantity: 4,
  low_stock_threshold: 2,
  stock_status: "active",
  dimensions: { length: null, width: null, height: null },
  images: ["products/2/tea.png"],
  image_items: [{ id: 9, path: "products/2/tea.png", is_main: true, sort_order: 0 }],
  variants: [],
  created_at: null,
  updated_at: null,
  ...overrides,
});

const apiError = (status, data) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, { status, data, statusText: "", headers: {}, config: {} });

test("product schema accepts values matching StoreProductRequest", () => {
  assert.equal(productFormSchema.safeParse(validValues()).success, true);
  assert.equal(
    productFormSchema.safeParse({ ...validValues(), categoryId: "", salePrice: "", costPrice: "", weight: "", tags: [], images: [] }).success,
    true,
  );
});

test("product schema enforces required fields, slug syntax, numeric limits and status enum", () => {
  const result = productFormSchema.safeParse({
    ...validValues(),
    name: "",
    slug: "Fresh Apples",
    sku: " ",
    status: "published",
    regularPrice: "-1",
    stockQuantity: "2.5",
    lowStockThreshold: "",
  });
  assert.equal(result.success, false);
  const paths = new Set(result.error.issues.map((issue) => issue.path.join(".")));
  assert.deepEqual([...paths].sort(), ["lowStockThreshold", "name", "regularPrice", "sku", "slug", "status", "stockQuantity"]);
  assert.equal(productFormSchema.safeParse({ ...validValues(), name: "x".repeat(256) }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), regularPrice: "1.999" }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), shortDescription: "x".repeat(201) }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), fullDescription: "x".repeat(2001) }).success, false);
});

test("product schema mirrors sale_price lte:regular_price and distinct variant SKUs", () => {
  const overpriced = productFormSchema.safeParse({ ...validValues(), regularPrice: "50.00", salePrice: "60.00" });
  assert.equal(overpriced.success, false);
  assert.equal(overpriced.error.issues[0].path.join("."), "salePrice");

  const duplicates = productFormSchema.safeParse({
    ...validValues(),
    variants: [
      { sku: "VAR-1", color: "Red", size: "S", price: "10.00", stock: "2" },
      { sku: "var-1", color: "Blue", size: "M", price: "10.00", stock: "2" },
    ],
  });
  assert.equal(duplicates.success, false);
  assert.equal(duplicates.error.issues[0].path.join("."), "variants.1.sku");

  const missingVariantPrice = productFormSchema.safeParse({
    ...validValues(),
    variants: [{ sku: "VAR-1", color: "", size: "", price: "", stock: "" }],
  });
  assert.equal(missingVariantPrice.success, false);
});

test("product schema rejects unsupported image types and images over 5120 KB", () => {
  const gif = new File(["gif"], "a.gif", { type: "image/gif" });
  const webp = new File(["webp"], "a.webp", { type: "image/webp" });
  const big = new File([new Uint8Array(5120 * 1024 + 1)], "big.png", { type: "image/png" });
  const edge = new File([new Uint8Array(5120 * 1024)], "edge.png", { type: "image/png" });
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [gif] }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [webp] }).success, true);
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [big] }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [edge] }).success, true);
});

test("create multipart payload uses Laravel keys, images[] and never sends merchant_id", () => {
  const values = productFormSchema.parse({
    ...validValues(),
    images: [...validValues().images, new File(["b"], "b.png", { type: "image/png" })],
    primaryImage: "new:1",
    variants: [{ sku: "VAR-1", color: "Red", size: "S", price: "10.00", stock: "2" }],
  });
  const form = buildProductFormData(values);

  assert.equal(form.get("merchant_id"), null);
  assert.equal(form.get("_method"), null);
  assert.equal(form.get("name"), "Fresh Apples");
  assert.equal(form.get("short_description"), "Crisp and sweet");
  assert.equal(form.get("full_description"), "Crisp and sweet apples");
  assert.equal(form.get("regular_price"), "99.50");
  assert.equal(form.get("sale_price"), "79.50");
  assert.equal(form.get("cost_price"), "40.00");
  assert.equal(form.get("brand"), "Sofia Farms");
  assert.equal(form.get("condition"), "new");
  assert.equal(form.get("weight"), "1.250");
  assert.deepEqual(form.getAll("tags[]"), ["fruit", "fresh"]);
  assert.equal(form.get("length"), "10.00");
  assert.equal(form.get("width"), "8.50");
  assert.equal(form.get("height"), "6.00");
  assert.equal(form.get("track_inventory"), "1");
  assert.equal(form.get("stock_quantity"), "25");
  assert.equal(form.get("low_stock_threshold"), "5");
  assert.deepEqual(JSON.parse(form.get("variants")), [
    { sku: "VAR-1", color: "Red", size: "S", price: "10.00", stock: 2, sort_order: 0 },
  ]);
  assert.deepEqual(form.getAll("images[]").map((file) => file.name), ["apple.jpg", "b.png"]);
  assert.equal(form.get("main_image_index"), "1");
  assert.equal(form.get("image_ids[]"), null);
});

test("empty optional values clear nullable columns and an untracked inventory flag is sent as 0", () => {
  const form = buildProductFormData(
    productFormSchema.parse({ ...validValues(), shortDescription: "", salePrice: "", weight: "", tags: [], trackInventory: false }),
  );
  assert.equal(form.get("short_description"), null);
  assert.equal(form.get("sale_price"), "");
  assert.equal(form.get("weight"), "");
  assert.equal(form.get("tags"), "");
  assert.deepEqual(form.getAll("tags[]"), []);
  assert.equal(form.get("track_inventory"), "0");
});

test("update multipart payload spoofs PATCH and maintains the gallery by image id", () => {
  const form = buildProductFormData(
    productFormSchema.parse({
      ...validValues(),
      images: [],
      existingImages: [
        { id: 7, path: "products/2/b.png" },
        { id: 5, path: "products/2/a.png" },
      ],
      primaryImage: "existing:5",
    }),
    { update: true },
  );
  assert.equal(form.get("_method"), "PATCH");
  assert.equal(form.getAll("images[]").length, 0);
  assert.deepEqual(form.getAll("image_ids[]"), ["7", "5"]);
  assert.equal(form.get("main_image_id"), "5");
  assert.equal(form.get("main_image_index"), null);
});

test("uploading on update replaces the gallery, so image ids are not sent", () => {
  const form = buildProductFormData(
    productFormSchema.parse({ ...validValues(), existingImages: [{ id: 7, path: "products/2/b.png" }], primaryImage: "existing:7" }),
    { update: true },
  );
  assert.equal(form.getAll("images[]").length, 1);
  assert.equal(form.get("image_ids[]"), null);
  assert.equal(form.get("main_image_index"), "0");
});

test("ProductResource maps back to form values", () => {
  const values = productToFormValues(
    apiProduct({
      category_id: 3,
      sale_price: "99.00",
      cost_price: "60.00",
      brand: "Sofia",
      condition: "used",
      weight: "0.500",
      tags: ["tea"],
      dimensions: { length: "1.00", width: "2.00", height: "3.00" },
      variants: [{ id: 4, sku: "TEA-S", color: "Green", size: "S", attributes: null, price: "130.00", stock: 2, sort_order: 0 }],
    }),
  );
  assert.deepEqual(values, {
    name: "Tea",
    slug: "tea",
    sku: "TEA-1",
    shortDescription: "Loose leaf",
    fullDescription: "Loose leaf tea",
    categoryId: "3",
    status: "draft",
    regularPrice: "120.00",
    salePrice: "99.00",
    costPrice: "60.00",
    brand: "Sofia",
    condition: "used",
    weight: "0.500",
    tags: ["tea"],
    length: "1.00",
    width: "2.00",
    height: "3.00",
    trackInventory: true,
    stockQuantity: "4",
    lowStockThreshold: "2",
    variants: [{ sku: "TEA-S", color: "Green", size: "S", price: "130.00", stock: "2" }],
    existingImages: [{ id: 9, path: "products/2/tea.png" }],
    images: [],
    primaryImage: "existing:9",
  });
  assert.equal(productFormSchema.safeParse(values).success, true);
});

test("tags round-trip through the comma separated input", () => {
  assert.deepEqual(parseTags(" fruit, fresh ,, fruit "), ["fruit", "fresh"]);
  assert.equal(formatTags(["fruit", "fresh"]), "fruit, fresh");
});

test("the primary image falls back to the first record and then the legacy path list", () => {
  assert.equal(
    primaryProductImage(
      apiProduct({
        image_items: [
          { id: 1, path: "products/2/a.png", is_main: false, sort_order: 0 },
          { id: 2, path: "products/2/b.png", is_main: true, sort_order: 1 },
        ],
      }),
    ),
    "products/2/b.png",
  );
  assert.equal(primaryProductImage(apiProduct({ image_items: [] })), "products/2/tea.png");
  assert.equal(primaryProductImage(apiProduct({ image_items: [], images: null })), null);
});

test("image paths resolve against the Laravel public storage URL", () => {
  assert.equal(productImageUrl("products/2/a.png", "http://localhost:8000/"), "http://localhost:8000/storage/products/2/a.png");
  assert.equal(productImageUrl("https://cdn.example.com/a.png", "http://localhost:8000"), "https://cdn.example.com/a.png");
});

test("422 duplicate SKU/slug, image, variant and pricing errors map to form fields", () => {
  const result = mapProductApiError(
    apiError(422, {
      message: "The sku has already been taken. (and 4 more errors)",
      errors: {
        sku: ["The sku has already been taken."],
        slug: ["The slug has already been taken."],
        "images.1": ["The images.1 failed to upload."],
        sale_price: ["The sale price must be less than or equal to regular price."],
        "variants.0.sku": ["The variants.0.sku has already been taken."],
        low_stock_threshold: ["The low stock threshold must be an integer."],
      },
    }),
  );
  assert.equal(result.status, 422);
  assert.match(result.fieldErrors.sku, /SKU is already used/);
  assert.match(result.fieldErrors.slug, /slug is already used/);
  assert.match(result.fieldErrors.images, /^Image 2 failed to upload/);
  assert.match(result.fieldErrors.salePrice, /less than or equal/);
  assert.match(result.fieldErrors["variants.0.sku"], /variant SKU is already in use/);
  assert.match(result.fieldErrors.lowStockThreshold, /must be an integer/);
  assert.equal(result.formError, "Please fix the highlighted fields and try again.");
});

test("non-field 422s, foreign categories, oversize uploads and network failures give clear messages", () => {
  const merchant = mapProductApiError(
    apiError(422, { message: "x", errors: { merchant: ["The authenticated user is not linked to a merchant account."] } }),
  );
  assert.equal(merchant.formError, "The authenticated user is not linked to a merchant account.");

  const category = mapProductApiError(apiError(404, { message: "No query results for model [App\\Models\\Category] 9" }));
  assert.match(category.fieldErrors.categoryId, /not available for your store/);

  assert.match(mapProductApiError(apiError(404, { message: "No query results for model [App\\Models\\Product] 9" })).formError, /doesn't belong to your store/);
  assert.match(mapProductApiError(apiError(413, "")).fieldErrors.images, /too large/);
  assert.match(mapProductApiError(new AxiosError("Network Error", "ERR_NETWORK")).formError, /couldn't reach the SofiaCart API/);
});

test("inventory adjustment schema and payload follow AdjustInventoryRequest", () => {
  assert.equal(inventoryAdjustSchema.safeParse({ quantityChange: "0", reason: "restock", notes: "" }).success, false);
  assert.equal(inventoryAdjustSchema.safeParse({ quantityChange: "1.5", reason: "restock", notes: "" }).success, false);
  assert.equal(inventoryAdjustSchema.safeParse({ quantityChange: "5", reason: "", notes: "" }).success, false);
  const values = inventoryAdjustSchema.parse({ quantityChange: "-3", reason: " damage ", notes: "  " });
  assert.deepEqual(buildInventoryAdjustPayload(7, values), { product_id: 7, quantity_change: -3, reason: "damage", notes: null });
});

test("inventory 422 errors map to adjustment fields", () => {
  const result = mapInventoryApiError(apiError(422, { message: "x", errors: { quantity_change: ["The resulting stock cannot be negative."] } }));
  assert.equal(result.fieldErrors.quantityChange, "The resulting stock cannot be negative.");
});
