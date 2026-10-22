"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Loader2, ScrollText } from "lucide-react";
import { LegalDocumentViewer } from "@/components/legal-document-viewer";
import { Button } from "@/components/ui/button";
import { fetchLegalDocumentBlob, fetchMerchantLegalDocuments, formatLegalDate, legalDocumentVersion, type PublicLegalDocument } from "@/lib/legal-documents";

export interface MerchantLegalConsentValue {
  acceptTerms: boolean;
  acknowledgePrivacy: boolean;
}

export const MERCHANT_LEGAL_QUERY_KEY = ["legal-documents", "merchant"] as const;

export function useMerchantLegalDocuments() {
  return useQuery({ queryKey: MERCHANT_LEGAL_QUERY_KEY, queryFn: fetchMerchantLegalDocuments, staleTime: 60_000 });
}

function DocumentPanel({ document, label }: { document: PublicLegalDocument | null; label: string }) {
  const [open, setOpen] = useState(false);

  if (!document) {
    return (
      <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        The {label} is temporarily unavailable, so registration cannot be completed right now. Please try again later.
      </div>
    );
  }

  const effective = formatLegalDate(document.effective_date);
  const viewerId = `legal-viewer-${document.type}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 rounded-lg bg-brand-50 p-2 text-brand-700"><ScrollText className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900">{label}</p>
            <p className="text-xs text-slate-500">
              {legalDocumentVersion(document)}
              {effective ? ` · effective ${effective}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" aria-expanded={open} aria-controls={viewerId} onClick={() => setOpen((value) => !value)}>
            {open ? "Hide" : "Read"} document
            <ChevronDown aria-hidden="true" className={open ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <a href={document.file_url} target="_blank" rel="noopener noreferrer">
              Open
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only"> {label} in a new tab</span>
            </a>
          </Button>
        </div>
      </div>
      {open ? (
        <div id={viewerId} className="border-t border-slate-100 p-3">
          <LegalDocumentViewer
            key={document.id}
            load={() => fetchLegalDocumentBlob(document)}
            format={document.format}
            title={`${label} ${legalDocumentVersion(document)}`}
            filename={`${label}.${document.format}`}
            downloadHref={document.download_url}
          />
        </div>
      ) : null}
    </div>
  );
}

// Shows the published merchant Terms and Privacy Policy and collects the two required, separate
// confirmations. The backend re-checks both against the published versions and records them.
export function MerchantLegalConsent({
  value,
  onChange,
  errors,
}: {
  value: MerchantLegalConsentValue;
  onChange: (value: MerchantLegalConsentValue) => void;
  errors: Partial<Record<"terms" | "privacy", string>>;
}) {
  const query = useMerchantLegalDocuments();
  const terms = query.data?.terms ?? null;
  const privacy = query.data?.privacy ?? null;

  return (
    <section aria-labelledby="merchant-legal-heading" className="space-y-3 rounded-2xl border border-slate-200/80 bg-[#faf9fe] p-4">
      <div>
        <h3 id="merchant-legal-heading" className="text-sm font-bold text-navy-900">Terms and Data Privacy</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Read both documents before submitting your application.</p>
      </div>

      {query.isPending ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading the Terms and Privacy Policy…
        </p>
      ) : query.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          We couldn&apos;t load the Terms and Privacy Policy.
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <DocumentPanel document={terms} label="Merchant Terms and Conditions" />
          <DocumentPanel document={privacy} label="Merchant Data Privacy Policy" />

          {terms ? (
            <div>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600"
                  checked={value.acceptTerms}
                  aria-invalid={errors.terms ? true : undefined}
                  aria-describedby={errors.terms ? "accept-terms-error" : undefined}
                  onChange={(event) => onChange({ ...value, acceptTerms: event.target.checked })}
                />
                <span>
                  I have read and agree to the <strong>Merchant Terms and Conditions</strong> ({legalDocumentVersion(terms)}).
                </span>
              </label>
              {errors.terms ? <p id="accept-terms-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.terms}</p> : null}
            </div>
          ) : null}
          {privacy ? (
            <div>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600"
                  checked={value.acknowledgePrivacy}
                  aria-invalid={errors.privacy ? true : undefined}
                  aria-describedby={errors.privacy ? "acknowledge-privacy-error" : "acknowledge-privacy-hint"}
                  onChange={(event) => onChange({ ...value, acknowledgePrivacy: event.target.checked })}
                />
                <span>
                  I acknowledge that I have read the <strong>Merchant Data Privacy Policy</strong> ({legalDocumentVersion(privacy)}).
                  <span id="acknowledge-privacy-hint" className="mt-0.5 block text-xs text-slate-500">
                    This confirms you received the notice. It is not consent to optional processing; SofiaCart asks for that separately where required.
                  </span>
                </span>
              </label>
              {errors.privacy ? <p id="acknowledge-privacy-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.privacy}</p> : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
