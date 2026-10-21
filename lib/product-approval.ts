// Product approval rules as enforced by sofiacart-backend ProductApprovalService. The backend is
// the authority (it rejects any status the merchant may not set); these helpers only decide which
// controls and messages the UI shows. Dependency-free so it can be unit tested with `node --test`.
import type { ProductChangeRequestResource, ProductListingStatus, ProductResource, ProductStatus } from "../types/index";

type ApprovalAware = Pick<ProductResource, "status"> & Partial<Pick<ProductResource, "approval" | "listing_status" | "pending_change_request">>;

export function isApproved(product: ApprovalAware | null | undefined) {
  return product?.approval?.is_approved === true;
}

/**
 * Statuses the merchant can pick in the product form. `active` is never offered for a product
 * that has not been approved, and `rejected` is only kept (unchanged) when the product has it.
 */
export function merchantStatusOptions(product?: ApprovalAware | null): ProductStatus[] {
  if (!product) return ["pending_approval", "draft"];
  if (isApproved(product)) return ["active", "archived"];
  const options: ProductStatus[] = ["pending_approval", "draft", "archived"];
  if (product.status === "rejected") options.unshift("rejected");
  return options;
}

export function statusOptionLabel(status: ProductStatus, product?: ApprovalAware | null) {
  switch (status) {
    case "pending_approval":
      return product?.status === "pending_approval" ? "Pending approval" : "Submit for approval";
    case "draft":
      return "Draft (not submitted)";
    case "rejected":
      return "Rejected (keep editing)";
    case "active":
      return "Active (listed)";
    case "archived":
      return isApproved(product) ? "Archived (hidden from store)" : "Archived";
    default:
      return status;
  }
}

export const LISTING_STATUS_LABELS: Record<ProductListingStatus, string> = {
  published: "Live on store",
  out_of_stock: "Live · out of stock",
  hidden: "Hidden (archived)",
  store_unavailable: "Store not live",
  draft: "Draft",
  pending_approval: "Awaiting review",
  rejected: "Rejected",
  archived: "Archived",
};

export const LISTING_STATUS_HINTS: Record<ProductListingStatus, string> = {
  published: "Approved and visible to customers.",
  out_of_stock: "Approved and listed, but customers cannot buy it until it is back in stock.",
  hidden: "Approved, but archived: customers cannot see it. Set it to Active to list it again.",
  store_unavailable: "Approved, but your store is not verified or is suspended, so customers cannot see it.",
  draft: "Not submitted. Customers cannot see it until it is submitted and approved.",
  pending_approval: "Waiting for a SofiaCart admin to review it. Customers cannot see it yet.",
  rejected: "Not approved. Fix the issues below and resubmit it for approval.",
  archived: "Archived before approval. Customers cannot see it.",
};

/** Pill tone key understood by StatusPill (`components/admin/ui.tsx`). */
export function listingStatusTone(status: ProductListingStatus) {
  const tones: Record<ProductListingStatus, string> = {
    published: "active",
    out_of_stock: "out_of_stock",
    hidden: "archived",
    store_unavailable: "suspended",
    draft: "draft",
    pending_approval: "pending_approval",
    rejected: "rejected",
    archived: "archived",
  };
  return tones[status];
}

export type ProductRowAction =
  | { kind: "submit"; label: string }
  | { kind: "withdraw"; label: string }
  | { kind: "status"; label: string; status: ProductStatus };

/** Quick actions for one row of the merchant product list. */
export function productRowActions(product: ApprovalAware): ProductRowAction[] {
  if (isApproved(product)) {
    return product.status === "archived"
      ? [{ kind: "status", label: "Restore", status: "active" }]
      : [{ kind: "status", label: "Archive", status: "archived" }];
  }
  if (product.status === "pending_approval") return [{ kind: "withdraw", label: "Withdraw" }];
  const actions: ProductRowAction[] = [{ kind: "submit", label: product.status === "rejected" ? "Resubmit" : "Submit" }];
  if (product.status !== "archived") actions.push({ kind: "status", label: "Archive", status: "archived" });
  return actions;
}

export type ProductSaveOutcome = "submitted" | "draft" | "changes_pending" | "updated";

/** What a save did, from the backend's response; passed back to the list page as `?action=`. */
export function productSaveOutcome(product: ApprovalAware, wasPendingChange = false): ProductSaveOutcome {
  if (product.pending_change_request && !wasPendingChange) return "changes_pending";
  if (product.status === "pending_approval") return "submitted";
  if (!isApproved(product) && product.status === "draft") return "draft";
  return "updated";
}

export const PRODUCT_SAVE_MESSAGES: Record<ProductSaveOutcome | "created" | "updated", string> = {
  submitted: "Your product was submitted for approval. Customers will see it once a SofiaCart admin approves it.",
  draft: "Your product was saved as a draft. Submit it for approval when it is ready.",
  changes_pending: "Your changes were submitted for review. The approved version stays live until a SofiaCart admin approves them.",
  updated: "Your product was updated.",
  created: "Your product was created.",
};

const CHANGE_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  slug: "Slug",
  description: "Description",
  short_description: "Short description",
  full_description: "Full description",
  category_id: "Category",
  price: "Price",
  regular_price: "Regular price",
  sale_price: "Sale price",
  brand: "Brand",
  condition: "Condition",
  weight: "Weight",
  tags: "Tags",
  length: "Length",
  width: "Width",
  height: "Height",
  gallery: "Image order",
  images: "Images",
  variants: "Variants",
};

export function changeFieldLabel(field: string) {
  return CHANGE_FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * `price` mirrors `regular_price` and `description` mirrors `full_description` on the backend, so
 * the mirrored rows are hidden from comparisons to avoid showing the same change twice.
 */
export function visibleComparisonRows<T extends { field: string }>(rows: T[]) {
  const fields = new Set(rows.map((row) => row.field));
  return rows.filter(
    (row) => !(row.field === "price" && fields.has("regular_price")) && !(row.field === "description" && fields.has("full_description")),
  );
}

/** Plain-text rendering of a requested/current value from a change request comparison. */
export function formatChangeValue(field: string, value: unknown, lookups: { categoryName?: (id: number) => string | undefined } = {}): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "category_id" && typeof value === "number") return lookups.categoryName?.(value) ?? `Category #${value}`;
  if (field === "tags" && Array.isArray(value)) return value.join(", ");
  if (field === "gallery" && typeof value === "object") {
    const gallery = value as { ids?: number[]; main_id?: number | null };
    return `${gallery.ids?.length ?? 0} image(s), main #${gallery.main_id ?? "—"}`;
  }
  if (field === "images" && Array.isArray(value)) return `${value.length} image(s)`;
  if (field === "variants" && Array.isArray(value)) {
    return value
      .map((variant) => {
        const item = variant as { sku?: string; color?: string | null; size?: string | null; price?: string | null };
        const label = [item.color, item.size].filter(Boolean).join(" / ");
        return `${item.sku}${label ? ` (${label})` : ""} @ ${item.price ?? "—"}`;
      })
      .join("; ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function changeRequestSummary(request: Pick<ProductChangeRequestResource, "fields">) {
  const labels = visibleComparisonRows(request.fields.map((field) => ({ field }))).map(({ field }) => changeFieldLabel(field));
  return labels.join(", ");
}
