"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { getStoredAuth, setStoredAuth } from "@/lib/auth";
import type { AccountUser } from "@/types/account";

// The signed-in merchant's own account: sofiacart-backend `auth` group (auth:sanctum). The account
// is always resolved from the token on the server; no user id is ever sent.
const ACCOUNT_KEY = ["merchant", "account"] as const;

export function useAccount() {
  return useQuery({
    queryKey: ACCOUNT_KEY,
    queryFn: async () => (await api.get<{ data: AccountUser }>("/api/auth/me")).data.data,
    staleTime: 0,
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; phone: string; current_password?: string }) =>
      (await api.patch<{ data: AccountUser }>("/api/auth/me", payload)).data.data,
    onSuccess: (user) => {
      queryClient.setQueryData(ACCOUNT_KEY, user);
      // Keep the signed-in identity shown in the shell (name, email) in sync with the server.
      const stored = getStoredAuth();
      if (stored) setStoredAuth({ token: stored.token, user: { ...stored.user, name: user.name, email: user.email } });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { current_password: string; password: string; password_confirmation: string }) =>
      (await api.put<{ message: string }>("/api/auth/password", payload)).data,
  });
}
