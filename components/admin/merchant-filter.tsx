"use client";

import { useQuery } from "@tanstack/react-query";
import { Field, SelectInput } from "@/components/admin/ui";
import { fetchMerchants } from "@/lib/api/admin";

const OPTION_LIMIT = 100;

export function useMerchantOptions() {
  return useQuery({
    queryKey: ["admin", "merchants", "options"],
    queryFn: () => fetchMerchants({ per_page: OPTION_LIMIT, sort: "name_asc" }),
    staleTime: 5 * 60_000,
  });
}

// Store names for resources that only carry merchant_id (e.g. inventory items).
export function useMerchantNames() {
  const options = useMerchantOptions();
  return (merchantId: number) => {
    const merchant = options.data?.data.find((item) => item.id === merchantId);
    return merchant ? { id: merchant.id, store_name: merchant.store_name } : null;
  };
}

// Merchant selector for platform-wide lists; options come from GET /api/admin/merchants.
export function MerchantFilter({
  id,
  value,
  onChange,
  label = "Merchant",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const merchants = useMerchantOptions();
  const truncated = (merchants.data?.meta.total ?? 0) > OPTION_LIMIT;

  return (
    <Field label={label} htmlFor={id}>
      <SelectInput id={id} className="w-48" value={value} onChange={(event) => onChange(event.target.value)} disabled={merchants.isPending}>
        <option value="">{merchants.isError ? "All merchants (list unavailable)" : "All merchants"}</option>
        {merchants.data?.data.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.store_name}
          </option>
        ))}
      </SelectInput>
      {truncated ? <p className="mt-1 text-[11px] text-muted-foreground">First {OPTION_LIMIT} merchants by name</p> : null}
    </Field>
  );
}
