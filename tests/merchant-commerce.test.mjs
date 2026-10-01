import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowedOrderTransitions, buildOrderPayload, buildReturnFormData, clampReturnQuantity,
  estimatedReturnAmount, orderTimeline, remainingReturnQuantity, returnEligible, returnReasons,
  returnStateEligible, returnTransitions, validateEvidence,
} from "../lib/merchant-commerce.ts";
import { merchantPage } from "../lib/merchant-resource.ts";

const order = {
  id: 4, customer_id: 5, status: "completed", payment_status: "paid",
  ordered_at: "2026-10-01T00:00:00Z",
  items: [{ id: 9, quantity: 3 }],
};

test("order payload never sends a merchant, amount, status or client price", () => {
  assert.deepEqual(buildOrderPayload(5, [{ product_id: 2, product_variant_id: 3, quantity: 2 }, { product_id: 4, quantity: 1 }], "Gift"), {
    customer_id: 5, items: [{ product_id: 2, product_variant_id: 3, quantity: 2 }, { product_id: 4, quantity: 1 }], notes: "Gift",
  });
  assert.deepEqual(allowedOrderTransitions({ ...order, status: "pending", payment_status: "unpaid" }), ["processing", "cancelled"]);
  assert.deepEqual(allowedOrderTransitions({ ...order, status: "processing", payment_status: "unpaid" }), ["cancelled"]);
  assert.deepEqual(allowedOrderTransitions({ ...order, status: "processing" }), ["completed"]);
  assert.deepEqual(allowedOrderTransitions(order), []);
  assert.deepEqual(returnTransitions, { pending: ["approved", "rejected"], approved: ["processed"], rejected: [], processed: [] });
});

test("return eligibility respects paid/partially refunded, date window, customer and completion", () => {
  const now = new Date("2026-10-15T00:00:00Z");
  assert.equal(returnEligible(order, 30, now), true);
  assert.equal(returnEligible({ ...order, payment_status: "partially_refunded" }, 30, now), true);
  for (const changed of [{ status: "processing" }, { payment_status: "refunded" }, { customer_id: null }, { ordered_at: null }]) {
    assert.equal(returnEligible({ ...order, ...changed }, 30, now), false);
  }
  assert.equal(returnEligible(order, 10, now), false);
  assert.equal(returnStateEligible(order), true);
});

test("non-rejected returns reserve ordered quantities across pages", () => {
  const requests = [
    { status: "pending", items: [{ order_item_id: 9, quantity: 1 }] },
    { status: "approved", items: [{ order_item_id: 9, quantity: 1 }] },
    { status: "rejected", items: [{ order_item_id: 9, quantity: 2 }] },
  ];
  assert.equal(remainingReturnQuantity(9, 3, requests), 1);
  assert.equal(remainingReturnQuantity(10, 3, requests), 3);
});

test("return multipart matches Laravel's nested items and evidence arrays", () => {
  const file = new File(["photo"], "evidence.png", { type: "image/png" });
  const data = buildReturnFormData({
    order_id: 4, customer_id: 5, reason: "Damaged", notes: "Box torn",
    items: [{ order_item_id: 9, quantity: 2 }], evidence: [file],
  });
  assert.deepEqual([...data.keys()], ["order_id", "customer_id", "reason", "notes", "items[0][order_item_id]", "items[0][quantity]", "evidence[]"]);
  assert.equal(data.get("order_id"), "4");
  assert.equal(data.get("items[0][quantity]"), "2");
  assert.equal(data.get("evidence[]").name, "evidence.png");
  assert.equal(buildReturnFormData({ order_id: 4, customer_id: 5, reason: "Damaged", items: [{ order_item_id: 9, quantity: 1 }] }).get("notes"), "Damaged");
  assert.equal(validateEvidence([file]), null);
  assert.match(validateEvidence(Array(6).fill(file)), /five/);
  assert.match(validateEvidence([new File(["x"], "x.pdf", { type: "application/pdf" })]), /JPG/);
  assert.match(validateEvidence([new File([new Uint8Array(5120 * 1024 + 1)], "huge.png", { type: "image/png" })]), /5 MB/);
});

test("the return wizard clamps quantities and estimates line amounts from order totals", () => {
  assert.deepEqual([...returnReasons], ["Defective / Not Working", "Wrong Item", "Wrong Size", "Changed Mind", "Too Small", "Other"]);
  assert.equal(clampReturnQuantity(-2, 3), 0);
  assert.equal(clampReturnQuantity(5, 3), 3);
  assert.equal(clampReturnQuantity(1.7, 3), 1);
  assert.equal(clampReturnQuantity(Number.NaN, 3), 0);
  assert.equal(clampReturnQuantity(2, -1), 0);
  assert.equal(estimatedReturnAmount({ quantity: 3, total_price: "90.00" }, 2), 60);
  assert.equal(estimatedReturnAmount({ quantity: 0, total_price: "90.00" }, 2), 0);
  assert.equal(estimatedReturnAmount({ quantity: 3, total_price: null }, 2), 0);
});

test("the order timeline is derived from status and never invents timestamps", () => {
  assert.deepEqual(orderTimeline({ ...order, status: "pending", payment_status: "unpaid" }).map((step) => step.state),
    ["done", "current", "upcoming", "upcoming"]);
  assert.deepEqual(orderTimeline({ ...order, status: "processing" }).map((step) => step.state),
    ["done", "done", "done", "current"]);
  assert.deepEqual(orderTimeline(order).map((step) => step.state), ["done", "done", "done", "done"]);
  assert.deepEqual(orderTimeline({ ...order, status: "cancelled" }).map((step) => step.key), ["placed", "cancelled"]);
  assert.deepEqual(orderTimeline(order).map((step) => step.at), [order.ordered_at, null, null, null]);
});

test("merchant lists preserve empty paginated envelopes", () => {
  const response = { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } };
  assert.equal(merchantPage(response), response);
  assert.throws(() => merchantPage({ data: [], meta: null }), /invalid paginated response/);
});
