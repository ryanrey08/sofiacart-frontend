"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import type { Paginated } from "@/types";
import type { MerchantChangeRequest, MerchantDocumentKey, MerchantProfileResponse } from "@/types/merchant-profile";

// Merchant store profile: sofiacart-backend `auth:sanctum` + `v1` group, scoped to the token's merchant.
// GET returns the approved (live) record; edits are submitted as change requests for admin approval.
const PROFILE_KEY = ["merchant", "profile"] as const;

export function useMerchantProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => (await api.get<MerchantProfileResponse>("/api/v1/merchant/profile")).data,
    staleTime: 0,
  });
}

export function useMerchantChangeRequests(page: number) {
  return useQuery({
    queryKey: [...PROFILE_KEY, "change-requests", page],
    queryFn: async () =>
      (await api.get<Paginated<MerchantChangeRequest>>("/api/v1/merchant/profile/change-requests", { params: { page, per_page: 5 } })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

// Multipart so replacement documents and text changes are submitted as one request.
export function useSubmitProfileChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) =>
      (await api.post<{ data: MerchantChangeRequest }>("/api/v1/merchant/profile/change-requests", payload)).data.data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useWithdrawProfileChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ data: MerchantChangeRequest }>(`/api/v1/merchant/profile/change-requests/${id}/withdraw`)).data.data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

// Files are private: they are fetched with the merchant token and shown as blob URLs.
export async function fetchOwnDocument(document: MerchantDocumentKey) {
  return (await api.get<Blob>(`/api/v1/merchant/profile/documents/${document}`, { responseType: "blob" })).data;
}

export async function fetchOwnChangeRequestFile(id: number, document: MerchantDocumentKey) {
  return (await api.get<Blob>(`/api/v1/merchant/profile/change-requests/${id}/files/${document}`, { responseType: "blob" })).data;
}
