import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADMIN_NAV_SECTIONS,
  ADMIN_PERMISSIONS,
  ORDER_STATUS_TRANSITIONS,
  firstAccessibleAdminPath,
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
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.processing, ["completed", "cancelled"]);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.completed, []);
  assert.deepEqual(ORDER_STATUS_TRANSITIONS.cancelled, []);
});
