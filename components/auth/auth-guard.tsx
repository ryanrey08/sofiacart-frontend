"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredAuth } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getStoredAuth();

  useEffect(() => {
    if (!auth) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
    }
  }, [auth, pathname, router]);

  if (!auth) {
    return null;
  }

  return <>{children}</>;
}
