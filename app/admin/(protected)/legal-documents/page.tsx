"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileUp, History, ScrollText } from "lucide-react";
import { Can, RequirePermission } from "@/components/admin/require-permission";
import { useAdminSession } from "@/components/admin/admin-session";
import { DetailList, ErrorState, Field, LoadingState, Modal, Notice, PageHeader, Panel, StatusPill, Tabs } from "@/components/admin/ui";
import { LegalDocumentViewer } from "@/components/legal-document-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchLegalDocumentFile,
  fetchLegalDocumentVersions,
  fetchLegalDocuments,
  publishLegalDocument,
  unpublishLegalDocument,
  uploadLegalDocument,
} from "@/lib/api/admin";
import { fieldErrorList, parseApiError } from "@/lib/admin/errors";
import { formatDateTime } from "@/lib/admin/format";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import type { AdminLegalDocument, AdminLegalDocumentSlot, LegalDocumentAudience } from "@/types/admin";

// Mirrors legal_documents.max_kilobytes in sofiacart-backend (the server enforces it).
const MAX_UPLOAD_MB = 10;
const ACCEPTED = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Confirm = { action: "publish" | "unpublish"; document: AdminLegalDocument; slot: AdminLegalDocumentSlot };
type NoticeState = { tone: "success" | "error"; text: string };

function describeError(error: unknown) {
  const details = parseApiError(error);
  return [details.message, ...fieldErrorList(details).filter((message) => message !== details.message)].join(" ");
}

function versionName(document: AdminLegalDocument) {
  return document.version_label ? `Version ${document.version} (${document.version_label})` : `Version ${document.version}`;
}

function documentName(document: AdminLegalDocument) {
  return `${document.audience === "buyer" ? "Buyer" : "Merchant"} ${document.title}`;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

export default function AdminLegalDocumentsPage() {
  return (
    <RequirePermission permission={ADMIN_PERMISSIONS.LEGAL_VIEW}>
      <LegalDocumentsContent />
    </RequirePermission>
  );
}

function LegalDocumentsContent() {
  const [audience, setAudience] = useState<LegalDocumentAudience>("buyer");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [preview, setPreview] = useState<AdminLegalDocument | null>(null);
  const [upload, setUpload] = useState<AdminLegalDocumentSlot | null>(null);
  const [history, setHistory] = useState<AdminLegalDocumentSlot | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const query = useQuery({ queryKey: ["admin", "legal-documents"], queryFn: fetchLegalDocuments });
  const slots = query.data?.filter((slot) => slot.audience === audience) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Legal Documents"
        description="Terms and Conditions and Data Privacy Policy shown to buyers and merchants. Uploads stay private drafts until published."
      />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Tabs<LegalDocumentAudience>
        label="Document audience"
        value={audience}
        onChange={setAudience}
        tabs={[
          { id: "buyer", label: "Buyers (storefront)" },
          { id: "merchant", label: "Merchants" },
        ]}
      />
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {slots.map((slot) => (
          <SlotCard
            key={`${slot.audience}-${slot.type}`}
            slot={slot}
            onPreview={setPreview}
            onUpload={() => setUpload(slot)}
            onHistory={() => setHistory(slot)}
            onConfirm={(action, document) => setConfirm({ action, document, slot })}
          />
        ))}
      </div>

      <PreviewModal
        document={preview}
        onClose={() => setPreview(null)}
        onConfirm={(action, document) => {
          const slot = query.data?.find((item) => item.audience === document.audience && item.type === document.type);
          if (slot) setConfirm({ action, document, slot });
        }}
      />
      <UploadModal
        slot={upload}
        onClose={() => setUpload(null)}
        onUploaded={(document, message) => {
          setUpload(null);
          setNotice({ tone: "success", text: message });
          setPreview(document);
        }}
      />
      <HistoryModal slot={history} onClose={() => setHistory(null)} onPreview={setPreview} onConfirm={(action, document) => {
          if (history) setConfirm({ action, document, slot: history });
        }}
      />
      <ConfirmModal
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onDone={(text) => {
          setConfirm(null);
          setPreview(null);
          setNotice({ tone: "success", text });
        }}
        onError={(text) => setNotice({ tone: "error", text })}
      />
    </div>
  );
}

function SlotCard({
  slot,
  onPreview,
  onUpload,
  onHistory,
  onConfirm,
}: {
  slot: AdminLegalDocumentSlot;
  onPreview: (document: AdminLegalDocument) => void;
  onUpload: () => void;
  onHistory: () => void;
  onConfirm: (action: Confirm["action"], document: AdminLegalDocument) => void;
}) {
  const published = slot.published;
  const pendingDraft = slot.latest && slot.latest.status === "draft" ? slot.latest : null;

  return (
    <Panel
      icon={ScrollText}
      title={`${slot.audience_label} ${slot.title}`}
      description={`Last updated ${formatDateTime(slot.last_updated_at)}`}
      actions={<StatusPill status={published ? "published" : "unpublished"} label={published ? `Published · v${published.version}` : "Not published"} />}
    >
      <div className="space-y-4">
        {published ? (
          <DetailList
            items={[
              { label: "Current version", value: versionName(published) },
              { label: "Effective date", value: formatDate(published.effective_date) },
              { label: "Published", value: `${formatDateTime(published.published_at)}${published.published_by ? ` by ${published.published_by.name}` : ""}` },
              { label: "File", value: `${published.original_filename} · ${published.format.toUpperCase()} · ${formatSize(published.file_size)}` },
            ]}
          />
        ) : (
          <Notice tone="info">
            No version is published. The public page shows this document as temporarily unavailable and{" "}
            {slot.audience === "buyer" ? "customer" : "merchant"} registration is paused until a version is published.
          </Notice>
        )}
        {pendingDraft ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              Draft {versionName(pendingDraft)} uploaded {formatDateTime(pendingDraft.uploaded_at)} is awaiting review.
            </span>
            <Button size="sm" variant="outline" onClick={() => onPreview(pendingDraft)}>
              <Eye aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Preview draft
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {published ? (
            <Button variant="outline" size="sm" onClick={() => onPreview(published)}>
              <Eye aria-hidden="true" className="mr-1.5 h-4 w-4" />
              View current
            </Button>
          ) : null}
          <Can permission={ADMIN_PERMISSIONS.LEGAL_MANAGE}>
            <Button size="sm" onClick={onUpload}>
              <FileUp aria-hidden="true" className="mr-1.5 h-4 w-4" />
              {published ? "Upload replacement" : "Upload document"}
            </Button>
            {published ? (
              <Button variant="outline" size="sm" className="text-red-700" onClick={() => onConfirm("unpublish", published)}>
                Unpublish
              </Button>
            ) : null}
          </Can>
          <Button variant="ghost" size="sm" onClick={onHistory} disabled={slot.versions_count === 0}>
            <History aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Version history ({slot.versions_count})
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function PreviewModal({
  document,
  onClose,
  onConfirm,
}: {
  document: AdminLegalDocument | null;
  onClose: () => void;
  onConfirm: (action: Confirm["action"], document: AdminLegalDocument) => void;
}) {
  const { can } = useAdminSession();

  return (
    <Modal open={document !== null} title={document ? `${documentName(document)} — ${versionName(document)}` : ""} onClose={onClose} wide>
      {document ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <StatusPill status={document.status} />
            <span>{document.original_filename}</span>
            <span>Effective {formatDate(document.effective_date)}</span>
          </div>
          {document.status !== "published" ? (
            <Notice tone="info">This version is not public. Review the full document below before publishing it.</Notice>
          ) : null}
          <LegalDocumentViewer
            key={document.id}
            load={() => fetchLegalDocumentFile(document.id)}
            format={document.format}
            title={`${documentName(document)} ${versionName(document)}`}
            filename={document.original_filename}
          />
          {can(ADMIN_PERMISSIONS.LEGAL_MANAGE) ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {document.status === "published" ? (
                <Button variant="outline" className="text-red-700" onClick={() => onConfirm("unpublish", document)}>
                  Unpublish
                </Button>
              ) : (
                <Button onClick={() => onConfirm("publish", document)}>Publish this version</Button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function UploadModal({
  slot,
  onClose,
  onUploaded,
}: {
  slot: AdminLegalDocumentSlot | null;
  onClose: () => void;
  onUploaded: (document: AdminLegalDocument, message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setVersionLabel("");
    setEffectiveDate("");
    setNotes("");
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      uploadLegalDocument(slot!.audience, slot!.type, {
        file: file!,
        version_label: versionLabel.trim() || undefined,
        effective_date: effectiveDate || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async (result) => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ["admin", "legal-documents"] });
      onUploaded(result.data, result.message);
    },
    onError: (failure) => setError(describeError(failure)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!file) return setError("Choose a PDF or Word (.docx) file.");
    if (!/\.(pdf|docx)$/i.test(file.name)) return setError("The file must be a PDF or Word (.docx) document.");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`The file may not be larger than ${MAX_UPLOAD_MB} MB.`);
    mutation.mutate();
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={slot !== null} title={slot ? `Upload ${slot.audience_label} ${slot.title}` : ""} onClose={close}>
      {slot ? (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <p className="text-sm text-muted-foreground">
            The file is stored exactly as uploaded and becomes a private draft.
            {slot.published ? ` Version ${slot.published.version} stays public until you publish the new version.` : ""}
          </p>
          <Field label={`Document file (PDF or .docx, up to ${MAX_UPLOAD_MB} MB)`} htmlFor="legal-file">
            <Input id="legal-file" type="file" accept={ACCEPTED} required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Version label (optional, as printed in the document)" htmlFor="legal-label">
              <Input id="legal-label" maxLength={50} placeholder="e.g. 1.0" value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} />
            </Field>
            <Field label="Effective date (optional)" htmlFor="legal-effective">
              <Input id="legal-effective" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
            </Field>
          </div>
          <Field label="Internal notes (optional)" htmlFor="legal-notes">
            <Textarea id="legal-notes" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Uploading…" : "Upload draft"}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

function HistoryModal({
  slot,
  onClose,
  onPreview,
  onConfirm,
}: {
  slot: AdminLegalDocumentSlot | null;
  onClose: () => void;
  onPreview: (document: AdminLegalDocument) => void;
  onConfirm: (action: Confirm["action"], document: AdminLegalDocument) => void;
}) {
  const query = useQuery({
    queryKey: ["admin", "legal-documents", slot?.audience, slot?.type, "versions"],
    queryFn: () => fetchLegalDocumentVersions(slot!.audience, slot!.type),
    enabled: slot !== null,
  });

  return (
    <Modal open={slot !== null} title={slot ? `${slot.audience_label} ${slot.title} — version history` : ""} onClose={onClose} wide>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-3">Version</th>
                <th scope="col" className="py-2 pr-3">Status</th>
                <th scope="col" className="py-2 pr-3">File</th>
                <th scope="col" className="py-2 pr-3">Uploaded</th>
                <th scope="col" className="py-2 pr-3">Published</th>
                <th scope="col" className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.data.map((document) => (
                <tr key={document.id}>
                  <td className="py-2.5 pr-3 font-semibold text-navy-900">{versionName(document)}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill status={document.status} />
                  </td>
                  <td className="max-w-[200px] truncate py-2.5 pr-3" title={document.original_filename}>
                    {document.original_filename}
                  </td>
                  <td className="py-2.5 pr-3">
                    {formatDateTime(document.uploaded_at)}
                    {document.uploaded_by ? <span className="block text-xs text-muted-foreground">{document.uploaded_by.name}</span> : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    {formatDateTime(document.published_at)}
                    {document.published_by ? <span className="block text-xs text-muted-foreground">{document.published_by.name}</span> : null}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onPreview(document)}>
                        Preview
                      </Button>
                      <Can permission={ADMIN_PERMISSIONS.LEGAL_MANAGE}>
                        {document.status === "published" ? (
                          <Button size="sm" variant="ghost" className="text-red-700" onClick={() => onConfirm("unpublish", document)}>
                            Unpublish
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => onConfirm("publish", document)}>
                            Publish
                          </Button>
                        )}
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Modal>
  );
}

function ConfirmModal({
  confirm,
  onClose,
  onDone,
  onError,
}: {
  confirm: Confirm | null;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => (confirm!.action === "publish" ? publishLegalDocument(confirm!.document.id) : unpublishLegalDocument(confirm!.document.id)),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "legal-documents"] });
      onDone(result.message);
    },
    onError: (failure) => {
      onError(describeError(failure));
      onClose();
    },
  });

  if (!confirm) return null;

  const { action, document, slot } = confirm;
  const current = slot.published;
  const name = `${slot.audience_label} ${slot.title}`;

  return (
    <Modal open title={action === "publish" ? `Publish ${name}?` : `Unpublish ${name}?`} onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-700">
        {action === "publish" ? (
          <>
            <p>
              <strong>{versionName(document)}</strong> ({document.original_filename}) will become the public {slot.title} for{" "}
              {slot.audience === "buyer" ? "storefront customers" : "merchants"}.
            </p>
            {current && current.id !== document.id ? (
              <p>Version {current.version} will be replaced. It stays in the version history and existing acceptance records keep pointing to it.</p>
            ) : null}
            <p>New registrations will be asked to accept this version.</p>
          </>
        ) : (
          <>
            <p>
              <strong>{versionName(document)}</strong> will be removed from public view and the {slot.title} will show as temporarily unavailable.
            </p>
            <p className="font-semibold text-red-700">
              {slot.audience === "buyer" ? "Customer" : "Merchant"} registration will be paused until a version is published again.
            </p>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className={action === "unpublish" ? "bg-red-600 hover:bg-red-700" : undefined}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Working…" : action === "publish" ? "Publish" : "Unpublish"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

