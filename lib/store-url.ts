// The public storefront address of a store: each store lives on its own subdomain of the
// customer site (sofiacart-website), e.g. https://chemkleen.sofiacart.ph.
// Keep this module dependency-free so it can be unit tested with `node --test`.

const DEFAULT_TEMPLATE = "https://{store}.sofiacart.ph";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The store's storefront URL, or null when the slug is missing or not a valid subdomain label. */
export function storefrontUrl(slug: string | null | undefined, template = process.env.NEXT_PUBLIC_STORE_URL_TEMPLATE || DEFAULT_TEMPLATE) {
  if (!slug || !SLUG_PATTERN.test(slug) || !template.includes("{store}")) return null;
  return template.replace("{store}", slug).replace(/\/+$/, "");
}
