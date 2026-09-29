import { z } from "zod";

const requiredFile = (label: string) =>
  z
    .any()
    .refine((value) => value && typeof value === "object", `${label} is required`);

export const merchantRegistrationSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  permitNumber: z.string().min(3, "Permit number is required"),
  tin: z.string().min(9, "TIN is required"),
  businessCategory: z.string().min(1, "Business category is required"),
  businessPermit: requiredFile("Business permit"),
  businessAddress: z.string().min(5, "Business address is required"),
  city: z.string().min(2, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  zipCode: z.string().min(4, "ZIP code is required"),
  storeName: z.string().min(2, "Store name is required"),
  storeSlug: z.string().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  storeCategory: z.string().min(1, "Store category is required"),
  storeDescription: z.string().min(30, "Store description should be at least 30 characters"),
  storeContactNumber: z.string().min(7, "Contact number is required"),
  storeEmail: z.email("Enter a valid store email"),
  storeAddress: z.string().min(5, "Store address is required"),
  storeLogo: requiredFile("Store logo"),
  storeBanner: z.any().nullable(),
  facebook: z.string(),
  instagram: z.string(),
  tiktok: z.string(),
  website: z.string(),
  ownerFullName: z.string().min(2, "Full name is required"),
  ownerPosition: z.string().min(2, "Position/Designation is required"),
  ownerEmail: z.email("Enter a valid owner email"),
  ownerContactNumber: z.string().min(7, "Contact number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  governmentIdType: z.string().min(1, "Government ID type is required"),
  governmentIdNumber: z.string().min(3, "Government ID number is required"),
  governmentIdExpiry: z.string().min(1, "Expiry date is required"),
  governmentIdFile: requiredFile("Government ID file"),
});

export type MerchantRegistrationSchema = z.infer<typeof merchantRegistrationSchema>;
