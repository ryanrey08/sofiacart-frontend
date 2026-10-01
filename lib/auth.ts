import type { AuthResponse } from "@/types";

const AUTH_USER_STORAGE_KEY = "sofiacart-auth-user";
const AUTH_TOKEN_STORAGE_KEY = "sofiacart-auth-token";
let authToken: string | null = null;
/** Dispatched on `window` when auth is written or cleared in this tab (`storage` only fires in other tabs). */
export const AUTH_CHANGE_EVENT = "sofiacart-auth-change";

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  authToken ??= window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!authToken) return null;

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return {
      token: authToken,
      user: JSON.parse(raw) as AuthResponse["user"],
    };
  } catch {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

export function getStoredToken() {
  if (typeof window !== "undefined" && !authToken) {
    authToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  return authToken;
}

export function setStoredAuth(payload: AuthResponse) {
  if (typeof window === "undefined") return;
  authToken = payload.token;
  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  authToken = null;
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}
