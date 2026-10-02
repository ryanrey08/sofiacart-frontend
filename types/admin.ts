// DTOs mirror the Laravel admin API resources in sofiacart-backend
// (app/Http/Resources/Admin/*, app/Http/Resources/*, app/Enums/*).

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
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
export type OrderPaymentStatus = "unpaid" | "paid" | "partially_refunded" | "refunded";
export type PaymentStatus = "pending" | "completed" | "failed" | "partially_refunded" | "refunded";
export type ProductStatus = "pending_approval" | "active" | "draft" | "archived" | "rejected";
export type RefundStatus = "pending" | "approved" | "rejected" | "processed";
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
  government_id_type: string | null;
  status: MerchantStatus | null;
  user?: { id: number; name: string; email: string } | null;
  orders_count?: number;
  products_count?: number;
  payments_sum_amount?: string | number | null;
  created_at: string | null;
  updated_at: string | null;
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
  name: string;
  email_masked: string | null;
  phone_masked: string | null;
  orders_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCustomerDetail extends AdminCustomer {
  recent_orders: AdminOrder[];
}

export interface AdminOrder {
  id: number;
  merchant_id: number;
  customer_id: number | null;
  order_number: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  total_amount: string | number;
  notes: string | null;
  ordered_at: string | null;
  customer?: { id: number; name: string; email: string | null } | null;
  items?: Array<{ id: number; product_name?: string; quantity?: number }>;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminProduct {
  id: number;
  merchant_id: number;
  category_id: number | null;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  status: ProductStatus;
  price: string | number;
  stock_quantity: number;
  category?: { id: number; name: string } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminPayment {
  id: number;
  merchant_id: number;
  order_id: number | null;
  reference: string;
  gateway: string | null;
  status: PaymentStatus;
  amount: string | number;
  paid_at: string | null;
  created_at: string | null;
}

export interface AdminTransaction {
  id: number;
  merchant_id: number;
  payment_id: number | null;
  order_id: number | null;
  reference: string;
  // The ledger now records service-written payment/refund rows too (credit/debit are legacy).
  type: "credit" | "debit" | "payment" | "refund";
  status: TransactionStatus;
  amount: string | number;
  description: string | null;
  transacted_at: string | null;
  created_at: string | null;
}

export interface AdminRefund {
  id: number;
  merchant_id: number;
  payment_id: number;
  order_id: number | null;
  reference: string;
  amount: string | number;
  reason: string | null;
  status: RefundStatus;
  refunded_at: string | null;
  created_at: string | null;
}

export interface AdminDashboard {
  date_range: { from: string; to: string; semantics: string };
  metrics: {
    orders_count: number;
    gross_sales: string;
    payments_collected: string;
    new_merchants: number;
    new_customers: number;
    new_products: number;
  };
  breakdowns: {
    orders_by_status: Array<{ status: string; total: number }>;
    merchant_statuses: Array<{ status: string; total: number }>;
    top_merchants: Array<{ id: number; store_name: string; total_sales: string | number | null }>;
  };
}

export type PlatformReportType = "merchant_sales" | "payment_status" | "order_status";

export interface PlatformReport {
  data: Array<Record<string, string | number | null>>;
  meta: {
    type: PlatformReportType;
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
