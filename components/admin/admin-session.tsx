"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/admin/ui";
import { adminLogout, adminLogoutAll, fetchAdminMe } from "@/lib/api/admin";
import {
  ADMIN_UNAUTHORIZED_EVENT,
  clearAdminSession,
  getAdminToken,
  setCachedAdminUser,
  subscribeToAdminSession,
} from "@/lib/admin/auth";
import { parseApiError } from "@/lib/admin/errors";
import { hasPermission, type PermissionRequirement } from "@/lib/admin/permissions";
import type { AdminUser } from "@/types/admin";

interface AdminSessionValue {
  user: AdminUser;
  permissions: string[];
  can: (requirement: PermissionRequirement | undefined) => boolean;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession must be used inside <AdminSessionProvider>.");
  return value;
}

// `undefined` on the server/before hydration so protected content never renders until
// the browser-side token has been read and verified against /api/admin/auth/me.
const getServerToken = () => undefined;

// Set when the admin explicitly signs out so the guard does not append a `redirect` back to the page.
let explicitLogout = false;

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(subscribeToAdminSession, getAdminToken, getServerToken);

  const me = useQuery({
    queryKey: ["admin", "me", token],
    queryFn: fetchAdminMe,
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (token !== null) return;
    queryClient.removeQueries({ queryKey: ["admin"] });
    if (explicitLogout) {
      explicitLogout = false;
      router.replace("/admin/login");
      return;
    }
    const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
    router.replace(`/admin/login${redirect}`);
  }, [token, pathname, queryClient, router]);

  useEffect(() => {
    const onUnauthorized = () => queryClient.removeQueries({ queryKey: ["admin"] });
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient]);

  useEffect(() => {
    if (me.data) setCachedAdminUser(me.data);
  }, [me.data]);

  const endSession = useCallback(async (request: () => Promise<unknown>) => {
    explicitLogout = true;
    try {
      await request();
    } catch {
      // The token is discarded locally even if the API is unreachable or already expired.
    }
    clearAdminSession();
  }, []);

  const user = me.data;
  const value = useMemo<AdminSessionValue | null>(() => {
    if (!user) return null;
    const permissions = user.effective_permissions ?? [];
    return {
      user,
      permissions,
      can: (requirement) => hasPermission(permissions, requirement),
      logout: () => endSession(adminLogout),
      logoutAll: () => endSession(adminLogoutAll),
    };
  }, [user, endSession]);

  if (!token) {
    return <FullScreen><LoadingState label="Checking admin session…" /></FullScreen>;
  }

  if (me.isError) {
    const details = parseApiError(me.error);
    return (
      <FullScreen>
        <div className="w-full max-w-lg space-y-4">
          <ErrorState
            title={details.status === 403 ? "Administrator access required" : "Unable to verify admin session"}
            error={me.error}
            onRetry={details.status === 403 ? undefined : () => void me.refetch()}
          />
          <Button variant="outline" onClick={() => void endSession(adminLogout)}>
            Sign out and use another account
          </Button>
        </div>
      </FullScreen>
    );
  }

  if (!value) {
    return <FullScreen><LoadingState label="Verifying admin session…" /></FullScreen>;
  }

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-brand-soft p-6">{children}</div>;
}
