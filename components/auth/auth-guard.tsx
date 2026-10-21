"use client";

import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_CHANGE_EVENT, getStoredAuth } from "@/lib/auth";
import { EMAIL_UNVERIFIED_EVENT, needsEmailVerification } from "@/lib/email-verification";
import { refreshStoredUser } from "@/lib/hooks/email-verification";

type AuthState = "signed-out" | "email-unverified" | "ready";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

function getAuthSnapshot(): AuthState {
  const auth = getStoredAuth();
  if (!auth) return "signed-out";
  return needsEmailVerification(auth.user) ? "email-unverified" : "ready";
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authState = useSyncExternalStore<AuthState | undefined>(subscribe, getAuthSnapshot, () => undefined); // undefined during SSR/hydration keeps markup identical
  const isSignedIn = authState !== undefined && authState !== "signed-out";

  useEffect(() => {
    if (authState === "signed-out") {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
    } else if (authState === "email-unverified") {
      router.replace("/verify-email");
    }
  }, [authState, pathname, router]);

  // The stored session may predate a verification or an email change; the backend is the source of truth.
  useEffect(() => {
    if (!isSignedIn) return;
    void refreshStoredUser().catch(() => undefined);
  }, [isSignedIn]);

  useEffect(() => {
    const onEmailUnverified = () => router.replace("/verify-email");
    window.addEventListener(EMAIL_UNVERIFIED_EVENT, onEmailUnverified);
    return () => window.removeEventListener(EMAIL_UNVERIFIED_EVENT, onEmailUnverified);
  }, [router]);

  if (authState !== "ready") {
    return null;
  }

  return <>{children}</>;
}
