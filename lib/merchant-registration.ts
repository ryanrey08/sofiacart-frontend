import type { ValidatedMerchantRegistration } from "./validation/merchant";

export function buildMerchantRegistrationFormData(values: ValidatedMerchantRegistration) {
  const formData = new FormData();
  const scalarFields: Array<[string, string]> = [
    ["name", values.name],
    ["email", values.email],
    ["password", values.password],
    ["password_confirmation", values.passwordConfirmation],
    ["phone", values.phone],
    ["business_name", values.businessName],
    ["business_type", values.businessType],
    ["business_permit_number", values.permitNumber],
    ["tin", values.tin],
    ["business_category", values.businessCategory],
    ["business_address", values.businessAddress],
    ["city", values.city],
    ["province", values.province],
    ["zip_code", values.zipCode],
    ["store_name", values.storeName],
    ["store_slug", values.storeSlug],
    ["store_category", values.storeCategory],
    ["store_description", values.storeDescription],
    ["store_address", values.storeAddress],
    ["contact_phone", values.storeContactNumber],
    ["contact_email", values.storeEmail],
    ["social_links", JSON.stringify({
      ...(values.facebook.trim() ? { facebook: values.facebook.trim() } : {}),
      ...(values.instagram.trim() ? { instagram: values.instagram.trim() } : {}),
      ...(values.tiktok.trim() ? { tiktok: values.tiktok.trim() } : {}),
      ...(values.website.trim() ? { website: values.website.trim() } : {}),
    })],
    ["owner_name", values.ownerFullName],
    ["owner_position", values.ownerPosition],
    ["owner_email", values.ownerEmail],
    ["owner_phone", values.ownerContactNumber],
    ["owner_birth_date", values.dateOfBirth],
    ["government_id_type", values.governmentIdType],
    ["government_id_number", values.governmentIdNumber],
    ["government_id_expiry_date", values.governmentIdExpiry],
  ];

  scalarFields.forEach(([name, value]) => formData.append(name, value));
  formData.append("business_permit", values.businessPermit);
  formData.append("store_logo", values.storeLogo);
  if (values.storeBanner) formData.append("store_banner", values.storeBanner);
  formData.append("government_id", values.governmentIdFile);

  return formData;
}
