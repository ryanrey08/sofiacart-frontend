import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatCooldown,
  isEmailUnverifiedResponse,
  needsEmailVerification,
  readVerificationOutcome,
  retryAfterSeconds,
} from "../lib/email-verification.ts";

test("verification outcomes are read only from known backend statuses", () => {
  for (const status of ["verified", "already_verified", "already_used", "expired", "invalid"]) {
    assert.equal(readVerificationOutcome({ status, message: "x" }), status);
  }
  assert.equal(readVerificationOutcome({ status: "approved" }), null);
  assert.equal(readVerificationOutcome({ message: "Too Many Attempts." }), null);
  assert.equal(readVerificationOutcome(null), null);
});

test("resend cooldown uses the backend retry_after and falls back to a minute", () => {
  assert.equal(retryAfterSeconds({ retry_after: 42 }), 42);
  assert.equal(retryAfterSeconds({ retry_after: "17.2" }), 18);
  assert.equal(retryAfterSeconds({}), 60);
  assert.equal(retryAfterSeconds({ retry_after: -5 }), 60);
  assert.equal(formatCooldown(42), "42s");
  assert.equal(formatCooldown(125), "2:05");
});

test("only merchants the backend reports as unverified are sent to verification", () => {
  assert.equal(needsEmailVerification({ role: "merchant", email_verified: false }), true);
  assert.equal(needsEmailVerification({ role: "merchant", email_verified: true }), false);
  // Sessions stored before verification existed are refreshed from the backend instead.
  assert.equal(needsEmailVerification({ role: "merchant" }), false);
  assert.equal(needsEmailVerification({ role: "admin", email_verified: false }), false);
  assert.equal(needsEmailVerification(null), false);
});

test("the API client recognises the backend's email_unverified response", () => {
  assert.equal(isEmailUnverifiedResponse(403, { code: "email_unverified" }), true);
  assert.equal(isEmailUnverifiedResponse(403, { message: "Forbidden" }), false);
  assert.equal(isEmailUnverifiedResponse(401, { code: "email_unverified" }), false);
});
