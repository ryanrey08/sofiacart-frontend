"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, Box, ClipboardList, Info, Loader2, Save } from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Notice,
  SelectInput,
} from "@/components/admin/ui";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { parseApiError } from "@/lib/admin/errors";
import { getStoredAuth } from "@/lib/auth";
import { useAdjustStock, useInventoryProduct } from "@/lib/hooks/inventory";
import {
  STOCK_ADJUSTMENT_LABELS,
  STOCK_ADJUSTMENT_TYPES,
  STOCK_REFERENCE_TYPES,
  mapStockUpdateErrorField,
  stockUpdateSchema,
  type StockUpdateValues,
  type ValidatedStockUpdate,
} from "@/lib/validation/inventory";
import { cn } from "@/lib/utils";
import type { InventoryItemResource, InventoryLogResource } from "@/types";

const REMARKS_MAX = 500;

// Resulting on-hand stock a given adjustment would produce (matches the backend rules).
function previewOnHand(type: string, onHand: number, quantity: number): number | null {
  if (!Number.isInteger(quantity)) return null;
  if (type === "increase") return onHand + quantity;
  if (type === "decrease") return onHand - quantity;
  return quantity; // set replaces on-hand
}

export default function UpdateStockPage() {
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="Inventory management is available to merchant accounts linked to a store." />;
  }
  return (
    <Suspense fallback={<LoadingState label="Loading stock update…" />}>
      <UpdateStockContent />
    </Suspense>
  );
}

function UpdateStockContent() {
  const searchParams = useSearchParams();
  const productId = Number(searchParams.get("product"));
  const variantParam = searchParams.get("variant");
  const variantId = variantParam && /^\d+$/.test(variantParam) ? Number(variantParam) : null;

  const detail = useInventoryProduct(Number.isInteger(productId) && productId > 0 ? productId : null);

  if (!Number.isInteger(productId) || productId <= 0) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="No product selected" description="Open Update Stock from an inventory item." />
      </div>
    );
  }
  if (detail.isPending) return <LoadingState label="Loading stock update…" />;
  if (detail.isError) return <ErrorState error={detail.error} title="Unable to load this product" onRetry={() => void detail.refetch()} />;
  if (!detail.data) return <EmptyState title="Product not found" />;

  const item = detail.data.items.find((pool) =>
    variantId ? pool.product_variant_id === variantId : pool.item_type === "product",
  );

  if (!item) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="Stock pool not found" description="This product or variant no longer has a stock record." />
      </div>
    );
  }

  return <UpdateStockForm item={item} product={detail.data.product} movements={detail.data.recent_movements} onSaved={() => void detail.refetch()} />;
}

function BackLink() {
  return (
    <Link
      href="/sales/inventory"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Inventory
    </Link>
  );
}

function UpdateStockForm({
  item,
  product,
  movements,
  onSaved,
}: {
  item: InventoryItemResource;
  product: { name: string; sku: string; brand: string | null; category?: { name: string } | null };
  movements: InventoryLogResource[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const mutation = useAdjustStock();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockUpdateValues, unknown, ValidatedStockUpdate>({
    resolver: zodResolver(stockUpdateSchema),
    defaultValues: {
      productVariantId: item.product_variant_id ? String(item.product_variant_id) : "",
      adjustmentType: "increase",
      quantity: "",
      reason: "",
      referenceType: "",
      referenceNumber: "",
      supplier: "",
      referenceDate: "",
      notes: "",
    },
  });

  const type = useWatch({ control, name: "adjustmentType" });
  const quantityRaw = useWatch({ control, name: "quantity" });
  const remarks = useWatch({ control, name: "notes" }) ?? "";
  const quantity = Number(quantityRaw);
  const preview = quantityRaw !== "" && /^\d+$/.test(quantityRaw) ? previewOnHand(type, item.on_hand, quantity) : null;
  const previewInvalid = preview !== null && (preview < 0 || preview < item.reserved);
  const variantLabel = item.variant ? [item.variant.color, item.variant.size].filter(Boolean).join(" / ") : null;

  const onSubmit = async (values: ValidatedStockUpdate) => {
    setFormError(null);
    setSuccess(null);
    try {
      const response = await mutation.mutateAsync({ productId: item.product_id, values });
      const updated = response.inventory_item;
      setSuccess(
        `${response.message}${updated ? ` ${updated.name} now has ${updated.available} available (${updated.on_hand} on hand).` : ""}`,
      );
      reset({ ...values, quantity: "", referenceNumber: "", notes: "" });
      onSaved();
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const details = parseApiError(error, "Stock could not be updated.");
      let mappedToField = false;
      for (const [apiField, messages] of Object.entries(details.fieldErrors)) {
        const field = mapStockUpdateErrorField(apiField);
        if (field && messages[0]) {
          setError(field, { type: "server", message: messages[0] });
          mappedToField = true;
        }
      }
      if (!mappedToField) setFormError(details.message);
    }
  };

  return (
    <form id="stock-update-form" className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <BackLink />
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">Update Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">Adjust the stock quantity for this product.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/sales/inventory")} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSubmitting ? "Saving…" : "Update Stock"}
          </Button>
        </div>
      </div>

      {success ? <Notice tone="success">{success}</Notice> : null}
      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Product information */}
          <Card className="border-none bg-white/95">
            <CardContent className="p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
                <Box className="h-4 w-4 text-brand-600" />
                Product Information
              </h2>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                {item.image ? (
                  <ProductImage path={item.image} alt={item.name} className="h-28 w-28 shrink-0" />
                ) : (
                  <div className="h-28 w-28 shrink-0 rounded-xl bg-slate-100" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">{item.name}</p>
                    <StockStatusBadge status={item.stock_status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    <InfoRow label="SKU" value={item.sku} />
                    <InfoRow label="Category" value={item.category?.name ?? product.category?.name ?? "—"} />
                    <InfoRow label="Brand" value={item.brand ?? product.brand ?? "—"} />
                    {variantLabel ? <InfoRow label="Variant" value={variantLabel} /> : null}
                    <InfoRow label="Price" value={item.price ? formatMoney(item.price) : "—"} />
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock update */}
          <Card className="border-none bg-white/95">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
                <ClipboardList className="h-4 w-4 text-brand-600" />
                Stock Update
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StockStat label="Current Stock" value={item.on_hand} tone="brand" />
                <StockStat label="Reserved Stock" value={item.reserved} tone="warning" />
                <StockStat label="Available Stock" value={item.available} tone="success" />
                <StockStat label="Low Stock Threshold" value={item.low_stock_threshold} tone="muted" />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(0,12rem)] lg:items-start">
                <Field label="Update Type *" htmlFor="stock-update-type" error={errors.adjustmentType?.message}>
                  <div id="stock-update-type" className="space-y-2">
                    {STOCK_ADJUSTMENT_TYPES.map((value) => (
                      <label
                        key={value}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                          type === value
                            ? "border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-200"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <input type="radio" value={value} className="accent-brand-600" {...register("adjustmentType")} />
                        {STOCK_ADJUSTMENT_LABELS[value]}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Quantity *" htmlFor="stock-quantity" error={errors.quantity?.message}>
                  <Input
                    id="stock-quantity"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder={type === "set" ? "New total" : "Units"}
                    hasError={!!errors.quantity}
                    {...register("quantity")}
                  />
                </Field>

                <div>
                  <span className="block text-sm font-medium text-slate-700">New Stock after Update</span>
                  <div
                    className={cn(
                      "mt-2 flex flex-col justify-center rounded-xl px-3 py-2.5",
                      previewInvalid ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700",
                    )}
                  >
                    <span className="text-2xl font-bold leading-none">{preview === null ? "—" : preview}</span>
                    {preview !== null && type !== "set" ? (
                      <span className="mt-1 text-xs font-medium text-slate-500">
                        ({item.on_hand} {type === "increase" ? "+" : "−"} {quantity || 0})
                      </span>
                    ) : null}
                  </div>
                  {previewInvalid ? (
                    <p className="mt-1 text-xs text-red-600">
                      {preview !== null && preview < item.reserved
                        ? `Cannot drop below the ${item.reserved} unit(s) reserved for open orders.`
                        : "Resulting stock cannot be negative."}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reference Type" htmlFor="stock-reference-type" error={errors.referenceType?.message}>
                  <SelectInput id="stock-reference-type" className="w-full" {...register("referenceType")}>
                    <option value="">Not specified</option>
                    {STOCK_REFERENCE_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {humanize(value)}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Reference No." htmlFor="stock-reference-number" error={errors.referenceNumber?.message}>
                  <Input id="stock-reference-number" placeholder="e.g. PO-2026-0156" hasError={!!errors.referenceNumber} {...register("referenceNumber")} />
                </Field>
                <Field label="Supplier" htmlFor="stock-supplier" error={errors.supplier?.message}>
                  <Input id="stock-supplier" placeholder="e.g. ABC Electronics Inc." hasError={!!errors.supplier} {...register("supplier")} />
                </Field>
                <Field label="Date" htmlFor="stock-reference-date" error={errors.referenceDate?.message}>
                  <Input id="stock-reference-date" type="date" {...register("referenceDate")} />
                </Field>
              </div>

              <Field label="Remarks" htmlFor="stock-remarks" error={errors.notes?.message}>
                <Textarea
                  id="stock-remarks"
                  className="min-h-24"
                  maxLength={REMARKS_MAX}
                  placeholder="e.g. Received new stock from supplier. Ref: PO-2026-0156"
                  hasError={!!errors.notes}
                  {...register("notes")}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {remarks.length}/{REMARKS_MAX}
                </p>
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <RecentMovements movements={movements} />
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Stock updates are reflected immediately in your inventory and recorded in the stock movement history for tracking.</p>
          </div>
        </div>
      </div>
    </form>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function StockStatusBadge({ status }: { status: InventoryItemResource["stock_status"] }) {
  const meta = {
    active: { label: "In Stock", className: "bg-green-50 text-green-700" },
    low_stock: { label: "Low Stock", className: "bg-amber-50 text-amber-800" },
    out_of_stock: { label: "Out of Stock", className: "bg-red-50 text-red-700" },
  }[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>;
}

function StockStat({ label, value, tone }: { label: string; value: number; tone: "brand" | "success" | "warning" | "muted" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    muted: "bg-slate-100 text-slate-600",
  } as const;
  return (
    <div className={cn("rounded-xl px-3 py-2.5 text-center", tones[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
    </div>
  );
}

const MOVEMENT_META: Record<string, { label: string; className: string }> = {
  stock_in: { label: "Stock In", className: "bg-green-50 text-green-700" },
  stock_out: { label: "Stock Out", className: "bg-red-50 text-red-700" },
  adjustment: { label: "Adjustment", className: "bg-slate-100 text-slate-600" },
  sale: { label: "Sale", className: "bg-blue-50 text-blue-700" },
  cancellation: { label: "Cancellation", className: "bg-amber-50 text-amber-800" },
  return: { label: "Return", className: "bg-brand-50 text-brand-700" },
};

function RecentMovements({ movements }: { movements: InventoryLogResource[] }) {
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-navy-900">Recent Stock Movements</h2>
        {movements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No stock movements recorded for this product yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {movements.map((log) => {
              const meta = MOVEMENT_META[log.type ?? ""] ?? { label: humanize(log.type), className: "bg-slate-100 text-slate-600" };
              return (
                <li key={log.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.className)}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.previous_stock !== undefined ? `${log.previous_stock} → ${log.resulting_stock}` : `Stock ${log.resulting_stock}`}
                      {log.reference_number ? ` · ${log.reference_number}` : ""}
                      {log.user?.name ? ` · ${log.user.name}` : " · System"}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-sm font-semibold", log.quantity_change > 0 ? "text-green-700" : "text-red-700")}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
