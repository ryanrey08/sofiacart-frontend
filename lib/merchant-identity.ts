import type { AuthUser } from "../types";

export interface MerchantIdentity {
  displayName: string;
  firstName: string;
  email: string | null;
  initials: string;
  roleLabel: string;
  merchantLabel: string;
  statusLabel: string | null;
}

export function getInitials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
}

export function humanizeStatus(status: string | null | undefined) {
  if (!status) return null;
  const words = status.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/** Derives display-only merchant identity from the authenticated user returned by `/api/auth/login`. */
export function describeMerchant(user: AuthUser | null | undefined): MerchantIdentity {
  const displayName = user?.name?.trim() || "Merchant account";
  return {
    displayName,
    firstName: user?.name?.trim().split(/\s+/)[0] || "there",
    email: user?.email ?? null,
    initials: getInitials(user?.name),
    roleLabel: user?.role === "admin" ? "Administrator" : "Merchant owner",
    merchantLabel: user?.merchant?.id ? `Merchant #${user.merchant.id}` : "Merchant store",
    statusLabel: humanizeStatus(user?.merchant?.status),
  };
}

/** A nav item is active on its exact route or any nested route (e.g. /sales/orders/12). */
export function isNavItemActive(pathname: string | null | undefined, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
