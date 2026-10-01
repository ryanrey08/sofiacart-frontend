import { z } from "zod";

// Mirrors the merchant customer contract: `name` (or `first_name`/`last_name`), `email`, `phone`,
// `customer_type`, `status`, `birthday`, `gender`, `tin`, a nested default address, `notes` and `tags`.
export const CUSTOMER_NAME_MAX = 120;
export const CUSTOMER_EMAIL_MAX = 255;
export const CUSTOMER_PHONE_MAX = 20;
export const CUSTOMER_NOTES_MAX = 5000;
export const CUSTOMER_TIN_MAX = 30;

export const CUSTOMER_GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const optionalText = (max: number, message: string) => z.string().trim().max(max, message);

export const customerFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(CUSTOMER_NAME_MAX, `First name may not be longer than ${CUSTOMER_NAME_MAX} characters`),
    lastName: optionalText(CUSTOMER_NAME_MAX, `Last name may not be longer than ${CUSTOMER_NAME_MAX} characters`),
    email: z
      .string()
      .trim()
      .max(CUSTOMER_EMAIL_MAX, `Email may not be longer than ${CUSTOMER_EMAIL_MAX} characters`)
      .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .max(CUSTOMER_PHONE_MAX, `Phone may not be longer than ${CUSTOMER_PHONE_MAX} characters`)
      .refine((value) => value === "" || /^[0-9+()\-\s]+$/.test(value), "Use digits, spaces and + ( ) - only"),
    birthday: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Use the date picker to choose a birthday")
      .refine((value) => value === "" || new Date(value).getTime() <= Date.now(), "Birthday cannot be in the future"),
    gender: z.string().trim(),
    customerType: z.enum(["regular", "vip", "wholesale"]),
    status: z.enum(["active", "inactive", "blocked"]),
    street: optionalText(255, "Street address may not be longer than 255 characters"),
    barangay: optionalText(120, "Barangay may not be longer than 120 characters"),
    city: optionalText(120, "City may not be longer than 120 characters"),
    province: optionalText(120, "Province may not be longer than 120 characters"),
    postalCode: optionalText(20, "Postal code may not be longer than 20 characters"),
    country: optionalText(120, "Country may not be longer than 120 characters"),
    tin: optionalText(CUSTOMER_TIN_MAX, `TIN may not be longer than ${CUSTOMER_TIN_MAX} characters`),
    notes: optionalText(CUSTOMER_NOTES_MAX, `Notes may not be longer than ${CUSTOMER_NOTES_MAX} characters`),
    tags: optionalText(255, "Tags may not be longer than 255 characters"),
  })
  // At least one way to reach the customer, so the record is usable for orders.
  .refine((values) => Boolean(values.email || values.phone), {
    message: "Add an email address or a phone number",
    path: ["email"],
  });

export type CustomerFormValues = z.input<typeof customerFormSchema>;
export type ValidatedCustomerForm = z.output<typeof customerFormSchema>;
