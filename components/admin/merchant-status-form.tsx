"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Field, Notice, SelectInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateMerchantStatus } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import { humanize } from "@/lib/admin/format";
import { merchantStatusSchema, type MerchantStatusSchema } from "@/lib/validation/admin";
import type { AdminMerchant, MerchantStatus } from "@/types/admin";

export const MERCHANT_STATUSES: MerchantStatus[] = ["pending", "verified", "information_requested", "suspended", "rejected"];

export function MerchantStatusForm({ merchant, onUpdated }: { merchant: AdminMerchant; onUpdated?: (merchant: AdminMerchant) => void }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MerchantStatusSchema>({
    resolver: zodResolver(merchantStatusSchema),
    defaultValues: { status: merchant.status ?? "pending", reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: MerchantStatusSchema) =>
      updateMerchantStatus(merchant.id, { status: values.status, reason: values.reason.trim() || undefined }),
    onSuccess: async (updated) => {
      setResult({ tone: "success", text: `Merchant status updated to ${humanize(updated.status)}.` });
      reset({ status: updated.status ?? "pending", reason: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      onUpdated?.(updated);
    },
    onError: (error) => setResult({ tone: "error", text: parseApiError(error).message }),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <Field label="Status" htmlFor={`merchant-status-${merchant.id}`} error={errors.status?.message}>
        <SelectInput id={`merchant-status-${merchant.id}`} className="w-full" {...register("status")}>
          {MERCHANT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Reason / note (optional, recorded in the audit log)" htmlFor={`merchant-reason-${merchant.id}`} error={errors.reason?.message}>
        <Textarea id={`merchant-reason-${merchant.id}`} className="min-h-[90px]" maxLength={1000} {...register("reason")} />
      </Field>
      {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Update status
      </Button>
    </form>
  );
}
