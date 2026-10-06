"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, Clock, FileUp, Loader2, Lock, Send, Store, Undo2, X, XCircle } from "lucide-react";
import { PrivateFile } from "@/components/admin/private-file";
import { AccessDenied, EmptyState, ErrorState, Field, LoadingState, Notice, Pagination } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { ChangeRequestFilePreviews, ProfileChangeComparison } from "@/components/merchant/profile-change-comparison";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { parseApiError } from "@/lib/admin/errors";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchOwnChangeRequestFile,
  fetchOwnDocument,
  useMerchantChangeRequests,
  useMerchantProfile,
  useSubmitProfileChange,
  useWithdrawProfileChange,
} from "@/lib/hooks/merchant-profile";
import {
  CHANGE_REQUEST_STATUS_LABELS,
  MERCHANT_DOCUMENTS,
  MERCHANT_FIELD_GROUPS,
  MERCHANT_FIELD_LABELS,
  MERCHANT_MULTILINE_FIELDS,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  buildProfileChangeFormData,
  fieldLabel,
  formatFileSize,
  profileToFormValues,
  validateDocument,
} from "@/lib/merchant-profile";
import { mapProfileErrorField, merchantProfileSchema, type MerchantProfileSchema } from "@/lib/validation/merchant-profile";
import { cn } from "@/lib/utils";
import type { MerchantChangeRequest, MerchantChangeRequestStatus, MerchantDocumentKey, MerchantProfile } from "@/types/merchant-profile";

type Uploads = Partial<Record<MerchantDocumentKey, File>>;

export default function StoreProfilePage() {
  const [auth] = useState(() => getStoredAuth());
  if (auth && (auth.user.role !== "merchant" || !auth.user.merchant)) {
    return <AccessDenied message="The store profile is available to merchant accounts linked to a store." />;
  }
  return <StoreProfileContent />;
}

function StoreProfileContent() {
  const profile = useMerchantProfile();
  const [notice, setNotice] = useState<string | null>(null);

  if (profile.isPending) return <LoadingState label="Loading store profile…" />;
  if (profile.isError) return <ErrorState error={profile.error} title="Unable to load your store profile" onRetry={() => void profile.refetch()} />;

  const { data, meta } = profile.data;
  const pending = meta.pending_change_request;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Account"
        title="Store Profile"
        description="Your approved store details. Changes you submit are reviewed by SofiaCart before they go live."
      />

      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <ChangeRequestBanner
        profile={data}
        pending={pending}
        latest={meta.latest_change_request}
        onWithdrawn={(request) => setNotice(`Request #${request.id} was withdrawn. Your approved details are unchanged.`)}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Re-keyed on every approval or new request so the form always starts from the approved data. */}
        <ProfileForm
          key={`${data.updated_at}-${pending?.id ?? "none"}`}
          profile={data}
          locked={Boolean(pending)}
          onSubmitted={(request) => {
            setNotice(`Your changes to ${request.fields.length} field${request.fields.length === 1 ? "" : "s"} were submitted for approval.`);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        <aside className="space-y-6">
          <AdminControlledDetails profile={data} />
          <ChangeHistory />
        </aside>
      </div>
    </div>
  );
}

function ChangeRequestBanner({
  profile,
  pending,
  latest,
  onWithdrawn,
}: {
  profile: MerchantProfile;
  pending: MerchantChangeRequest | null;
  latest: MerchantChangeRequest | null;
  onWithdrawn: (request: MerchantChangeRequest) => void;
}) {
  if (pending) {
    return (
      <Card className="border border-amber-200 bg-amber-50/60">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-navy-900">Pending Approval</h2>
                <StatusBadge status="pending" />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Submitted {formatDateTime(pending.submitted_at)}. Your current approved details stay live until a SofiaCart admin reviews these changes.
              </p>
            </div>
            <WithdrawControl request={pending} onWithdrawn={onWithdrawn} />
          </div>
          <ProfileChangeComparison request={pending} className="bg-white" />
          <ChangeRequestFilePreviews
            request={pending}
            hasCurrent={(document) => Boolean(profile[MERCHANT_DOCUMENTS.find((doc) => doc.key === document)!.profilePath])}
            loadCurrent={fetchOwnDocument}
            loadRequested={(document) => fetchOwnChangeRequestFile(pending.id, document)}
          />
        </CardContent>
      </Card>
    );
  }

  if (latest?.status === "rejected") {
    return (
      <Card className="border border-red-200 bg-red-50/60">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <XCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-navy-900">Changes rejected</h2>
                <StatusBadge status="rejected" />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Reviewed {formatDateTime(latest.reviewed_at)}. Your approved details were not changed — you can edit and submit again.
              </p>
              {latest.rejection_reason ? (
                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-red-800">
                  <span className="font-semibold">Reason:</span> {latest.rejection_reason}
                </p>
              ) : null}
            </div>
          </div>
          <ProfileChangeComparison request={latest} className="bg-white" />
        </CardContent>
      </Card>
    );
  }

  if (latest?.status === "approved") {
    return (
      <Notice tone="success">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Your last changes ({latest.fields.map(fieldLabel).join(", ")}) were approved {formatDateTime(latest.reviewed_at)} and are now live.
        </span>
      </Notice>
    );
  }

  return null;
}

function ProfileForm({
  profile,
  locked,
  onSubmitted,
}: {
  profile: MerchantProfile;
  locked: boolean;
  onSubmitted: (request: MerchantChangeRequest) => void;
}) {
  const mutation = useSubmitProfileChange();
  const [formError, setFormError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Uploads>({});
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<MerchantDocumentKey, string>>>({});
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<MerchantProfileSchema>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: profileToFormValues(profile),
  });
  const hasUploads = Object.values(uploads).some(Boolean);
  const canSubmit = (isDirty || hasUploads) && !Object.values(uploadErrors).some(Boolean);

  const onSubmit = async (values: MerchantProfileSchema) => {
    setFormError(null);
    try {
      onSubmitted(await mutation.mutateAsync(buildProfileChangeFormData(values, profile, uploads)));
    } catch (error) {
      const details = parseApiError(error, "Your changes could not be submitted.");
      let mapped = false;
      for (const [apiField, messages] of Object.entries(details.fieldErrors)) {
        if (MERCHANT_DOCUMENTS.some((doc) => doc.key === apiField) && messages[0]) {
          setUploadErrors((current) => ({ ...current, [apiField]: messages[0] }));
          mapped = true;
          continue;
        }
        const field = mapProfileErrorField(apiField);
        if (field && messages[0]) {
          setError(field, { type: "server", message: messages[0] });
          mapped = true;
        }
      }
      if (!mapped) setFormError(details.fieldErrors.changes?.[0] ?? details.message);
    }
  };

  const chooseFile = (key: MerchantDocumentKey, file: File | null) => {
    setUploads((current) => {
      const next = { ...current };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
    setUploadErrors((current) => ({ ...current, [key]: file ? (validateDocument(key, file) ?? undefined) : undefined }));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={locked || isSubmitting} className="space-y-6">
        {locked ? (
          <Notice tone="info">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              Editing is locked while your changes are pending approval. The form shows your current approved details.
            </span>
          </Notice>
        ) : null}

        {MERCHANT_FIELD_GROUPS.map((group) => (
          <Card key={group.title} className="border-none bg-white/95">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-base font-semibold text-navy-900">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {group.fields.map((field) => {
                  const id = `profile-${field}`;
                  const multiline = MERCHANT_MULTILINE_FIELDS.has(field);
                  const optional = field === "store_description";
                  return (
                    <Field
                      key={field}
                      label={`${MERCHANT_FIELD_LABELS[field]}${optional ? "" : " *"}`}
                      htmlFor={id}
                      error={errors[field]?.message}
                      className={multiline ? "sm:col-span-2" : undefined}
                    >
                      {multiline ? (
                        <Textarea id={id} className="min-h-20" hasError={!!errors[field]} {...register(field)} />
                      ) : (
                        <Input
                          id={id}
                          type={field.endsWith("email") ? "email" : field.endsWith("phone") ? "tel" : "text"}
                          hasError={!!errors[field]}
                          {...register(field)}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-none bg-white/95">
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-navy-900">Social links</h2>
            <p className="text-sm text-muted-foreground">Optional links shown on your store.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {SOCIAL_LINK_KEYS.map((key) => (
                <Field key={key} label={SOCIAL_LINK_LABELS[key]} htmlFor={`profile-${key}`} error={errors[key]?.message}>
                  <Input id={`profile-${key}`} type="url" placeholder="https://" hasError={!!errors[key]} {...register(key)} />
                </Field>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/95">
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-navy-900">Branding &amp; documents</h2>
            <p className="text-sm text-muted-foreground">
              Upload a replacement to change a file. New files stay private and your current files remain live until approved.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {MERCHANT_DOCUMENTS.map((doc) => (
                <DocumentPicker
                  key={doc.key}
                  doc={doc}
                  hasCurrent={Boolean(profile[doc.profilePath])}
                  file={uploads[doc.key] ?? null}
                  error={uploadErrors[doc.key]}
                  onChange={(file) => chooseFile(doc.key, file)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {formError ? <Notice tone="error">{formError}</Notice> : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="mr-auto text-xs text-muted-foreground">Changes are not visible to customers until approved.</p>
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty && !hasUploads}
            onClick={() => {
              reset(profileToFormValues(profile));
              setUploads({});
              setUploadErrors({});
            }}
          >
            Discard changes
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSubmitting ? "Submitting…" : "Submit for approval"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

function DocumentPicker({
  doc,
  hasCurrent,
  file,
  error,
  onChange,
}: {
  doc: (typeof MERCHANT_DOCUMENTS)[number];
  hasCurrent: boolean;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  const inputId = `profile-upload-${doc.key}`;
  return (
    <div className="space-y-2">
      {hasCurrent ? (
        <PrivateFile label={`Current ${doc.label.toLowerCase()}`} name={`current-${doc.key}`} load={() => fetchOwnDocument(doc.key)} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-muted-foreground">
          <p className="text-xs font-semibold text-slate-600">{doc.label}</p>
          <p className="mt-1">No file on record.</p>
        </div>
      )}
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition hover:bg-brand-50",
          error ? "border-red-300 text-red-700" : "border-slate-200 text-brand-700",
        )}
      >
        <FileUp aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{file ? `${file.name} (${formatFileSize(file.size)})` : `Replace ${doc.label.toLowerCase()}`}</span>
        {file ? (
          <button
            type="button"
            aria-label={`Remove selected ${doc.label.toLowerCase()}`}
            className="rounded-md p-0.5 text-slate-500 hover:bg-white hover:text-slate-800"
            onClick={(event) => {
              event.preventDefault();
              onChange(null);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>
      {/* Re-mounted when cleared so the same file can be picked again. */}
      <input
        key={file ? "chosen" : "empty"}
        id={inputId}
        type="file"
        accept={doc.accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <p className={cn("text-xs", error ? "text-red-600" : "text-muted-foreground")}>{error ?? doc.description}</p>
    </div>
  );
}

function WithdrawControl({ request, onWithdrawn }: { request: MerchantChangeRequest; onWithdrawn: (request: MerchantChangeRequest) => void }) {
  const mutation = useWithdrawProfileChange();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // mutateAsync, not mutate(): the refetch after withdrawing unmounts this banner, and per-call
  // mutate() callbacks are skipped once the component is gone.
  const withdraw = async () => {
    setError(null);
    try {
      onWithdrawn(await mutation.mutateAsync(request.id));
    } catch (failure) {
      setError(parseApiError(failure, "The request could not be withdrawn.").message);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-slate-700">Withdraw these changes?</span>
          <Button type="button" size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setConfirming(false)}>
            Keep request
          </Button>
          <Button type="button" size="sm" className="bg-none bg-red-600 hover:bg-red-700" disabled={mutation.isPending} onClick={() => void withdraw()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Yes, withdraw
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
          <Undo2 className="h-4 w-4" />
          Withdraw request
        </Button>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function AdminControlledDetails({ profile }: { profile: MerchantProfile }) {
  const rows: Array<[string, string | null]> = [
    ["Account status", humanize(profile.status)],
    ["Store URL", profile.store_slug],
    ["TIN", profile.tin],
    ["Business permit no.", profile.business_permit_number],
    ["Government ID", profile.government_id_type],
  ];
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <Store className="h-4 w-4 text-brand-600" />
          Managed by SofiaCart
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Verification and identity details can only be changed by SofiaCart support.</p>
        <dl className="mt-3 space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all text-right font-medium text-slate-900">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function ChangeHistory() {
  const [page, setPage] = useState(1);
  const history = useMerchantChangeRequests(page);

  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-navy-900">Change requests</h2>
        {history.isPending ? <LoadingState label="Loading history…" /> : null}
        {history.isError ? <ErrorState error={history.error} onRetry={() => void history.refetch()} /> : null}
        {history.data && history.data.data.length === 0 ? <EmptyState title="No change requests yet" /> : null}
        {history.data && history.data.data.length > 0 ? (
          <>
            <ol className="mt-3 space-y-2">
              {history.data.data.map((request) => (
                <li key={request.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">Request #{request.id}</span>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{request.fields.map(fieldLabel).join(", ")}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Submitted {formatDateTime(request.submitted_at)}
                    {request.reviewed_at ? ` · Reviewed ${formatDateTime(request.reviewed_at)}` : ""}
                    {request.withdrawn_at ? ` · Withdrawn ${formatDateTime(request.withdrawn_at)}` : ""}
                  </p>
                  {request.rejection_reason ? <p className="mt-1 text-xs text-red-700">Reason: {request.rejection_reason}</p> : null}
                </li>
              ))}
            </ol>
            <div className="mt-3">
              <Pagination meta={history.data.meta} onPageChange={setPage} />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: MerchantChangeRequestStatus }) {
  const tone = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    withdrawn: "bg-slate-100 text-slate-600",
  }[status];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tone)}>{CHANGE_REQUEST_STATUS_LABELS[status]}</span>;
}
