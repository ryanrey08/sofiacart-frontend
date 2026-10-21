export type MerchantOrderStatus = "pending" | "processing" | "out_for_delivery" | "completed" | "cancelled";
export type MerchantPaymentStatus = "unpaid" | "paid" | "partially_refunded" | "refunded";
export type ReturnStatus = "pending" | "approved" | "rejected" | "processed";

export interface OrderItemResource {
  id: number;
  product_id: number | null;
  product_variant_id: number | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
}

// Mirrors App\Http\Controllers\Api\MerchantDashboardController. Money fields are decimal strings;
// range metrics/series use the selected window, totals and inventory are all-time.
export interface MerchantDashboard {
  date_range: { from: string; to: string; semantics: string };
  currency: string;
  metrics: {
    orders_count: number;
    paid_orders_count: number;
    gross_sales: string;
    average_order_value: string;
    payments_collected: string;
    payments_count: number;
    refunds_processed: string;
    refunds_count: number;
    net_revenue: string;
    new_customers: number;
    new_products: number;
  };
  totals: {
    orders: number;
    pending_orders: number;
    customers: number;
    products: number;
    products_by_status: Record<string, number>;
    pending_payments: number;
    inventory: { total_items: number; low_stock: number; out_of_stock: number; total_available: number };
  };
  breakdowns: {
    orders_by_status: Array<{ status: MerchantOrderStatus; total: number }>;
    payments_by_status: Array<{ status: string; total: number }>;
    top_products: Array<{ id: number; name: string; sku: string | null; quantity_sold: number; revenue: string }>;
    low_stock: Array<{ product_id: number; name: string; sku: string | null; available: number; low_stock_threshold: number; stock_status: string }>;
  };
  series: Array<{ date: string; orders_count: number; gross_sales: string; payments_collected: string }>;
  recent: {
    orders: Array<{
      id: number;
      order_number: string;
      customer_name: string | null;
      items_count: number;
      total_amount: string;
      status: MerchantOrderStatus;
      payment_status: MerchantPaymentStatus;
      ordered_at: string | null;
    }>;
    transactions: Array<{ id: number; reference: string; type: string; method: string | null; amount: string; status: string; transacted_at: string | null }>;
  };
}

export interface MerchantOrder {
  id: number;
  merchant_id: number;
  customer_id: number | null;
  order_number: string;
  status: MerchantOrderStatus;
  payment_status: MerchantPaymentStatus;
  total_amount: string | number;
  subtotal: string | number;
  discount_amount: string | number;
  shipping_amount: string | number;
  shipping_address: string | null;
  notes: string | null;
  ordered_at: string | null;
  inventory_restored: boolean;
  customer: CustomerResource | null;
  items: OrderItemResource[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ReturnRequestResource {
  id: number;
  merchant_id: number;
  order_id: number;
  customer_id: number;
  refund_id: number | null;
  status: ReturnStatus;
  reason: string;
  notes: string | null;
  amount: string | number;
  items: Array<{ id: number; return_request_id: number; order_item_id: number; quantity: number; amount: string | number }>;
  evidence: Array<{ name: string; mime: string; url: string }>;
  created_at: string | null;
}

export type CustomerType = "regular" | "vip" | "wholesale";
export type CustomerStatus = "active" | "inactive" | "blocked";

/** A structured address. The legacy API stores a single free-text `address` string instead. */
export interface CustomerAddress {
  id?: number;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  is_default?: boolean;
}

/**
 * Mirrors sofiacart-backend `CustomerResource`. Only `id`, `merchant_id`, `name`, `email`, `phone`,
 * `address` and the timestamps exist today; every customer-management field below is optional and
 * arrives with the companion backend PR, so the UI hides what the API does not return.
 */
export interface CustomerResource {
  id: number;
  merchant_id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
  phone: string | null;
  address: string | CustomerAddress | null;
  addresses?: CustomerAddress[] | null;
  customer_type?: CustomerType | null;
  status?: CustomerStatus | null;
  birthday?: string | null;
  gender?: string | null;
  tin?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  orders_count?: number | null;
  total_spent?: string | number | null;
  last_order_at?: string | null;
  recent_orders?: CustomerRecentOrder[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomerRecentOrder {
  id: number;
  order_number: string;
  status: string | null;
  payment_status?: string | null;
  total_amount: string | number;
  ordered_at: string | null;
}

/** `GET /api/v1/customers/summary`. Counts are null when the endpoint does not provide them. */
export interface CustomerSummary {
  total_customers: number | null;
  new_customers: number | null;
  returning_customers: number | null;
  total_orders: number | null;
}
