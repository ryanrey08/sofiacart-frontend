import api from "@/lib/api/axios";
import type { NotificationPage } from "@/types/notifications";

// Merchant in-app notifications: sofiacart-backend `auth:sanctum` + `v1` group, scoped to the user.
export const MERCHANT_NOTIFICATIONS_KEY = ["merchant", "notifications"] as const;

export const fetchMerchantNotifications = async (params: { per_page?: number; unread?: boolean } = {}) =>
  (await api.get<NotificationPage>("/api/v1/notifications", { params })).data;
export const markMerchantNotificationRead = (id: string) => api.post(`/api/v1/notifications/${id}/read`);
export const markAllMerchantNotificationsRead = () => api.post("/api/v1/notifications/read-all");
