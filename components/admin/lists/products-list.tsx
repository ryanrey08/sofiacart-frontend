"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Loader2, Package, RotateCcw, XCircle } from "lucide-react";
import { ProductImage } from "@/components/merchant/product-image";
import { MerchantFilter } from "@/components/admin/merchant-filter";
import { Can } from "@/components/admin/require-permission";
import {
  AdminTable,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconAction,
  LoadingState,
  MerchantCell,
  Notice,
  Pagination,
  SearchField,
  SelectInput,
  StatusPill,
} from "@/components/admin/ui";
import { ProductChangeComparison } from "@/components/product-change-comparison";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProduct,
  fetchProductForReview,
  fetchProducts,
  reviewProduct,
  reviewProductChanges,
  updateProductStatus,
  type ProductReviewHistoryEntry,
} from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { useDebouncedValue } from "@/lib/admin/use-debounced-value";
import { LISTING_STATUS_LABELS, changeRequestSummary, isApproved, listingStatusTone } from "@/lib/product-approval";
import type { AdminProduct, ProductStatus } from "@/types/admin";

export const PRODUCT_STATUSES: ProductStatus[] = ["pending_approval", "active", "draft", "archived", "rejected"];
const STOCK_STATUSES = [
  { value: "active", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];
const EMPTY_FILTERS = { search: "", merchant_id: "", status: "", stock_status: "" };

const mainImage = (product: AdminProduct) => product.image_items?.find((image) => image.is_main)?.path ?? product.images?.[0] ?? null;

/**
 * Platform product list. With `review`, it is the approval queue (`review=pending`): new submissions
 * and approved products with pending edits, oldest submission first.
 */
export function ProductsList({
  merchantId,
  initialStatus = "",
  review = false,
  initialOpenId = null,
}: {
  merchantId?: number;
  initialStatus?: string;
  review?: boolean;
  initialOpenId?: number | null;
}) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: initialStatus });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(initialOpenId);
  const debouncedSearch = useDebouncedValue(filters.search);
  const params = {
    ...filters,
    status: review ? "" : filters.status,
    review: review ? "pending" : undefined,
    search: debouncedSearch,
    merchant_id: merchantId ?? filters.merchant_id,
    page,
    per_page: 10,
  };

  const query = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
  });

  const update = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <FilterBar bare>
        <SearchField id={review ? "review-search" : "product-search"} value={filters.search} onChange={(value) => update("search", value)} placeholder="Name, slug, SKU or description…" />
        {merchantId ? null : (
          <MerchantFilter id={review ? "review-merchant" : "product-merchant"} value={filters.merchant_id} onChange={(value) => update("merchant_id", value)} />
        )}
        {review ? null : (
          <Field label="Status" htmlFor="product-status">
            <SelectInput id="product-status" value={filters.status} onChange={(event) => update("status", event.target.value)}>
              <option value="">All statuses</option>
              {PRODUCT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
        <Field label="Stock" htmlFor={review ? "review-stock" : "product-stock"}>
          <SelectInput id={review ? "review-stock" : "product-stock"} value={filters.stock_status} onChange={(event) => update("stock_status", event.target.value)}>
            <option value="">All stock levels</option>
            {STOCK_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Button variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? (
        <EmptyState
          title={review ? "Nothing to review" : undefined}
          description={review ? "No products or product edits are awaiting approval." : "No products match these filters."}
        />
      ) : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption={review ? "Products awaiting approval" : "Products"}
            rows={query.data.data}
            rowKey={(row) => row.id}
            selectedKey={openId}
            columns={[
              {
                key: "name",
                header: "Product",
                render: (row) => {
                  const image = mainImage(row);
                  return (
                    <div className="flex items-center gap-3">
                      {image ? (
                        <ProductImage path={image} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                      ) : (
                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <Package className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900">{row.name}</p>
                        <p className="text-xs text-muted-foreground">SKU {row.sku}</p>
                      </div>
                    </div>
                  );
                },
              },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminProduct) => <MerchantCell merchant={row.merchant} merchantId={row.merchant_id} /> }]),
              { key: "category", header: "Category", render: (row) => row.category?.name ?? "—" },
              {
                key: "price",
                header: "Price",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-navy-900">{formatMoney(row.sale_price ?? row.price)}</p>
                    {row.sale_price ? <p className="text-xs text-muted-foreground line-through">{formatMoney(row.regular_price)}</p> : null}
                  </div>
                ),
              },
              {
                key: "stock",
                header: "Stock",
                render: (row) => (
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{row.stock_quantity}</span>
                    <StatusPill status={row.stock_status === "active" ? "in_stock" : row.stock_status} label={STOCK_STATUSES.find((option) => option.value === row.stock_status)?.label} />
                  </div>
                ),
              },
              { key: "status", header: "Approval", render: (row) => <ApprovalCell product={row} /> },
              ...(review
                ? [{ key: "submitted", header: "Submitted", render: (row: AdminProduct) => formatDateTime(row.pending_change_request?.submitted_at ?? row.approval?.submitted_at) }]
                : []),
              {
                key: "actions",
                header: <span className="sr-only">Actions</span>,
                render: (row) => <IconAction icon={Eye} label={`${review ? "Review" : "View"} ${row.name}`} onClick={() => setOpenId(row.id)} />,
              },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="products" />
        </>
      ) : null}

      <ProductDrawer productId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ApprovalCell({ product }: { product: AdminProduct }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusPill status={product.status} />
      {product.pending_change_request ? <StatusPill status="pending" label="Edits pending" /> : null}
      {product.listing_status && isApproved(product) ? (
        <span className="text-[11px] text-muted-foreground">{LISTING_STATUS_LABELS[product.listing_status]}</span>
      ) : null}
    </div>
  );
}

function ProductDrawer({ productId, onClose }: { productId: number | null; onClose: () => void }) {
  const product = useQuery({
    queryKey: ["admin", "products", "detail", productId],
    queryFn: () => fetchProductForReview(productId!),
    enabled: productId !== null,
  });
  const data = product.data?.product;

  return (
    <Drawer open={productId !== null} onClose={onClose} title={data?.name ?? "Product details"} subtitle={data ? <StatusPill status={data.status} /> : undefined}>
      {product.isPending ? <LoadingState /> : null}
      {product.isError ? <ErrorState error={product.error} onRetry={() => void product.refetch()} /> : null}
      {data ? (
        <>
          <ApprovalSummary product={data} />
          {data.status === "pending_approval" ? <ProductReviewPanel key={`${data.id}-${data.approval?.submitted_at}`} product={data} /> : null}
          {data.pending_change_request ? <ChangeReviewPanel key={data.pending_change_request.id} product={data} /> : null}

          {data.image_items && data.image_items.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {data.image_items.map((image) => (
                <ProductImage key={image.id} path={image.path} alt={data.name} className="h-20 w-20 shrink-0" />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted-foreground">No images uploaded.</p>
          )}
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={data.merchant} merchantId={data.merchant_id} /> },
              { label: "SKU", value: data.sku },
              { label: "Slug", value: data.slug },
              { label: "Category", value: data.category?.name ?? "—" },
              { label: "Brand", value: data.brand ?? "—" },
              { label: "Regular price", value: formatMoney(data.regular_price ?? data.price) },
              { label: "Sale price", value: data.sale_price ? formatMoney(data.sale_price) : "—" },
              { label: "Stock", value: `${data.stock_quantity}${data.track_inventory ? ` (low at ${data.low_stock_threshold})` : " · not tracked"}` },
              { label: "Condition", value: humanize(data.condition) },
              { label: "Weight", value: data.weight ? `${data.weight} kg` : "—" },
              { label: "Tags", value: data.tags.length ? data.tags.join(", ") : "—" },
              { label: "Updated", value: formatDateTime(data.updated_at) },
            ]}
          />
          {data.short_description ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{data.short_description}</p> : null}
          {data.full_description ?? data.description ? (
            <section className="space-y-1">
              <h3 className="text-sm font-bold text-navy-900">Description</h3>
              <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{data.full_description ?? data.description}</p>
            </section>
          ) : null}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-navy-900">Variants</h3>
            {data.variants && data.variants.length > 0 ? (
              <AdminTable
                caption="Product variants"
                rows={data.variants}
                rowKey={(variant) => variant.id}
                columns={[
                  { key: "sku", header: "SKU", render: (variant) => variant.sku },
                  {
                    key: "attributes",
                    header: "Attributes",
                    render: (variant) =>
                      [variant.color, variant.size, ...Object.entries(variant.attributes ?? {}).map(([key, value]) => `${humanize(key)}: ${String(value)}`)]
                        .filter(Boolean)
                        .join(" · ") || "—",
                  },
                  { key: "price", header: "Price", render: (variant) => formatMoney(variant.price) },
                  { key: "stock", header: "Stock", render: (variant) => variant.stock },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">This product has a single SKU without variants.</p>
            )}
          </section>
          <ReviewHistory entries={product.data?.history ?? []} />
          <Can permission={ADMIN_PERMISSIONS.PRODUCTS_MANAGE}>
            <ProductActions key={data.id} product={data} onDeleted={onClose} />
          </Can>
        </>
      ) : null}
    </Drawer>
  );
}

function ApprovalSummary({ product }: { product: AdminProduct }) {
  const approval = product.approval;
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-navy-900">Approval</h3>
        {product.listing_status ? <StatusPill status={listingStatusTone(product.listing_status)} label={LISTING_STATUS_LABELS[product.listing_status]} /> : null}
      </div>
      <DetailList
        items={[
          { label: "Approved", value: approval?.approved_at ? formatDateTime(approval.approved_at) : "Not yet approved" },
          { label: "Submitted", value: formatDateTime(approval?.submitted_at) },
          {
            label: "Last review",
            value: approval?.reviewed_at ? `${formatDateTime(approval.reviewed_at)}${approval.reviewed_by ? ` by ${approval.reviewed_by.name}` : ""}` : "—",
          },
        ]}
      />
      {product.status === "rejected" && approval?.rejection_reason ? (
        <Notice tone="error">Rejected: {approval.rejection_reason}</Notice>
      ) : null}
    </section>
  );
}

function useReviewRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
}

function ReviewButtons({
  busy,
  pending,
  reason,
  reasonId,
  onReason,
  onApprove,
  onReject,
  approveLabel,
  rejectLabel,
}: {
  busy: boolean;
  pending: "approved" | "rejected" | undefined;
  reason: string;
  reasonId: string;
  onReason: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  approveLabel: string;
  rejectLabel: string;
}) {
  return (
    <Can
      permission={ADMIN_PERMISSIONS.PRODUCTS_APPROVE}
      fallback={<p className="text-xs text-muted-foreground">Your role can view but not approve or reject products.</p>}
    >
      <Field label="Rejection reason (required to reject)" htmlFor={reasonId}>
        <Textarea
          id={reasonId}
          className="min-h-[80px]"
          maxLength={1000}
          value={reason}
          placeholder="Shown to the merchant so they can fix the product."
          onChange={(event) => onReason(event.target.value)}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" disabled={busy} onClick={onApprove} className="bg-none bg-emerald-600 hover:bg-emerald-700">
          {busy && pending === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {approveLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onReject}
          className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          {busy && pending === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          {rejectLabel}
        </Button>
      </div>
    </Can>
  );
}

/** Approve (publish) or reject a product submission. The backend decides; the drawer shows its response. */
function ProductReviewPanel({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient();
  const refresh = useReviewRefresh();
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      reviewProduct(product.id, { status, reason: reason.trim() || undefined, submitted_at: product.approval?.submitted_at }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["admin", "products", "detail", product.id], (current: { product: AdminProduct; history: ProductReviewHistoryEntry[] } | undefined) =>
        current ? { ...current, product: updated } : current,
      );
      setNotice({ tone: "success", text: updated.status === "active" ? `${updated.name} was approved and is now Active.` : `${updated.name} was rejected.` });
      await refresh();
    },
    onError: (failure) => {
      const details = parseApiError(failure);
      setNotice({ tone: "error", text: details.fieldErrors.reason?.[0] ?? details.fieldErrors.status?.[0] ?? details.message });
      if (details.status === 409 || details.fieldErrors.status) void refresh();
    },
  });

  const reject = () => {
    if (!reason.trim()) {
      setNotice({ tone: "error", text: "Enter a reason so the merchant knows what to fix." });
      return;
    }
    mutation.mutate("rejected");
  };

  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="text-sm font-bold text-navy-900">Awaiting approval</h3>
      <p className="text-sm text-slate-600">
        Submitted {formatDateTime(product.approval?.submitted_at)}. Review the images, pricing, category and stock below. Approving makes it eligible for the storefront
        (it still needs stock and a verified store).
      </p>
      <ReviewButtons
        busy={mutation.isPending}
        pending={mutation.variables}
        reason={reason}
        reasonId={`product-reason-${product.id}`}
        onReason={setReason}
        onApprove={() => mutation.mutate("approved")}
        onReject={reject}
        approveLabel="Approve product"
        rejectLabel="Reject product"
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}

/** Approve or reject a pending edit to an approved product; the approved version stays live until then. */
function ChangeReviewPanel({ product }: { product: AdminProduct }) {
  const refresh = useReviewRefresh();
  const request = product.pending_change_request!;
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (status: "approved" | "rejected") => reviewProductChanges(request.id, { status, reason: reason.trim() || undefined }),
    onSuccess: async (result) => {
      setNotice({ tone: "success", text: result.data.status === "approved" ? "Changes approved and now live." : "Changes rejected. The live version is unchanged." });
      await refresh();
    },
    onError: (failure) => {
      const details = parseApiError(failure);
      setNotice({ tone: "error", text: details.fieldErrors.reason?.[0] ?? details.fieldErrors.status?.[0] ?? details.message });
      if (details.fieldErrors.status) void refresh();
    },
  });

  const reject = () => {
    if (!reason.trim()) {
      setNotice({ tone: "error", text: "Enter a reason so the merchant knows why their changes were rejected." });
      return;
    }
    mutation.mutate("rejected");
  };

  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="text-sm font-bold text-navy-900">Edits awaiting approval</h3>
      <p className="text-sm text-slate-600">
        Submitted {formatDateTime(request.submitted_at)}
        {request.submitted_by ? ` by ${request.submitted_by.name}` : ""}: {changeRequestSummary(request)}. The approved version below stays live until you approve.
      </p>
      <ProductChangeComparison request={request} />
      <ReviewButtons
        busy={mutation.isPending}
        pending={mutation.variables}
        reason={reason}
        reasonId={`change-reason-${request.id}`}
        onReason={setReason}
        onApprove={() => mutation.mutate("approved")}
        onReject={reject}
        approveLabel="Approve changes"
        rejectLabel="Reject changes"
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}

const HISTORY_LABELS: Record<string, string> = {
  "product.submitted_for_approval": "Submitted for approval",
  "product.approval_withdrawn": "Withdrawn by merchant",
  "product.change_requested": "Edits submitted",
  "product.change_withdrawn": "Edits withdrawn by merchant",
  "admin.products.approved": "Approved",
  "admin.products.rejected": "Rejected",
  "admin.products.change_approved": "Edits approved",
  "admin.products.change_rejected": "Edits rejected",
};

function ReviewHistory({ entries }: { entries: ProductReviewHistoryEntry[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-navy-900">Review history</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions or decisions recorded yet.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <p className="font-semibold text-navy-900">{HISTORY_LABELS[entry.action] ?? entry.action}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(entry.created_at)}
                {entry.actor ? ` · ${entry.actor.name}` : ""}
              </p>
              {entry.reason ? <p className="mt-1 text-slate-700">Reason: {entry.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Visibility of an approved product (active ↔ archived) and deletion. Publishing a product that has
 * not been approved is only possible through the review panel above.
 */
function ProductActions({ product, onDeleted }: { product: AdminProduct; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  const nextStatus: ProductStatus = product.status === "archived" ? "active" : "archived";

  const statusMutation = useMutation({
    mutationFn: () => updateProductStatus(product.id, nextStatus),
    onSuccess: async (updated) => {
      setNotice({ tone: "success", text: `${updated.name} is now ${humanize(updated.status)}.` });
      await refresh();
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: async () => {
      await refresh();
      onDeleted();
    },
    onError: (error) => setNotice({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <section className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <h3 className="text-sm font-bold text-navy-900">Management</h3>
      <div className="flex flex-wrap items-end gap-2">
        {isApproved(product) ? (
          <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
            {product.status === "archived" ? "Restore to Active" : "Archive (hide from store)"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm(`Delete ${product.name}? This cannot be undone.`)) deleteMutation.mutate();
          }}
        >
          Delete
        </Button>
      </div>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}
