# SofiaCart Frontend – Implementation Status

_Last updated: 2026-10-01_

## Category management UI (supersedes older category notes below)

The category list, add and edit pages were rebuilt to match the mockups. They are written against the category management API in `ryanrey08/sofiacart-backend` PR #9 (the README, `routes/api.php`, the `*CategoryRequest` classes and `CategoryResource`). All routes are under `auth:sanctum`, and `merchant_id` is never sent.

| Action | Endpoint |
| --- | --- |
| List | `GET /api/v1/categories?page=&per_page=10\|20\|50&search=&status=active\|inactive&parent_id=&sort=name_asc\|name_desc\|products_asc\|products_desc\|oldest\|newest` |
| Stats | `GET /api/v1/categories/stats` → `{ data: { total, active, inactive, total_products } }` |
| View / create / update / delete | `GET`, `POST`, `PUT`, `DELETE /api/v1/categories/{id}` (JSON `{name, slug, parent_id, sort_order, description, meta_title, meta_description, is_active, show_in_nav}`) |
| Image | `POST /api/v1/categories/{id}/image` (multipart `image`, PNG/JPG/WEBP, max 2MB) |
| Status | `PATCH /api/v1/categories/{id}/status` `{is_active}` |
| Bulk | `POST /api/v1/categories/bulk` `{action: delete\|activate\|deactivate, ids}` |

- **Sidebar:** Products is a group with All Products and Categories, and the active item is highlighted.
- **List (`/sales/categories`):** stats cards, search, status, sort and More Filters (parent category), sortable headers, select-all and per-row checkboxes with bulk actions, and a kebab menu (View, Edit, Activate/Deactivate, Delete with confirmation). It also has a "Showing X to Y of Z" footer with pagination and a per-page select, plus a detail panel that stacks under the table below `xl`. The panel holds the information, image upload and product count with a View Products link. Loading skeletons, empty states and retryable error states are included.
- **Form (`/sales/categories/new`, `/sales/categories/[id]/edit`):** a shared react-hook-form + zod form, with the slug auto-generated until it is edited. The parent options exclude the category itself and its descendants. The description is a sanitized contentEditable rich-text editor with a 0/500 visible-character counter. SEO counters show hints of 50–60 and 150–160 characters. The image dropzone validates on the client, and the form has Active and Show in Navigation toggles plus a live preview. Server 422 errors are mapped onto fields. If the image upload fails after the category is saved, the form keeps the saved record, so retrying updates it instead of creating a duplicate. On success the form invalidates the category and product queries and redirects to the list, which shows a toast and selects the saved row.
- **Files:** `lib/api/categories.ts`, `lib/hooks/categories.ts`, `lib/merchant-categories.ts`, `lib/validation/category.ts`, `components/merchant/{category-form,category-details,category-image,image-dropzone,rich-text-editor}.tsx`, `components/ui/toast.tsx`, `components/sidebar.tsx`, `app/(dashboard)/sales/categories/{page,new/page,[id]/edit/page}.tsx`, `app/(dashboard)/sales/products/page.tsx` (`?category_id=` prefill), `types/index.ts`, `tests/merchant-categories.test.mjs` and `package.json`.
- **Verification:** `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` and `npm run build` all pass. The flows were also exercised in a browser against a local mock of the contract above: list, sort, paginate, detail panel, toggling status, client and server (duplicate slug) validation, create with redirect and toast, and edit with an image upload. They have not yet been run against the real backend.

## Merchant order and return request integration (supersedes older order/refund gap notes below)

Contract verified against `sofiacart-backend` merged `main` commit `b8193b4ddae9dc46454bd77354e7924625d67279`: `routes/api.php`, OrdersController, ReturnRequestsController, OrderResource, OrderItemResource, ReturnRequestResource, StoreOrderRequest, UpdateOrderRequest, models/enums, return migrations and README. These routes are Sanctum-protected merchant/staff back-office flows. `Customer` is not a linked authenticated customer identity; no public checkout/returns were added.

| Screen | Backend endpoints |
| --- | --- |
| `/sales/orders`, `/sales/orders/new`, `/sales/orders/[id]` | `GET/POST /api/v1/orders`, `GET /api/v1/orders/{id}`, `PATCH /api/v1/orders/{id}/status`, `GET /api/v1/customers`, `GET /api/v1/products` |
| `/sales/orders/[id]/return`, `/sales/returns`, `/sales/returns/[id]` | `GET/POST /api/v1/return-requests`, `GET/PATCH /api/v1/return-requests/{id}`, `GET /api/v1/return-requests/{id}/evidence/{index}` |
| `/finance/refunds/new`, `/finance/refunds` | `GET/POST /api/v1/refunds`, `GET /api/v1/payments` |

Orders use server search/status/payment status/customer/date filters and pagination; creation sends only `customer_id`, catalog-backed `items[][product_id,product_variant_id,quantity]` and optional `notes`. No `merchant_id`, status, amount or price is sent. The detail renders server totals, item snapshots, customer/shipping, status and notes where present; the API supplies no separate history. Allowed status transitions are pending → processing/cancelled, processing → completed/cancelled; completion requires paid and cancellation unpaid. No direct payment status editing, item replacement or order deletion is exposed.

Returns list supports `status`, `order_id`, `page`, `per_page`; creation sends multipart `order_id`, `customer_id`, `reason`, required `notes`, `items[0][order_item_id]`, `items[0][quantity]`, and optional `evidence[]`. The backend validates `notes` as `required|string`; if the user omits optional additional notes, the submitted notes repeat their reason, as disclosed at review. File limits are five JPG/PNG/WebP images of 5120 KB each. A completed paid/partially-refunded order inside the configured window is eligible; pending/approved/processed requests reserve quantities, rejected ones release them. Review permits pending → approved/rejected, approved → processed. A positive-value return needs an existing unique matching **processed** refund ID for the order's payment; zero-value returns need none. The Finance form records an externally handled refund only; it is not a payment gateway call. Evidence stays private on backend `local` storage and is fetched through the authenticated Axios client as a blob, never by direct unauthenticated image URL. No sensitive payment metadata is shown.

Changed paths: `types/commerce.ts`, `lib/merchant-commerce.ts`, `lib/hooks/{orders,return-requests}.ts`, `app/(dashboard)/sales/orders/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/return/page.tsx}`, `app/(dashboard)/sales/returns/{page.tsx,[id]/page.tsx}`, `app/(dashboard)/finance/refunds/{page.tsx,new/page.tsx}`, `components/merchant/private-evidence.tsx`, `components/sidebar.tsx`, `tests/merchant-commerce.test.mjs`, `package.json`, `README.md`, this file. Query mutations invalidate orders, returns, inventory, products, payments and refunds.

### Order and return UI refinement (2026-10-01)

The order detail (`/sales/orders/[id]`) now renders a status header (order + payment pills), Print and Request Return actions, the items table, a totals block (subtotal, shipping fee, discount, total), separate Customer/Shipping/Payment panels, a derived order timeline and a return request summary list for the order. Because `OrderResource` carries no shipping method, tracking number, payment method or per-status timestamps, those are not fabricated: the shipping panel states that the API exposes none, the payment panel links to Finance > Payments instead of rendering card data, and timeline steps other than "Order placed" show their derived state rather than an invented time.

`/sales/orders/[id]/return` is a four-step wizard (select items → provide details → preferred refund method → review). Quantities use increment/decrement buttons clamped by `clampReturnQuantity` to the quantity still returnable after pending/approved returns, and each line shows `estimatedReturnAmount`, a client-side preview derived from the stored line total; the backend recalculates the authoritative amount. The reason is a preset dropdown (`returnReasons`, with "Other" switching to free text), additional details are optional, and photos support drag-and-drop or file picking with thumbnails, per-file removal and the same five JPG/PNG/WebP × 5 MB limits the backend enforces. The refund-method step offers Original payment method only; **store credit and automatic gateway refunds are not supported by the backend**, so the store-credit radio is disabled and the preference is never sent in the payload — it only guides the refund recorded later in Finance > Refunds. The review step repeats items, reason, photos and an "Important notes" callout covering the return window, original condition, estimated amount and the refund-first processing requirement. Return detail now states explicitly that processed or rejected requests are locked.

Deployment/verification: deploy the merged backend migrations before use (return requests/items and order/item snapshot fields); configure `RETURN_WINDOW_DAYS` (default 30), private `local` storage, Sanctum authentication, CORS/Authorization and `NEXT_PUBLIC_API_URL` pointing at the Laravel root. Client eligibility warns on the default 30-day window but does not block a backend configured with a different window; server validation is definitive. A deployed Laravel API, merchant credentials and real payment/gateway were not available here, so end-to-end financial or inventory persistence cannot be claimed. Existing historical merchant order/refund descriptions below describe earlier work and are superseded by this section.

Verification in this checkout: `npm ci --no-audit --no-fund` succeeded (469 packages); `node --test tests/merchant-commerce.test.mjs` passed 7/7; `npm run test:unit` passed 38/38; `npx tsc --noEmit` and `npm run lint` passed; `npm run build` generated all new routes; `npm run test:smoke` passed 1/1 and checked the protected route paths as well as public pages. No live Laravel API, persisted order/return, evidence or external gateway was exercised. The tests cover serialization, transitions, eligibility, quantity reservation, file limits, paginated response validation and route availability.

## Scope of this update: product creation/management redesign

Rebuilds the merchant product list and the Add/Edit product experience against the **expanded** product API that landed in `ryanrey08/sofiacart-backend` PR #6 ("Expand product API for catalog management", branch `copilot/redesign-add-edit-product-ui`, merged into `main`). The contract below was read from the backend code on `main`, not assumed from the design: `routes/api.php`, `ProductsController`, `StoreProductRequest`, `UpdateProductRequest`, `ProductResource`, `Product`/`ProductImage`/`ProductVariant`, the catalog-field/`product_images`/`product_variants` migrations and `tests/Feature/ProductCrudTest.php`.

### Endpoints used (unchanged routes)

| Action | Request | Response |
| --- | --- | --- |
| List + metrics | `GET /api/v1/products?search=&status=&category_id=&stock_status=&page=&per_page=` | paginated `ProductResource` |
| View | `GET /api/v1/products/{id}` | `{ data: ProductResource }` (eager loads `category`, `variants`, `imageRecords`) |
| Create | `POST /api/v1/products` (multipart) | `201 { data: ProductResource }` |
| Edit | `POST /api/v1/products/{id}` with `_method=PATCH` (multipart) | `{ data: ProductResource }` |
| Archive / restore | `PATCH /api/v1/products/{id}` `{ status }` (JSON) | `{ data: ProductResource }` |
| Delete | `DELETE /api/v1/products/{id}` | `204` |
| Stock adjustment / history | `POST /api/v1/inventory/adjust`, `GET /api/v1/inventory/logs` | unchanged |

### Request fields (exactly the FormRequest keys; `merchant_id` is never sent)

`name`, `slug`, `sku`, `short_description`, `full_description`, `category_id`, `status`, `regular_price`, `sale_price`, `cost_price`, `brand`, `condition`, `weight`, `tags[]`, `length`, `width`, `height`, `track_inventory` (`1`/`0`), `stock_quantity`, `low_stock_threshold`, `images[]`, `main_image_index`, and on update `image_ids[]` / `main_image_id`. `variants` is sent as a JSON string of `{sku, color, size, price, stock, sort_order}` because multipart cannot carry nested arrays — `prepareForValidation()` decodes it. `price` is not sent: the controller derives it from `regular_price`. `short_description` is omitted when empty because the update rule is `sometimes|required`; the other nullable fields are sent empty so they can be cleared.

### Behaviour matched to the backend

- Client validation mirrors the rules: kebab-case slug, 200/2000 character descriptions, `sale_price <= regular_price`, numeric precision for `decimal(12,2)`/`decimal(10,3)`, distinct variant SKUs, `jpg/jpeg/png/webp` images up to 5 MB, and the five `ProductStatus` values (`pending_approval` and `rejected` are preserved on products that already have them).
- Images: uploading files replaces the whole gallery (`main_image_index` chooses the primary); without uploads an edit maintains the gallery by id, where the order of `image_ids[]` is `sort_order`, omitted ids are deleted and `main_image_id` sets the primary. The UI states this before saving instead of pretending images can be appended.
- Variants are replaced wholesale on save (the controller deletes and recreates them), so variant ids are not used as React keys across saves.
- 422 responses are mapped field-by-field, including `images.{n}`, `tags.{n}` and `variants.{n}.{field}`; unmapped errors (e.g. `merchant`) surface as a form-level message. 404 for a foreign category, 413 uploads, 401/403 and network failures keep their existing messages.
- Writes still write the returned resource into the detail cache and invalidate the product queries, which now also refreshes the summary metrics.

### Visual changes

- `/sales/products`: content panel with four summary metrics (total/active/low stock/out of stock, each counted through the list endpoint's own filters), search + category/status/stock filters, row selection with bulk archive/delete, per-row edit/stock/archive/delete, pagination and a sticky preview side panel showing images, pricing, details, tags, variants and inventory history.
- Add/Edit moved out of a modal into full pages inside the merchant shell (`/sales/products/new`, `/sales/products/[id]/edit`) with a back/header row, Cancel/Save, and a two-column card layout: Basic information, Pricing, Product details, Images, Variants on the left; Inventory and Visibility on the right. Below `sm` the layout is single column with a sticky Save/Cancel bar.

### Changed files

`app/(dashboard)/sales/products/page.tsx`, new `app/(dashboard)/sales/products/new/page.tsx` and `app/(dashboard)/sales/products/[id]/edit/page.tsx`, `components/merchant/product-form.tsx`, `components/merchant/product-details.tsx`, `lib/merchant-products.ts`, `lib/validation/product.ts`, `lib/hooks/products.ts`, `types/index.ts`, `tests/merchant-products.test.mjs`, `README.md` and this document. No migrations (frontend). The merchant shell, navigation, categories/inventory/orders/finance pages and the admin app were not touched.

### Tests and results

- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeds; `/sales/products/new` and `/sales/products/[id]/edit` are emitted.
- `npm run test:unit` — 31/31 pass (16 product tests covering schema rules, multipart keys, gallery maintenance, resource→form mapping, tag parsing and error mapping). `npm run test:smoke` — 1/1 pass.
- Manual run: no deployed SofiaCart backend is reachable from this environment, so the flow (list → preview → Add product → client validation → 422 mapping → create → redirect → edit prefill, desktop and 390px mobile) was exercised in Chrome against a local process that replays the documented Laravel contract. The captured multipart bodies contain exactly the keys listed above and no `merchant_id`. **An end-to-end check against a live backend and database is still outstanding.**

### Cross-repo compatibility

Every field and endpoint used here exists in `sofiacart-backend` `main`. The backend has no archive/restore endpoint (status change is used), no soft deletes, no incremental image upload and no barcode/SEO/variant-image columns, so none are shown. Products created before PR #6 still work: `regular_price` falls back to `price`, `full_description` to `description`, `tags` to `[]` and the gallery to the legacy `images` path list.

## Scope of this update: merchant visual redesign (registration + logged-in merchant UI)

Design targets were the three user-supplied reference images, in this order: (1) the merchant dashboard (dark purple gradient left rail, store header, compact KPI cards, charts, orders, low-stock and quick-actions panels), (2) registration Step 3 Owner Information (gradient onboarding rail, horizontal desktop progress tracker, white rounded form panel, 2-column labelled fields, document upload), and (3) registration Step 2 Store Information (same frame, store fields, logo/banner preview cards, social links). Copy from the images was not reused as data.

### What changed
- **Design tokens** (`tailwind.config.ts`, `app/globals.css`): `navy` palette, `bg-brand-rail` (dark purple rail) and `bg-brand-cta` gradients, `shadow-card`. Base element rules now live in `@layer base`; previously unlayered `font: inherit` / `color: inherit` overrode Tailwind utilities, so inputs ignored `text-sm`.
- **Shared primitives**: `Card`, `Button` (new `accent` orange variant, focus ring offset), `Input`/`Textarea` (`aria-invalid` when `hasError`, tighter radius/height), `Label`, `DataTable` (`scope`/`aria-sort`, buttons only on sortable headers, optional `className`), `MetricCard` (compact KPI), `ResourcePage` (shared `PageIntro`, section eyebrow from the route, labelled search, optional `isSample`), `ReportPage` (optional `isSample`), new `components/merchant/page-intro.tsx` (`PageIntro`, `SampleDataBadge`).
- **Merchant shell** (`app/(dashboard)/layout.tsx`, new `components/merchant/merchant-shell.tsx`, `components/sidebar.tsx`, `components/top-nav.tsx`):
  - Dark gradient rail with `aria-current="page"` active states. Below `lg` it becomes a modal drawer: toggle has `aria-expanded`/`aria-controls`, focus moves into the drawer and is trapped there, Escape/backdrop/link click close it, and focus returns to the toggle. There is also a skip link.
  - Hard-coded "Sofia Lifestyle Store" / "Sofia Reyes" identity removed. Identity now comes from the signed-in user saved by `/api/auth/login` (`lib/merchant-identity.ts`, `components/merchant/use-merchant-identity.ts`): name, email, `Merchant #id` and merchant status. No store-name endpoint exists, so no store name is shown.
  - Removed controls that did nothing: top-bar search, the notification bell with a fake unread dot, and the "Profile settings"/"Store preferences" menu items. The promo card was also removed. Sign out still works.
- **AuthGuard**: now reads auth through `useSyncExternalStore`, which fixes the React #418 hydration mismatch on every authenticated route. Redirect behaviour is unchanged. `lib/auth.ts` now dispatches a same-tab `sofiacart-auth-change` event on sign-in/sign-out so the guard and identity hook update immediately.
- **Dashboard**: the layout follows reference (1). No dashboard analytics endpoint exists, so every mock section has a "Sample" badge and a page-level notice saying so. Quick actions are links to existing routes. Removed the "Export report", per-item "Reorder" and period/metric selects, which had no handlers. The greeting uses the authenticated user's first name.
- **Customers and reports pages**: when `useResourceQuery` falls back to mock data (detected by reference equality with the mock object), the page shows a "Sample preview" badge and notice instead of presenting the figures as live.
- **Registration** (`components/auth/merchant-registration-form.tsx`, `components/stepper-nav.tsx`):
  - Gradient onboarding rail with logo and a vertical step list on desktop; a compact header on mobile.
  - Horizontal progress tracker from `md` up, and a labelled `progressbar` on small screens.
  - White rounded form panel; tight 2-column labelled fields grouped under section headings.
  - Upload drop zones: native file inputs stay keyboard-focusable, have labels, hints and error `aria-describedby`. The selected file name is shown, plus logo (square), banner (wide) and ID preview cards.
  - Review cards have "Edit" buttons that jump back to a step.
  - Invalid "Next Step" now focuses the first invalid field, and each new step focuses its heading.
  - Placeholders no longer use sample store names.
  - Unchanged: Zod schema, step field groups, the `/api/merchant/register` multipart payload (`buildMerchantRegistrationFormData`), 422/409/401/403/network error mapping and the signed-in merchant check.

### API preservation
No API client, hook, type or endpoint changed. These pages were not edited and keep their real `/api/v1` integration: products, categories, inventory, orders, payments, transactions and refunds. They only pick up the shared shell/primitive styling. This avoids conflicts with the separate, still-active merchant catalog/finance integration task; none of that task's work is claimed as merged here. Admin UI code was not edited; it only inherits the shared primitive and base-layer polish.

### Omitted modules (not invented)
There are no store profile, settings, or promotions/voucher routes or APIs in this frontend, so no screens or nav entries were added for them.

### Changed files
`tailwind.config.ts`, `app/globals.css`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/sales/customers/page.tsx`, `app/(dashboard)/reports/{sales,customers,products,inventory}/page.tsx`, `components/auth/auth-guard.tsx`, `lib/auth.ts`, `components/auth/merchant-registration-form.tsx`, `components/stepper-nav.tsx`, `components/sidebar.tsx`, `components/top-nav.tsx`, `components/data-table.tsx`, `components/metric-card.tsx`, `components/resource-page.tsx`, `components/report-page.tsx`, `components/ui/{button,card,input,label,textarea}.tsx`, new `components/merchant/{merchant-shell.tsx,page-intro.tsx,use-merchant-identity.ts}`, new `lib/merchant-identity.ts`, new `tests/merchant-identity.test.mjs`, `package.json` (adds that test to `test:unit`).

### Verification
- `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`: all passed.
- `npm run test:unit`: 26/26 passed, including the new identity/nav-active tests.
- `npm run test:smoke`: passed.
- Headless Chromium against `next start` at 1440×900, 820×1100 and 390×844:
  - Registration: steps 1→2 validated with real field input and an uploaded file. Invalid Next focuses `#storeName`.
  - All 12 merchant routes: no horizontal overflow at any width, and no page errors after the AuthGuard fix.
  - Drawer: on tablet/mobile it opens with focus on its close button and `aria-expanded=true`. Escape closes it and returns focus to the toggle.
  - Exactly one `aria-current="page"` nav item per route.
- Environment limits: no Laravel backend was reachable, so authenticated pages were checked with a fake stored session. API-backed pages showed their real error states, not data. The Playwright MCP browser was unavailable, so a local Playwright install in `/tmp` was used for screenshots.


## Scope of this update: merchant resource API integration

The backend contract was inspected at `ryanrey08/sofiacart-backend` commit `7437acf` (`routes/api.php`, `app/Http/Controllers/Api/*Controller.php`, `app/Http/Resources/*Resource.php`, `app/Http/Requests/*Request.php`, enums and `Controller::pageSize`). These routes require `auth:sanctum`, derive merchant ownership from the authenticated user, and return `{ data: [...], links, meta: { current_page, last_page, per_page, total } }` for lists. `page` selects the page; `per_page` is capped at 100. Single category writes return `{ data: CategoryResource }`; category deletion returns 204.

| Page | Real API | Fields displayed |
| --- | --- | --- |
| Categories | `GET /api/v1/categories?page=&per_page=15`; `POST /api/v1/categories` / `PATCH /api/v1/categories/{id}` `{name,slug,description}`; `DELETE /api/v1/categories/{id}` | `CategoryResource`: name, slug, description |
| Inventory | `GET /api/v1/inventory/logs?page=&per_page=15` | `InventoryLogResource`: product name/ID, reason, quantity_change, resulting_stock, created_at |
| Orders | `GET /api/v1/orders?page=&per_page=15` | `OrderResource`: order_number, customer, items, total_amount, ordered_at, status, payment_status |
| Payments | `GET /api/v1/payments?page=&per_page=15` | `PaymentResource`: reference, order_id, gateway, amount, paid_at, status |
| Transactions | `GET /api/v1/transactions?page=&per_page=15` | `TransactionResource`: reference, type, amount, transacted_at, status |
| Refunds | `GET /api/v1/refunds?page=&per_page=15` | `RefundResource`: reference, order_id, payment_id, reason, amount, created_at, status |

The order/payment/transaction/refund pages are deliberately read-only. They use the existing admin resource types for their shared public fields, preserve the backend's actual enum statuses (including `processed`, `partially_refunded`, `unpaid`), do not render payment metadata or secrets, and do not invent payment initiation endpoints. The category page implements only the backend-supported CRUD; there is no category status/archive, product count or parent relationship in its resource/schema. Category deletion may be refused by database constraints if products reference it. Product category options now fetch all category pages and writes invalidate category and product queries. Stock adjustments invalidate inventory history too. The shared `ResourcePage` retains its existing design and exposes server pagination, loading, empty and retryable error states. Search/sort on these lists apply only to the current server page.

**Changed files:** `app/(dashboard)/layout.tsx`, `app/(dashboard)/sales/{categories,inventory,orders}/page.tsx`, `app/(dashboard)/finance/{payments,transactions,refunds}/page.tsx`, `components/resource-page.tsx`, `lib/hooks/{categories,inventory,orders,payments,transactions,refunds,merchant-list,products}.ts`, `lib/merchant-resource.ts`, `tests/merchant-resource.test.mjs`, `package.json`, `README.md` and this status document. Existing admin flows and unrelated mock-backed dashboard/customer/report views are untouched.

**Verification (Node environment):** `npm ci` passed (0 vulnerabilities); `npm run test:unit` passed (23/23); `npm run lint` passed; `npx tsc --noEmit` passed; `npm run build` passed (all six merchant routes built); `npm run test:smoke` passed (1/1 public-route check). No live backend credentials or deployed API were available for authenticated end-to-end requests.

**Backend blockers / remaining work:** There is no `GET /api/v1/inventory` aggregate or category archive/status/tree, so no threshold or hierarchy is fabricated. Order creation currently accepts client-supplied `unit_price` and does not transactionally decrement/lock product stock, while cancellation/refund does not restore inventory; safe end-to-end checkout needs backend changes before exposing these actions. Payment creation accepts client-supplied status/amount, so the frontend does not claim gateway verification or initiate payments. Backend refund processing uses payment status and processed totals but inventory restoration is not implemented. Do not delete processed refunds through the backend's resource delete route: it does not recalculate payment/order statuses. Browser/API integration with an authenticated merchant and backend feature tests remain to be performed in a backend-enabled environment.

The section below records the earlier product implementation as it stood on 2026-09-30; its notes about *other* merchant pages showing sample data are superseded by this update. Its product field list, modal-based create/edit flow and `description`-only form are superseded by the product creation/management redesign documented at the top of this file.

## Scope of this update: merchant product management

The merchant **Products** page (`/sales/products`) no longer uses sample data. It now calls the Laravel product and inventory APIs through the shared merchant Axios client (`lib/api/axios.ts`), which uses `NEXT_PUBLIC_API_URL` as the base URL and sends the stored merchant token as a Sanctum bearer `Authorization` header. Before any edits, the contract was read from `sofiacart-backend` `main` (commit `b25ef23`):

- routes: `routes/api.php`
- controllers: `ProductsController`, `InventoryController`, `CategoryController`
- validation: `StoreProductRequest`, `UpdateProductRequest`, `AdjustInventoryRequest`
- resources: `ProductResource`, `CategoryResource`, `InventoryLogResource`
- merchant scoping: the `InteractsWithMerchantScope` trait
- schema: the `ProductStatus` enum, the products migration and `config/filesystems.php`
- tests: `tests/Feature/ProductCrudTest.php`, `tests/Feature/InventoryAdjustmentTest.php`

No endpoints, fields or response shapes were invented.

### Endpoints used (all `auth:sanctum`, scoped by the backend to the token's merchant)

| Feature | Request | Response consumed |
| --- | --- | --- |
| List, search and filter | `GET /api/v1/products?search=&status=&category_id=&page=&per_page=15` | paginated `{ data: ProductResource[], links, meta }` |
| View | `GET /api/v1/products/{id}` | `{ data: ProductResource }` |
| Create | `POST /api/v1/products` (multipart) | `201 { data: ProductResource }` |
| Edit | `POST /api/v1/products/{id}` with `_method=PATCH` (multipart; PHP only parses multipart bodies on POST) | `{ data: ProductResource }` |
| Archive / restore | `PATCH /api/v1/products/{id}` `{ status }` (JSON) | `{ data: ProductResource }` |
| Delete | `DELETE /api/v1/products/{id}` (hard delete) | `204` |
| Inventory update | `POST /api/v1/inventory/adjust` `{ product_id, quantity_change, reason, notes }` | `{ message, product, inventory_log }` |
| Inventory history (in the product view) | `GET /api/v1/inventory/logs?product_id=&per_page=10` | paginated `InventoryLogResource` |
| Category options | `GET /api/v1/categories?per_page=100` (the backend maximum) | paginated `CategoryResource` |

### Fields supported (only what the backend defines)

- **Product fields:** `name`, `slug`, `sku`, `description`, `category_id`, `status`, `price`, `stock_quantity`, and `images[]`.
- **Not supported by the backend:** variants and options. The backend has no such fields, so none were added.
- **Store ownership:** `merchant_id` is never sent. The backend takes the merchant from the token, restricts every read and write to that merchant, and rejects categories that belong to another merchant (404).
- **Account check:** the page also shows "Access restricted" when the stored user isn't a merchant linked to a store. The backend does not allow merchant writes for such accounts either.
- **Status:** the form offers `draft`, `pending_approval`, `active` and `archived`.
  - The backend's `rejected` value is shown for a product only when it already has that status.
  - This is a UI choice; the backend would accept any value of the enum.
- **Images:** JPG or PNG, up to 5120 KB each. They are appended as `images[]`, and the browser sets the multipart boundary.
  - Uploading new images on edit **replaces** all current images, which is how the backend behaves. The form says so.
  - The backend returns images as relative paths on its `public` disk. They are displayed from `NEXT_PUBLIC_API_URL/storage/<path>`, which requires `php artisan storage:link`.
- **Deactivate:** "Archive" sets the status to `archived`; "Restore as draft" sets it back to `draft`.
- **Stock on edit:** changing stock in the edit form writes `stock_quantity` directly. "Adjust stock" records a logged inventory change instead.

### Validation, errors and UX

- **Client-side validation (zod), following the FormRequests:**
  - required `name`, `slug`, `sku`, `status`, `price`, `stock_quantity`; each text field is limited to 255 characters
  - slug format checked with the same regex as the backend
  - `price` ≥ 0 with at most 2 decimal places and within `decimal(12,2)`
  - `stock_quantity` a whole number ≥ 0, within the unsigned-int range
  - status must be a value of the enum
  - images must be JPG/PNG, at most 5120 KB each
  - inventory adjustment: whole-number change other than 0, required reason (≤ 255 characters), optional notes, and resulting stock not below zero
- **Laravel 422 errors** are shown on the matching fields:
  - Duplicate `sku` or `slug` ("has already been taken") get clear messages; both must be unique across all of SofiaCart, not just the store.
  - `images.N` errors, including "failed to upload", appear on the Images field.
  - Errors that aren't tied to a form field, such as `merchant`, appear at the top of the form.
- **Other errors:**
  - 404 for a category → "category not available for your store"; 404 for a product → "no longer exists or doesn't belong to your store".
  - 413 → upload too large.
  - 401 clears the session (existing interceptor); 403 gets its own message.
  - Network failures give connection guidance.
- **States:**
  - loading, error with retry, and empty states
  - buttons disabled while a request is running (spinners on form submits)
  - confirmation before delete
  - success notices built from the API response (name, SKU, status, new stock and the backend's message)
- **Refreshing data:** after create, edit, status change or adjustment, the product returned by the API is written into the detail cache and the list is re-fetched from the API. After create, the list returns to page 1, where the new product appears (the backend sorts newest first). There is no mock fallback on this page any more.

### Changed files

- `app/(dashboard)/sales/products/page.tsx`: products page with list, filters, pagination and the create, view, edit, adjust, archive and delete actions
- `components/merchant/product-form.tsx`, `product-details.tsx`, `inventory-adjust-form.tsx`, `product-image.tsx` (new)
- `lib/hooks/products.ts`: React Query hooks that call the real API. The old mock-fallback `useProducts` was only used by this page.
- `lib/merchant-products.ts` (new): multipart and adjust payload builders, image URLs, and 422/404/413 error mapping
- `lib/validation/product.ts` (new)
- `types/index.ts`: `ProductResource`, `CategoryResource`, `InventoryLogResource`, `InventoryAdjustResponse`; re-exports `Paginated`/`ProductStatus` from `types/admin.ts`
- `tests/merchant-products.test.mjs` (new); `package.json` adds it to `test:unit`
- `README.md`, `SOFIACART_IMPLEMENTATION_STATUS.md`
- Reused without changes: the generic UI parts of `components/admin/ui.tsx` (Modal, Field, SelectInput, table, pagination and state components), `lib/admin/format.ts`, `lib/admin/use-debounced-value.ts`, `lib/utils.ts` `slugify`, and `lib/api/axios.ts`
- **Backend:** no changes. The backend repository could not be modified or checked out from this task environment.

### Commands run and results (Node v24.21.0)

| Command | Result |
| --- | --- |
| `npm ci` | Passed |
| `npm run lint` | Passed, 0 warnings |
| `npx tsc --noEmit` | Passed |
| `npm run test:unit` | 21/21 passed (11 new product tests covering schema, multipart keys and `_method`, no `merchant_id`, image rules, error mapping and inventory payload) |
| `npm run build` | Passed; `/sales/products` built |
| `npm run test:smoke` (after build) | 1/1 passed |

**Browser request check (headless Chromium against `next dev`):** not a backend test. `NEXT_PUBLIC_API_URL` pointed at a local capture server that recorded each raw request and answered **every write with 503**, so no success response was faked.

- **Reads:** the page sent `GET /api/v1/products` and `GET /api/v1/categories` with the bearer token.
- **Create:** a form submit with a PNG sent `POST /api/v1/products` as `multipart/form-data` with a browser-generated boundary, the Laravel field names and an `images[]` file part. No `merchant_id` was sent.
- **Other writes:**
  - Edit sent multipart `POST /api/v1/products/41` with `_method=PATCH`.
  - Adjust sent JSON `{product_id, quantity_change, reason, notes}`.
  - Archive sent `PATCH {status:"archived"}`, and Delete sent `DELETE`.
  - View loaded `GET /products/41` and `GET /inventory/logs?product_id=41`.
  - For these checks the capture server returned one list row in the `ProductResource` shape so the row actions could be clicked.
- **Validation:** empty-field messages, the automatic slug, and the negative-stock guard (no request sent) all appeared as expected.
- **Error display:** every 503 was shown as an error, never as success.

### Blockers and remaining work

- **No live end-to-end or backend test run (blocker).** `sofiacart-backend` is not checked out in this environment, and this task may not clone other repositories. So no Laravel server was running, `php artisan test` (`ProductCrudTest`, `InventoryAdjustmentTest`) was **not run**, and no real 201, 422 or 204 response was observed. The integration matches the backend source but **has not been verified against a running API**.
  - To verify: run the backend (`migrate --seed`, `storage:link`, `serve`) and set `NEXT_PUBLIC_API_URL=http://localhost:8000`.
  - Then, as a verified merchant: create with images, try a duplicate SKU (expect 422), edit with and without images, archive, adjust stock (including a negative result, expect 422) and delete.
  - Also run `php artisan test --filter='ProductCrud|InventoryAdjustment'`.
- **Upload size:** the backend allows 5120 KB per image, but PHP's default `upload_max_filesize` is 2M and `post_max_size` is 8M. Unless the server is configured for larger uploads, bigger images come back as `images.N failed to upload` or 413. The UI shows both errors, but the server limits should be raised.
- **CORS:** the Laravel CORS config must allow the frontend origin and the `Authorization` header (no `config/cors.php` is committed, so Laravel's defaults apply).
- **Backend gaps, not worked around:**
  - no variants or options
  - no removal of single images (an edit replaces the whole set)
  - `slug` and `sku` must be unique across all merchants
  - merchants can set any status value of the enum
- **Other merchant pages:** `/sales/inventory` still requests `/api/v1/inventory`, which the backend doesn't have, so it shows sample data. Inventory changes are now made from the Products page. Categories, orders and other merchant pages also still use sample-data fallbacks.
- **Hydration error (existed before this change):** `next dev` logs a hydration mismatch on every dashboard page (for example `/sales/orders`). It comes from `AuthGuard` reading browser storage during render. It is unrelated to this change and was left as is.

## Scope of this update: merchant registration API integration

### Completed

The four-step merchant registration form now submits to the existing public Laravel registration endpoint through the shared Axios client. The existing step flow and entered values remain in place through review and submission. The client lets Axios/browser generate the multipart boundary.

- **Endpoint:** `POST /api/merchant/register` (the configured `NEXT_PUBLIC_API_URL` must be the Laravel root URL, without `/api`).
- **Multipart scalar fields:** `name`, `email`, `password`, `password_confirmation`, `phone`, `business_name`, `business_type`, `business_permit_number`, `tin`, `business_category`, `business_address`, `city`, `province`, `zip_code`, `store_name`, `store_slug`, `store_category`, `store_description`, `store_address`, `contact_phone`, `contact_email`, `social_links`, `owner_name`, `owner_position`, `owner_email`, `owner_phone`, `owner_birth_date`, `government_id_type`, `government_id_number`, `government_id_expiry_date`.
- **File fields:** required `business_permit` (PDF/JPG/JPEG/PNG, max 5120 KB), required `store_logo` (JPG/JPEG/PNG, max 2048 KB), optional `store_banner` (JPG/JPEG/PNG, max 5120 KB), required `government_id` (PDF/JPG/JPEG/PNG, max 5120 KB). Social links are JSON-encoded in the `social_links` multipart field.
- **Response:** consumes the actual `{ message, user, merchant }` response and shows its message, returned user name/email, and merchant status. A pending status is presented as awaiting approval; the user can continue to the existing `/login` route. Registration does not return or store a token.
- **Validation/errors:** client-side rules cover required fields, password confirmation, Philippine phone formats, dates, slug syntax and upload types/sizes. Laravel 422 field keys are explicitly mapped to the form fields, including account and renamed fields. Duplicate (409), unauthorized/forbidden and connection/CORS failures receive general guidance; uniqueness remains server-validated.
- **Existing auth state:** a signed-in merchant (merchant role or nested merchant in stored auth) is stopped before registration; unauthenticated visitors can proceed.

### Changed files

- `components/auth/merchant-registration-form.tsx`
- `lib/merchant-registration.ts`
- `lib/validation/merchant.ts`
- `types/index.ts`
- `tests/merchant-registration.test.mjs`
- `package.json` (includes the contract tests in `test:unit`)
- `SOFIACART_IMPLEMENTATION_STATUS.md`

### Validation and test results

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 470 packages audited, 0 vulnerabilities reported |
| `npm run test:unit` | Passed, 10/10 tests (includes registration schema and multipart contract tests) |
| `npm run test:smoke` | Passed, 1/1; built public routes render |
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; `/register/merchant` included in the production build |

The test suite verifies payload names, JSON social links, optional banner behavior, password confirmation, phone formats, and birth/expiry dates. It does not exercise a live API.
An attempted local production-browser check could not run because the Playwright tool transport closed; the passing smoke test verifies public-route rendering, not interactive submission.

### Live API/CORS verification and remaining work

- **Not verified end-to-end:** the backend checkout is not present in this task environment (`/home/runner/work/sofiacart-backend` is unavailable), `NEXT_PUBLIC_API_URL` is unset, and no reachable Laravel API or credentials were provided. No request was sent to a live API.
- Backend API/Laravel tests were **not run** because the backend checkout is unavailable. PHP/Composer setup and Laravel Boost setup were not applicable without that checkout or its setup instructions.
- Configure `NEXT_PUBLIC_API_URL` to the Laravel root URL and allow the deployed frontend origin in Laravel CORS, then verify successful 201 registration, upload persistence, pending status, duplicate/422 errors and browser multipart/CORS behavior against a running backend.

This completes the frontend implementation, but does not claim live frontend-to-Laravel verification.

## Scope of this update: Super Admin console

This update re-applies the Super Admin frontend integration. The earlier task's commits could not be pushed (HTTP 403), so the work was rebuilt on top of the existing app instead of copied over. The source of truth is `sofiacart-backend` `main`: `routes/api.php` (`/api/admin/*`), `app/Http/Controllers/Api/Admin/*`, the FormRequests and Resources, `AdminPermissionRegistry`, `AdminRoleRegistry` and `AdminAuthorizationService`. No endpoints or permission names were invented.

The existing storefront, checkout, merchant auth and merchant dashboard code is untouched. The admin area uses its own token storage, its own Axios client and its own routes.

### Completed

| Area | Details | Backend endpoints |
| --- | --- | --- |
| Admin layout and routes | `/admin/*` with its own layout, a permission-filtered sidebar, a mobile drawer and an account menu | — |
| Authentication | Login (`device_name`, 429 throttle message), token verification, logout, logout from all devices, forgot and reset password, and redirect back to the requested page (same-origin `/admin` paths only) | `POST auth/login`, `GET auth/me`, `POST auth/logout`, `POST auth/logout-all`, `POST auth/forgot-password`, `POST auth/reset-password` |
| Sessions | Lists admin tokens and revokes the ones not in use by this browser | `GET auth/sessions`, `DELETE auth/sessions/{id}` |
| Protected routes and RBAC | Session provider checks `/auth/me`. Pages are guarded with `RequirePermission`, and actions are hidden with `Can` when the permission is missing. A 401 clears the admin session only. | uses `effective_permissions` |
| Dashboard | Date-range filter, metrics, chart, status breakdown and top merchants | `GET dashboard` |
| Merchants | List (search, status filter, pagination), onboarding queue with review, billing, and a detail page with status updates and onboarding history | `GET merchants`, `GET merchants/{id}`, `PATCH merchants/{id}/status`, `GET merchants/{id}/onboarding-history`, `GET merchants/{id}/billing` |
| Orders | Filters (search, status, payment status, dates) and status changes limited to the backend's allowed transitions | `GET orders`, `PATCH orders/{id}/status` |
| Products | Filters, status updates and delete | `GET products`, `PATCH products/{id}/status`, `DELETE products/{id}` |
| Customers | Search, merchant filter, and a detail view with orders | `GET customers`, `GET customers/{id}`, `GET customers/{id}/orders` |
| Payments | Payments, transactions and refunds tabs, plus refund status updates | `GET payments`, `GET transactions`, `GET refunds`, `PATCH refunds/{id}/status` |
| Reports | Platform report by type with pagination, and CSV export | `GET reports/platform`, `GET reports/platform/export` |
| Platform settings | View settings, edit text or JSON values (a blank secret keeps its current value), and add settings | `GET settings`, `PUT settings` |
| User management | Search and active filter, create, edit, delete and view activity. Role and permission choices follow the backend's delegation rules. | `admin/users` CRUD, `GET users/{id}/activity` |
| Roles & permissions | Role CRUD with a permission checklist limited to permissions the admin already holds, and custom permission CRUD. System entries are read-only. | `admin/roles` CRUD, `admin/permissions` CRUD |
| System logs | Filters for search, action, actor, subject type and subject ID, pagination, and expandable metadata (redacted by the backend) | `GET logs` |

All list pages have loading, error (with retry), empty and access-denied states. Form fields are checked with zod rules that match the backend FormRequests, and Laravel 422 `errors` are shown on the form.

### Changed files

- `.gitignore`: added an exception so the `app/admin/(protected)/logs` route is not ignored by the generic `logs` rule
- `README.md`: added a Super Admin section and the `npm run test:unit` command
- `package.json`: added the `test:unit` script
- `tests/smoke.test.mjs`: added a `/admin/login` check
- `tests/admin-permissions.test.mjs`: new unit tests for RBAC and navigation, redirect safety, and order transitions
- `types/admin.ts`
- `lib/admin/{auth,errors,format,permissions,use-debounced-value}.ts`
- `lib/api/admin-client.ts`, `lib/api/admin.ts`
- `lib/validation/admin.ts`
- `components/admin/*`: admin UI kit, session provider, guards, shell, auth forms, merchant status and billing, audit log table, permission checklist
- `app/admin/layout.tsx`
- `app/admin/{login,forgot-password,reset-password}/page.tsx`
- `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`
- `app/admin/(protected)/{dashboard,merchants,merchants/onboarding,merchants/billing,merchants/[id],orders,products,customers,payments,reports,settings,users,roles,logs,sessions}/page.tsx`

### Checks run (2026-09-29, Node v24.21.0)

| Command | Result |
| --- | --- |
| `npm run lint` | Passed (exit 0) |
| `npx tsc --noEmit` | Passed (exit 0) |
| `npm run build` | Passed (exit 0); all `/admin/*` routes built |
| `npm run test:unit` | 5/5 passed |
| `npm run test:smoke` (after build) | 1/1 passed, including `/admin/login` |

A browser run was also done against a local mock server that returns the backend's response shapes. It is not a real backend and was not committed. The run checked:

- Visiting a protected page without a token redirects to the login page with the original path saved.
- After login, the admin lands on the first page their permissions allow.
- The sidebar lists only modules the admin's permissions allow.
- System roles are read-only.
- Form validation messages appear.
- The Permissions tab, System Logs and Sessions pages load their data.
- A page the admin lacks permission for shows "Access restricted".
- The admin token is stored in `sessionStorage` and does not touch the merchant session.

### Known blockers and limitations

- **No live backend or credentials were available.** None of the pages have been verified end-to-end against a running `sofiacart-backend`. Response handling follows the controllers and Resources in the backend source.
- **Backend configuration needed:**
  - `NEXT_PUBLIC_API_URL` must point to the Laravel app root.
  - The backend must allow this frontend's origin (CORS) and the `Authorization` header.
- **Password reset / admin invite emails (backend blocker):** `sofiacart-backend` sends reset links through Laravel's default `ResetPassword` notification, which needs a route named `password.reset`. No such route exists and `ResetPassword::createUrlUsing` is never registered. The backend catches and logs the resulting exception, so no email is sent even though the API responds with success. Newly invited admins, who get a random password, therefore cannot sign in until the backend builds links to `/admin/reset-password?token=…&email=…` on this frontend. The frontend reset page is ready for that link.
- **List filters:** the backend's admin orders, products, payments and refunds lists have no merchant filter, so none is offered in the UI.
- **Permission picker:** it loads up to 100 permissions, the backend's maximum `per_page`.
- **Custom permissions:** they can be created and assigned to roles, but backend routes only enforce the built-in permission names.
- **Token storage:** the admin token lives in `sessionStorage`, so signing in again is needed per browser tab/session. Token lifetime and revocation are handled by the backend.
