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
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
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

export interface DashboardData {
  metrics: Metric[];
  salesChart: ChartPoint[];
  recentOrders: Order[];
  topProducts: Array<{ name: string; sales: string; revenue: string }>;
  lowStockItems: Array<{ name: string; stock: number; threshold: number }>;
}

export interface ReportData {
  cards: SummaryCard[];
  chart: ChartPoint[];
  table: Array<Record<string, string | number>>;
}

export interface MerchantRegistrationFormValues {
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
