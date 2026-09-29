"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/admin/ui";
import { useAdminSession } from "@/components/admin/admin-session";
import { firstAccessibleAdminPath } from "@/lib/admin/permissions";

export default function AdminIndexPage() {
  const router = useRouter();
  const { permissions } = useAdminSession();

  useEffect(() => {
    router.replace(firstAccessibleAdminPath(permissions));
  }, [permissions, router]);

  return <LoadingState label="Opening admin console…" />;
}
