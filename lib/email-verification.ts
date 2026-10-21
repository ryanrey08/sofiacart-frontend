// Merchant email verification helpers shared by the registration, login, verify-email and guard
// screens. Kept free of `@/` imports so the unit tests can load this file directly.
import type { AuthUser } from "../types";

/** Outcomes returned as `status` by POST /api/merchant/email/verify (sofiacart-backend). */
export const VERIFICATION_OUTCOMES = ["verified", "already_verified", "already_used", "expired", "invalid"] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

/** Matches the backend's one-request-per-minute resend limit. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Dispatched on `window` by the API client when the backend answers 403 `email_unverified`. */
export const EMAIL_UNVERIFIED_EVENT = "sofiacart:email-unverified";

const PENDING_EMAIL_STORAGE_KEY = "sofiacart-pending-verification-email";

function bodyField(body: unknown, field: string): unknown {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>)[field] : undefined;
}

/** The verification outcome in an API response body, or null when the body has none (network, 5xx, 429). */
export function readVerificationOutcome(body: unknown): VerificationOutcome | null {
  const status = bodyField(body, "status");
  return VERIFICATION_OUTCOMES.find((outcome) => outcome === status) ?? null;
}

/** Seconds to wait after a 429 from the resend endpoints (the body carries `retry_after`). */
export function retryAfterSeconds(body: unknown, fallback = RESEND_COOLDOWN_SECONDS): number {
  const value = Number(bodyField(body, "retry_after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : fallback;
}

export function isEmailUnverifiedResponse(httpStatus: number | undefined, body: unknown): boolean {
  return httpStatus === 403 && bodyField(body, "code") === "email_unverified";
}

/**
 * Only an explicit `false` from the backend counts as unverified; older stored sessions without the
 * field are refreshed from GET /api/auth/me and otherwise stopped by the backend itself.
 */
export function needsEmailVerification(user: Pick<AuthUser, "role" | "email_verified"> | null | undefined): boolean {
  return user?.role === "merchant" && user.email_verified === false;
}

export function formatCooldown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
}

/** Remembers which address a link was sent to, so the verify page can offer a resend after a new tab or an expired link. */
export function rememberPendingVerificationEmail(email: string) {
  try {
    window.localStorage.setItem(PENDING_EMAIL_STORAGE_KEY, email);
  } catch {
    // Storage can be unavailable (private mode); the merchant can type the address instead.
  }
}

export function readPendingVerificationEmail(): string | null {
  try {
    return window.localStorage.getItem(PENDING_EMAIL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function forgetPendingVerificationEmail() {
  try {
    window.localStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
}
