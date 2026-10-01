import assert from "node:assert/strict";
import { test } from "node:test";
import { merchantPage } from "../lib/merchant-resource.ts";

test("merchant list preserves the Laravel resource envelope and pagination", () => {
  const payload = {
    data: [{ id: 1, status: "processed" }],
    links: { next: "/api/v1/refunds?page=2" },
    meta: { current_page: 1, last_page: 2, total: 16, per_page: 15 },
  };
  assert.strictEqual(merchantPage(payload), payload);
  assert.deepEqual(merchantPage({ ...payload, data: [], meta: { ...payload.meta, total: 0 } }).data, []);
});

test("merchant list rejects malformed envelopes instead of displaying fallback records", () => {
  for (const payload of [undefined, [], { data: [] }, { data: {}, meta: { current_page: 1, last_page: 1, total: 0 } }]) {
    assert.throws(() => merchantPage(payload), /invalid paginated response/);
  }
});
