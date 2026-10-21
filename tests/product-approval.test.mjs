import assert from "node:assert/strict";
import { test } from "node:test";
import {
  changeRequestSummary,
  formatChangeValue,
  isApproved,
  merchantStatusOptions,
  productRowActions,
  productSaveOutcome,
  statusOptionLabel,
  visibleComparisonRows,
} from "../lib/product-approval.ts";

const approval = (isApprovedValue) => ({
  is_approved: isApprovedValue,
  submitted_at: null,
  approved_at: isApprovedValue ? "2026-10-01T00:00:00.000Z" : null,
  reviewed_at: null,
  rejection_reason: null,
});

test("new and unapproved products can never be set active by the merchant", () => {
  assert.deepEqual(merchantStatusOptions(), ["pending_approval", "draft"]);
  assert.deepEqual(merchantStatusOptions({ status: "draft", approval: approval(false) }), ["pending_approval", "draft", "archived"]);
  assert.deepEqual(merchantStatusOptions({ status: "rejected", approval: approval(false) }), ["rejected", "pending_approval", "draft", "archived"]);
  for (const status of ["draft", "pending_approval", "rejected", "archived"]) {
    assert.ok(!merchantStatusOptions({ status, approval: approval(false) }).includes("active"), status);
  }
  // Responses without approval data (older backends) are treated as unapproved.
  assert.ok(!merchantStatusOptions({ status: "active" }).includes("active"));
});

test("approved products only toggle between active and archived", () => {
  assert.equal(isApproved({ status: "active", approval: approval(true) }), true);
  assert.deepEqual(merchantStatusOptions({ status: "active", approval: approval(true) }), ["active", "archived"]);
  assert.equal(statusOptionLabel("pending_approval", { status: "draft" }), "Submit for approval");
  assert.equal(statusOptionLabel("pending_approval", { status: "pending_approval" }), "Pending approval");
});

test("row actions follow the approval state", () => {
  assert.deepEqual(productRowActions({ status: "pending_approval", approval: approval(false) }), [{ kind: "withdraw", label: "Withdraw" }]);
  assert.deepEqual(productRowActions({ status: "rejected", approval: approval(false) }).map((action) => action.label), ["Resubmit", "Archive"]);
  assert.deepEqual(productRowActions({ status: "archived", approval: approval(false) }), [{ kind: "submit", label: "Submit" }]);
  assert.deepEqual(productRowActions({ status: "active", approval: approval(true) }), [{ kind: "status", label: "Archive", status: "archived" }]);
  assert.deepEqual(productRowActions({ status: "archived", approval: approval(true) }), [{ kind: "status", label: "Restore", status: "active" }]);
});

test("save outcome reflects what the backend did", () => {
  assert.equal(productSaveOutcome({ status: "pending_approval", approval: approval(false) }), "submitted");
  assert.equal(productSaveOutcome({ status: "draft", approval: approval(false) }), "draft");
  const staged = { status: "active", approval: approval(true), pending_change_request: { id: 3 } };
  assert.equal(productSaveOutcome(staged), "changes_pending");
  // An edit request that was already pending before this save is not a new submission.
  assert.equal(productSaveOutcome(staged, true), "updated");
  assert.equal(productSaveOutcome({ status: "active", approval: approval(true), pending_change_request: null }), "updated");
});

test("change comparisons hide mirrored fields and format values", () => {
  const rows = visibleComparisonRows([{ field: "price" }, { field: "regular_price" }, { field: "description" }, { field: "full_description" }, { field: "name" }]);
  assert.deepEqual(rows.map((row) => row.field), ["regular_price", "full_description", "name"]);
  assert.equal(changeRequestSummary({ fields: ["name", "price", "regular_price", "images"] }), "Name, Regular price, Images");
  assert.equal(formatChangeValue("tags", ["a", "b"]), "a, b");
  assert.equal(formatChangeValue("category_id", 4, { categoryName: (id) => (id === 4 ? "Lamps" : undefined) }), "Lamps");
  assert.equal(formatChangeValue("sale_price", null), "—");
  assert.equal(formatChangeValue("variants", [{ sku: "V-1", color: "Red", size: null, price: "10.00" }]), "V-1 (Red) @ 10.00");
});
