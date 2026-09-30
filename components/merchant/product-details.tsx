"use client";

import { DetailList, ErrorState, LoadingState, StatusPill } from "@/components/admin/ui";
import { ProductImage } from "@/components/merchant/product-image";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { useProduct, useProductInventoryLogs } from "@/lib/hooks/products";

export function ProductDetails({ productId }: { productId: number }) {
  const product = useProduct(productId);
  const logs = useProductInventoryLogs(productId);

  if (product.isPending) return <LoadingState label="Loading product…" />;
  if (product.isError) return <ErrorState error={product.error} title="Unable to load product" onRetry={() => void product.refetch()} />;

  const data = product.data;
  return (
    <div className="space-y-5">
      {data.images?.length ? (
        <div className="flex flex-wrap gap-2">
          {data.images.map((path) => (
            <ProductImage key={path} path={path} alt={data.name} className="h-24 w-24" />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No images uploaded.</p>
      )}
      <DetailList
        items={[
          { label: "Name", value: data.name },
          { label: "Status", value: <StatusPill status={data.status} /> },
          { label: "SKU", value: data.sku },
          { label: "Slug", value: data.slug },
          { label: "Price", value: formatMoney(data.price) },
          { label: "Stock", value: data.stock_quantity },
          { label: "Category", value: data.category?.name ?? "—" },
          { label: "Updated", value: formatDateTime(data.updated_at) },
        ]}
      />
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Description</h3>
        <p className="whitespace-pre-line text-sm text-slate-700">{data.description || "—"}</p>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent inventory changes</h3>
        {logs.isPending ? <LoadingState label="Loading inventory history…" /> : null}
        {logs.isError ? <ErrorState error={logs.error} title="Unable to load inventory history" onRetry={() => void logs.refetch()} /> : null}
        {logs.data && logs.data.data.length === 0 ? <p className="text-sm text-muted-foreground">No inventory adjustments yet.</p> : null}
        {logs.data && logs.data.data.length > 0 ? (
          <ul className="divide-y divide-slate-100 rounded-2xl bg-slate-50 text-sm">
            {logs.data.data.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
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
    </div>
  );
}
