"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Can } from "@/components/admin/require-permission";
import { EmptyState, ErrorState, Field, LoadingState, Notice, Pagination, StatusPill } from "@/components/admin/ui";
import { ChangeRequestFilePreviews, ProfileChangeComparison } from "@/components/merchant/profile-change-comparison";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchMerchantChangeRequest,
  fetchMerchantChangeRequestFile,
  fetchMerchantChangeRequests,
  fetchMerchantDocument,
  reviewMerchantChangeRequest,
} from "@/lib/api/admin";
import { formatDateTime } from "@/lib/admin/format";
import { parseApiError } from "@/lib/admin/errors";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { fieldLabel } from "@/lib/merchant-profile";
import type { AdminMerchant } from "@/types/admin";

const CHANGE_REQUESTS_KEY = ["admin", "merchant-change-requests"] as const;

/**
 * Review of a merchant's pending profile change: current approved values vs requested values,
 * with Approve (applies the values to the live record) and Reject (requires a reason).
 */
export function PendingProfileChangeReview({
  merchant,
  changeRequestId,
  onDecided,
}: {
  merchant: AdminMerchant;
  changeRequestId: number;
  onDecided: (merchant: AdminMerchant) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const request = useQuery({
    queryKey: [...CHANGE_REQUESTS_KEY, changeRequestId],
    queryFn: () => fetchMerchantChangeRequest(changeRequestId),
  });

  const mutation = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      reviewMerchantChangeRequest(changeRequestId, { status, reason: reason.trim() || undefined }),
    onSuccess: async (result) => {
      setError(null);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      await queryClient.invalidateQueries({ queryKey: CHANGE_REQUESTS_KEY });
      onDecided(result.meta.merchant);
    },
    onError: (failure) => {
      const details = parseApiError(failure);
      setError(details.fieldErrors.reason?.[0] ?? details.fieldErrors.status?.[0] ?? details.message);
    },
  });

  if (request.isPending) return <LoadingState label="Loading requested changes…" />;
  if (request.isError) return <ErrorState error={request.error} onRetry={() => void request.refetch()} />;

  const data = request.data;
  const reject = () => {
    if (!reason.trim()) {
      setError("Enter a reason so the merchant knows why their changes were rejected.");
      return;
    }
    mutation.mutate("rejected");
  };
  const busy = mutation.isPending;
  const reasonId = `change-reason-${data.id}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Request #{data.id} · submitted {formatDateTime(data.submitted_at)}
        {data.submitted_by ? ` by ${data.submitted_by.name}` : ""}. The merchant&apos;s live details stay unchanged until you approve.
      </p>
      <ProfileChangeComparison request={data} />
      <ChangeRequestFilePreviews
        request={data}
        hasCurrent={(document) => (merchant.documents ?? []).includes(document)}
        loadCurrent={(document) => fetchMerchantDocument(merchant.id, document)}
        loadRequested={(document) => fetchMerchantChangeRequestFile(data.id, document)}
      />

      <Can
        permission={ADMIN_PERMISSIONS.MERCHANTS_MANAGE}
        fallback={<p className="text-xs text-muted-foreground">Your role can view but not approve or reject profile changes.</p>}
      >
        <Field label="Rejection reason (required to reject)" htmlFor={reasonId}>
          <Textarea
            id={reasonId}
            className="min-h-[80px]"
            maxLength={1000}
            value={reason}
            placeholder="Shown to the merchant and recorded in the merchant history."
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" disabled={busy} onClick={() => mutation.mutate("approved")} className="bg-none bg-emerald-600 hover:bg-emerald-700">
            {busy && mutation.variables === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve changes
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={reject}
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            {busy && mutation.variables === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reject changes
          </Button>
        </div>
      </Can>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}

/** All profile change requests for one merchant, newest first. */
export function ProfileChangeHistory({ merchantId }: { merchantId: number }) {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: [...CHANGE_REQUESTS_KEY, "merchant", merchantId, page],
    queryFn: () => fetchMerchantChangeRequests({ merchant_id: merchantId, page, per_page: 5 }),
    placeholderData: keepPreviousData,
  });

  if (history.isPending) return <LoadingState label="Loading change requests…" />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  if (history.data.data.length === 0) return <EmptyState title="No profile change requests" />;

  return (
    <div>
      <ol className="space-y-3">
        {history.data.data.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy-900">Request #{entry.id}</p>
              <StatusPill status={entry.status} />
            </div>
            <p className="mt-1 text-xs text-slate-600">{entry.fields.map(fieldLabel).join(", ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {formatDateTime(entry.submitted_at)}
              {entry.reviewed_at ? ` · ${entry.status === "approved" ? "Approved" : "Rejected"} ${formatDateTime(entry.reviewed_at)}` : ""}
              {entry.reviewed_by ? ` by ${entry.reviewed_by.name}` : ""}
              {entry.withdrawn_at ? ` · Withdrawn by merchant ${formatDateTime(entry.withdrawn_at)}` : ""}
            </p>
            {entry.rejection_reason ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{entry.rejection_reason}</p> : null}
          </li>
        ))}
      </ol>
      <Pagination meta={history.data.meta} onPageChange={setPage} noun="requests" />
    </div>
  );
}
