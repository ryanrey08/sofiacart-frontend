# Product Approval Status

Last updated: 2026-10-21

A merchant's product reaches the customer storefront only after a Super Admin approves it. Customer-facing edits to a product that is already approved are reviewed too, and the approved version stays live in the meantime.

The rules are enforced in the backends. The frontends only show the right controls.

Projects changed:

- `sofiacart-backend` (merchant/admin API, owns the shared `products` table)
- `sofiacart-webiste-backend` (the folder is `sofiacart-website-backend`): customer API
- `sofiacart-frontend`: merchant and Super Admin UI

`sofiacart-website` needed no change. It reads only the customer API, already shows "Product not found" on a 404, and shows cart errors as toasts.

## What existed before

- **Statuses:** `products.status` was already an enum with `draft`, `pending_approval`, `active`, `archived` and `rejected`.
- **Permission:** `products.approve` was already defined. The Super Admin and Product Manager roles hold it.
- **Customer visibility:** the customer API already showed only `status = active` products from `verified` merchants. Every catalog, cart, wishlist, review and checkout query goes through a single scope, `Product::storefrontVisible()`.
- **The gap:** merchants could create products as `active`, or switch them to `active`. Admins could do the same through the generic product update, using the "Moderation" status select. Nothing recorded who approved what.

## Lifecycle

```
            create (default)                 admin approves
  [new] ──────────────────▶ pending_approval ───────────────▶ active ◀──▶ archived
    │ create as draft             │   ▲   │ admin rejects        (approved: merchant toggles freely)
    ▼                             │   │   ▼
  draft ──── submit ──────────────┘   │  rejected ── edit directly ── resubmit ──┘
    ▲                                 │
    └──────── withdraw ───────────────┘   (a pending product is locked; withdraw to edit)

  Approved product edit ─▶ product_change_requests (pending)
       admin approves ─▶ values applied to the live row   |   rejects / merchant withdraws ─▶ live row unchanged
```

- **Approved** means `products.approved_at` is set. It is written only by `ProductApprovalService::approve()`, and by the backfill described below.
- **Public** means `status = active`, plus `approved_at` set, plus the merchant is `verified`. Stock still decides whether the product can be bought.
- **Draft** is supported: create with `status: "draft"`, or withdraw a pending submission.
- **"Changes Requested"** was not added as a separate state. A rejection with a required reason, followed by an edit and a resubmission, covers it. The existing `rejected` status is reused.

### Status transitions (`ProductApprovalService::assertStatusChangeAllowed`)

| Product | Statuses the merchant or generic API may set |
|---|---|
| New | `pending_approval` (default) or `draft` |
| Not yet approved | `draft`, `pending_approval` (submits the product), `archived`. If the product is already `rejected`, it may also stay `rejected`. |
| Approved | `active` or `archived` only |

- `active` on a product that has not been approved returns 422 `status`.
- `rejected` returns 422 unless the product already has that status.
- `submitted_at`, `approved_at`, `reviewed_by`, `reviewed_at` and `rejection_reason` are `prohibited` in both product requests, and return 422 if sent.
- These rules also apply to admin tokens on `/api/admin/products` and `/api/v1/products`. Only the approval endpoint can publish a product.

### Policy for editing an approved product

- **Applied immediately:** `stock_quantity`, `low_stock_threshold`, `track_inventory`, `cost_price`, `sku`, active↔archived, and variant **stock**.
- **Reviewed first:** customer-facing fields.
  - `name`, `slug`, descriptions, `category_id`
  - prices (`price` / `regular_price` / `sale_price`)
  - `brand`, `condition`, `weight`, `tags`, dimensions
  - image order or new images
  - variants (adding or removing one, or changing its price, colour or size)

  These are stored as a `product_change_requests` row. Only fields that differ from the live value are kept, after normalising decimals, line endings, blanks and tags. A full-form save that changes only the stock therefore creates nothing.
- **One pending request per product.** A second request returns 422 `changes` until the first is reviewed or withdrawn.
- **Applying an approved request:**
  - It is applied in a transaction, with the request and product rows locked.
  - Existing variants keep their **live** stock, because orders may have moved the stock since the request was submitted.
  - The service re-checks that the slug is still unique, that the category is still owned by the merchant, and that variant SKUs are free.
  - If a variant would be removed that has orders, the request is refused when it is submitted, not only when it is approved.
- **Uploaded replacement images:**
  - They are stored on the `public` disk under a hashed name (the same disk and pattern as new products) and are not linked from the storefront.
  - They are deleted when a request is rejected or withdrawn, or when its product is deleted.
  - The previous gallery files are deleted after an approval.
- **A product that is awaiting approval is locked:**
  - Content edits return 422 `status` ("withdraw it from review to make changes").
  - Stock fields can still change.
  - Withdrawing returns the product to `draft`.

## Database (`sofiacart-backend`)

The migration `2026_10_21_100000_add_product_approval_workflow` is additive, and `down()` reverses it.

- **New columns on `products`:**
  - `submitted_at`
  - `approved_at`
  - `reviewed_by` (FK to users, null on delete)
  - `reviewed_at`
  - `rejection_reason`
  - index `(status, submitted_at)`
- **New table `product_change_requests`:**
  - `product_id`, `merchant_id`, `status` (`pending` / `approved` / `rejected` / `withdrawn`)
  - `changes` and `original` (JSON)
  - `images` (JSON)
  - `submitted_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `withdrawn_at`
  - indexes `(product_id, status)` and `(status, created_at)`

### Existing products (backfill)

Existing rows were not blanket-reset. The backfill follows each row's current status:

| Current status | Backfill | Effect |
|---|---|---|
| `active` | `approved_at = COALESCE(updated_at, created_at, now)` | **Grandfathered.** The product stays live; nothing disappears from the store. |
| `pending_approval` | `submitted_at = COALESCE(updated_at, created_at, now)` | Appears in the review queue |
| `draft`, `archived`, `rejected` | none | Never approved. Publishing it later requires review. |

- **Local Docker MySQL:** the migration was applied, and all **181** products were `active` from verified merchants beforehand. Afterwards there were 181 active, 181 approved and 0 change requests. The storefront API still lists 181 products.
- **Grandfathered products:** these were self-published before this workflow existed, so `reviewed_by` is null for them. If they need a retroactive review, a Super Admin can archive any of them from the admin product drawer.
- **Deployment order:** run this migration **before** deploying the customer API change. The customer API filters on `products.approved_at`, which must exist.

## APIs

### Merchant (`/api/v1`, `auth:sanctum` + verified email; scoped to the token's merchant)

| Method | Route | Purpose |
|---|---|---|
| POST | `/products` | Creates the product. It defaults to `pending_approval` (and is announced to reviewers), or `draft`. |
| PATCH | `/products/{id}` | Edits the product directly, or stages the change as a request if the product is approved. Status rules are listed above. |
| POST | `/products/{id}/submit` | Sends a `draft`, `rejected` or never-approved `archived` product for review. A second submit returns 422. |
| POST | `/products/{id}/withdraw` | Moves the product from `pending_approval` to `draft` |
| POST | `/products/{id}/change-request/withdraw` | Cancels pending edits. The live product is unchanged. |
| GET | `/products?status=pending_approval`, `?has_pending_changes=1` | Filters |

- **Admin tokens:** these three action routes return **403** for admins, who review through `/api/admin`.
- **Other merchants:** another merchant's product returns **404**.

### Admin (`/api/admin`, admin middleware and an `admin` token)

| Method | Route | Permission |
|---|---|---|
| GET | `/products?review=pending` | `products.view`. Lists new submissions and products with pending edits, oldest first. Also accepts `has_pending_changes`, `status`, `merchant_id`, `search`, `stock_status` and pagination. |
| GET | `/products/{id}` | `products.view`. Adds `meta.review_history` (from the audit log). |
| PATCH | `/products/{id}/approval` | `products.approve` (route middleware plus `ProductPolicy::review`) |
| PATCH | `/product-change-requests/{id}/status` | `products.approve`. Same body as the approval route, without `submitted_at`. Returns `meta.product`. |

**Body of `/products/{id}/approval`:** `{status: approved|rejected, reason, submitted_at?}`.

- `reason` is required to reject (422 `reason`).
- `submitted_at` is the submission the admin opened. If it is stale, the API returns **409**, so a resubmission is never approved unseen.
- If the product is not pending, the API returns 422 `status`. This covers double clicks and two admins acting at once.

**`ProductResource` fields added:**

- `approval`: `is_approved`, `submitted_at`, `approved_at`, `reviewed_at`, `reviewed_by` (admin responses only) and `rejection_reason`
- `listing_status`, one of:
  - `published`, `out_of_stock`, `hidden`, `store_unavailable`
  - or a pre-approval state: `draft`, `pending_approval`, `rejected`, `archived`
- `pending_change_request` (with `comparison` rows showing current vs requested values)
- `latest_change_request`

**Who can review:**

- Super Admin and Product Manager (both hold `products.approve`). The Product Manager role already had this permission and was not changed.
- Admin, Merchant Manager and the other roles get 403.
- Merchant tokens are stopped by the admin middleware.

### Audit and notifications

**Audit:** `AdminAuditLogger` records each step with the product as the subject. The metadata holds field names and the reason, never values.

- `product.submitted_for_approval`
- `product.approval_withdrawn`
- `product.change_requested`
- `product.change_withdrawn`
- `admin.products.approved`
- `admin.products.rejected`
- `admin.products.change_approved`
- `admin.products.change_rejected`

The two review routes are excluded from the generic `AuditAdminMutation` log, so decisions are not logged twice.

**Notifications** use the existing database and mail channels. They are sent after commit and wrapped in `rescue()`.

| Notification | Recipients | Link |
|---|---|---|
| `ProductSubmittedForReview` | Admins with `products.approve` | `/admin/products?review=pending&product={id}` |
| `ProductReviewed` (approved, or rejected with the reason) | Merchant owner | `/sales/products?saved={id}` |

## Customer catalog (`sofiacart-webiste-backend`)

`Product::storefrontVisible()` now also requires `products.approved_at IS NOT NULL`, and `isStorefrontVisible()` does too. The status value alone is never trusted. Because every customer path already used this scope, the approval check now covers:

- listing and `/products/search`
- product detail by slug, availability, and product reviews
- categories (only those with a visible product)
- popular products
- cart add, cart merge and cart line evaluation
- wishlist
- checkout. `CheckoutService` re-evaluates every line through `CartService::evaluateLine()` inside the order transaction, with locked product rows.

There is no "related" or "recommended" endpoint in the customer API.

The existing stock, price and merchant checks are unchanged.

**Merchant manual orders:** in `sofiacart-backend`, `InventoryService` now also refuses products that are `active` but not approved.

## Frontend (`sofiacart-frontend`)

### Super Admin: `/admin/products`

- **Tabs:**
  - **Awaiting approval**, with a count. It shows new submissions and approved products with pending edits, oldest first, with the same search, merchant and stock filters and pagination as before.
  - **All products**.
- **Table:** the Approval column shows the status pill, an "Edits pending" marker, and the storefront state of approved products.
- **Drawer:**
  - an approval summary (approved and submitted dates, last reviewer, rejection reason)
  - a review panel with **Approve** and **Reject**. Reject requires a reason. The panel sends `submitted_at` and shows the status returned by the backend.
  - for pending edits, a current vs requested comparison with replacement image previews, plus Approve or Reject changes
  - images, pricing, category, stock, variants and description
  - review history
- **Permissions:** without `products.approve`, the drawer says the role can view but not decide.
- **Management:** the old "Moderation" select, which let an admin set any status, is gone. Approved products get Archive or Restore (`products.manage`); Delete is unchanged.
- **Notification links:** `?review=pending&product=<id>` opens the queue and the product.

### Merchant: `/sales/products`

- **Metrics:** adds an **Awaiting review** card.
- **Table:**
  - the status pill, plus the storefront state for approved products (Live on store, Live · out of stock, Hidden, Store not live)
  - an "Edits in review" marker
  - the rejection reason inline
- **Row actions:**
  - Submit or Resubmit, Withdraw, and Archive for products that are not yet approved
  - Archive or Restore (`active`) for approved products
  - Bulk archive skips products that are under review
- **Preview panel:**
  - an Approval section with the state hint and the rejection reason
  - Submit or Withdraw
  - pending edits with the comparison and **Withdraw pending edits**
  - the reason when the latest edit was rejected
- **Product form:**
  - Status choices depend on approval. A product that has not been approved is never offered `active`. New products default to **Submit for approval**.
  - A banner explains the lock while the product is pending, the rejection reason, or the reapproval policy for approved products.
  - After saving, the list shows what happened: submitted, saved as draft, edits sent for review, or updated.

## Tests and checks run (2026-10-21)

| Project | Command | Result |
|---|---|---|
| sofiacart-backend | `php artisan test` | **184 / 185 passed** |
| sofiacart-backend | `vendor/bin/pint --dirty` | formatted |
| sofiacart-website-backend | `php artisan test` | **83 / 83 passed**. The 76 existing tests and 7 new ones in `ProductApprovalVisibilityApiTest` all pass. |
| sofiacart-frontend | `npx tsc --noEmit` | passed |
| sofiacart-frontend | `npm run lint` | passed |
| sofiacart-frontend | `npm run build` | passed |
| sofiacart-frontend | `npm run test:unit` (71 tests, 5 of them new in `tests/product-approval.test.mjs`) | **71 / 71 passed**, through a loader (see the note below) |

**sofiacart-backend: the one failure is pre-existing.** It is `OrderWorkflowTest::test_order_creation_rejects_inactive_or_draft_products`. The test expects the error key `items`, but the API returns `items.0.product_id`. It failed the same way before this work. The baseline had 5 failures; the other 4 were caused by partial product updates nulling `price`, and the `normaliseProductData` fix in this change resolves them.

**sofiacart-backend: new tests in `ProductApprovalWorkflowTest` (10).** They cover:

- a new product is pending and unpublished, and reviewers are notified
- merchants cannot create, set or approve `active`, `rejected` or `approved_at`
- only `products.approve` with an admin token can review
- approval is recorded, logged and final
- rejection requires a reason, and the merchant can fix and resubmit
- a pending product is locked, and a stale review returns 409
- edits to an approved product wait for review while the live version stays, and approving applies them
- rejected or withdrawn edits never go live, and their uploads are deleted
- other merchants get 404, admin tokens get 403 on the merchant actions, and the generic admin update cannot publish
- manual orders refuse products that are active but not approved

**sofiacart-website-backend: new tests in `ProductApprovalVisibilityApiTest` (7).** They cover:

- pending, rejected and active-but-unapproved products are excluded from listing, search and category filters
- they cannot be reached by slug, availability or reviews
- categories that only have such products are hidden, and so are popular products that lose approval
- the cart and wishlist reject them on direct requests
- checkout re-checks approval: a product that loses approval after being carted, or a cart row inserted directly, gets a 422 and no order
- an approved product can be bought

**Live smoke check:**

- `/admin/products` (including `?review=pending&product=1`), `/sales/products`, `/sales/products/new` and `/sales/products/1/edit` returned 200 from the running dev server.
- An unauthenticated `PATCH /api/admin/products/1/approval` returned 401.

**Note on `test:unit`:** the installed Node versions (20.18 at most) cannot import `.ts` files, so `npm run test:unit` fails at import for **every** suite, including the existing ones. The suites were run with `node --import <register.mjs> --test …`, using a small ESM loader kept outside the repo that transpiles `.ts` with the project's own `typescript` package. On Node 22.6 or later, `npm run test:unit` should work as is.

## Local test accounts

`sofiacart-backend/database/seeders/ProductApprovalTestAccountsSeeder.php` creates a Super Admin and a verified merchant (with a verified email and a category). The emails and the shared test password are constants in that file. The seeder is idempotent and refuses to run in production.

```bash
docker exec sofiacart-app php artisan db:seed --class=ProductApprovalTestAccountsSeeder --force
```

It has been run on the local Docker database (users 21 and 22, merchant 21 "Approval Test Store").

## Browser walkthrough (2026-10-21, local stack)

Run in the desktop app's browser against `localhost:3000` (merchant and admin), `localhost:3001` (storefront) and both APIs:

1. **Merchant creates "Approval Walkthrough Lamp" (product 182).** The form offered only "Submit for approval" and "Draft". After saving, the list showed "Your product was submitted for approval", the status was *Pending approval*, and Awaiting review was 1.
2. **Storefront, while pending:** `/products/approval-walkthrough-lamp` showed "Product not found". The API returned 404, and search and store listings returned nothing.
3. **Admin opens the notification link** `/admin/products?review=pending&product=182`. The Awaiting approval tab opened with the review drawer.
4. **Admin rejects without a reason:** blocked with "Enter a reason…". With a reason, the drawer showed *Rejected*, the reviewer and the reason, and the queue emptied.
5. **Merchant views the rejection:** the reason was shown in the list, the preview and the edit form. The merchant added a description, chose "Submit for approval" and saved. The product went back to *Pending approval*.
6. **Direct API bypass attempts with the merchant's token**, while the product was pending:

   | Request | Result |
   |---|---|
   | `PATCH /api/v1/products/182 {status: active}` | **422** |
   | `PATCH /api/admin/products/182/approval` | **403** |
   | `PATCH /api/v1/products/182 {approved_at}` | **422** ("prohibited") |

   The product stayed pending.
7. **Admin approves:** the product became *Active*. The review history showed four entries (submitted, rejected with its reason, resubmitted, approved), and the queue count went to 0.
8. **Storefront, after approval:** the product page was live (In Stock, Add to Cart enabled), it appeared in search, and its category appeared in the navigation.

**Audit log for product 182:** `product.submitted_for_approval`, then `admin.products.rejected`, `product.submitted_for_approval` and `admin.products.approved`, each with the correct actor.

**Mail during the walkthrough:** the local backend `.env` uses a real SMTP account. After the first submission (whose two recipients, `example.org` and `.test` addresses, cannot receive mail), `MAIL_MAILER` was switched to `log` for the rest of the walkthrough and then restored. The `.env` file was verified to be byte-identical to the original afterwards. The logged mails confirm that the reviewer and merchant notifications fire.

The test product remains live in the local database. Archive or delete it from the admin drawer if it is not wanted.

## Not verified and open items

- **Synchronous email:** with the real SMTP account, each submission or decision request waits for the mail send (about 10 s for 2 recipients in the walkthrough). This applies equally to the existing merchant-profile notifications. A queue worker would remove the wait.
- **Not walked through in the browser:** edits to an approved product (staged change requests), and image uploads. The browser tool cannot attach files. Both are covered by the backend feature tests.
- **Grandfathered products:** the 181 existing live products keep their status without a retroactive review (see the backfill section).
- **Takedown:** there is no action to revoke an approval. An admin can archive the product, but the merchant could set it back to `active`. A takedown or suspend action would be a follow-up.
- **`/api/v1` with admin tokens:** these routes still accept admin tokens without `admin.permission` checks. This is how they worked before this change. The approval rules still apply to them, but other v1 routes were not changed.
