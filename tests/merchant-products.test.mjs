import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError } from "axios";
import {
  buildInventoryAdjustPayload,
  buildProductFormData,
  mapInventoryApiError,
  mapProductApiError,
  productImageUrl,
  productToFormValues,
} from "../lib/merchant-products.ts";
import { inventoryAdjustSchema, productFormSchema } from "../lib/validation/product.ts";

const validValues = () => ({
  name: "Fresh Apples",
  slug: "fresh-apples",
  sku: "SKU-APPLE-001",
  description: "Crisp and sweet apples",
  categoryId: "3",
  status: "active",
  price: "99.50",
  stockQuantity: "25",
  images: [new File(["img"], "apple.jpg", { type: "image/jpeg" })],
});

const apiError = (status, data) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, { status, data, statusText: "", headers: {}, config: {} });

test("product schema accepts values matching StoreProductRequest", () => {
  assert.equal(productFormSchema.safeParse(validValues()).success, true);
  assert.equal(productFormSchema.safeParse({ ...validValues(), categoryId: "", description: "", images: [] }).success, true);
});

test("product schema enforces required fields, slug syntax, numeric limits and status enum", () => {
  const result = productFormSchema.safeParse({
    ...validValues(),
    name: "",
    slug: "Fresh Apples",
    sku: " ",
    status: "published",
    price: "-1",
    stockQuantity: "2.5",
  });
  assert.equal(result.success, false);
  const paths = new Set(result.error.issues.map((issue) => issue.path.join(".")));
  assert.deepEqual([...paths].sort(), ["name", "price", "sku", "slug", "status", "stockQuantity"]);
  assert.equal(productFormSchema.safeParse({ ...validValues(), name: "x".repeat(256) }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), price: "1.999" }).success, false);
});

test("product schema rejects non JPG/PNG images and images over 5120 KB", () => {
  const gif = new File(["gif"], "a.gif", { type: "image/gif" });
  const big = new File([new Uint8Array(5120 * 1024 + 1)], "big.png", { type: "image/png" });
  const edge = new File([new Uint8Array(5120 * 1024)], "edge.png", { type: "image/png" });
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [gif] }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [big] }).success, false);
  assert.equal(productFormSchema.safeParse({ ...validValues(), images: [edge] }).success, true);
});

test("create multipart payload uses Laravel keys, images[] and never sends merchant_id", () => {
  const values = productFormSchema.parse({
    ...validValues(),
    images: [...validValues().images, new File(["b"], "b.png", { type: "image/png" })],
  });
  const form = buildProductFormData(values);
  assert.deepEqual([...form.keys()], [
    "name",
    "slug",
    "sku",
    "description",
    "category_id",
    "status",
    "price",
    "stock_quantity",
    "images[]",
    "images[]",
  ]);
  assert.equal(form.get("merchant_id"), null);
  assert.equal(form.get("_method"), null);
  assert.deepEqual(form.getAll("images[]").map((file) => file.name), ["apple.jpg", "b.png"]);
  assert.equal(form.get("stock_quantity"), "25");
});

test("update multipart payload spoofs PATCH and omits images when none are chosen", () => {
  const form = buildProductFormData(productFormSchema.parse({ ...validValues(), images: [] }), { update: true });
  assert.equal(form.get("_method"), "PATCH");
  assert.equal(form.getAll("images[]").length, 0);
});

test("ProductResource maps back to form values", () => {
  const values = productToFormValues({
    id: 1,
    merchant_id: 2,
    category_id: null,
    name: "Tea",
    slug: "tea",
    sku: "TEA-1",
    description: null,
    status: "draft",
    price: "120.00",
    stock_quantity: 4,
    images: ["products/2/tea.png"],
    created_at: null,
    updated_at: null,
  });
  assert.deepEqual(values, {
    name: "Tea",
    slug: "tea",
    sku: "TEA-1",
    description: "",
    categoryId: "",
    status: "draft",
    price: "120.00",
    stockQuantity: "4",
    images: [],
  });
  assert.equal(productFormSchema.safeParse(values).success, true);
});

test("image paths resolve against the Laravel public storage URL", () => {
  assert.equal(productImageUrl("products/2/a.png", "http://localhost:8000/"), "http://localhost:8000/storage/products/2/a.png");
  assert.equal(productImageUrl("https://cdn.example.com/a.png", "http://localhost:8000"), "https://cdn.example.com/a.png");
});

test("422 duplicate SKU/slug and image errors map to form fields", () => {
  const result = mapProductApiError(
    apiError(422, {
      message: "The sku has already been taken. (and 2 more errors)",
      errors: {
        sku: ["The sku has already been taken."],
        slug: ["The slug has already been taken."],
        "images.1": ["The images.1 failed to upload."],
      },
    }),
  );
  assert.equal(result.status, 422);
  assert.match(result.fieldErrors.sku, /SKU is already used/);
  assert.match(result.fieldErrors.slug, /slug is already used/);
  assert.match(result.fieldErrors.images, /^Image 2 failed to upload/);
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
