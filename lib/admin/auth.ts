import type { AdminUser } from "@/types/admin";

// Admin sessions are isolated from the storefront/merchant session in lib/auth.ts:
// separate storage keys, separate axios client, separate unauthorized event.
const ADMIN_TOKEN_STORAGE_KEY = "sofiacart-admin-token";
const ADMIN_USER_STORAGE_KEY = "sofiacart-admin-user";
export const ADMIN_AUTH_CHANGED_EVENT = "sofiacart:admin-auth-changed";
export const ADMIN_UNAUTHORIZED_EVENT = "sofiacart:admin-unauthorized";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || null;
}

export function getCachedAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(ADMIN_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    window.sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    return null;
  }
}

export function setAdminSession(token: string, user: AdminUser) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  window.sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
}

export function setCachedAdminUser(user: AdminUser) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
}

export function subscribeToAdminSession(callback: () => void) {
  window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
