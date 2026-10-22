import api from "@/lib/api/axios";

// GET /api/legal-documents/{audience} in sofiacart-backend (LegalDocumentResource): only the
// published version of each document is ever returned; `null` means temporarily unavailable.
export interface PublicLegalDocument {
  id: number;
  audience: "buyer" | "merchant";
  type: "terms" | "privacy";
  title: string;
  version: number;
  version_label: string | null;
  effective_date: string | null;
  published_at: string | null;
  format: "pdf" | "docx";
  mime_type: string;
  file_size: number;
  file_url: string;
  download_url: string;
}

export interface PublishedLegalDocuments {
  terms: PublicLegalDocument | null;
  privacy: PublicLegalDocument | null;
}

export async function fetchMerchantLegalDocuments() {
  const response = await api.get<{ data: PublishedLegalDocuments }>("/api/legal-documents/merchant");
  return response.data.data;
}

export async function fetchLegalDocumentBlob(document: PublicLegalDocument) {
  const response = await api.get<Blob>(document.file_url, { responseType: "blob" });
  return response.data;
}

export function legalDocumentVersion(document: Pick<PublicLegalDocument, "version" | "version_label">) {
  return document.version_label ? `version ${document.version_label}` : `version ${document.version}`;
}

export function formatLegalDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}
