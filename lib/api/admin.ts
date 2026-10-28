import adminApi from "@/lib/api/admin-client";
import type {
  AdminAuditLog,
  AdminCity,
  AdminCustomer,
  AdminCustomerDetail,
  AdminDashboard,
  AdminInventoryItem,
  AdminInventoryLog,
  AdminLegalDocument,
  AdminLegalDocumentSlot,
  AdminLoginResponse,
  AdminMerchant,
  AdminOrder,
  AdminPayment,
  AdminPermission,
  AdminProduct,
  AdminProvince,
  AdminRefund,
  AdminRegistrationOption,
  AdminRegistrationOptionGroup,
  AdminReturnRequest,
  AdminRole,
  AdminSession,
  AdminSetting,
  AdminTransaction,
  AdminUser,
  CustomerReport,
  InventoryReport,
  LegalDocumentAudience,
  LegalDocumentType,
  MerchantBilling,
  MerchantDocument,
  MerchantStatus,
  MerchantStatusSummary,
  OrderStatus,
  Paginated,
  PlatformReport,
  PlatformReportFilters,
  PlatformReportType,
  ProductReport,
  ProductStatus,
  RefundStatus,
  RegistrationOptionType,
  SalesReportPoint,
} from "@/types/admin";
import type { InventorySummary, ProductChangeRequestResource } from "@/types";
import type { MerchantChangeRequest } from "@/types/merchant-profile";
import type { NotificationPage } from "@/types/notifications";
import type { PaymentDetail, PaymentOrderBalance, PaymentSummary } from "@/types/payments";
import type { RefundSummary } from "@/types/refunds";
import type { TransactionSummary, TransactionTimelineEvent } from "@/types/transactions";

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
export const fetchMerchantSummary = () => getData<MerchantStatusSummary>("/api/admin/merchants/summary");
export const fetchMerchant = (id: number) => getData<AdminMerchant>(`/api/admin/merchants/${id}`);
export async function updateMerchantStatus(id: number, payload: { status: MerchantStatus; reason?: string }) {
  const response = await adminApi.patch<{ data: AdminMerchant }>(`/api/admin/merchants/${id}/status`, payload);
  return response.data.data;
}
// Direct edit by an admin (multipart, for replacement files): applied immediately, no approval.
export async function updateMerchantProfile(id: number, data: FormData) {
  const response = await adminApi.post<{ data: AdminMerchant; fields: string[]; message: string }>(`/api/admin/merchants/${id}/profile`, data);
  return response.data;
}
export const fetchMerchantOnboardingHistory = (id: number, params: QueryParams) =>
  getPage<AdminAuditLog>(`/api/admin/merchants/${id}/onboarding-history`, params);
export const fetchMerchantBilling = (id: number) => getData<MerchantBilling>(`/api/admin/merchants/${id}/billing`);

// Merchant profile change requests — merchant edits awaiting approval before they reach the live record.
export const fetchMerchantChangeRequests = (params: QueryParams) =>
  getPage<MerchantChangeRequest>("/api/admin/merchant-change-requests", params);
export const fetchMerchantChangeRequest = (id: number) => getData<MerchantChangeRequest>(`/api/admin/merchant-change-requests/${id}`);
// Replacement document uploaded with a pending request (private; available until it is decided).
export async function fetchMerchantChangeRequestFile(id: number, document: MerchantDocument) {
  const response = await adminApi.get<Blob>(`/api/admin/merchant-change-requests/${id}/files/${document}`, { responseType: "blob" });
  return response.data;
}

// In-app notifications for the signed-in admin.
export const fetchAdminNotifications = async (params: QueryParams = {}) =>
  (await adminApi.get<NotificationPage>("/api/admin/notifications", { params: cleanParams(params) })).data;
export const markAdminNotificationRead = (id: string) => adminApi.post(`/api/admin/notifications/${id}/read`);
export const markAllAdminNotificationsRead = () => adminApi.post("/api/admin/notifications/read-all");
export async function reviewMerchantChangeRequest(id: number, payload: { status: "approved" | "rejected"; reason?: string }) {
  const response = await adminApi.patch<{ data: MerchantChangeRequest; meta: { merchant: AdminMerchant } }>(
    `/api/admin/merchant-change-requests/${id}/status`,
    payload,
  );
  return response.data;
}
// Registration documents are served through the authenticated admin API, never by public URL.
export async function fetchMerchantDocument(id: number, document: MerchantDocument) {
  const response = await adminApi.get<Blob>(`/api/admin/merchants/${id}/documents/${document}`, { responseType: "blob" });
  return response.data;
}

// Customers
export const fetchCustomers = (params: QueryParams) => getPage<AdminCustomer>("/api/admin/customers", params);
export const fetchCustomer = (id: number) => getData<AdminCustomerDetail>(`/api/admin/customers/${id}`);
export const fetchCustomerOrders = (id: number, params: QueryParams) =>
  getPage<AdminOrder>(`/api/admin/customers/${id}/orders`, params);

// Orders
export const fetchOrders = (params: QueryParams) => getPage<AdminOrder>("/api/admin/orders", params);
export const fetchOrder = (id: number) => getData<AdminOrder>(`/api/admin/orders/${id}`);
export async function updateOrderStatus(id: number, status: OrderStatus) {
  const response = await adminApi.patch<{ data: AdminOrder }>(`/api/admin/orders/${id}/status`, { status });
  return response.data.data;
}

// Products
export const fetchProducts = (params: QueryParams) => getPage<AdminProduct>("/api/admin/products", params);
export const fetchProduct = (id: number) => getData<AdminProduct>(`/api/admin/products/${id}`);
export async function updateProductStatus(id: number, status: ProductStatus) {
  const response = await adminApi.patch<{ data: AdminProduct }>(`/api/admin/products/${id}`, { status });
  return response.data.data;
}
export const deleteProduct = (id: number) => adminApi.delete(`/api/admin/products/${id}`);
export interface ProductReviewHistoryEntry {
  id: number;
  action: string;
  description: string | null;
  reason: string | null;
  fields: string[] | null;
  actor: { id: number; name: string; role: string | null } | null;
  created_at: string | null;
}
// Product detail plus the approval history (ProductsController::show, admin only).
export async function fetchProductForReview(id: number) {
  const response = await adminApi.get<{ data: AdminProduct; meta?: { review_history?: ProductReviewHistoryEntry[] } }>(`/api/admin/products/${id}`);
  return { product: response.data.data, history: response.data.meta?.review_history ?? [] };
}
// Approve (publish) or reject a product awaiting approval; requires products.approve.
// `submitted_at` is the submission the reviewer saw: a newer resubmission returns 409.
export async function reviewProduct(id: number, payload: { status: "approved" | "rejected"; reason?: string; submitted_at?: string | null }) {
  const response = await adminApi.patch<{ data: AdminProduct }>(`/api/admin/products/${id}/approval`, payload);
  return response.data.data;
}
// Apply or discard a pending edit to an approved product; requires products.approve.
export async function reviewProductChanges(changeRequestId: number, payload: { status: "approved" | "rejected"; reason?: string }) {
  const response = await adminApi.patch<{ data: ProductChangeRequestResource; meta: { product: AdminProduct } }>(
    `/api/admin/product-change-requests/${changeRequestId}/status`,
    payload,
  );
  return response.data;
}

// Inventory (InventoryController; requires products.inventory.manage)
export const fetchInventoryItems = (params: QueryParams) => getPage<AdminInventoryItem>("/api/admin/inventory", params);
export const fetchInventorySummary = (params: QueryParams) => getData<InventorySummary>("/api/admin/inventory/summary", params);
export const fetchInventoryLogs = (params: QueryParams) => getPage<AdminInventoryLog>("/api/admin/inventory/logs", params);

// Return requests (ReturnRequestsController)
export const fetchReturnRequests = (params: QueryParams) => getPage<AdminReturnRequest>("/api/admin/return-requests", params);
export const fetchReturnRequest = (id: number) => getData<AdminReturnRequest>(`/api/admin/return-requests/${id}`);
// Review rules (transitions, refund matching, stock restoration) are enforced by ReturnRequestsController::review.
export async function reviewReturnRequest(id: number, payload: { status: string; refund_id?: number }) {
  const response = await adminApi.patch<{ data: AdminReturnRequest }>(`/api/admin/return-requests/${id}`, payload);
  return response.data.data;
}
export async function fetchReturnEvidence(id: number, index: number) {
  const response = await adminApi.get<Blob>(`/api/admin/return-requests/${id}/evidence/${index}`, { responseType: "blob" });
  return response.data;
}

// Payments, transactions, refunds
export const fetchPayments = (params: QueryParams) => getPage<AdminPayment>("/api/admin/payments", params);
export const fetchTransactions = (params: QueryParams) => getPage<AdminTransaction>("/api/admin/transactions", params);
export const fetchRefunds = (params: QueryParams) => getPage<AdminRefund>("/api/admin/refunds", params);
export const fetchPaymentSummary = (params: QueryParams) => getData<PaymentSummary>("/api/admin/payments/summary", params);
export const fetchTransactionSummary = (params: QueryParams) => getData<TransactionSummary>("/api/admin/transactions/summary", params);
export const fetchRefundSummary = (params: QueryParams) => getData<RefundSummary>("/api/admin/refunds/summary", params);
export async function fetchPayment(id: number) {
  const response = await adminApi.get<{ data: AdminPayment & PaymentDetail; meta: { order_balance: PaymentOrderBalance | null } }>(`/api/admin/payments/${id}`);
  return response.data;
}
export async function fetchTransaction(id: number) {
  const response = await adminApi.get<{ data: AdminTransaction; meta: { history: AdminTransaction[]; timeline: TransactionTimelineEvent[] } }>(
    `/api/admin/transactions/${id}`,
  );
  return response.data;
}
export const fetchRefund = (id: number) => getData<AdminRefund>(`/api/admin/refunds/${id}`);
// Uses the dedicated status endpoint so RefundService enforces the allowed transitions.
export async function updateRefundStatus(id: number, payload: { status: RefundStatus; notes?: string; failure_reason?: string }) {
  const response = await adminApi.patch<{ data: AdminRefund }>(`/api/admin/refunds/${id}/status`, payload);
  return response.data.data;
}

// Reports
export async function fetchPlatformReport(params: PlatformReportFilters & { type: PlatformReportType; page?: number; per_page?: number }) {
  const response = await adminApi.get<PlatformReport>("/api/admin/reports/platform", { params: cleanParams(params) });
  return response.data;
}
export async function exportPlatformReport(params: PlatformReportFilters & { type: PlatformReportType }) {
  const response = await adminApi.get<Blob>("/api/admin/reports/export", { params: cleanParams(params), responseType: "blob" });
  return response.data;
}
export const fetchSalesReport = (params: QueryParams) => getData<SalesReportPoint[]>("/api/admin/reports/sales", params);
export const fetchCustomerReport = (params: QueryParams) => getData<CustomerReport>("/api/admin/reports/customers", params);
export const fetchProductReport = (params: QueryParams) => getData<ProductReport>("/api/admin/reports/products", params);
export const fetchInventoryReport = (params: QueryParams) => getData<InventoryReport>("/api/admin/reports/inventory", params);

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

// Legal documents (Terms and Conditions, Data Privacy Policy) — LegalDocumentController.
export const fetchLegalDocuments = () => getData<AdminLegalDocumentSlot[]>("/api/admin/legal-documents");

export const fetchLegalDocumentVersions = (audience: LegalDocumentAudience, type: LegalDocumentType) =>
  getData<AdminLegalDocument[]>(`/api/admin/legal-documents/${audience}/${type}/versions`);

export async function uploadLegalDocument(
  audience: LegalDocumentAudience,
  type: LegalDocumentType,
  payload: { file: File; version_label?: string; effective_date?: string; notes?: string },
) {
  const form = new FormData();
  form.append("file", payload.file);
  if (payload.version_label) form.append("version_label", payload.version_label);
  if (payload.effective_date) form.append("effective_date", payload.effective_date);
  if (payload.notes) form.append("notes", payload.notes);
  const response = await adminApi.post<{ data: AdminLegalDocument; message: string }>(`/api/admin/legal-documents/${audience}/${type}/versions`, form);
  return response.data;
}

// Any version, including drafts, streamed through the authenticated admin client for preview.
export async function fetchLegalDocumentFile(id: number) {
  const response = await adminApi.get<Blob>(`/api/admin/legal-documents/versions/${id}/file`, { responseType: "blob" });
  return response.data;
}

export async function publishLegalDocument(id: number) {
  const response = await adminApi.post<{ data: AdminLegalDocument; message: string }>(`/api/admin/legal-documents/versions/${id}/publish`);
  return response.data;
}

export async function unpublishLegalDocument(id: number) {
  const response = await adminApi.post<{ data: AdminLegalDocument; message: string }>(`/api/admin/legal-documents/versions/${id}/unpublish`);
  return response.data;
}

// Merchant registration dropdowns and locations — RegistrationOptionController, LocationController.
type Saved<T> = { data: T; message: string };

export const fetchRegistrationOptionGroups = () => getData<AdminRegistrationOptionGroup[]>("/api/admin/registration-options");

export async function createRegistrationOption(type: RegistrationOptionType, name: string) {
  const response = await adminApi.post<Saved<AdminRegistrationOption>>("/api/admin/registration-options", { type, name });
  return response.data;
}

export async function updateRegistrationOption(id: number, payload: { name?: string; is_active?: boolean }) {
  const response = await adminApi.patch<Saved<AdminRegistrationOption>>(`/api/admin/registration-options/${id}`, payload);
  return response.data;
}

export async function reorderRegistrationOptions(type: RegistrationOptionType, ids: number[]) {
  const response = await adminApi.put<{ data: AdminRegistrationOptionGroup[] }>("/api/admin/registration-options/order", { type, ids });
  return response.data.data;
}

export const deleteRegistrationOption = (id: number) => adminApi.delete<{ message: string }>(`/api/admin/registration-options/${id}`);

export const fetchAdminProvinces = (search?: string) => getData<AdminProvince[]>("/api/admin/provinces", { search });

export async function createProvince(payload: { name: string; region?: string | null }) {
  const response = await adminApi.post<Saved<AdminProvince>>("/api/admin/provinces", payload);
  return response.data;
}

export async function updateProvince(id: number, payload: { name?: string; region?: string | null; is_active?: boolean }) {
  const response = await adminApi.patch<Saved<AdminProvince>>(`/api/admin/provinces/${id}`, payload);
  return response.data;
}

export const deleteProvince = (id: number) => adminApi.delete<{ message: string }>(`/api/admin/provinces/${id}`);

export const fetchAdminCities = (provinceId: number) => getData<AdminCity[]>(`/api/admin/provinces/${provinceId}/cities`);

export async function createCity(provinceId: number, payload: { name: string; kind?: AdminCity["kind"] }) {
  const response = await adminApi.post<Saved<AdminCity>>(`/api/admin/provinces/${provinceId}/cities`, payload);
  return response.data;
}

export async function updateCity(id: number, payload: { name?: string; kind?: AdminCity["kind"]; is_active?: boolean }) {
  const response = await adminApi.patch<Saved<AdminCity>>(`/api/admin/cities/${id}`, payload);
  return response.data;
}

export const deleteCity = (id: number) => adminApi.delete<{ message: string }>(`/api/admin/cities/${id}`);
