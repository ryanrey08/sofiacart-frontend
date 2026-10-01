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

6. Run the unit tests (admin RBAC, merchant registration and merchant products; no build required):

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

## Merchant resource pages

- `/sales/categories` lists, creates, edits and deletes merchant categories through `/api/v1/categories`. Category slugs must be globally unique. The backend has no category status, archive or parent/child fields; delete may be rejected when products reference a category.
- `/sales/inventory` displays paginated `/api/v1/inventory/logs` (stock change, resulting quantity and reason). Adjust stock from `/sales/products` using `/api/v1/inventory/adjust`; there is no `/api/v1/inventory` list or reorder-threshold field.
- `/sales/orders`, `/finance/payments`, `/finance/transactions` and `/finance/refunds` display merchant-scoped, paginated `/api/v1/{orders,payments,transactions,refunds}` resources. Search and sorting on these tables apply to the **current page**; use pagination to browse the rest. These pages show loading, empty and retryable API error states instead of fallback sample data. Payment metadata is never rendered.
- Merchant order creation/payment processing/refund execution is **not offered** by these read-only pages: the backend currently trusts client-submitted order item prices and does not transactionally reserve/reduce stock on order creation or restore it on cancellation/refund. Do not treat a client-side flow as a safe checkout/payment implementation. See `SOFIACART_IMPLEMENTATION_STATUS.md` for the verified contract and outstanding work.

## Notes

- All API requests use `NEXT_PUBLIC_API_URL` as the base URL.
- Example resolution: `NEXT_PUBLIC_API_URL=http://localhost:8000` + `/api/v1/orders` => `http://localhost:8000/api/v1/orders`.
- Dashboard overview, customers and report views retain their existing sample-data behavior. The six merchant resource pages above and the Products page require the real API; no sample data is shown on failure. A deployed backend was not available for an end-to-end browser run.
