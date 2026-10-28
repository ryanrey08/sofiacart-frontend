"use client";

import { useQuery } from "@tanstack/react-query";
import {
  REGISTRATION_OPTIONS_QUERY_KEY,
  fetchProvinceCities,
  fetchRegistrationOptions,
  type RegistrationCatalog,
} from "@/lib/registration-options";

const STALE_TIME = 5 * 60_000;

export function useRegistrationOptions() {
  return useQuery({ queryKey: REGISTRATION_OPTIONS_QUERY_KEY, queryFn: fetchRegistrationOptions, staleTime: STALE_TIME });
}

// The cities listed for the chosen province. `cities` is null when the province has none listed
// (or is not in the catalog), in which case the city is typed instead of picked.
export function useProvinceCities(catalog: RegistrationCatalog | undefined, provinceName: string | null | undefined) {
  const province = catalog?.provinces.find((item) => item.name === provinceName);
  const query = useQuery({
    queryKey: [...REGISTRATION_OPTIONS_QUERY_KEY, "cities", province?.id],
    queryFn: () => fetchProvinceCities(province!.id),
    enabled: Boolean(province?.has_cities),
    staleTime: STALE_TIME,
  });

  return {
    cities: province?.has_cities ? (query.data?.map((city) => city.name) ?? []) : null,
    isLoading: Boolean(province?.has_cities) && query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
