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

// Icon keys are resolved to lucide icons in the shell so this module stays dependency-free.
export type AdminNavIcon =
  | "dashboard"
  | "merchants"
  | "orders"
  | "products"
  | "customers"
  | "payments"
  | "reports"
  | "settings"
  | "users"
  | "logs";

export interface AdminNavItem {
  href: string;
  label: string;
  permission: PermissionRequirement;
  icon: AdminNavIcon;
  // Items sharing a group render as children under one collapsible sidebar entry (Canva "Merchants").
  group?: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

// Each entry is guarded by the permission(s) the backend route middleware requires.
// Order follows the Super Admin sidebar in the Canva design.
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", permission: ADMIN_PERMISSIONS.DASHBOARD_VIEW }],
  },
  {
    title: "Merchants",
    items: [
      { href: "/admin/merchants", label: "Merchant List", icon: "merchants", group: "Merchants", permission: ADMIN_PERMISSIONS.MERCHANTS_VIEW },
      { href: "/admin/merchants/onboarding", label: "Onboarding", icon: "merchants", group: "Merchants", permission: ADMIN_PERMISSIONS.MERCHANTS_VIEW },
      {
        href: "/admin/merchants/billing",
        label: "Billing",
        icon: "merchants",
        group: "Merchants",
        permission: { allOf: [ADMIN_PERMISSIONS.MERCHANTS_VIEW, ADMIN_PERMISSIONS.MERCHANTS_BILLING_VIEW] },
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/orders", label: "All Orders", icon: "orders", group: "Orders", permission: ADMIN_PERMISSIONS.ORDERS_VIEW },
      { href: "/admin/orders/returns", label: "Returns", icon: "orders", group: "Orders", permission: ADMIN_PERMISSIONS.ORDERS_VIEW },
      { href: "/admin/products", label: "All Products", icon: "products", group: "Products", permission: ADMIN_PERMISSIONS.PRODUCTS_VIEW },
      { href: "/admin/products/inventory", label: "Inventory", icon: "products", group: "Products", permission: ADMIN_PERMISSIONS.PRODUCTS_INVENTORY },
      { href: "/admin/customers", label: "Customers", icon: "customers", permission: ADMIN_PERMISSIONS.CUSTOMERS_VIEW },
      { href: "/admin/payments", label: "Payments", icon: "payments", permission: ADMIN_PERMISSIONS.PAYMENTS_VIEW },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "reports", permission: ADMIN_PERMISSIONS.REPORTS_VIEW },
      { href: "/admin/settings", label: "Platform Settings", icon: "settings", permission: ADMIN_PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    title: "Access control",
    items: [
      { href: "/admin/users", label: "Users", icon: "users", group: "User Management", permission: ADMIN_PERMISSIONS.USERS_VIEW },
      {
        href: "/admin/roles",
        label: "Roles & Permissions",
        icon: "users",
        group: "User Management",
        permission: { anyOf: [ADMIN_PERMISSIONS.ROLES_VIEW, ADMIN_PERMISSIONS.PERMISSIONS_VIEW] },
      },
      { href: "/admin/logs", label: "System Logs", icon: "logs", permission: ADMIN_PERMISSIONS.LOGS_VIEW },
    ],
  },
];

export interface AdminNavEntry {
  label: string;
  icon: AdminNavIcon;
  href?: string;
  children?: AdminNavItem[];
}

// Flattens the permitted sections into sidebar entries, folding grouped items under one parent.
export function sidebarEntries(granted: readonly string[] | null | undefined): AdminNavEntry[] {
  const entries: AdminNavEntry[] = [];
  for (const item of visibleNavSections(granted).flatMap((section) => section.items)) {
    if (!item.group) {
      entries.push({ label: item.label, icon: item.icon, href: item.href });
      continue;
    }
    const parent = entries.find((entry) => entry.children && entry.label === item.group);
    if (parent) parent.children!.push(item);
    else entries.push({ label: item.group, icon: item.icon, children: [item] });
  }
  return entries;
}

// Longest matching nav href for the current path, so /admin/merchants/12 highlights Merchant List.
export function activeNavHref(pathname: string, hrefs: readonly string[]) {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

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

// Mirrors App\Enums\RefundStatus::allowedTransitions in sofiacart-backend.
export const REFUND_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "cancelled", "processing", "processed"],
  approved: ["processing", "processed", "rejected", "cancelled"],
  processing: ["processed", "failed"],
  failed: ["processing", "processed", "cancelled"],
  rejected: [],
  processed: [],
  cancelled: [],
};

// Mirrors UpdateMerchantStatusRequest: rejections and information requests need a reason.
// Any other status change is allowed except re-applying the current status.
export const MERCHANT_REASON_REQUIRED = new Set(["rejected", "information_requested"]);

export type OnboardingStepState = "complete" | "current" | "upcoming" | "failed";

// Derives the Canva onboarding progress (Info → Docs → Review → Approval) from real merchant data:
// registration info exists for every record, documents come from the uploaded files and the last
// two steps follow the onboarding status.
export function onboardingSteps(merchant: { status: string | null; documents?: readonly string[] | null }) {
  const docs = merchant.documents ?? [];
  const hasRequiredDocs = docs.includes("business_permit") && docs.includes("government_id");
  const status = merchant.status ?? "pending";
  const decided = status === "verified" || status === "suspended" || status === "rejected";
  const review: OnboardingStepState = decided ? "complete" : "current";
  const approval: OnboardingStepState =
    status === "verified" || status === "suspended" ? "complete" : status === "rejected" ? "failed" : "upcoming";

  return [
    { key: "info", label: "Info", state: "complete" as OnboardingStepState },
    { key: "docs", label: "Docs", state: (hasRequiredDocs ? "complete" : status === "information_requested" ? "current" : "upcoming") as OnboardingStepState },
    { key: "review", label: "Review", state: review },
    { key: "approval", label: "Approval", state: approval },
  ];
}
