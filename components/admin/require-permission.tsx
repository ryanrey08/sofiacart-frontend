"use client";

import type { ReactNode } from "react";
import { AccessDenied } from "@/components/admin/ui";
import { useAdminSession } from "@/components/admin/admin-session";
import type { PermissionRequirement } from "@/lib/admin/permissions";

export function RequirePermission({ permission, children }: { permission: PermissionRequirement; children: ReactNode }) {
  const { can } = useAdminSession();
  if (!can(permission)) return <AccessDenied />;
  return <>{children}</>;
}

export function Can({ permission, children, fallback = null }: { permission: PermissionRequirement; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAdminSession();
  return <>{can(permission) ? children : fallback}</>;
}
