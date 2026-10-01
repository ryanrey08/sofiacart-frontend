"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getStoredAuth } from "@/lib/auth";
import { describeMerchant } from "@/lib/merchant-identity";
import type { AuthUser } from "@/types";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Serialized so the snapshot is referentially stable between renders.
function getSnapshot() {
  return JSON.stringify(getStoredAuth()?.user ?? null);
}

export function useMerchantIdentity() {
  const serializedUser = useSyncExternalStore(subscribe, getSnapshot, () => "null");
  return useMemo(() => describeMerchant(JSON.parse(serializedUser) as AuthUser | null), [serializedUser]);
}
