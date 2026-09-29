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
import { adminLogin } from "@/lib/api/admin";
import { setAdminSession } from "@/lib/admin/auth";
import { parseApiError } from "@/lib/admin/errors";
import { firstAccessibleAdminPath, safeAdminRedirect } from "@/lib/admin/permissions";
import { adminLoginSchema, type AdminLoginSchema } from "@/lib/validation/admin";

export function AdminLoginForm({ redirect, passwordReset = false }: { redirect: string | null; passwordReset?: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginSchema>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: AdminLoginSchema) => {
    setFormError(null);
    try {
      const response = await adminLogin({ ...values, device_name: "sofiacart-admin-web" });
      setAdminSession(response.token, response.user);
      router.replace(safeAdminRedirect(redirect) ?? firstAccessibleAdminPath(response.user.effective_permissions));
    } catch (error) {
      const details = parseApiError(error, "Unable to sign in.");
      if (details.status === 429) {
        setFormError("Too many sign-in attempts. Please wait a minute and try again.");
        return;
      }
      setFormError(details.fieldErrors.email?.[0] ?? details.message);
    }
  };

  return (
    <AdminAuthCard title="Admin sign in" description="Sign in to the SofiaCart Super Admin console.">
      {passwordReset ? (
        <div className="mb-4">
          <Notice tone="success">Your password was reset. Sign in with your new password.</Notice>
        </div>
      ) : null}
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <Label htmlFor="admin-email">Email address</Label>
          <Input id="admin-email" type="email" autoComplete="username" hasError={!!errors.email} {...register("email")} />
          {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="admin-password">Password</Label>
          <Input id="admin-password" type="password" autoComplete="current-password" hasError={!!errors.password} {...register("password")} />
          {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password.message}</p> : null}
        </div>
        {formError ? <Notice tone="error">{formError}</Notice> : null}
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/admin/forgot-password" className="font-semibold text-brand-700 hover:text-brand-800">
          Forgot password?
        </Link>
        <Link href="/login" className="text-muted-foreground hover:text-slate-900">
          Merchant sign in
        </Link>
      </div>
    </AdminAuthCard>
  );
}
