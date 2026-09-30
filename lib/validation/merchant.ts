import { z } from "zod";

const philippinePhone = /^(?:\+639\d{9}|09\d{9})$/;
const permitTypes = ["application/pdf", "image/jpeg", "image/png"];
const imageTypes = ["image/jpeg", "image/png"];
const isFile = (value: unknown): value is File => typeof File !== "undefined" && value instanceof File;

const requiredFile = (label: string, types: string[], maxSize: number) =>
  z.custom<File | null>((value) => value === null || isFile(value), `${label} is required`)
    .refine(isFile, `${label} is required`)
    .refine((file) => isFile(file) && types.includes(file.type), `${label} must be a PDF, JPG, or PNG file`)
    .refine((file) => isFile(file) && file.size <= maxSize, `${label} must be no larger than ${Math.floor(maxSize / 1024)} KB`);

const optionalImage = z.custom<File | null>(
  (value) => value === null || isFile(value),
  "Store banner must be an image file",
).refine((file) => file === null || imageTypes.includes(file.type), "Store banner must be a JPG or PNG image")
  .refine((file) => file === null || file.size <= 5120 * 1024, "Store banner must be no larger than 5120 KB");

export const merchantRegistrationSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  passwordConfirmation: z.string().min(8, "Please confirm your password"),
  phone: z.string().regex(philippinePhone, "Use a Philippine number in +639XXXXXXXXX or 09XXXXXXXXX format"),
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  permitNumber: z.string().min(3, "Permit number is required"),
  tin: z.string().min(9, "TIN is required"),
  businessCategory: z.string().min(1, "Business category is required"),
  businessPermit: requiredFile("Business permit", permitTypes, 5120 * 1024),
  businessAddress: z.string().min(5, "Business address is required"),
  city: z.string().min(2, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  zipCode: z.string().min(4, "ZIP code is required"),
  storeName: z.string().min(2, "Store name is required"),
  storeSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug with letters, numbers, and single hyphens"),
  storeCategory: z.string().min(1, "Store category is required"),
  storeDescription: z.string(),
  storeContactNumber: z.string().regex(philippinePhone, "Use a Philippine number in +639XXXXXXXXX or 09XXXXXXXXX format"),
  storeEmail: z.email("Enter a valid store email"),
  storeAddress: z.string().min(5, "Store address is required"),
  storeLogo: requiredFile("Store logo", imageTypes, 2048 * 1024),
  storeBanner: optionalImage,
  facebook: z.string(),
  instagram: z.string(),
  tiktok: z.string(),
  website: z.string(),
  ownerFullName: z.string().min(2, "Full name is required"),
  ownerPosition: z.string().min(2, "Position/Designation is required"),
  ownerEmail: z.email("Enter a valid owner email"),
  ownerContactNumber: z.string().regex(philippinePhone, "Use a Philippine number in +639XXXXXXXXX or 09XXXXXXXXX format"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  governmentIdType: z.string().min(1, "Government ID type is required"),
  governmentIdNumber: z.string().min(3, "Government ID number is required"),
  governmentIdExpiry: z.string().min(1, "Expiry date is required"),
  governmentIdFile: requiredFile("Government ID file", permitTypes, 5120 * 1024),
}).superRefine((values, context) => {
  if (values.password !== values.passwordConfirmation) {
    context.addIssue({
      code: "custom",
      path: ["passwordConfirmation"],
      message: "Passwords do not match",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (values.dateOfBirth && values.dateOfBirth >= today) {
    context.addIssue({
      code: "custom",
      path: ["dateOfBirth"],
      message: "Date of birth must be before today",
    });
  }
  if (values.governmentIdExpiry && values.governmentIdExpiry <= today) {
    context.addIssue({
      code: "custom",
      path: ["governmentIdExpiry"],
      message: "Government ID expiry date must be after today",
    });
  }
});

export type MerchantRegistrationSchema = z.input<typeof merchantRegistrationSchema>;
export type ValidatedMerchantRegistration = z.output<typeof merchantRegistrationSchema>;
