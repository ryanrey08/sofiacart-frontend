"use client";

import { Pencil } from "lucide-react";
import { ErrorState, LoadingState, StatusPill } from "@/components/admin/ui";
import { ProductImage } from "@/components/merchant/product-image";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { useProduct, useProductInventoryLogs } from "@/lib/hooks/products";
import type { ProductResource } from "@/types";

export function ProductDetails({ productId, onEdit }: { productId: number; onEdit?: () => void }) {
  const product = useProduct(productId);
  const logs = useProductInventoryLogs(productId);

  if (product.isPending) return <LoadingState label="Loading product…" />;
  if (product.isError) return <ErrorState error={product.error} title="Unable to load product" onRetry={() => void product.refetch()} />;

  const data = product.data;
  const gallery = galleryPaths(data);
  const onSale = data.sale_price !== null && data.sale_price !== undefined && data.sale_price !== "";
  const dimensions = [data.dimensions?.length, data.dimensions?.width, data.dimensions?.height].filter(
    (value) => value !== null && value !== undefined && value !== "",
  );

  return (
    <div className="space-y-4">
      {gallery.length ? (
        <div className="space-y-2">
          <ProductImage path={gallery[0]} alt={data.name} className="h-40 w-full" />
          {gallery.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {gallery.slice(1).map((path) => (
                <ProductImage key={path} path={path} alt={data.name} className="h-14 w-14" />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">No images uploaded.</p>
      )}

      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-navy-900">{data.name}</h3>
          <StatusPill status={data.status} />
        </div>
        <p className="text-xs text-muted-foreground">SKU {data.sku}</p>
        <p className="mt-2 text-lg font-bold text-navy-900">
          {formatMoney(onSale ? data.sale_price : (data.regular_price ?? data.price))}
          {onSale ? <span className="ml-2 text-sm font-medium text-muted-foreground line-through">{formatMoney(data.regular_price ?? data.price)}</span> : null}
        </p>
        {data.short_description ? <p className="mt-2 text-sm text-slate-700">{data.short_description}</p> : null}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Detail label="Category" value={data.category?.name ?? "—"} />
        <Detail label="Stock" value={`${data.stock_quantity} · ${humanize(data.stock_status)}`} />
        <Detail label="Brand" value={data.brand || "—"} />
        <Detail label="Condition" value={data.condition ? humanize(data.condition) : "—"} />
        <Detail label="Cost price" value={data.cost_price ? formatMoney(data.cost_price) : "—"} />
        <Detail label="Weight" value={data.weight ? `${data.weight} kg` : "—"} />
        <Detail label="Dimensions" value={dimensions.length === 3 ? `${dimensions.join(" × ")} cm` : "—"} />
        <Detail
          label="Low stock at"
          value={data.track_inventory ? String(data.low_stock_threshold) : "Not tracked"}
        />
      </dl>

      {data.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {data.variants?.length ? (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">Variants</h4>
          <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 text-sm">
            {data.variants.map((variant) => (
              <li key={variant.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate">
                  {[variant.color, variant.size].filter(Boolean).join(" · ") || variant.sku}
                  <span className="block text-xs text-muted-foreground">SKU {variant.sku}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-slate-600">
                  {formatMoney(variant.price)}
                  <span className="block">{variant.stock} in stock</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.full_description || data.description ? (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">Description</h4>
          <p className="whitespace-pre-line text-sm text-slate-700">{data.full_description || data.description}</p>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Recent inventory changes</h4>
        {logs.isPending ? <LoadingState label="Loading inventory history…" /> : null}
        {logs.isError ? <ErrorState error={logs.error} title="Unable to load inventory history" onRetry={() => void logs.refetch()} /> : null}
        {logs.data && logs.data.data.length === 0 ? <p className="text-sm text-muted-foreground">No inventory adjustments yet.</p> : null}
        {logs.data && logs.data.data.length > 0 ? (
          <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 text-sm">
            {logs.data.data.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className={log.quantity_change > 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </span>{" "}
                  · {log.reason}
                  {log.notes ? <span className="text-muted-foreground"> — {log.notes}</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  Stock {log.resulting_stock} · {formatDateTime(log.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">Updated {formatDateTime(data.updated_at)}</p>

      {onEdit ? (
        <Button type="button" variant="outline" className="w-full" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit product
        </Button>
      ) : null}
    </div>
  );
}

// `image_items` carries the ordered gallery with its primary flag; `images` is the legacy path list.
function galleryPaths(product: ProductResource) {
  if (product.image_items?.length) {
    return [...product.image_items]
      .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order)
      .map((image) => image.path);
  }
  return product.images ?? [];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-900">{value}</dd>
    </div>
  );
}
