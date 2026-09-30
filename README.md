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

- `/sales/products` lists, creates (multipart with `images[]`), views, edits, archives and deletes the signed-in merchant's products, and adjusts stock. It calls `/api/v1/products`, `/api/v1/categories`, `/api/v1/inventory/adjust` and `/api/v1/inventory/logs`.
- The backend decides which store a product belongs to from the merchant's token; the frontend never sends `merchant_id`.
- Product images are shown from `NEXT_PUBLIC_API_URL/storage/<path>`, so run `php artisan storage:link` on the backend.

## Notes

- All API requests use `NEXT_PUBLIC_API_URL` as the base URL.
- Example resolution: `NEXT_PUBLIC_API_URL=http://localhost:8000` + `/api/v1/orders` => `http://localhost:8000/api/v1/orders`.
- Management and report views include realistic placeholder data so the UI renders cleanly before the Laravel backend is connected.
- The dashboard overview always shows sample data; management and report views fall back to samples when requests fail. Login requires a working API. The backend endpoints and response contracts used by this scaffold have not been verified against a live backend.
