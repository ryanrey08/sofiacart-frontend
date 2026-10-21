"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, MailCheck, MailWarning, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api/axios";
import { AUTH_CHANGE_EVENT, clearStoredAuth, getStoredAuth } from "@/lib/auth";
import {
  RESEND_COOLDOWN_SECONDS,
  forgetPendingVerificationEmail,
  formatCooldown,
  readPendingVerificationEmail,
} from "@/lib/email-verification";
import { useAccount, useUpdateAccount } from "@/lib/hooks/account";
import {
  refreshStoredUser,
  syncStoredUser,
  useResendVerificationEmail,
  verifyEmailToken,
  type VerifyResult,
} from "@/lib/hooks/email-verification";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types";

function subscribeToAuth(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

// Serialized so the snapshot is referentially stable between renders.
function getStoredUserSnapshot() {
  return JSON.stringify(getStoredAuth()?.user ?? null);
}

/** The signed-in merchant from the stored session; `undefined` until hydrated. */
function useStoredMerchant(): AuthUser | null | undefined {
  const serialized = useSyncExternalStore<string | undefined>(subscribeToAuth, getStoredUserSnapshot, () => undefined);
  if (serialized === undefined) return undefined;
  const user = JSON.parse(serialized) as AuthUser | null;
  return user?.role === "merchant" ? user : null;
}

const noopSubscribe = () => () => {};

function usePendingVerificationEmail() {
  return useSyncExternalStore(noopSubscribe, readPendingVerificationEmail, () => null);
}

function ScreenShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#f6f5fb] px-4 py-8">{children}</div>;
}

function StatusIcon({ tone, children }: { tone: "brand" | "success" | "warning" | "danger"; children: ReactNode }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  } as const;
  return <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", tones[tone])}>{children}</div>;
}

/** The address a link was sent to, shown prominently so merchants can spot a typo. */
export function DestinationEmail({ email }: { email: string }) {
  return (
    <p className="mx-auto w-fit max-w-full break-all rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-base font-semibold text-navy-900">
      {email}
    </p>
  );
}

/**
 * Resend button with loading, success, error and cooldown states. Signed-in merchants resend to
 * their account address; otherwise the merchant's typed (or known) address is sent to the public
 * endpoint, whose answer is the same whether or not the address is registered.
 */
export function ResendVerification({
  email,
  signedIn,
  emailEditable = false,
  initialCooldown = 0,
  onAlreadyVerified,
}: {
  email?: string | null;
  signedIn: boolean;
  emailEditable?: boolean;
  initialCooldown?: number;
  onAlreadyVerified?: () => void;
}) {
  const inputId = useId();
  const resend = useResendVerificationEmail();
  // Follows the known address until the merchant types their own.
  const [typedAddress, setTypedAddress] = useState<string | null>(null);
  const address = typedAddress ?? email ?? "";
  const [addressError, setAddressError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async () => {
    setFeedback(null);
    const target = address.trim();
    if (!signedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setAddressError("Enter the email address you registered with.");
      return;
    }
    setAddressError(null);

    const result = await resend.mutateAsync({ email: signedIn ? undefined : target });
    if (result.kind === "sent") {
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setFeedback({ tone: "success", message: signedIn ? result.message : `${result.message} Check your inbox and spam folder.` });
    } else if (result.kind === "already_verified") {
      setFeedback({ tone: "success", message: result.message });
      onAlreadyVerified?.();
    } else if (result.kind === "rate_limited") {
      setCooldown(result.retryAfter);
      setFeedback({ tone: "error", message: result.message });
    } else {
      setFeedback({ tone: "error", message: result.message });
    }
  };

  const busy = resend.isPending;
  const waiting = cooldown > 0;

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {!signedIn && emailEditable ? (
        <div className="text-left">
          <Label htmlFor={inputId}>Email address</Label>
          <Input
            id={inputId}
            type="email"
            autoComplete="email"
            placeholder="merchant@example.com"
            value={address}
            hasError={!!addressError}
            aria-describedby={addressError ? `${inputId}-error` : undefined}
            onChange={(event) => setTypedAddress(event.target.value)}
          />
          {addressError ? <p id={`${inputId}-error`} className="mt-2 text-sm text-red-600">{addressError}</p> : null}
        </div>
      ) : null}
      <Button type="submit" variant="outline" className="w-full" disabled={busy || waiting} aria-disabled={busy || waiting}>
        {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : waiting ? <Clock3 aria-hidden="true" className="h-4 w-4" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
        {busy ? "Sending…" : waiting ? `Resend available in ${formatCooldown(cooldown)}` : "Resend verification email"}
      </Button>
      <div aria-live="polite">
        {feedback ? (
          <p
            role={feedback.tone === "error" ? "alert" : "status"}
            className={cn(
              "rounded-xl px-4 py-3 text-left text-sm",
              feedback.tone === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700",
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Shown right after registration: where the link went, how long it lasts, and a resend action. */
export function VerificationEmailSentCard({
  email,
  emailSent,
  expiresInMinutes,
  children,
}: {
  email: string;
  emailSent: boolean;
  expiresInMinutes: number;
  children?: ReactNode;
}) {
  return (
    <ScreenShell>
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3 text-center">
          <StatusIcon tone={emailSent ? "brand" : "warning"}>
            {emailSent ? <MailCheck aria-hidden="true" className="h-7 w-7" /> : <MailWarning aria-hidden="true" className="h-7 w-7" />}
          </StatusIcon>
          <CardTitle className="text-3xl text-navy-900">{emailSent ? "Check your email" : "Verify your email address"}</CardTitle>
          <CardDescription>
            {emailSent
              ? "Your merchant registration was submitted. We sent a verification link to:"
              : "Your merchant registration was submitted, but we couldn't send the verification email to:"}
          </CardDescription>
          <DestinationEmail email={email} />
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          {emailSent ? (
            <p className="text-sm text-slate-700">
              Open the link in that email to verify your address. It expires in {formatMinutes(expiresInMinutes)} and works once. Can&apos;t find it? Check your spam folder.
            </p>
          ) : (
            <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Request a new verification email below. If it still doesn&apos;t arrive, try again in a few minutes.
            </p>
          )}
          <div className="mx-auto max-w-sm">
            <ResendVerification email={email} signedIn={false} initialCooldown={emailSent ? RESEND_COOLDOWN_SECONDS : 0} />
          </div>
          {children}
        </CardContent>
      </Card>
    </ScreenShell>
  );
}

function formatMinutes(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

const APPROVAL_NOTE = "Verifying your email doesn't approve your store. The SofiaCart team still reviews your application, and you'll be notified of the decision.";

/** /verify-email?token=… : redeems the link with the backend and shows the result. */
function VerificationLinkResult({ token }: { token: string }) {
  const router = useRouter();
  const storedMerchant = useStoredMerchant();
  const pendingEmail = usePendingVerificationEmail();
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    let active = true;
    void verifyEmailToken(token).then((outcome) => {
      if (!active) return;
      setResult(outcome);
      if (outcome.outcome === "verified" || outcome.outcome === "already_verified") {
        forgetPendingVerificationEmail();
        // A signed-in merchant's session picks up the verified status from the backend.
        if (getStoredAuth()) void refreshStoredUser().catch(() => undefined);
      }
      // Keep the single-use token out of the browser history.
      window.history.replaceState(null, "", "/verify-email");
    });
    return () => {
      active = false;
    };
  }, [token]);

  if (!result || storedMerchant === undefined) {
    return (
      <ScreenShell>
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-3 text-center">
            <StatusIcon tone="brand"><Loader2 aria-hidden="true" className="h-7 w-7 animate-spin" /></StatusIcon>
            <CardTitle className="text-2xl text-navy-900">Verifying your email…</CardTitle>
            <CardDescription role="status">This only takes a moment.</CardDescription>
          </CardHeader>
        </Card>
      </ScreenShell>
    );
  }

  const signedIn = storedMerchant !== null;
  const continueAction = signedIn ? (
    <Button onClick={() => router.replace("/dashboard")}>Continue to dashboard</Button>
  ) : (
    <Button asChild><Link href="/login">Sign in to continue</Link></Button>
  );

  if (result.outcome === "verified" || result.outcome === "already_verified") {
    return (
      <ScreenShell>
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-3 text-center">
            <StatusIcon tone="success"><CheckCircle2 aria-hidden="true" className="h-7 w-7" /></StatusIcon>
            <CardTitle className="text-3xl text-navy-900">{result.outcome === "verified" ? "Email verified" : "Email already verified"}</CardTitle>
            <CardDescription role="status">{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <p className="text-sm text-slate-700">{APPROVAL_NOTE}</p>
            {continueAction}
          </CardContent>
        </Card>
      </ScreenShell>
    );
  }

  if (result.outcome === "already_used") {
    return (
      <ScreenShell>
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-3 text-center">
            <StatusIcon tone="warning"><AlertTriangle aria-hidden="true" className="h-7 w-7" /></StatusIcon>
            <CardTitle className="text-2xl text-navy-900">Link already used</CardTitle>
            <CardDescription role="alert">{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <p className="text-sm text-slate-700">
              Verification links work once. If you already verified with this link, you can continue. Otherwise, sign in to request a new link.
            </p>
            {continueAction}
          </CardContent>
        </Card>
      </ScreenShell>
    );
  }

  const isExpired = result.outcome === "expired";
  return (
    <ScreenShell>
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <StatusIcon tone={isExpired ? "warning" : "danger"}>
            {isExpired ? <Clock3 aria-hidden="true" className="h-7 w-7" /> : <XCircle aria-hidden="true" className="h-7 w-7" />}
          </StatusIcon>
          <CardTitle className="text-2xl text-navy-900">
            {isExpired ? "Link expired" : result.outcome === "invalid" ? "Link not valid" : "Verification unavailable"}
          </CardTitle>
          <CardDescription role="alert">{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-sm text-slate-700">
            {result.outcome === "error"
              ? "Try opening the link again in a moment."
              : signedIn
                ? `Request a new verification link for ${storedMerchant.email}.`
                : "Request a new verification link. Only the newest link you receive will work."}
          </p>
          <div className="mx-auto max-w-sm">
            <ResendVerification
              email={storedMerchant?.email ?? pendingEmail}
              signedIn={signedIn}
              emailEditable
              onAlreadyVerified={() => router.replace("/dashboard")}
            />
          </div>
          {!signedIn ? (
            <p className="text-sm text-muted-foreground">
              Already verified? <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </ScreenShell>
  );
}

/** Lets a signed-in, unverified merchant fix a mistyped address; the backend sends a new link to it. */
function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const update = useUpdateAccount();
  const account = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; current_password?: string; form?: string }>({});
  const emailId = useId();
  const passwordId = useId();

  const submit = async () => {
    setErrors({});
    if (!account.data) return;
    try {
      await update.mutateAsync({
        name: account.data.name,
        email: email.trim(),
        phone: account.data.phone ?? "",
        current_password: password,
      });
      setEmail("");
      setPassword("");
    } catch (error: unknown) {
      const fieldErrors = isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error) ? error.response?.data?.errors : undefined;
      setErrors({
        email: fieldErrors?.email?.[0],
        current_password: fieldErrors?.current_password?.[0],
        form: fieldErrors ? undefined : "We couldn't update your email address. Please try again.",
      });
    }
  };

  return (
    <details className="rounded-xl border border-slate-200 px-4 py-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-navy-900">Wrong email address?</summary>
      <form
        className="mt-3 space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-sm text-muted-foreground">Links sent to {currentEmail} will stop working, and we&apos;ll send a new link to the address you enter.</p>
        <div>
          <Label htmlFor={emailId}>New email address</Label>
          <Input id={emailId} type="email" autoComplete="email" value={email} hasError={!!errors.email} onChange={(event) => setEmail(event.target.value)} />
          {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
        </div>
        <div>
          <Label htmlFor={passwordId}>Current password</Label>
          <Input id={passwordId} type="password" autoComplete="current-password" value={password} hasError={!!errors.current_password} onChange={(event) => setPassword(event.target.value)} />
          {errors.current_password ? <p className="mt-2 text-sm text-red-600">{errors.current_password}</p> : null}
        </div>
        {errors.form ? <p role="alert" className="text-sm text-red-600">{errors.form}</p> : null}
        {update.isSuccess ? (
          <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Email updated. We sent a new verification link to {update.data.email}.
          </p>
        ) : null}
        <Button type="submit" size="sm" disabled={update.isPending || !account.data || !email.trim() || !password}>
          {update.isPending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          Update email and send link
        </Button>
      </form>
    </details>
  );
}

/** /verify-email for a signed-in merchant whose email is not verified yet. Status always comes from the backend. */
function SignedInVerificationPending() {
  const router = useRouter();
  const account = useAccount();
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const verified = account.data?.email_verified === true;

  useEffect(() => {
    if (account.data) syncStoredUser(account.data);
  }, [account.data]);

  const signOut = () => {
    void api.post("/api/auth/logout").catch(() => undefined);
    clearStoredAuth();
    router.push("/login");
  };

  const checkAgain = async () => {
    setCheckMessage(null);
    const { data } = await account.refetch();
    if (data?.email_verified) {
      router.replace("/dashboard");
    } else if (data) {
      setCheckMessage(`Your email isn't verified yet. Open the link we sent to ${data.email}.`);
    } else {
      setCheckMessage("We couldn't check your verification status. Please try again.");
    }
  };

  if (account.isPending) {
    return (
      <ScreenShell>
        <p role="status" className="text-sm text-muted-foreground">Checking your account…</p>
      </ScreenShell>
    );
  }

  if (account.isError || !account.data) {
    return (
      <ScreenShell>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-navy-900">We couldn&apos;t load your account</CardTitle>
            <CardDescription role="alert">Check your connection and try again.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button onClick={() => void account.refetch()}>Try again</Button>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </CardContent>
        </Card>
      </ScreenShell>
    );
  }

  if (verified) {
    return (
      <ScreenShell>
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-3 text-center">
            <StatusIcon tone="success"><CheckCircle2 aria-hidden="true" className="h-7 w-7" /></StatusIcon>
            <CardTitle className="text-3xl text-navy-900">Email verified</CardTitle>
            <CardDescription>{account.data.email} is verified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <p className="text-sm text-slate-700">{APPROVAL_NOTE}</p>
            <Button onClick={() => router.replace("/dashboard")}>Continue to dashboard</Button>
          </CardContent>
        </Card>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-3 text-center">
          <StatusIcon tone="brand"><MailCheck aria-hidden="true" className="h-7 w-7" /></StatusIcon>
          <CardTitle className="text-3xl text-navy-900">Verify your email address</CardTitle>
          <CardDescription>Verify your email to unlock your merchant dashboard. We sent a verification link to:</CardDescription>
          <DestinationEmail email={account.data.email} />
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Button className="w-full" onClick={() => void checkAgain()} disabled={account.isFetching}>
            {account.isFetching ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            I&apos;ve verified my email
          </Button>
          {checkMessage ? <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{checkMessage}</p> : null}
          <ResendVerification signedIn onAlreadyVerified={() => void checkAgain()} />
          <ChangeEmailForm currentEmail={account.data.email} />
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </CardContent>
      </Card>
    </ScreenShell>
  );
}

/** /verify-email without a token for someone who isn't signed in (e.g. lost the email). */
function SignedOutVerificationPending() {
  const pendingEmail = usePendingVerificationEmail();

  return (
    <ScreenShell>
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <StatusIcon tone="brand"><MailCheck aria-hidden="true" className="h-7 w-7" /></StatusIcon>
          <CardTitle className="text-3xl text-navy-900">Verify your email address</CardTitle>
          <CardDescription>Open the verification link we emailed you. Didn&apos;t get it, or did it expire? Request a new one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <ResendVerification email={pendingEmail} signedIn={false} emailEditable />
          <p className="text-sm text-muted-foreground">
            Already verified? <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </ScreenShell>
  );
}

export function VerifyEmailScreen({ token }: { token: string | null }) {
  const storedMerchant = useStoredMerchant();

  if (token) return <VerificationLinkResult token={token} />;
  if (storedMerchant === undefined) {
    return (
      <ScreenShell>
        <p role="status" className="text-sm text-muted-foreground">Checking your account…</p>
      </ScreenShell>
    );
  }
  return storedMerchant ? <SignedInVerificationPending /> : <SignedOutVerificationPending />;
}
