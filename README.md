# SofiaCart Frontend

SofiaCart is a multi-merchant e-commerce frontend built with Next.js App Router, TypeScript, Tailwind CSS, React Query, React Hook Form, and Zod.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

   `NEXT_PUBLIC_API_URL` should point to the Laravel application root URL, not to an `/api`-prefixed path. The frontend appends paths such as `/api/auth/login`, `/api/merchant/register`, and `/api/v1/orders`.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Create a production build:

   ```bash
   npm run build
   ```

5. Smoke-check the built public routes:

   ```bash
   npm run test:smoke
   ```

6. Run the unit tests (admin RBAC, merchant registration, products, orders and returns; no build required):

   ```bash
   npm run test:unit
   ```

## Project structure

- `app/` — App Router pages for auth, dashboard, management, and reports
- `components/` — shared layout, table, form, and metric UI components
- `lib/api` — shared Axios instance with auth interceptors
- `lib/hooks` — resource-specific React Query hooks for Laravel API endpoints
- `lib/validation` — Zod schemas for login and merchant registration flows
- `types/` — strict TypeScript DTOs and domain models
- `app/admin` — Super Admin console (`/admin/login`, protected modules under `app/admin/(protected)`)
- `components/admin`, `lib/admin`, `lib/api/admin*.ts`, `types/admin.ts` — admin UI kit, RBAC helpers, isolated admin API client, and DTOs

## Super Admin console

- Open `/admin/login` and sign in with a backend admin account (`POST /api/admin/auth/login`). The admin token is kept in `sessionStorage` and sent only by the dedicated admin Axios client, so it never mixes with the merchant session.
- Every page is guarded by the `effective_permissions` returned by `GET /api/admin/auth/me`; the sidebar only lists modules the account may open. Permission names mirror `AdminPermissionRegistry` in `sofiacart-backend`.
- Modules: Dashboard, Merchants (list, onboarding, billing, detail), Orders, Products, Customers, Payments (payments, transactions, refunds), Reports, Platform Settings, User Management, Roles & Permissions, System Logs, and Active Sessions.
- `/admin/reset-password?token=...&email=...` submits to `POST /api/admin/auth/reset-password`. The backend does not yet customise its reset-link URL, so that link must be configured in `sofiacart-backend` to point at this page.

## Merchant product management

- `/sales/products` is the catalogue panel: summary metrics, search, category/status/stock filters, row selection with bulk archive/delete, per-row edit, stock adjustment, archive/restore and delete, pagination, and a preview side panel. It calls `/api/v1/products`, `/api/v1/categories`, `/api/v1/inventory/adjust` and `/api/v1/inventory/logs`.
- Metrics and the stock filter use the backend's own `stock_status` (`active`, `low_stock`, `out_of_stock`) computed from `track_inventory`, `stock_quantity` and `low_stock_threshold`.
- `/sales/products/new` and `/sales/products/[id]/edit` are full pages inside the merchant shell with Basic information, Pricing, Product details, Images, Variants, Inventory and Visibility sections. Supported fields mirror `StoreProductRequest`/`UpdateProductRequest`: `name`, `slug`, `sku`, `short_description`, `full_description`, `category_id`, `status`, `regular_price`, `sale_price`, `cost_price`, `brand`, `condition`, `weight`, `tags[]`, `length`/`width`/`height`, `track_inventory`, `stock_quantity`, `low_stock_threshold`, `images[]` and `variants`.
- Creates are `POST /api/v1/products`; edits are `POST /api/v1/products/{id}` with `_method=PATCH` (PHP only parses multipart bodies on POST). `variants` is sent as a JSON string because multipart cannot carry nested arrays; the FormRequest decodes it, and saving replaces the stored variants.
- Images: uploading files **replaces the whole gallery** (`main_image_index` picks the primary). Without new uploads an edit maintains the gallery by id — the order of `image_ids[]` becomes `sort_order`, omitted ids are deleted and `main_image_id` sets the primary. The form explains this before you save.
- The backend decides which store a product belongs to from the merchant's token; the frontend never sends `merchant_id`.
- Product images are shown from `NEXT_PUBLIC_API_URL/storage/<path>`, so run `php artisan storage:link` on the backend.

## Merchant customer management

- `/sales/customers` is the customer panel: summary cards (Total, New, Returning, Total Orders), debounced search, customer type and status filters, a registration date range under **More Filters**, pagination (10/20/50 per page) and a detail side panel with Overview/Orders/Addresses/Notes tabs. Row actions are View, Edit and Delete. `/sales/customers/new` and `/sales/customers/[id]/edit` share one form (react-hook-form + zod in `lib/validation/customer.ts`) with Personal Information, Address, Customer Type and Additional Information sections, plus **Save & Add Another** on create. The API client is `lib/api/customers.ts`, the hooks are in `lib/hooks/customers.ts` and the pure helpers (list params, payload building, formatting) are in `lib/merchant-customers.ts`.
- Expected backend contract (companion `sofiacart-backend` PR, "Implement Laravel backend for merchant customers management"): `GET /api/v1/customers` paginated with `search`, `customer_type`, `status`, `date_from`, `date_to`, `page`, `per_page`; `GET /api/v1/customers/summary` returning total/new/returning customers and total orders; `GET /api/v1/customers/{id}` returning aggregates (`orders_count`, `total_spent`, `last_order_at`) and `recent_orders`; `POST /api/v1/customers` and `PATCH /api/v1/customers/{id}` accepting `name` (kept for the merged backend) plus `first_name`, `last_name`, `email`, `phone`, `customer_type`, `status`, `birthday`, `gender`, `tin`, `notes`, `tags[]` and a nested default `address` object. All requests go through the merchant Sanctum Axios client; `merchant_id` is never sent.
- Until that backend ships the UI degrades honestly instead of inventing data: the merged backend only exposes `name`, `email`, `phone` and a string `address`, so when `/customers/summary` is missing only Total Customers is shown (from the list `meta.total`) with an explanatory notice, the type/status filters and columns are hidden when records carry no segment fields, and order counts or total spend render `—` when the API does not return them. There is no sample-data fallback and no export button.
- Customers are store records, not accounts: the backend `Customer` has no authentication, so the form offers no password, login or welcome-email control and says so. Mutations invalidate the customer and order query keys, so `/sales/orders/new` keeps seeing fresh `CustomerResource` options. A nested `address` is only sent when a street/city/province/postal field is filled, which keeps creates compatible with the merged backend's string `address` validation.


- `/sales/categories` is the category management panel. It has stats cards (`GET /api/v1/categories/stats`), search, status, sort and parent filters, sortable headers, row selection with bulk activate/deactivate/delete (`POST /api/v1/categories/bulk`), per-row View/Edit/Activate/Deactivate/Delete (`PATCH /api/v1/categories/{id}/status`), pagination (10/20/50 per page), and a detail panel. The panel shows the category information, an image card with an immediate upload (`POST /api/v1/categories/{id}/image`), and the product count with a link to `/sales/products?category_id=`. It lives under the sidebar's Products group next to All Products.
- `/sales/categories/new` and `/sales/categories/[id]/edit` share one form (react-hook-form + zod in `lib/validation/category.ts`). Fields: name, parent category, slug (auto-generated from the name, lowercase letters/numbers/hyphens), sort order, rich-text description (max 500 visible characters), SEO meta title/description, image (PNG/JPG/WEBP, max 2MB), and the Active and Show in Navigation toggles. A live preview is included. The form saves JSON with `POST /api/v1/categories` or `PUT /api/v1/categories/{id}`, then uploads the selected image. 422 errors are mapped onto the fields, and on success the form redirects to the list with a toast. The API client is `lib/api/categories.ts` and the hooks are in `lib/hooks/categories.ts`. List `sort` values are `name_asc|name_desc|products_asc|products_desc|oldest|newest`.
- `/sales/inventory` displays paginated `/api/v1/inventory/logs` (stock change, resulting quantity and reason). Adjust stock from `/sales/products` using `/api/v1/inventory/adjust`; there is no `/api/v1/inventory` list or reorder-threshold field.
- `/sales/orders` uses server-side search, status, payment status, date filters and pagination (`GET /api/v1/orders`). `/sales/orders/new` selects real customers (`GET /api/v1/customers`) and active products/variants (`GET /api/v1/products`), then submits only customer ID, product/variant IDs, quantities and optional notes (`POST /api/v1/orders`). The backend checks stock and calculates prices/totals. `/sales/orders/[id]` (`GET /api/v1/orders/{id}`) shows the server's order snapshot and allowed `PATCH /api/v1/orders/{id}/status` transitions. Payment status, prices and order items cannot be edited here; order deletion is unsupported.
- `/sales/orders/[id]/return` creates a merchant/staff physical return for a completed paid or partially refunded order inside the backend return window (`POST /api/v1/return-requests`, multipart). The three steps select remaining item quantities, collect required reason and optional notes/evidence (up to five JPG/PNG/WebP images of 5 MB each), then review and submit. Because the merged backend requires nonempty `notes`, an omitted note repeats the entered reason in the API payload. `/sales/returns` lists/filter/paginates (`GET /api/v1/return-requests`); `/sales/returns/[id]` loads details (`GET /api/v1/return-requests/{id}`), downloads private evidence with authenticated blob requests (`GET /api/v1/return-requests/{id}/evidence/{index}`) and permits only pending → approved/rejected and approved → processed (`PATCH /api/v1/return-requests/{id}`).
- Positive-value returns require an **already processed** refund for the same order/payment and exact amount before processing; the server restores inventory on processing, not on refund recording. `/finance/refunds` lists financial refund records (`GET /api/v1/refunds`); `/finance/refunds/new` can record an externally completed refund (`POST /api/v1/refunds`), using matching payments from `GET /api/v1/payments`. This **does not execute a gateway refund** or create store credit. Payment metadata is never rendered. The backend has no authenticated customer identity tied to `Customer`, so none of these routes are storefront self-service.
- All merchant API pages show loading, empty and retryable error states instead of silently substituting sample records. Deploy the merged backend Order/Return migrations, configure its private `local` evidence disk, `RETURN_WINDOW_DAYS` (default 30), Sanctum and CORS; set `NEXT_PUBLIC_API_URL` to the backend root. The backend remains authoritative for all eligibility, stock, amounts, refund matching and 422 responses.

## Notes

- All API requests use `NEXT_PUBLIC_API_URL` as the base URL.
- Example resolution: `NEXT_PUBLIC_API_URL=http://localhost:8000` + `/api/v1/orders` => `http://localhost:8000/api/v1/orders`.
- Dashboard overview and report views retain their existing sample-data behavior. Merchant customer, order, return, product and finance flows require the real API; no sample data is shown on failure. See `SOFIACART_IMPLEMENTATION_STATUS.md` for verification and deployment limitations.
