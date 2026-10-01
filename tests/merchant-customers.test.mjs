import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError } from "axios";
import {
  buildCustomerListParams,
  buildCustomerPayload,
  customerDisplayName,
  customerInitials,
  customerToFormValues,
  emptyCustomerFormValues,
  formatCustomerAddress,
  mapCustomerApiError,
  normalizeCustomerSummary,
  parseCustomerTags,
  splitCustomerName,
  supportsCustomerSegments,
  toAmount,
} from "../lib/merchant-customers.ts";
import { customerFormSchema } from "../lib/validation/customer.ts";

const validValues = () => ({ ...emptyCustomerFormValues, firstName: "Maria", lastName: "Santos", email: "maria@example.com" });
const issues = (values) => customerFormSchema.safeParse(values).error?.issues.map((issue) => issue.path[0]) ?? [];

function axiosError(status, data) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status, data, statusText: "", headers: {}, config: {} });
}

test("list params drop empty filters and map the UI filters to API query keys", () => {
  assert.deepEqual(buildCustomerListParams({}), { page: 1, per_page: 10 });
  assert.deepEqual(
    buildCustomerListParams({ search: "  maria ", customerType: "vip", status: "active", dateFrom: "2026-01-01", dateTo: "2026-02-01", page: 3, perPage: 20 }),
    { page: 3, per_page: 20, search: "maria", customer_type: "vip", status: "active", date_from: "2026-01-01", date_to: "2026-02-01" },
  );
  assert.deepEqual(buildCustomerListParams({ search: "   ", customerType: "", status: "", page: 0 }), { page: 1, per_page: 10 });
  assert.deepEqual(buildCustomerListParams({ perPage: 0 }), { page: 1, per_page: 10 });
  assert.deepEqual(buildCustomerListParams({ perPage: Number.NaN }), { page: 1, per_page: 10 });
});

test("names fall back to the legacy single `name` column", () => {
  assert.deepEqual(splitCustomerName("Maria Lourdes Santos"), { firstName: "Maria Lourdes", lastName: "Santos" });
  assert.deepEqual(splitCustomerName("Maria"), { firstName: "Maria", lastName: "" });
  assert.deepEqual(splitCustomerName(null), { firstName: "", lastName: "" });
  assert.equal(customerDisplayName({ name: "Legacy Name", first_name: "Maria", last_name: "Santos" }), "Maria Santos");
  assert.equal(customerDisplayName({ name: "Legacy Name" }), "Legacy Name");
  assert.equal(customerDisplayName({ name: "" }), "Unnamed customer");
  assert.equal(customerInitials("Maria Santos"), "MS");
  assert.equal(customerInitials("Maria"), "M");
  assert.equal(customerInitials("   "), "?");
});

test("schema requires a first name, a contact detail and sane field values", () => {
  assert.equal(customerFormSchema.safeParse(validValues()).success, true);
  assert.equal(customerFormSchema.safeParse({ ...validValues(), email: "", phone: "0912 345 6789" }).success, true);
  assert.deepEqual(issues({ ...validValues(), firstName: " " }), ["firstName"]);
  assert.deepEqual(issues({ ...validValues(), email: "", phone: "" }), ["email"]);
  assert.deepEqual(issues({ ...validValues(), email: "not-an-email" }), ["email"]);
  assert.deepEqual(issues({ ...validValues(), phone: "call me" }), ["phone"]);
  assert.deepEqual(issues({ ...validValues(), birthday: "2999-01-01" }), ["birthday"]);
  assert.deepEqual(issues({ ...validValues(), birthday: "1990-05-04" }), []);
});

test("payload sends `name` plus the split name, nulls empty optionals and parses tags", () => {
  const parsed = customerFormSchema.parse({ ...validValues(), phone: " 0912 ", tags: " vip, manila ,, ", notes: " Call before delivery " });
  const payload = buildCustomerPayload(parsed);
  assert.equal(payload.name, "Maria Santos");
  assert.equal(payload.first_name, "Maria");
  assert.equal(payload.last_name, "Santos");
  assert.equal(payload.phone, "0912");
  assert.equal(payload.birthday, null);
  assert.equal(payload.gender, null);
  assert.equal(payload.tin, null);
  assert.equal(payload.notes, "Call before delivery");
  assert.deepEqual(payload.tags, ["vip", "manila"]);
  assert.equal(payload.customer_type, "regular");
  assert.equal(payload.status, "active");
  // The default country alone must not create an address.
  assert.equal("address" in payload, false);
  assert.deepEqual(parseCustomerTags(" a , ,b "), ["a", "b"]);
});

test("payload nests the default address only when an address field was filled in", () => {
  const parsed = customerFormSchema.parse({ ...validValues(), street: "12 Mabini St", city: "Makati", postalCode: "1200" });
  const payload = buildCustomerPayload(parsed);
  assert.deepEqual(payload.address, {
    label: "Default",
    is_default: true,
    line1: "12 Mabini St",
    barangay: null,
    city: "Makati",
    province: null,
    postal_code: "1200",
    country: "Philippines",
  });
});

test("resources map back to form values for both the legacy and the extended API", () => {
  const legacy = { id: 1, merchant_id: 2, name: "Maria Santos", email: "maria@example.com", phone: null, address: "12 Mabini St, Makati", created_at: null, updated_at: null };
  assert.deepEqual(customerToFormValues(legacy), {
    ...emptyCustomerFormValues,
    firstName: "Maria",
    lastName: "Santos",
    email: "maria@example.com",
    street: "12 Mabini St, Makati",
  });
  const extended = {
    ...legacy,
    first_name: "Maria Lourdes",
    last_name: "Santos",
    customer_type: "vip",
    status: "inactive",
    birthday: "1990-05-04T00:00:00.000Z",
    gender: "female",
    tin: "123",
    tags: ["vip", "manila"],
    address: null,
    addresses: [
      { id: 9, line1: "9 Rizal Ave", barangay: "Poblacion", city: "Makati", province: "Metro Manila", postal_code: "1200", country: "Philippines", is_default: true },
    ],
  };
  const values = customerToFormValues(extended);
  assert.equal(values.firstName, "Maria Lourdes");
  assert.equal(values.customerType, "vip");
  assert.equal(values.status, "inactive");
  assert.equal(values.birthday, "1990-05-04");
  assert.equal(values.street, "9 Rizal Ave");
  assert.equal(values.city, "Makati");
  assert.equal(values.tags, "vip, manila");
  const blankNames = customerToFormValues({ ...legacy, first_name: "", last_name: "  " });
  assert.equal(blankNames.firstName, "Maria");
  assert.equal(blankNames.lastName, "Santos");
});

test("addresses render from the structured object or the legacy string", () => {
  assert.equal(formatCustomerAddress("12 Mabini St"), "12 Mabini St");
  assert.equal(formatCustomerAddress({ line1: "9 Rizal Ave", city: "Makati", country: "Philippines" }), "9 Rizal Ave, Makati, Philippines");
  assert.equal(formatCustomerAddress(null), "");
});

test("summary accepts wrapped or bare payloads and reports missing counts as null", () => {
  assert.deepEqual(normalizeCustomerSummary({ data: { total_customers: 12, new_customers: 3, returning_customers: 4, total_orders: 40 } }), {
    total_customers: 12,
    new_customers: 3,
    returning_customers: 4,
    total_orders: 40,
  });
  assert.deepEqual(normalizeCustomerSummary({ total: "5" }), { total_customers: 5, new_customers: null, returning_customers: null, total_orders: null });
  assert.deepEqual(normalizeCustomerSummary(null), { total_customers: null, new_customers: null, returning_customers: null, total_orders: null });
});

test("amounts and segment support are only reported when the API provides them", () => {
  assert.equal(toAmount("1250.50"), 1250.5);
  assert.equal(toAmount(0), 0);
  assert.equal(toAmount(null), null);
  assert.equal(toAmount("not-a-number"), null);
  assert.equal(supportsCustomerSegments([{ id: 1, name: "A" }]), false);
  assert.equal(supportsCustomerSegments([{ id: 1, name: "A" }, { id: 2, name: "B", status: "active" }]), true);
});

test("server errors map to form fields", () => {
  const validation = mapCustomerApiError(
    axiosError(422, { message: "Invalid", errors: { email: ["The email has already been taken."], "address.city": ["Invalid city."], foo: ["Other"] } }),
  );
  assert.deepEqual(validation.fieldErrors, { email: "The email has already been taken.", city: "Invalid city." });
  assert.equal(validation.formError, "Other");
  assert.equal(mapCustomerApiError(axiosError(404, {})).formError, "This customer no longer exists or doesn't belong to your store.");
  assert.equal(mapCustomerApiError(axiosError(409, { message: "Customer has orders." })).formError, "Customer has orders.");
  assert.equal(mapCustomerApiError(new Error("boom")).formError, "boom");
});
