import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMerchantRegistrationFormData } from "../lib/merchant-registration.ts";
import { merchantRegistrationSchema } from "../lib/validation/merchant.ts";

const validValues = () => ({
  name: "Ava Merchant",
  email: "ava@example.com",
  password: "securepass123",
  passwordConfirmation: "securepass123",
  phone: "+639171234567",
  businessName: "Ava Trading",
  businessType: "Sole Proprietorship",
  permitNumber: "PERMIT-123",
  tin: "123456789",
  businessCategory: "Fashion",
  businessPermit: new File(["permit"], "permit.pdf", { type: "application/pdf" }),
  businessAddress: "123 Main Street",
  city: "Manila",
  province: "Metro Manila",
  zipCode: "1000",
  storeName: "Ava Store",
  storeSlug: "ava-store",
  storeCategory: "Fashion",
  storeDescription: "",
  storeContactNumber: "09171234567",
  storeEmail: "store@example.com",
  storeAddress: "456 Market Road",
  storeLogo: new File(["logo"], "logo.png", { type: "image/png" }),
  storeBanner: null,
  facebook: "https://facebook.com/ava",
  instagram: "",
  tiktok: "",
  website: "https://ava.example.com",
  ownerFullName: "Ava Merchant",
  ownerPosition: "Owner",
  ownerEmail: "owner@example.com",
  ownerContactNumber: "+639171234567",
  dateOfBirth: "1990-01-01",
  governmentIdType: "Passport",
  governmentIdNumber: "P1234567",
  governmentIdExpiry: "2099-01-01",
  governmentIdFile: new File(["id"], "id.pdf", { type: "application/pdf" }),
});

test("merchant registration schema accepts valid values and nullable description", () => {
  assert.equal(merchantRegistrationSchema.safeParse(validValues()).success, true);
});

test("merchant registration schema enforces password confirmation and Philippine phones", () => {
  const values = validValues();
  values.passwordConfirmation = "differentpass";
  values.phone = "555-1234";

  const result = merchantRegistrationSchema.safeParse(values);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      result.error.issues.map((issue) => issue.path.join(".")),
      ["phone", "passwordConfirmation"],
    );
  }
});

test("merchant registration schema rejects invalid birth and ID expiry dates", () => {
  const values = validValues();
  const today = new Date().toISOString().slice(0, 10);
  values.dateOfBirth = today;
  values.governmentIdExpiry = today;

  const result = merchantRegistrationSchema.safeParse(values);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      result.error.issues.map((issue) => issue.path.join(".")),
      ["dateOfBirth", "governmentIdExpiry"],
    );
  }
});

test("multipart registration payload uses the Laravel names and upload fields", () => {
  const form = buildMerchantRegistrationFormData(validValues());
  assert.deepEqual([...form.keys()], [
    "name",
    "email",
    "password",
    "password_confirmation",
    "phone",
    "business_name",
    "business_type",
    "business_permit_number",
    "tin",
    "business_category",
    "business_address",
    "city",
    "province",
    "zip_code",
    "store_name",
    "store_slug",
    "store_category",
    "store_description",
    "store_address",
    "contact_phone",
    "contact_email",
    "social_links",
    "owner_name",
    "owner_position",
    "owner_email",
    "owner_phone",
    "owner_birth_date",
    "government_id_type",
    "government_id_number",
    "government_id_expiry_date",
    "business_permit",
    "store_logo",
    "government_id",
  ]);
  assert.equal(form.get("social_links"), JSON.stringify({
    facebook: "https://facebook.com/ava",
    website: "https://ava.example.com",
  }));
  assert.equal(form.get("business_permit").name, "permit.pdf");
  assert.equal(form.get("store_logo").name, "logo.png");
  assert.equal(form.get("government_id").name, "id.pdf");
  assert.equal(form.get("store_banner"), null);
});

test("multipart registration payload includes an optional store banner under its contract key", () => {
  const values = validValues();
  values.storeBanner = new File(["banner"], "banner.jpg", { type: "image/jpeg" });

  const form = buildMerchantRegistrationFormData(values);
  assert.equal(form.get("store_banner").name, "banner.jpg");
});
