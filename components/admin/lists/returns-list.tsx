"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { MerchantFilter } from "@/components/admin/merchant-filter";
import { PrivateFile } from "@/components/admin/private-file";
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
  SelectInput,
  StatusPill,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchReturnEvidence, fetchReturnRequest, fetchReturnRequests, reviewReturnRequest } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { formatDateTime, formatMoney, humanize } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { AdminReturnRequest } from "@/types/admin";

const RETURN_STATUSES = ["pending", "approved", "rejected", "processed"];

// Mirrors ReturnRequestsController::review: pending → approved/rejected, approved → processed.
const RETURN_TRANSITIONS: Record<string, string[]> = { pending: ["approved", "rejected"], approved: ["processed"], rejected: [], processed: [] };

export function ReturnsList({ merchantId }: { merchantId?: number }) {
  const [filters, setFilters] = useState({ merchant_id: "", status: "", order_id: "" });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const orderId = /^\d+$/.test(filters.order_id.trim()) ? filters.order_id.trim() : "";
  const params = { status: filters.status, order_id: orderId, merchant_id: merchantId ?? filters.merchant_id, page, per_page: 10 };

  const query = useQuery({
    queryKey: ["admin", "returns", params],
    queryFn: () => fetchReturnRequests(params),
    placeholderData: keepPreviousData,
  });

  const update = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <FilterBar bare>
        {merchantId ? null : <MerchantFilter id="return-merchant" value={filters.merchant_id} onChange={(value) => update("merchant_id", value)} />}
        <Field label="Status" htmlFor="return-status">
          <SelectInput id="return-status" value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">All</option>
            {RETURN_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Order ID" htmlFor="return-order" error={filters.order_id && !orderId ? "Enter a numeric order ID" : undefined}>
          <Input id="return-order" inputMode="numeric" className="w-32" value={filters.order_id} onChange={(event) => update("order_id", event.target.value)} />
        </Field>
      </FilterBar>

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? <EmptyState description="No return requests match these filters." /> : null}
      {query.data && query.data.data.length > 0 ? (
        <>
          <AdminTable
            bare
            caption="Return requests"
            rows={query.data.data}
            rowKey={(row) => row.id}
            selectedKey={openId}
            columns={[
              { key: "id", header: "Request", className: "whitespace-nowrap", render: (row) => <span className="font-semibold text-brand-700">#{row.id}</span> },
              ...(merchantId ? [] : [{ key: "merchant", header: "Merchant", render: (row: AdminReturnRequest) => <MerchantCell merchant={row.merchant} merchantId={row.merchant_id} /> }]),
              { key: "order", header: "Order", className: "whitespace-nowrap", render: (row) => row.order?.order_number ?? `#${row.order_id}` },
              { key: "customer", header: "Customer", render: (row) => row.customer?.name ?? `#${row.customer_id}` },
              { key: "reason", header: "Reason", className: "max-w-56", render: (row) => <span className="line-clamp-2">{row.reason}</span> },
              { key: "amount", header: "Amount", className: "whitespace-nowrap", render: (row) => formatMoney(row.amount) },
              { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
              { key: "refund", header: "Refund", render: (row) => (row.refund_id ? `#${row.refund_id}` : "—") },
              { key: "created", header: "Requested", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
              { key: "actions", header: <span className="sr-only">Actions</span>, render: (row) => <IconAction icon={Eye} label={`View return ${row.id}`} onClick={() => setOpenId(row.id)} /> },
            ]}
          />
          <Pagination meta={query.data.meta} onPageChange={setPage} noun="return requests" />
        </>
      ) : null}

      <ReturnDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ReturnDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin", "returns", "detail", id], queryFn: () => fetchReturnRequest(id!), enabled: id !== null });
  const data = detail.data;

  return (
    <Drawer open={id !== null} onClose={onClose} title={id ? `Return request #${id}` : "Return request"} subtitle={data ? <StatusPill status={data.status} /> : undefined}>
      {detail.isPending ? <LoadingState /> : null}
      {detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : null}
      {data ? (
        <>
          <DetailList
            items={[
              { label: "Merchant", value: <MerchantCell merchant={data.merchant} merchantId={data.merchant_id} /> },
              { label: "Order", value: data.order ? `${data.order.order_number} · ${formatMoney(data.order.total_amount)}` : `#${data.order_id}` },
              { label: "Order payment", value: data.order ? <StatusPill status={data.order.payment_status} /> : "—" },
              { label: "Customer", value: data.customer?.name ?? `#${data.customer_id}` },
              { label: "Return amount", value: formatMoney(data.amount) },
              { label: "Linked refund", value: data.refund_id ? `#${data.refund_id}` : "—" },
              { label: "Reason", value: data.reason },
              { label: "Requested", value: formatDateTime(data.created_at) },
            ]}
          />
          {data.notes ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{data.notes}</p> : null}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-navy-900">Items</h3>
            <ul className="space-y-1 text-sm">
              {data.items.map((item) => (
                <li key={item.id} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>Order item #{item.order_item_id} × {item.quantity}</span>
                  <span>{formatMoney(item.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
          {data.evidence.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-navy-900">Evidence</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.evidence.map((file, index) => (
                  <PrivateFile key={`${file.name}-${index}`} label={file.name} name={file.name} load={() => fetchReturnEvidence(data.id, index)} />
                ))}
              </div>
            </section>
          ) : null}
          <Can permission={ADMIN_PERMISSIONS.PAYMENTS_REFUND}>
            <ReturnReview request={data} />
          </Can>
        </>
      ) : null}
    </Drawer>
  );
}

function ReturnReview({ request }: { request: AdminReturnRequest }) {
  const queryClient = useQueryClient();
  const transitions = RETURN_TRANSITIONS[request.status] ?? [];
  const [status, setStatus] = useState(transitions[0] ?? "");
  const [refundId, setRefundId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const next = transitions.includes(status) ? status : (transitions[0] ?? "");
  const needsRefund = next === "processed" && Number(request.amount) > 0;

  const mutation = useMutation({
    mutationFn: () => reviewReturnRequest(request.id, needsRefund ? { status: next, refund_id: Number(refundId) } : { status: next }),
    onSuccess: async (updated) => {
      setNotice({ tone: "success", text: `Return #${updated.id} is now ${humanize(updated.status)}.` });
      await queryClient.invalidateQueries({ queryKey: ["admin", "returns"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    },
    onError: (error) => {
      const details = parseApiError(error);
      setNotice({ tone: "error", text: details.fieldErrors.refund_id?.[0] ?? details.fieldErrors.status?.[0] ?? details.message });
    },
  });

  if (transitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{humanize(request.status)} return requests are locked.</p>;
  }

  return (
    <section className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <h3 className="text-sm font-bold text-navy-900">Review return</h3>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Decision" htmlFor={`return-next-${request.id}`}>
          <SelectInput id={`return-next-${request.id}`} value={next} onChange={(event) => setStatus(event.target.value)}>
            {transitions.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </SelectInput>
        </Field>
        {needsRefund ? (
          <Field label="Processed refund ID" htmlFor={`return-refund-${request.id}`}>
            <Input id={`return-refund-${request.id}`} inputMode="numeric" className="w-36" value={refundId} onChange={(event) => setRefundId(event.target.value.trim())} />
          </Field>
        ) : null}
        <Button disabled={mutation.isPending || (needsRefund && !/^\d+$/.test(refundId))} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save decision"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Processing a paid return requires an existing processed refund for the same order and amount. Stock is restored by the API when processed.
      </p>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </section>
  );
}
