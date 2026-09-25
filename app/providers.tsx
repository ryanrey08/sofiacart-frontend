"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    const handleUnauthorized = () => router.push("/login");
    window.addEventListener("sofiacart:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("sofiacart:unauthorized", handleUnauthorized);
  }, [router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
