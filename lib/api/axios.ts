import axios from "axios";
import { clearStoredAuth, getStoredToken } from "@/lib/auth";
import { EMAIL_UNVERIFIED_EVENT, isEmailUnverifiedResponse } from "@/lib/email-verification";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = ["Bearer", token].join(" ");
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      clearStoredAuth();
      window.dispatchEvent(new Event("sofiacart:unauthorized"));
    }

    if (typeof window !== "undefined" && isEmailUnverifiedResponse(error.response?.status, error.response?.data)) {
      window.dispatchEvent(new Event(EMAIL_UNVERIFIED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default api;
