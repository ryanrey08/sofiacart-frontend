// Permission names mirror App\Admin\AdminPermissionRegistry in sofiacart-backend.
// Keep this module dependency-free so it can be unit tested with `node --test`.

export const ADMIN_PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  MERCHANTS_VIEW: "merchants.view",
  MERCHANTS_MANAGE: "merchants.manage",
  MERCHANTS_BILLING_VIEW: "merchants.billing.view",
  ORDERS_VIEW: "orders.view",
  ORDERS_MANAGE: "orders.manage",
  ORDERS_REFUND: "orders.refund",
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",
  PRODUCTS_APPROVE: "products.approve",
  PRODUCTS_INVENTORY: "products.inventory.manage",
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_MANAGE: "payments.manage",
  PAYMENTS_RECONCILE: "payments.reconcile",
  PAYMENTS_REFUND: "payments.refund",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  USERS_ASSIGN_SUPER_ADMIN: "users.assign_super_admin",
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  PERMISSIONS_VIEW: "permissions.view",
  PERMISSIONS_MANAGE: "permissions.manage",
  LOGS_VIEW: "logs.view",
} as const;

export type AdminPermissionName = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export type PermissionRequirement = string | { anyOf: string[] } | { allOf: string[] };

export function hasPermission(granted: readonly string[] | null | undefined, requirement: PermissionRequirement | undefined) {
  if (!requirement) return true;
  const set = new Set(granted ?? []);

  if (typeof requirement === "string") return set.has(requirement);
  if ("anyOf" in requirement) return requirement.anyOf.some((permission) => set.has(permission));
  return requirement.allOf.every((permission) => set.has(permission));
}

export interface AdminNavItem {
  href: string;
  label: string;
  permission: PermissionRequirement;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

// Each entry is guarded by the permission(s) the backend route middleware requires.
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", permission: ADMIN_PERMISSIONS.DASHBOARD_VIEW }],
  },
  {
    title: "Merchants",
    items: [
      { href: "/admin/merchants", label: "Merchant List", permission: ADMIN_PERMISSIONS.MERCHANTS_VIEW },
      { href: "/admin/merchants/onboarding", label: "Onboarding", permission: ADMIN_PERMISSIONS.MERCHANTS_VIEW },
      {
        href: "/admin/merchants/billing",
        label: "Billing",
        permission: { allOf: [ADMIN_PERMISSIONS.MERCHANTS_VIEW, ADMIN_PERMISSIONS.MERCHANTS_BILLING_VIEW] },
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", permission: ADMIN_PERMISSIONS.ORDERS_VIEW },
      { href: "/admin/products", label: "Products", permission: ADMIN_PERMISSIONS.PRODUCTS_VIEW },
      { href: "/admin/customers", label: "Customers", permission: ADMIN_PERMISSIONS.CUSTOMERS_VIEW },
      { href: "/admin/payments", label: "Payments", permission: ADMIN_PERMISSIONS.PAYMENTS_VIEW },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/reports", label: "Reports", permission: ADMIN_PERMISSIONS.REPORTS_VIEW },
      { href: "/admin/settings", label: "Platform Settings", permission: ADMIN_PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    title: "Access control",
    items: [
      { href: "/admin/users", label: "User Management", permission: ADMIN_PERMISSIONS.USERS_VIEW },
      {
        href: "/admin/roles",
        label: "Roles & Permissions",
        permission: { anyOf: [ADMIN_PERMISSIONS.ROLES_VIEW, ADMIN_PERMISSIONS.PERMISSIONS_VIEW] },
      },
      { href: "/admin/logs", label: "System Logs", permission: ADMIN_PERMISSIONS.LOGS_VIEW },
    ],
  },
];

export function visibleNavSections(granted: readonly string[] | null | undefined) {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasPermission(granted, item.permission)),
  })).filter((section) => section.items.length > 0);
}

export function firstAccessibleAdminPath(granted: readonly string[] | null | undefined) {
  return visibleNavSections(granted)[0]?.items[0]?.href ?? "/admin/sessions";
}

// Only allow same-origin, admin-area redirect targets after login.
export function safeAdminRedirect(value: string | null | undefined) {
  if (!value || !(value === "/admin" || value.startsWith("/admin/")) || value.includes("\\") || value.startsWith("/admin/login")) {
    return null;
  }

  return value;
}

// Mirrors OrdersController::ensureValidStatusTransition in sofiacart-backend.
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
