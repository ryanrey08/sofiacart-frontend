// DTOs mirror the Laravel admin API resources in sofiacart-backend
// (app/Http/Resources/Admin/*, app/Http/Resources/*, app/Enums/*).
import type { InventoryItemResource, InventoryLogResource, ProductResource } from "./index";
import type { MerchantOrder, ReturnRequestResource } from "./commerce";
import type { PaymentResource } from "./payments";
import type { RefundResource } from "./refunds";
import type { TransactionResource } from "./transactions";

export interface Paginated<T> {
  data: T[];
  links?: Record<string, string | null>;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
  };
}

export interface AdminPermission {
  id: number;
  name: string;
  group: string;
  label: string;
  description: string | null;
  is_system: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminRole {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions?: AdminPermission[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUser {
  id: number;
  role: "admin" | "merchant" | null;
  phone: string | null;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  admin_roles?: AdminRole[];
  admin_permissions?: AdminPermission[];
  effective_permissions?: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminLoginResponse {
  message: string;
  token: string;
  user: AdminUser;
}

export interface AdminSession {
  id: number;
  name: string;
  abilities: string[];
  last_used_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  is_current: boolean;
}

export type MerchantStatus = "pending" | "verified" | "information_requested" | "suspended" | "rejected";
export type OrderStatus = "pending" | "processing" | "out_for_delivery" | "completed" | "cancelled";
export type OrderPaymentStatus = "unpaid" | "paid" | "partially_refunded" | "refunded";
export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled" | "expired" | "partially_refunded" | "refunded";
export type ProductStatus = "pending_approval" | "active" | "draft" | "archived" | "rejected";
export type RefundStatus = "pending" | "approved" | "rejected" | "processing" | "processed" | "failed" | "cancelled";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface AdminMerchant {
  id: number;
  user_id: number | null;
  business_name: string | null;
  business_type: string | null;
  business_permit_number: string | null;
  tin: string | null;
  business_category: string | null;
  business_address: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  store_name: string;
  store_slug: string | null;
  store_category: string | null;
  store_description: string | null;
  store_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_links: Record<string, string | null> | null;
  owner_name: string | null;
  owner_position: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_birth_date?: string | null;
  government_id_type: string | null;
  government_id_number?: string | null;
  government_id_expiry_date?: string | null;
  status: MerchantStatus | null;
  user?: { id: number; name: string; email: string } | null;
  orders_count?: number;
  products_count?: number;
  customers_count?: number;
  payments_count?: number;
  transactions_count?: number;
  refunds_count?: number;
  payments_sum_amount?: string | number | null;
  // Registration files present on the record; fetched through the admin documents endpoint.
  documents?: MerchantDocument[];
  created_at: string | null;
  updated_at: string | null;
}

export type MerchantDocument = "business_permit" | "government_id" | "store_logo" | "store_banner";

// GET /api/admin/merchants/summary
export interface MerchantStatusSummary {
  total: number;
  by_status: Record<MerchantStatus, number>;
  store_categories: string[];
}

// Owning store, included on platform-wide admin listings (IncludesMerchantSummary).
export interface MerchantRef {
  id: number;
  store_name: string;
  store_slug: string | null;
}

export interface AdminAuditLog {
  id: number;
  action: string;
  description: string | null;
  actor?: AdminUser | null;
  subject_type: string | null;
  subject_id: number | null;
  metadata: unknown;
  ip_address: string | null;
  created_at: string | null;
}

export interface MerchantBilling {
  merchant_id: number;
  store_name: string;
  payments_total: string;
  refunds_total: string;
  net_total: string;
  payments_count: number;
  refunds_count: number;
  transactions_count: number;
  recent_payments: Array<{
    id: number;
    reference: string;
    gateway: string | null;
    status: PaymentStatus;
    amount: string | number;
    paid_at: string | null;
    created_at: string | null;
  }>;
}

export interface AdminCustomer {
  id: number;
  merchant_id: number;
  merchant?: MerchantRef | null;
  name: string;
  customer_type?: string | null;
  status?: "active" | "inactive";
  email_masked: string | null;
  phone_masked: string | null;
  orders_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCustomerDetail extends AdminCustomer {
  recent_orders: AdminOrder[];
}

type WithMerchant<T> = T & { merchant?: MerchantRef | null };

// The admin order list/detail is OrderResource; detail additionally loads payments, refunds and returns.
export type AdminOrder = WithMerchant<Omit<MerchantOrder, "customer" | "items">> & {
  customer?: { id: number; name: string; email: string | null } | null;
  items?: MerchantOrder["items"];
  payments?: AdminPayment[];
  refunds?: AdminRefund[];
  return_requests?: AdminReturnRequest[];
};

export type AdminProduct = WithMerchant<ProductResource>;
export type AdminInventoryItem = InventoryItemResource;
export type AdminInventoryLog = InventoryLogResource;
export type AdminPayment = WithMerchant<Omit<PaymentResource, "status">> & { status: PaymentStatus };
export type AdminTransaction = WithMerchant<TransactionResource>;
export type AdminRefund = WithMerchant<Omit<RefundResource, "status">> & { status: RefundStatus };
export type AdminReturnRequest = WithMerchant<ReturnRequestResource> & {
  order?: { id: number; order_number: string; status: OrderStatus; payment_status: OrderPaymentStatus; total_amount: string | number } | null;
  customer?: { id: number; name: string } | null;
};

export interface AdminDashboard {
  date_range: { from: string; to: string; semantics: string };
  metrics: {
    orders_count: number;
    gross_sales: string;
    payments_collected: string;
    payments_count: number;
    refunds_processed: string;
    refunds_count: number;
    transactions_count: number;
    new_merchants: number;
    new_customers: number;
    new_products: number;
  };
  totals: {
    merchants: number;
    merchants_by_status: Record<MerchantStatus, number>;
    pending_onboarding: number;
    customers: number;
    products: number;
    orders: number;
    inventory: { total_items: number; low_stock: number; out_of_stock: number; total_available: number; total_reserved: number };
  };
  series: Array<{ date: string; new_merchants: number; orders_count: number; gross_sales: string; payments_collected: string }>;
  breakdowns: {
    orders_by_status: Array<{ status: string; total: number }>;
    merchant_statuses: Array<{ status: string; total: number }>;
    top_merchants: Array<{ id: number; store_name: string; total_sales: string | number | null }>;
  };
}

export type PlatformReportType = "merchant_sales" | "payment_status" | "order_status";

export type PlatformReportFilters = {
  merchant_id?: number | string;
  date_from?: string;
  date_to?: string;
};

export interface PlatformReport {
  data: Array<Record<string, string | number | null>>;
  meta: {
    type: PlatformReportType;
    filters?: PlatformReportFilters;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AdminSetting {
  id: number;
  key: string;
  value: unknown;
  description: string | null;
  is_secret: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// GET /api/admin/reports/{sales,customers,products,inventory} (ReportsController, unscoped for admins).
export interface SalesReportPoint {
  report_date: string;
  total_sales: string | number;
  orders_count: number;
}
export interface CustomerReport {
  new_customers_count: number;
  top_customers: Array<{ id: number; name: string; total_spent: string | number }>;
}
export interface ProductReport {
  top_selling: Array<{ id: number; name: string; sku: string; total_quantity_sold: string | number }>;
  low_stock: Array<{ id: number; name: string; sku: string; stock_quantity: number }>;
}
export interface InventoryReport {
  total_logs: number;
  net_quantity_change: number;
  by_reason: Array<{ reason: string; total_logs: number; net_quantity_change: string | number }>;
}
