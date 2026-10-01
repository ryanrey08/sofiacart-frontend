import { isAxiosError } from "axios";
import type { CustomerAddress, CustomerResource, CustomerStatus, CustomerSummary, CustomerType } from "../types/commerce";
import type { CustomerFormValues, ValidatedCustomerForm } from "./validation/customer";

// Pure customer helpers (no `@/` imports) so tests/merchant-customers.test.mjs can import them directly.

export type CustomerFormField = keyof CustomerFormValues;

// Laravel request keys → form fields. `merchant_id` is never sent: the backend scopes by token.
const CUSTOMER_FIELD_MAP: Record<string, CustomerFormField> = {
  name: "firstName",
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  phone: "phone",
  birthday: "birthday",
  gender: "gender",
  customer_type: "customerType",
  status: "status",
  tin: "tin",
  notes: "notes",
  tags: "tags",
  "address.line1": "street",
  "address.barangay": "barangay",
  "address.city": "city",
  "address.province": "province",
  "address.postal_code": "postalCode",
  "address.country": "country",
  address: "street",
};

export const CUSTOMER_PER_PAGE_OPTIONS = [10, 20, 50] as const;

export const CUSTOMER_TYPE_OPTIONS: ReadonlyArray<{ value: CustomerType; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Wholesale" },
];

export const CUSTOMER_STATUS_OPTIONS: ReadonlyArray<{ value: CustomerStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blocked", label: "Blocked" },
];

export interface CustomerListFilters {
  search?: string;
  customerType?: CustomerType | "";
  status?: CustomerStatus | "";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

export interface CustomerListParams {
  page: number;
  per_page: number;
  search?: string;
  customer_type?: CustomerType;
  status?: CustomerStatus;
  date_from?: string;
  date_to?: string;
}

// `GET /api/v1/customers?search=&customer_type=&status=&date_from=&date_to=&page=&per_page=`
export function buildCustomerListParams(filters: CustomerListFilters): CustomerListParams {
  const params: CustomerListParams = { page: Math.max(1, filters.page ?? 1), per_page: filters.perPage ?? CUSTOMER_PER_PAGE_OPTIONS[0] };
  const search = filters.search?.trim();
  if (search) params.search = search;
  if (filters.customerType) params.customer_type = filters.customerType;
  if (filters.status) params.status = filters.status;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  return params;
}

export const emptyCustomerFormValues: CustomerFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthday: "",
  gender: "",
  customerType: "regular",
  status: "active",
  street: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Philippines",
  tin: "",
  notes: "",
  tags: "",
};

/** Legacy records only store a single `name`; everything before the last space becomes the first name. */
export function splitCustomerName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function customerDisplayName(customer: Pick<CustomerResource, "name" | "first_name" | "last_name">) {
  const composed = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
  return composed || customer.name || "Unnamed customer";
}

export function customerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Accepts the structured address from the new API and the legacy free-text column. */
export function formatCustomerAddress(address: string | CustomerAddress | null | undefined) {
  if (!address) return "";
  if (typeof address === "string") return address.trim();
  return [address.line1, address.line2, address.barangay, address.city, address.province, address.postal_code, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function defaultCustomerAddress(customer: CustomerResource): CustomerAddress | string | null {
  const addresses = customer.addresses ?? [];
  return addresses.find((address) => address.is_default) ?? addresses[0] ?? customer.address ?? null;
}

export function customerAddresses(customer: CustomerResource): Array<CustomerAddress | string> {
  if (customer.addresses?.length) return customer.addresses;
  return customer.address ? [customer.address] : [];
}

export function parseCustomerTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function customerToFormValues(customer: CustomerResource): CustomerFormValues {
  const fallback = splitCustomerName(customer.name);
  const address = defaultCustomerAddress(customer);
  const structured = address && typeof address === "object" ? address : null;
  return {
    firstName: customer.first_name ?? fallback.firstName,
    lastName: customer.last_name ?? fallback.lastName,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    birthday: customer.birthday ? customer.birthday.slice(0, 10) : "",
    gender: customer.gender ?? "",
    customerType: customer.customer_type ?? "regular",
    status: customer.status ?? "active",
    street: structured ? structured.line1 ?? "" : typeof address === "string" ? address : "",
    barangay: structured?.barangay ?? "",
    city: structured?.city ?? "",
    province: structured?.province ?? "",
    postalCode: structured?.postal_code ?? "",
    country: structured?.country ?? emptyCustomerFormValues.country,
    tin: customer.tin ?? "",
    notes: customer.notes ?? "",
    tags: (customer.tags ?? []).join(", "),
  };
}

export interface CustomerPayload {
  name: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  customer_type: CustomerType;
  status: CustomerStatus;
  birthday: string | null;
  gender: string | null;
  tin: string | null;
  notes: string | null;
  tags: string[];
  address?: CustomerAddress;
}

/**
 * JSON body for `POST /api/v1/customers` and `PATCH /api/v1/customers/{id}`. `name` is always sent so the
 * legacy resource (which only stores `name`, `email`, `phone`) keeps working; the nested default `address`
 * is only sent when at least one address field was filled in.
 */
export function buildCustomerPayload(values: ValidatedCustomerForm): CustomerPayload {
  const addressParts = {
    line1: values.street,
    barangay: values.barangay,
    city: values.city,
    province: values.province,
    postal_code: values.postalCode,
    country: values.country,
  };
  // The pre-filled country alone is not an address, so a blank address block is never sent.
  const hasAddress = Object.entries(addressParts).some(([key, part]) => key !== "country" && Boolean(part));
  return {
    name: [values.firstName, values.lastName].filter(Boolean).join(" "),
    first_name: values.firstName,
    last_name: values.lastName || null,
    email: values.email || null,
    phone: values.phone || null,
    customer_type: values.customerType,
    status: values.status,
    birthday: values.birthday || null,
    gender: values.gender || null,
    tin: values.tin || null,
    notes: values.notes || null,
    tags: parseCustomerTags(values.tags),
    ...(hasAddress
      ? {
          address: {
            label: "Default",
            is_default: true,
            line1: addressParts.line1 || null,
            barangay: addressParts.barangay || null,
            city: addressParts.city || null,
            province: addressParts.province || null,
            postal_code: addressParts.postal_code || null,
            country: addressParts.country || null,
          },
        }
      : {}),
  };
}

const toCount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) ? count : null;
};

/** Accepts `{ data: {…} }` or a bare object and tolerates both `total` and `total_customers` style keys. */
export function normalizeCustomerSummary(payload: unknown): CustomerSummary {
  const source = (payload && typeof payload === "object" && "data" in payload ? (payload as { data: unknown }).data : payload) as
    | Record<string, unknown>
    | null
    | undefined;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = toCount(source?.[key]);
      if (value !== null) return value;
    }
    return null;
  };
  return {
    total_customers: pick("total_customers", "total"),
    new_customers: pick("new_customers", "new"),
    returning_customers: pick("returning_customers", "returning"),
    total_orders: pick("total_orders", "orders"),
  };
}

/** Money fields arrive as strings from Laravel decimals; anything unparseable is reported as unknown. */
export function toAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** True when the API returns the customer-management fields that the type/status controls depend on. */
export function supportsCustomerSegments(customers: CustomerResource[]) {
  return customers.some((customer) => customer.customer_type != null || customer.status != null);
}

export interface CustomerApiErrorResult {
  status: number | null;
  fieldErrors: Partial<Record<CustomerFormField, string>>;
  formError: string | null;
}

export function mapCustomerApiError(error: unknown, fallback = "Something went wrong. Please try again."): CustomerApiErrorResult {
  if (!isAxiosError(error)) {
    return { status: null, fieldErrors: {}, formError: error instanceof Error && error.message ? error.message : fallback };
  }
  if (!error.response) {
    return {
      status: null,
      fieldErrors: {},
      formError: "We couldn't reach the SofiaCart API. Check your connection and that the backend is running.",
    };
  }

  const { status } = error.response;
  const data = (error.response.data ?? {}) as { message?: unknown; errors?: unknown };
  const message = typeof data.message === "string" && data.message ? data.message : null;

  if (status === 422) {
    const errors = data.errors && typeof data.errors === "object" ? (data.errors as Record<string, string[] | string>) : {};
    const fieldErrors: Partial<Record<CustomerFormField, string>> = {};
    const unmapped: string[] = [];
    Object.entries(errors).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value[0] : value;
      if (!text) return;
      const field = CUSTOMER_FIELD_MAP[key];
      if (!field) unmapped.push(text);
      else if (!fieldErrors[field]) fieldErrors[field] = text;
    });
    const formError =
      unmapped[0] ?? (Object.keys(fieldErrors).length ? "Please fix the highlighted fields and try again." : message ?? fallback);
    return { status, fieldErrors, formError };
  }

  const formError =
    status === 401
      ? "Your session has expired. Please sign in again."
      : status === 403
        ? "You are not allowed to manage this customer."
        : status === 404
          ? "This customer no longer exists or doesn't belong to your store."
          : message ?? fallback;
  return { status, fieldErrors: {}, formError };
}

export function describeCustomerError(error: unknown, fallback?: string) {
  return mapCustomerApiError(error, fallback).formError ?? fallback ?? "Something went wrong. Please try again.";
}
