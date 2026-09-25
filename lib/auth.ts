import type { AuthResponse } from "@/types";

const AUTH_USER_STORAGE_KEY = "sofiacart-auth-user";
const AUTH_TOKEN_COOKIE = "sofiacart_token";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const token = getCookie(AUTH_TOKEN_COOKIE);
  if (!token) return null;

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return {
      token,
      user: JSON.parse(raw) as AuthResponse["user"],
    };
  } catch {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

export function getStoredToken() {
  return getStoredAuth()?.token ?? null;
}

export function setStoredAuth(payload: AuthResponse) {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(payload.token)}; Path=/; SameSite=Strict${secure}`;
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
