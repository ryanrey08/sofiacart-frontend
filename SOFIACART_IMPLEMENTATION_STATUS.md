# SofiaCart Frontend – Implementation Status

_Last updated: 2026-10-01_

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

The section below records the earlier product implementation as it stood on 2026-09-30; its notes about *other* merchant pages showing sample data are superseded by this update.

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
