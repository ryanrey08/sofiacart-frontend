# SofiaCart Frontend – Implementation Status

_Last updated: 2026-09-29_

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
- **Reset link:** the backend does not customise its password-reset link. Its reset email needs to link to `/admin/reset-password?token=…&email=…` on this frontend.
- **List filters:** the backend's admin orders, products, payments and refunds lists have no merchant filter, so none is offered in the UI.
- **Permission picker:** it loads up to 100 permissions, the backend's maximum `per_page`.
- **Custom permissions:** they can be created and assigned to roles, but backend routes only enforce the built-in permission names.
- **Token storage:** the admin token lives in `sessionStorage`, so signing in again is needed per browser tab/session. Token lifetime and revocation are handled by the backend.
