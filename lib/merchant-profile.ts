import type {
  ChangeValue,
  MerchantChangeRequestStatus,
  MerchantDocumentKey,
  MerchantEditableField,
  MerchantProfile,
  SocialLinks,
} from "@/types/merchant-profile";

// Mirrors SubmitMerchantProfileChangeRequest file rules (same limits as registration).
export const MERCHANT_DOCUMENTS: Array<{
  key: MerchantDocumentKey;
  label: string;
  description: string;
  accept: string;
  types: string[];
  maxBytes: number;
  profilePath: keyof Pick<MerchantProfile, "store_logo_path" | "store_banner_path" | "business_permit_path" | "government_id_path">;
}> = [
  {
    key: "store_logo",
    label: "Store logo",
    description: "PNG or JPG, up to 2 MB.",
    accept: "image/png,image/jpeg",
    types: ["image/png", "image/jpeg"],
    maxBytes: 2 * 1024 * 1024,
    profilePath: "store_logo_path",
  },
  {
    key: "store_banner",
    label: "Store banner",
    description: "PNG or JPG, up to 5 MB.",
    accept: "image/png,image/jpeg",
    types: ["image/png", "image/jpeg"],
    maxBytes: 5 * 1024 * 1024,
    profilePath: "store_banner_path",
  },
  {
    key: "business_permit",
    label: "Business permit",
    description: "PDF, PNG or JPG, up to 5 MB.",
    accept: "application/pdf,image/png,image/jpeg",
    types: ["application/pdf", "image/png", "image/jpeg"],
    maxBytes: 5 * 1024 * 1024,
    profilePath: "business_permit_path",
  },
  {
    key: "government_id",
    label: "Government ID",
    description: "PDF, PNG or JPG, up to 5 MB.",
    accept: "application/pdf,image/png,image/jpeg",
    types: ["application/pdf", "image/png", "image/jpeg"],
    maxBytes: 5 * 1024 * 1024,
    profilePath: "government_id_path",
  },
];

export const DOCUMENT_LABELS = Object.fromEntries(MERCHANT_DOCUMENTS.map((doc) => [doc.key, doc.label])) as Record<MerchantDocumentKey, string>;

export function isDocumentKey(field: string): field is MerchantDocumentKey {
  return field in DOCUMENT_LABELS;
}

/** Client-side check matching the backend rules; returns an error message or null. */
export function validateDocument(key: MerchantDocumentKey, file: File): string | null {
  const doc = MERCHANT_DOCUMENTS.find((item) => item.key === key)!;
  if (!doc.types.includes(file.type)) return `${doc.label} must be a ${doc.description.replace(/, up to .*$/, "")} file.`;
  if (file.size > doc.maxBytes) return `${doc.label} is too large (${formatFileSize(file.size)}). ${doc.description}`;
  return null;
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const SOCIAL_LINK_KEYS = ["facebook", "instagram", "tiktok", "website"] as const;
export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

export const SOCIAL_LINK_LABELS: Record<SocialLinkKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  website: "Website",
};

export const MERCHANT_FIELD_LABELS: Record<MerchantEditableField, string> = {
  store_name: "Store name",
  store_category: "Store category",
  store_description: "Store description",
  store_address: "Store address",
  business_name: "Business name",
  business_type: "Business type",
  business_category: "Business category",
  business_address: "Business address",
  city: "City",
  province: "Province",
  zip_code: "ZIP code",
  contact_phone: "Contact phone",
  contact_email: "Contact email",
  social_links: "Social links",
  owner_name: "Owner name",
  owner_position: "Owner position",
  owner_email: "Owner email",
  owner_phone: "Owner phone",
};

// Form sections, in display order. Social links are rendered separately as one input per network.
export const MERCHANT_FIELD_GROUPS: Array<{ title: string; description: string; fields: Exclude<MerchantEditableField, "social_links">[] }> = [
  {
    title: "Store information",
    description: "How your store appears to customers.",
    fields: ["store_name", "store_category", "store_description", "store_address"],
  },
  {
    title: "Business information",
    description: "Your registered business details and address.",
    fields: ["business_name", "business_type", "business_category", "business_address", "city", "province", "zip_code"],
  },
  {
    title: "Contact information",
    description: "Where customers and SofiaCart can reach your store.",
    fields: ["contact_phone", "contact_email"],
  },
  {
    title: "Owner information",
    description: "The person responsible for this store.",
    fields: ["owner_name", "owner_position", "owner_email", "owner_phone"],
  },
];

export const MERCHANT_MULTILINE_FIELDS = new Set<MerchantEditableField>(["store_description", "store_address", "business_address"]);

export const CHANGE_REQUEST_STATUS_LABELS: Record<MerchantChangeRequestStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function fieldLabel(field: string) {
  return MERCHANT_FIELD_LABELS[field as MerchantEditableField] ?? DOCUMENT_LABELS[field as MerchantDocumentKey] ?? field.replace(/_/g, " ");
}

/** Human-readable value for comparison tables; social links become "Network: url" lines. */
export function formatChangeValue(value: ChangeValue | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  const entries = Object.entries(value).filter(([, link]) => link);
  if (entries.length === 0) return "—";
  return entries.map(([network, link]) => `${SOCIAL_LINK_LABELS[network as SocialLinkKey] ?? network}: ${link}`).join("\n");
}

export type MerchantProfileFormValues = Record<Exclude<MerchantEditableField, "social_links">, string> & Record<SocialLinkKey, string>;

/** Form defaults from the approved (live) profile. */
export function profileToFormValues(profile: MerchantProfile): MerchantProfileFormValues {
  const links: SocialLinks = profile.social_links ?? {};
  const values = {} as MerchantProfileFormValues;
  for (const group of MERCHANT_FIELD_GROUPS) {
    for (const field of group.fields) values[field] = profile[field] ?? "";
  }
  for (const key of SOCIAL_LINK_KEYS) values[key] = links[key] ?? "";
  return values;
}

/**
 * Multipart submission payload. All editable fields are sent; the backend keeps only the ones that
 * differ from the approved record. Social links the form doesn't edit are preserved from the live
 * record, and replacement files are attached under their document key.
 */
export function buildProfileChangeFormData(
  values: MerchantProfileFormValues,
  profile: MerchantProfile,
  uploads: Partial<Record<MerchantDocumentKey, File>>,
) {
  const data = new FormData();
  for (const group of MERCHANT_FIELD_GROUPS) {
    for (const field of group.fields) data.append(field, values[field].trim());
  }
  const links: Record<string, string> = { ...(profile.social_links ?? {}) };
  for (const key of SOCIAL_LINK_KEYS) {
    const link = values[key].trim();
    if (link) links[key] = link;
    else delete links[key];
  }
  const entries = Object.entries(links).filter(([, link]) => link);
  // An empty value clears all links (the backend converts "" to null).
  if (entries.length === 0) data.append("social_links", "");
  for (const [network, link] of entries) data.append(`social_links[${network}]`, link);
  for (const [key, file] of Object.entries(uploads)) {
    if (file) data.append(key, file);
  }
  return data;
}
