import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADMIN_NAV_SECTIONS,
  ADMIN_PERMISSIONS,
  MERCHANT_REASON_REQUIRED,
  ORDER_STATUS_TRANSITIONS,
  REFUND_STATUS_TRANSITIONS,
  activeNavHref,
  firstAccessibleAdminPath,
  onboardingSteps,
  sidebarEntries,
  hasPermission,
  safeAdminRedirect,
  visibleNavSections,
} from "../lib/admin/permissions.ts";

test("hasPermission supports single, anyOf and allOf requirements", () => {
  const granted = ["orders.view", "roles.view"];
  assert.equal(hasPermission(granted, undefined), true);
  assert.equal(hasPermission(granted, "orders.view"), true);
  assert.equal(hasPermission(granted, "orders.manage"), false);
  assert.equal(hasPermission(granted, { anyOf: ["permissions.view", "roles.view"] }), true);
  assert.equal(hasPermission(granted, { allOf: ["orders.view", "orders.manage"] }), false);
  assert.equal(hasPermission(null, "orders.view"), false);
});

test("navigation only shows modules the backend permissions allow", () => {
  const hrefs = (granted) => visibleNavSections(granted).flatMap((section) => section.items.map((item) => item.href));

  assert.deepEqual(hrefs([]), []);
  assert.deepEqual(hrefs(["merchants.view"]), ["/admin/merchants", "/admin/merchants/onboarding"]);
  assert.deepEqual(hrefs(["merchants.view", "merchants.billing.view"]), ["/admin/merchants", "/admin/merchants/onboarding", "/admin/merchants/billing"]);
  assert.deepEqual(hrefs(["permissions.view"]), ["/admin/roles"]);

  const all = Object.values(ADMIN_PERMISSIONS);
  const total = ADMIN_NAV_SECTIONS.reduce((count, section) => count + section.items.length, 0);
  assert.equal(hrefs(all).length, total);
});

test("firstAccessibleAdminPath picks the first permitted module", () => {
  assert.equal(firstAccessibleAdminPath(Object.values(ADMIN_PERMISSIONS)), "/admin/dashboard");
  assert.equal(firstAccessibleAdminPath(["logs.view"]), "/admin/logs");
  assert.equal(firstAccessibleAdminPath([]), "/admin/sessions");
});

test("safeAdminRedirect only allows admin-area paths", () => {
  assert.equal(safeAdminRedirect("/admin/orders?page=2"), "/admin/orders?page=2");
  assert.equal(safeAdminRedirect("/admin"), "/admin");
  for (const value of [null, "", "https://evil.test/admin", "//evil.test", "/administrator", "/admin\\evil", "/admin/login", "/dashboard"]) {
    assert.equal(safeAdminRedirect(value), null, String(value));
  }
});

test("order status transitions mirror the backend state machine", () => {
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.pending, ["processing", "cancelled"]);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.processing, ["out_for_delivery", "cancelled"]);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.out_for_delivery, ["completed"]);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.completed, []);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.cancelled, []);
});

test("sidebar folds grouped items under one parent and respects permissions", () => {
  const entries = sidebarEntries(Object.values(ADMIN_PERMISSIONS));
  const merchants = entries.find((entry) => entry.label === "Merchants");
  assert.deepEqual(merchants.children.map((child) => child.href), ["/admin/merchants", "/admin/merchants/onboarding", "/admin/merchants/billing"]);
  assert.deepEqual(entries.find((entry) => entry.label === "Orders").children.map((child) => child.href), ["/admin/orders", "/admin/orders/returns"]);

  // Inventory requires the inventory permission, not just products.view.
  const productsOnly = sidebarEntries(["products.view"]);
  assert.deepEqual(productsOnly.map((entry) => entry.label), ["Products"]);
  assert.deepEqual(productsOnly[0].children.map((child) => child.href), ["/admin/products"]);
});

test("activeNavHref picks the most specific matching route", () => {
  const hrefs = ["/admin/merchants", "/admin/merchants/onboarding", "/admin/orders"];
  assert.equal(activeNavHref("/admin/merchants/12", hrefs), "/admin/merchants");
  assert.equal(activeNavHref("/admin/merchants/onboarding", hrefs), "/admin/merchants/onboarding");
  assert.equal(activeNavHref("/admin/ordersx", hrefs), undefined);
});

test("onboarding progress is derived from merchant status and uploaded documents", () => {
  const states = (merchant) => onboardingSteps(merchant).map((step) => step.state);
  const docs = ["business_permit", "government_id", "store_logo"];
  assert.deepEqual(states({ status: "pending", documents: docs }), ["complete", "complete", "current", "upcoming"]);
  assert.deepEqual(states({ status: "information_requested", documents: ["store_logo"] }), ["complete", "current", "current", "upcoming"]);
  assert.deepEqual(states({ status: "verified", documents: docs }), ["complete", "complete", "complete", "complete"]);
  assert.deepEqual(states({ status: "rejected", documents: docs }), ["complete", "complete", "complete", "failed"]);
});

test("decision and refund rules mirror the backend", () => {
  assert.equal(MERCHANT_REASON_REQUIRED.has("rejected"), true);
  assert.equal(MERCHANT_REASON_REQUIRED.has("information_requested"), true);
  assert.equal(MERCHANT_REASON_REQUIRED.has("verified"), false);
  assert.deepEqual(REFUND_STATUS_TRANSITIONS.processed, []);
  assert.deepEqual(REFUND_STATUS_TRANSITIONS.processing, ["processed", "failed"]);
});
