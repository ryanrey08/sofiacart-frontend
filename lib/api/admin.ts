import adminApi from "@/lib/api/admin-client";
import type {
  AdminAuditLog,
  AdminCustomer,
  AdminCustomerDetail,
  AdminDashboard,
  AdminLoginResponse,
  AdminMerchant,
  AdminOrder,
  AdminPayment,
  AdminPermission,
  AdminProduct,
  AdminRefund,
  AdminRole,
  AdminSession,
  AdminSetting,
  AdminTransaction,
  AdminUser,
  MerchantBilling,
  MerchantStatus,
  OrderStatus,
  Paginated,
  PlatformReport,
  PlatformReportType,
  ProductStatus,
  RefundStatus,
} from "@/types/admin";

// Every function here maps 1:1 to a route in sofiacart-backend routes/api.php.

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function cleanParams(params: QueryParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

async function getData<T>(path: string, params?: QueryParams) {
  const response = await adminApi.get<{ data: T }>(path, { params: cleanParams(params) });
  return response.data.data;
}

async function getPage<T>(path: string, params?: QueryParams) {
  const response = await adminApi.get<Paginated<T>>(path, { params: cleanParams(params) });
  return response.data;
}

// Auth — /api/admin/auth/*
export async function adminLogin(payload: { email: string; password: string; device_name?: string }) {
  const response = await adminApi.post<AdminLoginResponse>("/api/admin/auth/login", payload);
  return response.data;
}
export const fetchAdminMe = () => getData<AdminUser>("/api/admin/auth/me");
export const adminLogout = () => adminApi.post("/api/admin/auth/logout");
export const adminLogoutAll = () => adminApi.post("/api/admin/auth/logout-all");
export const fetchAdminSessions = () => getData<AdminSession[]>("/api/admin/auth/sessions");
export const revokeAdminSession = (tokenId: number) => adminApi.delete(`/api/admin/auth/sessions/${tokenId}`);
export async function adminForgotPassword(email: string) {
  const response = await adminApi.post<{ message: string }>("/api/admin/auth/forgot-password", { email });
  return response.data;
}
export async function adminResetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }) {
  const response = await adminApi.post<{ message: string }>("/api/admin/auth/reset-password", payload);
  return response.data;
}

// Dashboard
export const fetchAdminDashboard = (params: { date_from?: string; date_to?: string }) =>
  getData<AdminDashboard>("/api/admin/dashboard", params);

// Merchants
export const fetchMerchants = (params: QueryParams) => getPage<AdminMerchant>("/api/admin/merchants", params);
export const fetchMerchant = (id: number) => getData<AdminMerchant>(`/api/admin/merchants/${id}`);
export async function updateMerchantStatus(id: number, payload: { status: MerchantStatus; reason?: string }) {
  const response = await adminApi.patch<{ data: AdminMerchant }>(`/api/admin/merchants/${id}/status`, payload);
  return response.data.data;
}
export const fetchMerchantOnboardingHistory = (id: number, params: QueryParams) =>
  getPage<AdminAuditLog>(`/api/admin/merchants/${id}/onboarding-history`, params);
export const fetchMerchantBilling = (id: number) => getData<MerchantBilling>(`/api/admin/merchants/${id}/billing`);

// Customers
export const fetchCustomers = (params: QueryParams) => getPage<AdminCustomer>("/api/admin/customers", params);
export const fetchCustomer = (id: number) => getData<AdminCustomerDetail>(`/api/admin/customers/${id}`);
export const fetchCustomerOrders = (id: number, params: QueryParams) =>
  getPage<AdminOrder>(`/api/admin/customers/${id}/orders`, params);

// Orders
export const fetchOrders = (params: QueryParams) => getPage<AdminOrder>("/api/admin/orders", params);
export async function updateOrderStatus(id: number, status: OrderStatus) {
  const response = await adminApi.patch<{ data: AdminOrder }>(`/api/admin/orders/${id}/status`, { status });
  return response.data.data;
}

// Products
export const fetchProducts = (params: QueryParams) => getPage<AdminProduct>("/api/admin/products", params);
export async function updateProductStatus(id: number, status: ProductStatus) {
  const response = await adminApi.patch<{ data: AdminProduct }>(`/api/admin/products/${id}`, { status });
  return response.data.data;
}
export const deleteProduct = (id: number) => adminApi.delete(`/api/admin/products/${id}`);

// Payments, transactions, refunds
export const fetchPayments = (params: QueryParams) => getPage<AdminPayment>("/api/admin/payments", params);
export const fetchTransactions = (params: QueryParams) => getPage<AdminTransaction>("/api/admin/transactions", params);
export const fetchRefunds = (params: QueryParams) => getPage<AdminRefund>("/api/admin/refunds", params);
export async function updateRefundStatus(id: number, status: RefundStatus) {
  const response = await adminApi.patch<{ data: AdminRefund }>(`/api/admin/refunds/${id}`, { status });
  return response.data.data;
}

// Reports
export async function fetchPlatformReport(params: { type: PlatformReportType; page?: number; per_page?: number }) {
  const response = await adminApi.get<PlatformReport>("/api/admin/reports/platform", { params: cleanParams(params) });
  return response.data;
}
export async function exportPlatformReport(type: PlatformReportType) {
  const response = await adminApi.get<Blob>("/api/admin/reports/export", { params: { type }, responseType: "blob" });
  return response.data;
}

// Settings
export const fetchSettings = () => getData<AdminSetting[]>("/api/admin/settings");
export async function updateSettings(
  settings: Array<{ key: string; value?: unknown; description?: string | null; is_secret?: boolean }>,
) {
  const response = await adminApi.put<{ data: AdminSetting[] }>("/api/admin/settings", { settings });
  return response.data.data;
}

// Admin users
export interface AdminUserPayload {
  name?: string;
  email?: string;
  phone?: string | null;
  is_active?: boolean;
  role_ids?: number[];
  permission_ids?: number[];
}
export const fetchAdminUsers = (params: QueryParams) => getPage<AdminUser>("/api/admin/users", params);
export async function createAdminUser(payload: AdminUserPayload) {
  const response = await adminApi.post<{ message: string; data: AdminUser; password_setup: { email: string; expires_in_minutes: number | null } }>(
    "/api/admin/users",
    payload,
  );
  return response.data;
}
export async function updateAdminUser(id: number, payload: AdminUserPayload) {
  const response = await adminApi.patch<{ data: AdminUser }>(`/api/admin/users/${id}`, payload);
  return response.data.data;
}
export const deleteAdminUser = (id: number) => adminApi.delete(`/api/admin/users/${id}`);
export const fetchAdminUserActivity = (id: number, params: QueryParams) =>
  getPage<AdminAuditLog>(`/api/admin/users/${id}/activity`, params);

// Roles
export interface AdminRolePayload {
  slug?: string;
  name?: string;
  description?: string | null;
  permission_ids?: number[];
}
export const fetchRoles = (params: QueryParams) => getPage<AdminRole>("/api/admin/roles", params);
export async function createRole(payload: AdminRolePayload) {
  const response = await adminApi.post<{ data: AdminRole }>("/api/admin/roles", payload);
  return response.data.data;
}
export async function updateRole(id: number, payload: AdminRolePayload) {
  const response = await adminApi.patch<{ data: AdminRole }>(`/api/admin/roles/${id}`, payload);
  return response.data.data;
}
export const deleteRole = (id: number) => adminApi.delete(`/api/admin/roles/${id}`);

// Permissions
export interface AdminPermissionPayload {
  name?: string;
  group?: string;
  label?: string;
  description?: string | null;
}
export const fetchPermissions = (params: QueryParams) => getPage<AdminPermission>("/api/admin/permissions", params);
export async function createPermission(payload: AdminPermissionPayload) {
  const response = await adminApi.post<{ data: AdminPermission }>("/api/admin/permissions", payload);
  return response.data.data;
}
export async function updatePermission(id: number, payload: AdminPermissionPayload) {
  const response = await adminApi.patch<{ data: AdminPermission }>(`/api/admin/permissions/${id}`, payload);
  return response.data.data;
}
export const deletePermission = (id: number) => adminApi.delete(`/api/admin/permissions/${id}`);

// System logs
export const fetchSystemLogs = (params: QueryParams) => getPage<AdminAuditLog>("/api/admin/logs", params);
export const fetchSystemLog = (id: number) => getData<AdminAuditLog>(`/api/admin/logs/${id}`);
