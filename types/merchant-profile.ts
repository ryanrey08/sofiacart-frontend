// Mirrors sofiacart-backend MerchantResource and MerchantChangeRequestResource. The merchant record
// is always the approved (live) data; edits live in change requests until an admin approves them.

export type MerchantChangeRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

// Replaceable files (MerchantManagementController::DOCUMENTS). Uploads stay private until approved.
export type MerchantDocumentKey = "store_logo" | "store_banner" | "business_permit" | "government_id";

export interface ChangeRequestFile {
  name: string;
  mime: string | null;
  size: number | null;
}

// Fields a merchant may request to change (MerchantProfileChangeService::EDITABLE_FIELDS).
export type MerchantEditableField =
  | "business_name"
  | "business_type"
  | "business_category"
  | "business_address"
  | "city"
  | "province"
  | "zip_code"
  | "store_name"
  | "store_category"
  | "store_description"
  | "store_address"
  | "contact_phone"
  | "contact_email"
  | "social_links"
  | "owner_name"
  | "owner_position"
  | "owner_email"
  | "owner_phone";

export type SocialLinks = Partial<Record<"facebook" | "instagram" | "tiktok" | "website", string>> & Record<string, string>;

export interface MerchantProfile {
  id: number;
  user_id: number | null;
  business_name: string | null;
  business_type: string | null;
  business_permit_number: string | null;
  tin: string | null;
  business_category: string | null;
  business_address: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  store_name: string;
  store_slug: string | null;
  store_category: string | null;
  store_description: string | null;
  store_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_links: SocialLinks | null;
  owner_name: string | null;
  owner_position: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  government_id_type: string | null;
  // Approved (live) files; fetched through GET /api/v1/merchant/profile/documents/{document}.
  store_logo_path: string | null;
  store_banner_path: string | null;
  business_permit_path: string | null;
  government_id_path: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ChangeValue = string | SocialLinks | null;

export interface MerchantChangeComparisonRow {
  field: MerchantEditableField | MerchantDocumentKey;
  kind: "text" | "file";
  // Approved value on the live record right now (file rows: the current file name).
  current: ChangeValue;
  // Approved value when the request was submitted.
  original: ChangeValue;
  // File rows: the uploaded file name.
  requested: ChangeValue;
  // False when the live record already matches the requested value.
  changed: boolean;
  file?: ChangeRequestFile;
}

export interface MerchantChangeRequest {
  id: number;
  merchant_id: number;
  status: MerchantChangeRequestStatus;
  // Text fields and replacement documents, in that order.
  fields: Array<MerchantEditableField | MerchantDocumentKey>;
  changes: Partial<Record<MerchantEditableField, ChangeValue>>;
  original: Partial<Record<MerchantEditableField | MerchantDocumentKey, ChangeValue>>;
  files: Partial<Record<MerchantDocumentKey, ChangeRequestFile>>;
  comparison?: MerchantChangeComparisonRow[];
  rejection_reason: string | null;
  submitted_by?: { id: number; name: string } | null;
  reviewed_by?: { id: number; name: string } | null;
  merchant?: { id: number; store_name: string; business_name: string | null; store_slug: string | null; status: string | null } | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  withdrawn_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// GET /api/v1/merchant/profile
export interface MerchantProfileResponse {
  data: MerchantProfile;
  meta: {
    editable_fields: MerchantEditableField[];
    pending_change_request: MerchantChangeRequest | null;
    latest_change_request: MerchantChangeRequest | null;
  };
}
