import { z } from "zod";

// Mirrors sofiacart-backend SubmitMerchantProfileChangeRequest (itself mirroring registration rules).
const philippinePhone = /^(?:\+639\d{9}|09\d{9})$/;
const phoneMessage = "Use a Philippine number in +639XXXXXXXXX or 09XXXXXXXXX format";

const required = (label: string, max = 255) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalUrl = z
  .string()
  .trim()
  .max(255, "Link is too long")
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "Enter a full URL starting with https://");

export const merchantProfileSchema = z.object({
  store_name: required("Store name"),
  store_category: required("Store category"),
  store_description: z.string().trim().max(5000, "Store description is too long"),
  store_address: required("Store address", 1000),
  business_name: required("Business name"),
  business_type: required("Business type"),
  business_category: required("Business category"),
  business_address: required("Business address", 1000),
  city: required("City"),
  province: required("Province"),
  zip_code: required("ZIP code", 10),
  contact_phone: z.string().trim().regex(philippinePhone, phoneMessage),
  contact_email: z.string().trim().email("Enter a valid email address").max(255),
  owner_name: required("Owner name"),
  owner_position: required("Owner position"),
  owner_email: z.string().trim().email("Enter a valid email address").max(255),
  owner_phone: z.string().trim().regex(philippinePhone, phoneMessage),
  facebook: optionalUrl,
  instagram: optionalUrl,
  tiktok: optionalUrl,
  website: optionalUrl,
});

export type MerchantProfileSchema = z.infer<typeof merchantProfileSchema>;

/** Maps a Laravel validation key (e.g. `social_links.facebook`) to the form field it belongs to. */
export function mapProfileErrorField(apiField: string): keyof MerchantProfileSchema | null {
  const social = apiField.match(/^social_links\.(facebook|instagram|tiktok|website)$/);
  if (social) return social[1] as keyof MerchantProfileSchema;
  return apiField in merchantProfileSchema.shape ? (apiField as keyof MerchantProfileSchema) : null;
}
