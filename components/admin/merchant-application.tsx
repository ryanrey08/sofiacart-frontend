"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { PrivateFile } from "@/components/admin/private-file";
import { merchantStatusLabel } from "@/components/admin/merchant-status-form";
import { DetailList, EmptyState, ErrorState, LoadingState, Pagination, StatusPill } from "@/components/admin/ui";
import { fetchMerchantDocument, fetchMerchantOnboardingHistory } from "@/lib/api/admin";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { onboardingSteps } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";
import type { AdminMerchant, MerchantDocument, MerchantStatus } from "@/types/admin";

const DOCUMENT_LABELS: Record<MerchantDocument, string> = {
  business_permit: "Business permit",
  government_id: "Government ID",
  store_logo: "Store logo",
  store_banner: "Store banner",
};

export function OnboardingProgress({ merchant, compact = false }: { merchant: AdminMerchant; compact?: boolean }) {
  const steps = onboardingSteps(merchant);
  return (
    <ol className="flex items-start" aria-label={`Onboarding progress: ${merchantStatusLabel(merchant.status)}`}>
      {steps.map((step, index) => (
        <li key={step.key} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            <span className={cn("h-0.5 flex-1", index === 0 ? "bg-transparent" : steps[index - 1].state === "complete" ? "bg-brand-500" : "bg-slate-200")} />
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full border-2",
                compact ? "h-4 w-4" : "h-6 w-6",
                step.state === "complete" && "border-brand-600 bg-brand-600 text-white",
                step.state === "current" && "border-brand-600 bg-white",
                step.state === "upcoming" && "border-slate-300 bg-white",
                step.state === "failed" && "border-red-500 bg-red-500 text-white",
              )}
            >
              {step.state === "complete" ? <Check aria-hidden="true" className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} /> : null}
              {step.state === "failed" ? <X aria-hidden="true" className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} /> : null}
              {step.state === "current" ? <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> : null}
            </span>
            <span className={cn("h-0.5 flex-1", index === steps.length - 1 ? "bg-transparent" : step.state === "complete" ? "bg-brand-500" : "bg-slate-200")} />
          </div>
          <span className={cn("mt-1 text-[11px]", step.state === "upcoming" ? "text-slate-400" : "text-slate-600")}>
            {step.label}
            <span className="sr-only"> {step.state}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function MerchantApplicationDetails({ merchant }: { merchant: AdminMerchant }) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-navy-900">Business information</h3>
        <DetailList
          items={[
            { label: "Business name", value: merchant.business_name },
            { label: "Business type", value: merchant.business_type },
            { label: "Business category", value: merchant.business_category },
            { label: "Permit number", value: merchant.business_permit_number },
            { label: "TIN", value: merchant.tin },
            {
              label: "Business address",
              value: [merchant.business_address, merchant.city, merchant.province, merchant.zip_code].filter(Boolean).join(", ") || "—",
            },
          ]}
        />
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-navy-900">Store information</h3>
        <DetailList
          items={[
            { label: "Store name", value: merchant.store_name },
            { label: "Store slug", value: merchant.store_slug },
            { label: "Store category", value: merchant.store_category },
            { label: "Store contact", value: [merchant.contact_email, merchant.contact_phone].filter(Boolean).join(" · ") || "—" },
            { label: "Store address", value: merchant.store_address },
            { label: "Description", value: merchant.store_description },
            {
              label: "Social links",
              value:
                Object.entries(merchant.social_links ?? {})
                  .filter(([, url]) => url)
                  .map(([network, url]) => `${humanize(network)}: ${url}`)
                  .join(" · ") || "—",
            },
          ]}
        />
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-navy-900">Owner & identity</h3>
        <DetailList
          items={[
            { label: "Owner", value: [merchant.owner_name, merchant.owner_position].filter(Boolean).join(" · ") || "—" },
            { label: "Owner contact", value: [merchant.owner_email, merchant.owner_phone].filter(Boolean).join(" · ") || "—" },
            { label: "Account", value: merchant.user ? `${merchant.user.name} (${merchant.user.email})` : "—" },
            { label: "Government ID type", value: merchant.government_id_type },
            { label: "Government ID expiry", value: merchant.government_id_expiry_date ?? "—" },
            { label: "Submitted", value: formatDateTime(merchant.created_at) },
          ]}
        />
      </section>
    </div>
  );
}

export function MerchantDocuments({ merchant }: { merchant: AdminMerchant }) {
  const documents = merchant.documents ?? [];
  if (documents.length === 0) return <EmptyState title="No uploaded documents" description="This merchant record has no stored registration files." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {documents.map((document) => (
        <PrivateFile
          // Re-fetch when the record changes: an approved profile change can replace a document.
          key={`${document}-${merchant.updated_at}`}
          label={DOCUMENT_LABELS[document]}
          name={`${merchant.store_slug ?? merchant.id}-${document}`}
          load={() => fetchMerchantDocument(merchant.id, document)}
        />
      ))}
    </div>
  );
}

export function OnboardingHistory({ merchantId }: { merchantId: number }) {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["admin", "merchants", merchantId, "history", page],
    queryFn: () => fetchMerchantOnboardingHistory(merchantId, { page, per_page: 10 }),
    placeholderData: keepPreviousData,
  });

  if (history.isPending) return <LoadingState label="Loading history…" />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  if (history.data.data.length === 0) return <EmptyState title="No decisions recorded yet" />;

  return (
    <div>
      <ol className="space-y-3">
        {history.data.data.map((entry) => {
          const metadata = (entry.metadata ?? {}) as { status?: MerchantStatus; previous_status?: MerchantStatus | null; reason?: string | null };
          return (
            <li key={entry.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy-900">{entry.description ?? entry.action}</p>
                <time className="text-xs text-muted-foreground" dateTime={entry.created_at ?? undefined}>
                  {formatDateTime(entry.created_at)}
                </time>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                {metadata.previous_status ? <StatusPill status={metadata.previous_status} /> : null}
                {metadata.previous_status && metadata.status ? <span aria-hidden="true">→</span> : null}
                {metadata.status ? <StatusPill status={metadata.status} /> : null}
                <span>by {entry.actor ? `${entry.actor.name} (${entry.actor.email})` : "System"}</span>
              </div>
              {metadata.reason ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{metadata.reason}</p> : null}
            </li>
          );
        })}
      </ol>
      <Pagination meta={history.data.meta} onPageChange={setPage} noun="entries" />
    </div>
  );
}
