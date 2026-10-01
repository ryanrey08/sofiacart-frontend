export type MerchantOrderStatus = "pending" | "processing" | "completed" | "cancelled";
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

export interface CustomerResource {
  id: number;
  merchant_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
}
