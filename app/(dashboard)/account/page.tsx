"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { KeyRound, Loader2, Save, ShieldCheck, Store, UserRound } from "lucide-react";
import { AccessDenied, ErrorState, Field, LoadingState, Notice } from "@/components/admin/ui";
import { PageIntro } from "@/components/merchant/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { parseApiError } from "@/lib/admin/errors";
import { getStoredAuth } from "@/lib/auth";
import { useAccount, useChangePassword, useUpdateAccount } from "@/lib/hooks/account";
import {
  accountProfileSchema,
  changePasswordSchema,
  type AccountProfileSchema,
  type ChangePasswordSchema,
} from "@/lib/validation/account";
import type { AccountUser } from "@/types/account";

type NoticeState = { tone: "success" | "error"; text: string };

export default function AccountPage() {
  const [auth] = useState(() => getStoredAuth());
  if (auth && auth.user.role !== "merchant") {
    return <AccessDenied message="Account settings here are for merchant accounts. Admins manage their account in the admin console." />;
  }
  return <AccountContent />;
}

function AccountContent() {
  const account = useAccount();

  if (account.isPending) return <LoadingState label="Loading your account…" />;
  if (account.isError) return <ErrorState error={account.error} title="Unable to load your account" onRetry={() => void account.refetch()} />;

  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Account" title="My Account" description="Manage your personal details and keep your account secure." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <PersonalDetailsForm account={account.data} />
          <ChangePasswordForm />
        </div>
        <aside>
          <AccountSummary account={account.data} />
        </aside>
      </div>
    </div>
  );
}

function PersonalDetailsForm({ account }: { account: AccountUser }) {
  const mutation = useUpdateAccount();
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AccountProfileSchema>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: { name: account.name, email: account.email, phone: account.phone ?? "", current_password: "" },
  });
  const email = useWatch({ control, name: "email" }) ?? "";
  const emailChanged = email.trim().toLowerCase() !== account.email.toLowerCase();

  const onSubmit = async (values: AccountProfileSchema) => {
    setNotice(null);
    if (emailChanged && !values.current_password) {
      setError("current_password", { type: "required", message: "Enter your current password to change your email address" });
      return;
    }
    try {
      const updated = await mutation.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        ...(emailChanged ? { current_password: values.current_password } : {}),
      });
      reset({ name: updated.name, email: updated.email, phone: updated.phone ?? "", current_password: "" });
      setNotice({ tone: "success", text: "Your personal details were updated." });
    } catch (error) {
      const details = parseApiError(error, "Your details could not be updated.");
      let mapped = false;
      for (const field of ["name", "email", "phone", "current_password"] as const) {
        const message = details.fieldErrors[field]?.[0];
        if (message) {
          setError(field, { type: "server", message });
          mapped = true;
        }
      }
      if (!mapped) setNotice({ tone: "error", text: details.message });
    }
  };

  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <UserRound className="h-4 w-4 text-brand-600" />
          Personal information
        </h2>
        <p className="text-sm text-muted-foreground">Your name and contact details as the account owner. Your email is used to sign in.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" htmlFor="account-name" error={errors.name?.message} className="sm:col-span-2">
              <Input id="account-name" autoComplete="name" hasError={!!errors.name} {...register("name")} />
            </Field>
            <Field label="Email address *" htmlFor="account-email" error={errors.email?.message}>
              <Input id="account-email" type="email" autoComplete="email" hasError={!!errors.email} {...register("email")} />
            </Field>
            <Field label="Mobile number *" htmlFor="account-phone" error={errors.phone?.message}>
              <Input id="account-phone" type="tel" autoComplete="tel" placeholder="09171234567" hasError={!!errors.phone} {...register("phone")} />
            </Field>
            {emailChanged ? (
              <Field
                label="Current password (required to change your email) *"
                htmlFor="account-current-password"
                error={errors.current_password?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="account-current-password"
                  type="password"
                  autoComplete="current-password"
                  hasError={!!errors.current_password}
                  {...register("current_password")}
                />
              </Field>
            ) : null}
          </fieldset>
          {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isSubmitting}
              onClick={() => reset({ name: account.name, email: account.email, phone: account.phone ?? "", current_password: "" })}
            >
              Discard changes
            </Button>
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordForm() {
  const mutation = useChangePassword();
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });
  const type = showPasswords ? "text" : "password";

  const onSubmit = async (values: ChangePasswordSchema) => {
    setNotice(null);
    try {
      const response = await mutation.mutateAsync(values);
      reset();
      setShowPasswords(false);
      setNotice({ tone: "success", text: response.message });
    } catch (error) {
      const details = parseApiError(error, "Your password could not be changed.");
      if (details.status === 429) {
        setNotice({ tone: "error", text: "Too many password attempts. Please wait a minute and try again." });
        return;
      }
      let mapped = false;
      for (const field of ["current_password", "password", "password_confirmation"] as const) {
        const message = details.fieldErrors[field]?.[0];
        if (message) {
          setError(field, { type: "server", message });
          mapped = true;
        }
      }
      if (!mapped) setNotice({ tone: "error", text: details.message });
    }
  };

  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <KeyRound className="h-4 w-4 text-brand-600" />
          Change password
        </h2>
        <p className="text-sm text-muted-foreground">
          Use at least 8 characters. After changing it, your other signed-in devices are signed out.
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password *" htmlFor="password-current" error={errors.current_password?.message} className="sm:col-span-2">
              <Input id="password-current" type={type} autoComplete="current-password" hasError={!!errors.current_password} {...register("current_password")} />
            </Field>
            <Field label="New password *" htmlFor="password-new" error={errors.password?.message}>
              <Input id="password-new" type={type} autoComplete="new-password" hasError={!!errors.password} {...register("password")} />
            </Field>
            <Field label="Confirm new password *" htmlFor="password-confirm" error={errors.password_confirmation?.message}>
              <Input
                id="password-confirm"
                type={type}
                autoComplete="new-password"
                hasError={!!errors.password_confirmation}
                {...register("password_confirmation")}
              />
            </Field>
          </fieldset>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} className="accent-brand-600" />
            Show passwords
          </label>
          {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountSummary({ account }: { account: AccountUser }) {
  return (
    <Card className="border-none bg-white/95">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-navy-900">Account</h2>
        <dl className="mt-3 space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium text-slate-900">Merchant owner</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Store</dt>
            <dd className="text-right font-medium text-slate-900">{account.merchant?.store_name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Store status</dt>
            <dd className="font-medium text-slate-900">{humanize(account.merchant?.status)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="text-right font-medium text-slate-900">{formatDateTime(account.created_at)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Store details, branding and documents are managed separately and reviewed by SofiaCart.
        </p>
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href="/store-profile">
            <Store className="h-4 w-4" />
            Go to Store Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
