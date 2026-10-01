"use client";

import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredAuth } from "@/lib/auth";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// `undefined` on the server/first hydration pass keeps server and client markup identical.
function getAuthSnapshot(): boolean {
  return getStoredAuth() !== null;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useSyncExternalStore<boolean | undefined>(subscribe, getAuthSnapshot, () => undefined);

  useEffect(() => {
    if (isAuthenticated === false) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
