import { z } from "zod";

// Rules mirror the Laravel FormRequests under app/Http/Requests/Admin and LoginRequest.

export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type AdminLoginSchema = z.infer<typeof adminLoginSchema>;

export const adminForgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});
export type AdminForgotPasswordSchema = z.infer<typeof adminForgotPasswordSchema>;

export const adminResetPasswordSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });
export type AdminResetPasswordSchema = z.infer<typeof adminResetPasswordSchema>;

export const adminUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.email("Enter a valid email address").max(255),
  phone: z.string().trim().max(20, "Phone must be at most 20 characters"),
  is_active: z.boolean(),
  role_ids: z.array(z.number().int()),
  permission_ids: z.array(z.number().int()),
});
export type AdminUserSchema = z.infer<typeof adminUserSchema>;

export const adminRoleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens"),
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string(),
  permission_ids: z.array(z.number().int()),
});
export type AdminRoleSchema = z.infer<typeof adminRoleSchema>;

export const adminPermissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, "Use lowercase segments separated by '.', '_' or '-'"),
  group: z.string().trim().min(1, "Group is required").max(255),
  label: z.string().trim().min(1, "Label is required").max(255),
  description: z.string(),
});
export type AdminPermissionSchema = z.infer<typeof adminPermissionSchema>;

export const merchantStatusSchema = z.object({
  status: z.enum(["pending", "verified", "information_requested", "suspended", "rejected"]),
  reason: z.string().max(1000, "Reason must be at most 1000 characters"),
});
export type MerchantStatusSchema = z.infer<typeof merchantStatusSchema>;
