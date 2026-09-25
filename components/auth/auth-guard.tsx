"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredAuth } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();

    if (!auth) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
      setChecked(true);
      return;
    }

    setIsAuthorized(true);
    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return <div className="min-h-screen bg-brand-soft" />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
