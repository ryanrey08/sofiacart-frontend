import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError } from "axios";
import {
  buildCategoryListParams,
  buildCategoryPayload,
  categoryImagePath,
  categoryToFormValues,
  emptyCategoryFormValues,
  isCategoryActive,
  mapCategoryApiError,
  nextSort,
  normalizeCategoryStats,
  paginationPages,
  showingRange,
} from "../lib/merchant-categories.ts";
import { categoryFormSchema, categoryImageError, richTextLength, richTextToPlainText } from "../lib/validation/category.ts";

const validValues = () => ({ ...emptyCategoryFormValues, name: "Home & Living", slug: "home-living" });

function axiosError(status, data) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status, data, statusText: "", headers: {}, config: {} });
}

test("list params drop empty filters and pair sort with a direction", () => {
  assert.deepEqual(buildCategoryListParams({}), { page: 1, per_page: 10 });
  assert.deepEqual(
    buildCategoryListParams({ search: "  shoes ", status: "inactive", parentId: 4, sort: "products_count", direction: "desc", page: 3, perPage: 20 }),
    { page: 3, per_page: 20, search: "shoes", status: "inactive", parent_id: 4, sort: "products_count", direction: "desc" },
  );
  assert.deepEqual(buildCategoryListParams({ search: "   ", status: "", parentId: null, page: 0 }), { page: 1, per_page: 10 });
});

test("header sorting flips direction and starts names ascending, counts and dates descending", () => {
  assert.deepEqual(nextSort({ sort: "name", direction: "asc" }, "name"), { sort: "name", direction: "desc" });
  assert.deepEqual(nextSort({ sort: "name", direction: "asc" }, "products_count"), { sort: "products_count", direction: "desc" });
  assert.deepEqual(nextSort({ sort: "created_at", direction: "desc" }, "name"), { sort: "name", direction: "asc" });
});

test("schema validates slug format, numbers, description text length and the image", () => {
  assert.equal(categoryFormSchema.safeParse(validValues()).success, true);
  const issues = (values) => categoryFormSchema.safeParse(values).error?.issues.map((issue) => issue.path[0]) ?? [];
  assert.deepEqual(issues({ ...validValues(), name: " " }), ["name"]);
  assert.deepEqual(issues({ ...validValues(), slug: "Home Living" }), ["slug"]);
  assert.deepEqual(issues({ ...validValues(), slug: "home--living" }), ["slug"]);
  assert.deepEqual(issues({ ...validValues(), sortOrder: "-1" }), ["sortOrder"]);
  assert.deepEqual(issues({ ...validValues(), description: `<p><b>${"a".repeat(500)}</b></p>` }), []);
  assert.deepEqual(issues({ ...validValues(), description: `<p>${"a".repeat(501)}</p>` }), ["description"]);
  const big = new File([new Uint8Array(2048 * 1024 + 1)], "big.png", { type: "image/png" });
  assert.deepEqual(issues({ ...validValues(), image: big }), ["image"]);
  const ok = new File([new Uint8Array(10)], "ok.webp", { type: "image/webp" });
  assert.deepEqual(issues({ ...validValues(), image: ok }), []);
});

test("image checks allow PNG/JPG/WEBP up to 2MB", () => {
  assert.equal(categoryImageError({ type: "image/jpeg", size: 2048 * 1024 }), null);
  assert.match(categoryImageError({ type: "image/gif", size: 10 }), /PNG, JPG or WEBP/);
  assert.match(categoryImageError({ type: "image/png", size: 2048 * 1024 + 1 }), /2MB/);
});

test("rich text helpers count visible text only", () => {
  assert.equal(richTextToPlainText("<p>Hi&nbsp;<b>there</b></p><ul><li>One</li><li>Two &amp; three</li></ul>"), "Hi there One Two & three");
  assert.equal(richTextLength("<p><br></p>"), 0);
  assert.equal(richTextLength(null), 0);
});

test("payload maps form values to API fields", () => {
  const parsed = categoryFormSchema.parse({
    ...validValues(),
    parentId: "7",
    sortOrder: "3",
    description: "<p>Decor</p>",
    metaTitle: " Home ",
    isActive: false,
    showInNav: false,
  });
  assert.deepEqual(buildCategoryPayload(parsed, true), {
    name: "Home & Living",
    slug: "home-living",
    parent_id: 7,
    sort_order: 3,
    description: "<p>Decor</p>",
    meta_title: "Home",
    meta_description: null,
    is_active: false,
    show_in_nav: false,
  });
  const empty = buildCategoryPayload(categoryFormSchema.parse({ ...validValues(), sortOrder: "", description: "<p><br></p>" }), false);
  assert.equal(empty.parent_id, null);
  assert.equal(empty.sort_order, 0);
  assert.equal(empty.description, null);
});

test("resources map back to form values with safe defaults", () => {
  const legacy = { id: 1, merchant_id: 2, name: "Old", slug: "old", description: null, created_at: null, updated_at: null };
  assert.deepEqual(categoryToFormValues(legacy), { ...emptyCategoryFormValues, name: "Old", slug: "old" });
  assert.equal(isCategoryActive(legacy), true);
  assert.equal(isCategoryActive({ is_active: false }), false);
  assert.equal(categoryImagePath({ image: "categories/a.png", image_url: null }), "categories/a.png");
  assert.equal(categoryImagePath({ image: "categories/a.png", image_url: "https://cdn/a.png" }), "https://cdn/a.png");
  assert.equal(
    categoryToFormValues({ ...legacy, parent_id: 5, sort_order: 2, is_active: false, show_in_nav: false, meta_title: "T" }).parentId,
    "5",
  );
});

test("stats accept wrapped or bare payloads", () => {
  assert.deepEqual(normalizeCategoryStats({ data: { total: 12, active: 9, inactive: 3, total_products: 40 } }), {
    total: 12,
    active: 9,
    inactive: 3,
    total_products: 40,
  });
  assert.deepEqual(normalizeCategoryStats({ total: "5" }), { total: 5, active: 0, inactive: 0, total_products: 0 });
  assert.deepEqual(normalizeCategoryStats(null), { total: 0, active: 0, inactive: 0, total_products: 0 });
});

test("pagination helpers describe the visible range and page buttons", () => {
  assert.deepEqual(showingRange({ current_page: 2, per_page: 10, total: 24 }), { from: 11, to: 20, total: 24 });
  assert.deepEqual(showingRange({ current_page: 3, per_page: 10, total: 24, from: 21, to: 24 }), { from: 21, to: 24, total: 24 });
  assert.deepEqual(showingRange({ current_page: 1, per_page: 10, total: 0 }), { from: 0, to: 0, total: 0 });
  assert.deepEqual(paginationPages(1, 3), [1, 2, 3]);
  assert.deepEqual(paginationPages(5, 10), [1, "…", 4, 5, 6, "…", 10]);
  assert.deepEqual(paginationPages(1, 10), [1, 2, "…", 10]);
});

test("server errors map to form fields", () => {
  const validation = mapCategoryApiError(
    axiosError(422, { message: "Invalid", errors: { slug: ["The slug has already been taken."], parent_id: ["Invalid parent."], foo: ["Other"] } }),
  );
  assert.deepEqual(validation.fieldErrors, { slug: "The slug has already been taken.", parentId: "Invalid parent." });
  assert.equal(validation.formError, "Other");
  assert.equal(mapCategoryApiError(axiosError(404, {})).formError, "This category no longer exists or doesn't belong to your store.");
  assert.equal(mapCategoryApiError(axiosError(409, { message: "Category has products." })).formError, "Category has products.");
  assert.ok(mapCategoryApiError(axiosError(413, {})).fieldErrors.image);
  assert.equal(mapCategoryApiError(new Error("boom")).formError, "boom");
});
