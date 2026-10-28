import api from "@/lib/api/axios";

// GET /api/registration-options in sofiacart-backend (RegistrationOptionsService::catalog): the
// active dropdown entries for merchant registration and the Store Profile form, managed by the
// Super Admin under Platform > Registration Options.
export interface RegistrationProvince {
  id: number;
  name: string;
  // False when no cities are listed for the province; the form then accepts a typed city.
  has_cities: boolean;
}

export interface RegistrationCatalog {
  business_types: string[];
  categories: string[];
  government_id_types: string[];
  provinces: RegistrationProvince[];
}

export interface RegistrationCity {
  id: number;
  name: string;
  kind: "city" | "municipality" | null;
}

export const REGISTRATION_OPTIONS_QUERY_KEY = ["registration-options"] as const;

export async function fetchRegistrationOptions() {
  const response = await api.get<{ data: RegistrationCatalog }>("/api/registration-options");
  return response.data.data;
}

export async function fetchProvinceCities(provinceId: number) {
  const response = await api.get<{ data: RegistrationCity[] }>(`/api/registration-options/provinces/${provinceId}/cities`);
  return response.data.data;
}

// Keeps a saved value selectable after the Super Admin renames or deactivates it, so editing other
// fields never silently clears it.
export function withCurrentValue(options: readonly string[], current: string | null | undefined) {
  return current && !options.includes(current) ? [current, ...options] : [...options];
}
