import { isAxiosError } from "axios";

export interface ApiErrorDetails {
  status: number | null;
  message: string;
  fieldErrors: Record<string, string[]>;
}

// Normalizes Laravel error payloads: `{ message }` for 401/403/404 and
// `{ message, errors: { field: string[] } }` for 422 validation failures.
export function parseApiError(error: unknown, fallback = "Something went wrong. Please try again."): ApiErrorDetails {
  if (isAxiosError(error)) {
    if (!error.response) {
      return {
        status: null,
        message: "We couldn't reach the SofiaCart API. Check NEXT_PUBLIC_API_URL and that the backend is running.",
        fieldErrors: {},
      };
    }

    const data = error.response.data as { message?: unknown; errors?: unknown } | undefined;
    const fieldErrors =
      data && typeof data.errors === "object" && data.errors !== null ? (data.errors as Record<string, string[]>) : {};
    const firstFieldError = Object.values(fieldErrors)[0]?.[0];
    const message =
      typeof data?.message === "string" && data.message
        ? data.message
        : firstFieldError ?? defaultMessageForStatus(error.response.status, fallback);

    return { status: error.response.status, message, fieldErrors };
  }

  return { status: null, message: fallback, fieldErrors: {} };
}

function defaultMessageForStatus(status: number, fallback: string) {
  if (status === 401) return "Your admin session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested record was not found.";
  return fallback;
}

export function fieldErrorList(details: ApiErrorDetails) {
  return Object.values(details.fieldErrors).flat();
}
