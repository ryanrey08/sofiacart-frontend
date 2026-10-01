import type { ProductStatus } from "./admin";

export type StatusTone =
  | "completed"
  | "paid"
  | "processing"
  | "pending"
  | "failed"
  | "cancelled"
  | "rejected"
  | "shipped"
  | "active"
  | "inactive"
  | "draft"
  | "low"
  | "in-stock";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "merchant";
  merchant?: { id: number; status?: string } | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface MerchantRegistrationResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    merchant?: { id: number; status?: string } | null;
  };
  merchant: {
    id: number;
    status: string;
    store_name?: string;
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  customer: string;
  items: number;
  total: number;
  status: Extract<StatusTone, "completed" | "processing" | "pending" | "cancelled" | "shipped">;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  status: Extract<StatusTone, "active" | "inactive">;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  sales: number;
  status: Extract<StatusTone, "active" | "draft" | "inactive">;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  productsCount: number;
  status: Extract<StatusTone, "active" | "inactive">;
}

export interface InventoryItem {
  id: number;
  product: string;
  sku: string;
  stock: number;
  threshold: number;
  status: Extract<StatusTone, "low" | "in-stock">;
  updatedAt: string;
}

export interface Payment {
  id: number;
  paymentId: string;
  customer: string;
  amount: number;
  method: string;
  status: Extract<StatusTone, "paid" | "pending" | "failed">;
  paidAt: string;
}

export interface Transaction {
  id: number;
  reference: string;
  type: string;
  amount: number;
  status: Extract<StatusTone, "completed" | "pending" | "failed">;
  date: string;
}

export interface Refund {
  id: number;
  refundId: string;
  orderNumber: string;
  customer: string;
  amount: number;
  reason: string;
  status: Extract<StatusTone, "processing" | "completed" | "rejected">;
  requestedAt: string;
}

export interface Metric {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
}

export interface SummaryCard {
  label: string;
  value: string;
  change: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface SalesReportRow {
  order: string;
  customer: string;
  total: string;
  status: Extract<StatusTone, "completed" | "processing" | "pending" | "cancelled" | "shipped">;
}

export interface CustomerReportRow {
  customer: string;
  orders: number;
  spent: string;
  status: Extract<StatusTone, "active" | "inactive">;
}

export interface ProductReportRow {
  product: string;
  sales: number;
  stock: number;
  status: Extract<StatusTone, "active" | "draft" | "inactive">;
}

export interface InventoryReportRow {
  product: string;
  stock: number;
  threshold: number;
  status: Extract<StatusTone, "low" | "in-stock">;
}

export interface DashboardData {
  metrics: Metric[];
  salesChart: ChartPoint[];
  recentOrders: Order[];
  topProducts: Array<{ name: string; sales: string; revenue: string }>;
  lowStockItems: Array<{ name: string; stock: number; threshold: number }>;
}

export interface ReportData<T extends object = Record<string, string | number>> {
  cards: SummaryCard[];
  chart: ChartPoint[];
  table: T[];
}

export interface MerchantRegistrationFormValues {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  phone: string;
  businessName: string;
  businessType: string;
  permitNumber: string;
  tin: string;
  businessCategory: string;
  businessPermit: File | null;
  businessAddress: string;
  city: string;
  province: string;
  zipCode: string;
  storeName: string;
  storeSlug: string;
  storeCategory: string;
  storeDescription: string;
  storeContactNumber: string;
  storeEmail: string;
  storeAddress: string;
  storeLogo: File | null;
  storeBanner: File | null;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  ownerFullName: string;
  ownerPosition: string;
  ownerEmail: string;
  ownerContactNumber: string;
  dateOfBirth: string;
  governmentIdType: string;
  governmentIdNumber: string;
  governmentIdExpiry: string;
  governmentIdFile: File | null;
}

// Merchant catalog DTOs mirror sofiacart-backend app/Http/Resources/{Product,Category,InventoryLog}Resource.php.
export type { Paginated, ProductStatus } from "./admin";

// Category management fields (parent, image, status, navigation, SEO, products_count) are optional so
// older backends that only return name/slug/description keep working.
export interface CategoryResource {
  id: number;
  merchant_id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id?: number | null;
  parent?: { id: number; name: string; slug?: string } | null;
  sort_order?: number | null;
  image_path?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  show_in_nav?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  products_count?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  total_products: number;
}

export type CategoryStatusFilter = "active" | "inactive";
export type CategorySortField = "name" | "products_count" | "created_at";
export type CategorySortDirection = "asc" | "desc";
export type CategoryBulkAction = "delete" | "activate" | "deactivate";

// `stock_status` is computed by Product::getStockStatusAttribute() and also accepted as a list filter.
export type ProductStockStatus = "out_of_stock" | "low_stock" | "active";

export interface ProductImageResource {
  id: number;
  path: string;
  is_main: boolean;
  sort_order: number;
}

export interface ProductVariantResource {
  id: number;
  sku: string;
  color: string | null;
  size: string | null;
  attributes: Record<string, unknown> | null;
  price: string | number;
  stock: number;
  sort_order: number;
}

export interface ProductResource {
  id: number;
  merchant_id: number;
  category_id: number | null;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  short_description: string | null;
  full_description: string | null;
  status: ProductStatus;
  price: string | number;
  regular_price: string | number | null;
  sale_price: string | number | null;
  cost_price: string | number | null;
  brand: string | null;
  condition: string | null;
  weight: string | number | null;
  tags: string[];
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: ProductStockStatus;
  dimensions: { length: string | number | null; width: string | number | null; height: string | number | null };
  images: string[] | null;
  // Present on index/show/store/update (eager loaded); absent on the inventory adjust response.
  image_items?: ProductImageResource[];
  variants?: ProductVariantResource[];
  category?: CategoryResource | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InventoryLogResource {
  id: number;
  merchant_id: number;
  product_id: number;
  user_id: number;
  reason: string;
  quantity_change: number;
  resulting_stock: number;
  notes: string | null;
  product?: ProductResource | null;
  created_at: string | null;
}

export interface InventoryAdjustResponse {
  message: string;
  product: ProductResource;
  inventory_log: InventoryLogResource;
}
