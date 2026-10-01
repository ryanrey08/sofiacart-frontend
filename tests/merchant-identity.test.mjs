import assert from "node:assert/strict";
import { test } from "node:test";
import { describeMerchant, getInitials, humanizeStatus, isNavItemActive } from "../lib/merchant-identity.ts";

test("merchant identity is derived from the authenticated user instead of sample store data", () => {
  const identity = describeMerchant({ id: 7, name: "Ava  Dela Cruz", email: "ava@example.com", role: "merchant", merchant: { id: 42, status: "pending_review" } });
  assert.equal(identity.displayName, "Ava  Dela Cruz");
  assert.equal(identity.firstName, "Ava");
  assert.equal(identity.initials, "AC");
  assert.equal(identity.email, "ava@example.com");
  assert.equal(identity.merchantLabel, "Merchant #42");
  assert.equal(identity.statusLabel, "Pending review");
  assert.doesNotMatch(JSON.stringify(identity), /Sofia/);
});

test("merchant identity falls back to neutral labels when profile fields are missing", () => {
  const identity = describeMerchant(null);
  assert.equal(identity.displayName, "Merchant account");
  assert.equal(identity.merchantLabel, "Merchant store");
  assert.equal(identity.statusLabel, null);
  assert.equal(getInitials("cher"), "CH");
  assert.equal(getInitials("   "), "SC");
  assert.equal(humanizeStatus(""), null);
});

test("navigation active state matches exact and nested routes only", () => {
  assert.equal(isNavItemActive("/sales/orders", "/sales/orders"), true);
  assert.equal(isNavItemActive("/sales/orders/15", "/sales/orders"), true);
  assert.equal(isNavItemActive("/sales/orders-archive", "/sales/orders"), false);
  assert.equal(isNavItemActive("/dashboard", "/sales/orders"), false);
  assert.equal(isNavItemActive(null, "/dashboard"), false);
});
