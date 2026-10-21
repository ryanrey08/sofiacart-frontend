"use client";

import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { getStoredAuth, setStoredAuth } from "@/lib/auth";
import { readVerificationOutcome, retryAfterSeconds, type VerificationOutcome } from "@/lib/email-verification";
import type { AuthUser } from "@/types";
import type { AccountUser } from "@/types/account";

// Merchant email verification: sofiacart-backend `merchant/email/*`. Verification state always comes
// from the backend; the frontend never marks an account verified on its own.

export type VerifyResult = { outcome: VerificationOutcome; message: string } | { outcome: "error"; message: string };

// One request per token, so React's double-invoked effects can't redeem a link twice (the second
// call would report "already used").
const verificationRequests = new Map<string, Promise<VerifyResult>>();

export function verifyEmailToken(token: string): Promise<VerifyResult> {
  let request = verificationRequests.get(token);
  if (!request) {
    request = api
      .post<{ status: string; message: string }>("/api/merchant/email/verify", { token })
      .then(({ data }) => ({ outcome: readVerificationOutcome(data) ?? "verified", message: data.message }) as VerifyResult)
      .catch((error: unknown): VerifyResult => {
        if (isAxiosError(error) && error.response) {
          const outcome = readVerificationOutcome(error.response.data);
          if (outcome) return { outcome, message: String(error.response.data?.message ?? "") };
          if (error.response.status === 429) {
            return { outcome: "error", message: "Too many verification attempts. Please wait a minute and try again." };
          }
        }
        return { outcome: "error", message: "We couldn't reach the verification service. Check your connection and try again." };
      });
    verificationRequests.set(token, request);
  }
  return request;
}

export type ResendResult =
  | { kind: "sent"; message: string }
  | { kind: "already_verified"; message: string }
  | { kind: "rate_limited"; message: string; retryAfter: number }
  | { kind: "failed"; message: string };

/**
 * Signed-in merchants resend to their own account address; otherwise the public endpoint is used
 * with the address the merchant typed (its response never says whether the address is registered).
 */
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: async ({ email }: { email?: string }): Promise<ResendResult> => {
      try {
        const { data } = email
          ? await api.post<{ message: string; status?: string }>("/api/merchant/email/resend", { email })
          : await api.post<{ message: string; status?: string }>("/api/merchant/email/verification-notification");
        return data.status === "already_verified"
          ? { kind: "already_verified", message: data.message }
          : { kind: "sent", message: data.message };
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = retryAfterSeconds(error.response.data);
          return { kind: "rate_limited", retryAfter, message: "Please wait before requesting another verification email." };
        }
        if (isAxiosError(error) && error.response?.data?.message) {
          return { kind: "failed", message: String(error.response.data.message) };
        }
        return { kind: "failed", message: "We couldn't send the email. Check your connection and try again." };
      }
    },
  });
}

/** Copies the backend's view of the account (verification and approval status) into the stored session. */
export function syncStoredUser(account: AccountUser): AuthUser | null {
  const stored = getStoredAuth();
  if (!stored) return null;
  const user: AuthUser = {
    ...stored.user,
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    email_verified: account.email_verified,
    merchant: account.merchant ? { ...account.merchant, status: account.merchant.status ?? undefined } : null,
  };
  if (JSON.stringify(user) !== JSON.stringify(stored.user)) {
    setStoredAuth({ token: stored.token, user });
  }
  return user;
}

/** Re-reads the signed-in account from GET /api/auth/me and updates the stored session with it. */
export async function refreshStoredUser(): Promise<AuthUser | null> {
  const { data } = await api.get<{ data: AccountUser }>("/api/auth/me");
  return syncStoredUser(data.data);
}
