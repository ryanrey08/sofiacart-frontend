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

## Project structure

- `app/` — App Router pages for auth, dashboard, management, and reports
- `components/` — shared layout, table, form, and metric UI components
- `lib/api` — shared Axios instance with auth interceptors
- `lib/hooks` — resource-specific React Query hooks for Laravel API endpoints
- `lib/validation` — Zod schemas for login and merchant registration flows
- `types/` — strict TypeScript DTOs and domain models

## Notes

- All API requests use `NEXT_PUBLIC_API_URL` as the base URL.
- Example resolution: `NEXT_PUBLIC_API_URL=http://localhost:8000` + `/api/v1/orders` => `http://localhost:8000/api/v1/orders`.
- Management and report views include realistic placeholder data so the UI renders cleanly before the Laravel backend is connected.
- The dashboard overview always shows sample data; management and report views fall back to samples when requests fail. Login requires a working API. The backend endpoints and response contracts used by this scaffold have not been verified against a live backend.
