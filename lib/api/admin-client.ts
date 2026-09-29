import axios from "axios";
import { ADMIN_UNAUTHORIZED_EVENT, clearAdminSession, getAdminToken } from "@/lib/admin/auth";

// Dedicated client for /api/admin/* so admin tokens never leak into storefront requests
// and admin 401s never clear the merchant session.
const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "",
  headers: {
    Accept: "application/json",
  },
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = ["Bearer", token].join(" ");
  }

  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url ?? "");
    if (typeof window !== "undefined" && error.response?.status === 401 && !url.endsWith("/auth/login")) {
      clearAdminSession();
      window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default adminApi;
