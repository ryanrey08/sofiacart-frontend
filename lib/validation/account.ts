import { z } from "zod";

// Mirrors sofiacart-backend UpdateAccountRequest / ChangePasswordRequest.
const philippinePhone = /^(?:\+639\d{9}|09\d{9})$/;

export const accountProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(255, "Email is too long"),
  phone: z.string().trim().regex(philippinePhone, "Use a Philippine number in +639XXXXXXXXX or 09XXXXXXXXX format"),
  // Only sent (and required by the backend) when the email address changes.
  current_password: z.string(),
});
export type AccountProfileSchema = z.infer<typeof accountProfileSchema>;

// Same rule as registration and the admin reset flow: at least 8 characters, confirmed.
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })
  .refine((values) => !values.password || values.password !== values.current_password, {
    message: "The new password must be different from your current password",
    path: ["password"],
  });
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
