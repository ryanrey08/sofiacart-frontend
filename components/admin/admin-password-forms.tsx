"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { AdminAuthCard } from "@/components/admin/auth-card";
import { Notice } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminForgotPassword, adminResetPassword } from "@/lib/api/admin";
import { parseApiError } from "@/lib/admin/errors";
import {
  adminForgotPasswordSchema,
  adminResetPasswordSchema,
  type AdminForgotPasswordSchema,
  type AdminResetPasswordSchema,
} from "@/lib/validation/admin";

export function AdminForgotPasswordForm() {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminForgotPasswordSchema>({ resolver: zodResolver(adminForgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = async (values: AdminForgotPasswordSchema) => {
    setMessage(null);
    try {
      const response = await adminForgotPassword(values.email);
      setMessage({ tone: "success", text: response.message });
    } catch (error) {
      setMessage({ tone: "error", text: parseApiError(error).message });
    }
  };

  return (
    <AdminAuthCard title="Reset admin password" description="We'll email a reset link if the account has active admin access.">
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <Label htmlFor="forgot-email">Email address</Label>
          <Input id="forgot-email" type="email" hasError={!!errors.email} {...register("email")} />
          {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to admin sign in
        </Link>
      </p>
    </AdminAuthCard>
  );
}

export function AdminResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminResetPasswordSchema>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { token, email, password: "", password_confirmation: "" },
  });

  const onSubmit = async (values: AdminResetPasswordSchema) => {
    setFormError(null);
    try {
      await adminResetPassword(values);
      router.replace("/admin/login?reset=1");
    } catch (error) {
      const details = parseApiError(error);
      setFormError(details.fieldErrors.email?.[0] ?? details.fieldErrors.password?.[0] ?? details.message);
    }
  };

  return (
    <AdminAuthCard title="Choose a new password" description="Set a new password for your admin account.">
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" {...register("token")} />
        {errors.token ? <Notice tone="error">{errors.token.message} — open the link from your reset email.</Notice> : null}
        <div>
          <Label htmlFor="reset-email">Email address</Label>
          <Input id="reset-email" type="email" hasError={!!errors.email} {...register("email")} />
          {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <Input id="reset-password" type="password" autoComplete="new-password" hasError={!!errors.password} {...register("password")} />
          {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="reset-password-confirmation">Confirm new password</Label>
          <Input
            id="reset-password-confirmation"
            type="password"
            autoComplete="new-password"
            hasError={!!errors.password_confirmation}
            {...register("password_confirmation")}
          />
          {errors.password_confirmation ? <p className="mt-2 text-sm text-red-600">{errors.password_confirmation.message}</p> : null}
        </div>
        {formError ? <Notice tone="error">{formError}</Notice> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Reset password
        </Button>
      </form>
    </AdminAuthCard>
  );
}
