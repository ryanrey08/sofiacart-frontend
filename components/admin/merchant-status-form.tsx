"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileQuestion, Loader2, XCircle } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateMerchantStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { MERCHANT_REASON_REQUIRED } from "@/lib/admin/permissions";
import { merchantStatusSchema } from "@/lib/validation/admin";
import type { AdminMerchant, MerchantStatus } from "@/types/admin";

export const MERCHANT_STATUSES: MerchantStatus[] = ["pending", "verified", "information_requested", "suspended", "rejected"];

const STATUS_LABELS: Record<MerchantStatus, string> = {
  pending: "Pending review",
  verified: "Approved",
  information_requested: "Information requested",
  suspended: "Suspended",
  rejected: "Rejected",
};

export const merchantStatusLabel = (status: MerchantStatus | null | undefined) => (status ? STATUS_LABELS[status] : "—");

// Records an onboarding decision through PATCH /api/admin/merchants/{id}/status. The backend
// persists the status, writes the audit log (admin, timestamp, reason) and refuses no-op changes.
export function MerchantStatusForm({ merchant, onUpdated }: { merchant: AdminMerchant; onUpdated?: (merchant: AdminMerchant) => void }) {
  const queryClient = useQueryClient();
  const current = merchant.status ?? "pending";
  const [reason, setReason] = useState("");
  const [other, setOther] = useState<MerchantStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (status: MerchantStatus) => updateMerchantStatus(merchant.id, { status, reason: reason.trim() || undefined }),
    onSuccess: async (updated) => {
      setSuccess(`Merchant is now ${merchantStatusLabel(updated.status)}. The decision was recorded in the audit log.`);
      setError(null);
      setReason("");
      setOther("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      onUpdated?.(updated);
    },
    onError: (failure) => {
      const details = parseApiError(failure);
      setError(details.fieldErrors.reason?.[0] ?? details.fieldErrors.status?.[0] ?? details.message);
      setSuccess(null);
    },
  });

  const decide = (status: MerchantStatus) => {
    const parsed = merchantStatusSchema.safeParse({ status, reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the decision details.");
      setSuccess(null);
      return;
    }
    if (status === current) {
      setError(`The merchant is already ${merchantStatusLabel(status).toLowerCase()}.`);
      return;
    }
    mutation.mutate(status);
  };

  const reasonId = `merchant-reason-${merchant.id}`;
  const busy = mutation.isPending;
  const others = MERCHANT_STATUSES.filter((status) => status !== current);

  return (
    <div className="space-y-4">
      <Field label={`Reason / note${MERCHANT_REASON_REQUIRED.has(other) ? " (required)" : ""}`} htmlFor={reasonId}>
        <Textarea
          id={reasonId}
          className="min-h-[90px]"
          maxLength={1000}
          value={reason}
          placeholder="Required to reject or request information. Recorded in the onboarding history."
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" disabled={busy || current === "verified"} onClick={() => decide("verified")} className="bg-none bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Approve
        </Button>
        <Button type="button" variant="outline" disabled={busy || current === "information_requested"} onClick={() => decide("information_requested")}>
          <FileQuestion className="h-4 w-4" />
          Request info
        </Button>
        <Button type="button" variant="outline" disabled={busy || current === "rejected"} onClick={() => decide("rejected")} className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
        <Field label="Other status change" htmlFor={`merchant-other-${merchant.id}`} className="flex-1">
          <SelectInput id={`merchant-other-${merchant.id}`} className="w-full" value={other} onChange={(event) => setOther(event.target.value as MerchantStatus | "")}>
            <option value="">Select a status…</option>
            {others.map((status) => (
              <option key={status} value={status}>
                {merchantStatusLabel(status)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Button type="button" variant="outline" disabled={busy || !other} onClick={() => other && decide(other)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Apply
        </Button>
      </div>

      {busy ? <Notice tone="info">Saving decision…</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {success ? <Notice tone="success">{success}</Notice> : null}
      <p className="text-xs text-muted-foreground">
        Current status: <strong>{merchantStatusLabel(current)}</strong>
      </p>
    </div>
  );
}
