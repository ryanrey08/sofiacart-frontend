# SofiaCart Dashboard — Real Data Status

Status of connecting the admin/merchant dashboards to real, database-backed data.

_Last updated: 2026-10-21_

## Summary

- **Super Admin dashboard** (`app/admin/(protected)/dashboard/page.tsx`) was **already** wired to real
  data via `GET /api/admin/dashboard` (`fetchAdminDashboard`), plus `GET /api/admin/merchants` and
  `GET /api/admin/logs`. No changes were required there; it is documented below for completeness.
- **Merchant dashboard** (`app/(dashboard)/dashboard/page.tsx`) was **fully mocked** (`lib/mocks.ts`
  `mockDashboard`, with a visible "Sample preview" banner). This work replaced those mocks with a new
  merchant-scoped aggregation endpoint and live data. **This was the main change.**

The customer-facing storefront and all other merchant tools were left untouched.

## Merchant dashboard — what changed

### Backend (`sofiacart-backend`)

New merchant-scoped aggregation endpoint, following the existing admin `DashboardController` pattern and
reusing existing enums, services and the `InteractsWithMerchantScope` trait (no new business logic, no new
tables).

| File | Purpose |
| --- | --- |
| `app/Http/Controllers/Api/MerchantDashboardController.php` | Aggregates KPIs, charts, breakdowns and recent activity for the signed-in merchant in one query set. |
| `app/Http/Requests/MerchantDashboardRequest.php` | Validates `date_from` / `date_to`. |
| `routes/api.php` | `GET /api/v1/merchant/dashboard` inside the `auth:sanctum` + `merchant.verified` + `v1` group. |
| `tests/Feature/MerchantDashboardTest.php` | Feature tests (metrics, tenant scoping, empty store, date filters). |

### Frontend (`sofiacart-frontend`)

| File | Purpose |
| --- | --- |
| `lib/hooks/dashboard.ts` | `useMerchantDashboard()` React Query hook. **No mock fallback** — errors surface. |
| `types/commerce.ts` | `MerchantDashboard` interface mirroring the API response. |
| `app/(dashboard)/dashboard/page.tsx` | Rewired to the hook; removed `mockDashboard` usage and the sample-data banner/badges; added loading, error, empty and zero states. Layout, styling, charts and quick actions preserved. |

`lib/mocks.ts` still defines `mockDashboard` because `mockReports.sales` references its chart data, and the
reports pages (out of scope for this task) still use those mocks. It is no longer rendered on the dashboard.

## Widgets connected to real data (merchant dashboard)

| Widget | Source |
| --- | --- |
| KPI: Net Revenue · 30 days | `metrics.net_revenue` = captured payments − processed refunds, in range |
| KPI: Orders · 30 days (paid / pending) | `metrics.orders_count`, `metrics.paid_orders_count`, `totals.pending_orders` |
| KPI: Total Customers (+ new in range) | `totals.customers`, `metrics.new_customers` |
| KPI: Total Products (+ low/out of stock) | `totals.products`, `totals.inventory.low_stock + out_of_stock` |
| Sales Overview (line + bar) | `series[].gross_sales` per day |
| Recent Orders table | `recent.orders` (order #, customer, items, total, status) |
| Low Stock | `breakdowns.low_stock` (from `InventoryService`) |
| Top Selling Products | `breakdowns.top_products` (from real `order_items`) |

The response also carries `breakdowns.orders_by_status`, `breakdowns.payments_by_status`,
`recent.transactions`, `metrics.average_order_value` and `totals.products_by_status`, available for future
widgets without a new request.

## Metric definitions and calculation rules

Reused the platform's existing definitions — no new business rules were invented.

- **Gross sales** = `SUM(orders.total_amount)` over `ordered_at` in range (matches admin dashboard and reports).
- **Payments collected** = `SUM(payments.amount)` where status ∈ `PaymentStatus::captured()`
  (`completed`, `partially_refunded`, `refunded`), by `created_at` in range. Pending / failed / expired /
  cancelled payments are excluded.
- **Refunds processed** = `SUM(refunds.amount)` where status = `RefundStatus::Processed`, by `refunded_at` in range.
- **Net revenue** = payments collected − refunds processed.
- **Paid orders** = orders with `payment_status = Paid` (`OrderPaymentStatus::Paid`).
- **Pending orders / pending payments** = all-time counts of `OrderStatus::Pending` / `PaymentStatus::Pending`.
- **Top products** = `SUM(order_items.quantity)` and `SUM(order_items.total_price)` grouped by product, in range.
- **Inventory low/out of stock** = `InventoryService::summarize()` (`stock_status` of `low_stock` / `out_of_stock`).
- **Totals** (orders, customers, products, inventory) are **all-time** and independent of the date range.
- **Currency**: `config('payments.currency')` (PHP); frontend formats via `Intl.NumberFormat("en-PH")`.
- **Range default**: last 30 days (`now()->subDays(29)` → `now()`), inclusive. Dates parsed server-side.

## Role-based data restrictions

- The endpoint lives in the `auth:sanctum` + `merchant.verified` + `v1` group, so only authenticated,
  verified merchants reach it. Admins (who have no merchant) are handled by the separate admin dashboard.
- Every query is tenant-scoped through `InteractsWithMerchantScope` (`scopeMerchant` / `requiredMerchantId`).
  Scoping is enforced in the **backend**, not via frontend filters. A merchant can only ever see their own
  store's orders, products, customers, payments and inventory.
- An admin token may read a single merchant's figures via `?merchant_id=` (same convention as the other v1
  endpoints), but this is not used by the merchant UI.

## Performance

- One request per dashboard load; aggregation done in SQL (`COUNT` / `SUM` / `GROUP BY`), not by loading
  records into the client.
- Recent orders use `withCount('items')` and eager-load `customer:id,name` (no N+1). Recent transactions
  and top products use indexed joins.
- React Query keys results per date range and uses `keepPreviousData`, so a slow response cannot overwrite a
  newer one and refetches do not flicker.

## Tests executed and results

| Check | Command | Result |
| --- | --- | --- |
| New backend feature tests | `php artisan test tests/Feature/MerchantDashboardTest.php` | **5 passed** (39 assertions) |
| Full backend suite | `php artisan test` | 170 passed, **5 pre-existing failures** (see below) |
| Frontend typecheck | `npx tsc --noEmit` | **Pass** |
| Frontend lint | `npm run lint` | **Pass** |
| Frontend production build | `npm run build` | **Pass** (`/dashboard` compiled) |
| Frontend smoke | `npm run test:smoke` | **Pass** |
| Frontend unit | `npm run test:unit` | Pre-existing failure — see below |

### Pre-existing failures (not caused by this work)

- **Backend (5):** `OrderWorkflowTest::test_order_creation_rejects_inactive_or_draft_products`,
  `ProductCrudTest` (3 tests), `ReturnRequestWorkflowTest::...`. These fail identically with the dashboard
  route change stashed (product `price` NOT NULL constraint / validation-key assertions in product & order
  flows). Unrelated to the dashboard.
- **Frontend `test:unit` (9):** all fail with `ERR_UNKNOWN_FILE_EXTENSION ".ts"` — the `node --test` runner
  has no TypeScript loader configured in this environment. Pre-existing and unrelated to this change.

## Not yet verified / blockers

- **Live browser verification** of the rendered merchant dashboard against a running API was not performed
  (requires the Laravel server running, a seeded verified-merchant login, and store data). The feature test
  proves the endpoint returns correct real figures, and typecheck/build prove the frontend wiring; a manual
  pass with a seeded merchant is the remaining confirmation.
- The merchant dashboard uses a fixed **last-30-days** window (no date-range picker was added, to preserve
  the existing layout). The backend already accepts `date_from`/`date_to`, so a picker can be added later
  without backend changes.
