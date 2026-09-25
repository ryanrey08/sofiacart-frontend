import type {
  Category,
  Customer,
  CustomerReportRow,
  DashboardData,
  InventoryItem,
  InventoryReportRow,
  Order,
  Payment,
  Product,
  ProductReportRow,
  Refund,
  ReportData,
  SalesReportRow,
  Transaction,
} from "@/types";

export const mockOrders: Order[] = [
  { id: 1, orderNumber: "ORD-1001", customer: "Maria Santos", items: 3, total: 4280, status: "completed", createdAt: "2026-09-20" },
  { id: 2, orderNumber: "ORD-1002", customer: "Paolo Cruz", items: 1, total: 1299, status: "shipped", createdAt: "2026-09-21" },
  { id: 3, orderNumber: "ORD-1003", customer: "Angela Reyes", items: 2, total: 2199, status: "processing", createdAt: "2026-09-22" },
  { id: 4, orderNumber: "ORD-1004", customer: "Jules Tan", items: 5, total: 6850, status: "pending", createdAt: "2026-09-23" },
  { id: 5, orderNumber: "ORD-1005", customer: "Mika Navarro", items: 1, total: 899, status: "cancelled", createdAt: "2026-09-24" },
];

export const mockCustomers: Customer[] = [
  { id: 1, name: "Maria Santos", email: "maria@example.com", phone: "+63 917 111 2233", totalOrders: 12, totalSpent: 18250, status: "active" },
  { id: 2, name: "Paolo Cruz", email: "paolo@example.com", phone: "+63 918 222 3344", totalOrders: 4, totalSpent: 6490, status: "active" },
  { id: 3, name: "Angela Reyes", email: "angela@example.com", phone: "+63 919 333 4455", totalOrders: 2, totalSpent: 2199, status: "inactive" },
  { id: 4, name: "Jules Tan", email: "jules@example.com", phone: "+63 920 444 5566", totalOrders: 8, totalSpent: 13110, status: "active" },
];

export const mockProducts: Product[] = [
  { id: 1, name: "Sofia Daily Serum", sku: "SFS-100", category: "Beauty", price: 899, stock: 74, sales: 320, status: "active" },
  { id: 2, name: "Merchant Desk Lamp", sku: "SDL-220", category: "Home", price: 1299, stock: 15, sales: 184, status: "active" },
  { id: 3, name: "Canvas Carry Tote", sku: "CCT-310", category: "Fashion", price: 649, stock: 0, sales: 260, status: "inactive" },
  { id: 4, name: "Starter Pack Bundle", sku: "SPB-410", category: "Bundles", price: 2499, stock: 11, sales: 95, status: "draft" },
];

export const mockCategories: Category[] = [
  { id: 1, name: "Beauty", slug: "beauty", productsCount: 18, status: "active" },
  { id: 2, name: "Home", slug: "home", productsCount: 9, status: "active" },
  { id: 3, name: "Fashion", slug: "fashion", productsCount: 14, status: "active" },
  { id: 4, name: "Bundles", slug: "bundles", productsCount: 6, status: "inactive" },
];

export const mockInventory: InventoryItem[] = [
  { id: 1, product: "Merchant Desk Lamp", sku: "SDL-220", stock: 15, threshold: 20, status: "low", updatedAt: "2026-09-24" },
  { id: 2, product: "Starter Pack Bundle", sku: "SPB-410", stock: 11, threshold: 15, status: "low", updatedAt: "2026-09-23" },
  { id: 3, product: "Sofia Daily Serum", sku: "SFS-100", stock: 74, threshold: 20, status: "in-stock", updatedAt: "2026-09-22" },
  { id: 4, product: "Canvas Carry Tote", sku: "CCT-310", stock: 0, threshold: 10, status: "low", updatedAt: "2026-09-21" },
];

export const mockPayments: Payment[] = [
  { id: 1, paymentId: "PAY-9001", customer: "Maria Santos", amount: 4280, method: "GCash", status: "paid", paidAt: "2026-09-20" },
  { id: 2, paymentId: "PAY-9002", customer: "Paolo Cruz", amount: 1299, method: "Card", status: "paid", paidAt: "2026-09-21" },
  { id: 3, paymentId: "PAY-9003", customer: "Angela Reyes", amount: 2199, method: "Bank Transfer", status: "pending", paidAt: "2026-09-22" },
  { id: 4, paymentId: "PAY-9004", customer: "Jules Tan", amount: 6850, method: "Card", status: "failed", paidAt: "2026-09-23" },
];

export const mockTransactions: Transaction[] = [
  { id: 1, reference: "TXN-12001", type: "Payout", amount: 15400, status: "completed", date: "2026-09-20" },
  { id: 2, reference: "TXN-12002", type: "Chargeback", amount: 6850, status: "pending", date: "2026-09-21" },
  { id: 3, reference: "TXN-12003", type: "Settlement", amount: 8100, status: "completed", date: "2026-09-22" },
  { id: 4, reference: "TXN-12004", type: "Adjustment", amount: 1200, status: "failed", date: "2026-09-23" },
];

export const mockRefunds: Refund[] = [
  { id: 1, refundId: "RFD-1101", orderNumber: "ORD-1005", customer: "Mika Navarro", amount: 899, reason: "Order cancellation", status: "completed", requestedAt: "2026-09-24" },
  { id: 2, refundId: "RFD-1102", orderNumber: "ORD-1004", customer: "Jules Tan", amount: 6850, reason: "Payment issue", status: "processing", requestedAt: "2026-09-23" },
  { id: 3, refundId: "RFD-1103", orderNumber: "ORD-1001", customer: "Maria Santos", amount: 450, reason: "Item mismatch", status: "rejected", requestedAt: "2026-09-22" },
];

export const mockDashboard: DashboardData = {
  metrics: [
    { label: "Total Sales", value: "₱128,400", trend: "+14.8% vs last month", trendDirection: "up" },
    { label: "Total Orders", value: "1,284", trend: "+8.2% vs last month", trendDirection: "up" },
    { label: "Total Customers", value: "864", trend: "+11.4% vs last month", trendDirection: "up" },
    { label: "Total Products", value: "128", trend: "-2 restock alerts", trendDirection: "down" },
  ],
  salesChart: [
    { label: "Mon", value: 12500 },
    { label: "Tue", value: 16800 },
    { label: "Wed", value: 14900 },
    { label: "Thu", value: 20100 },
    { label: "Fri", value: 23600 },
    { label: "Sat", value: 19850 },
    { label: "Sun", value: 20650 },
  ],
  recentOrders: mockOrders,
  topProducts: [
    { name: "Sofia Daily Serum", sales: "320 sold", revenue: "₱287,680" },
    { name: "Merchant Desk Lamp", sales: "184 sold", revenue: "₱239,016" },
    { name: "Canvas Carry Tote", sales: "260 sold", revenue: "₱168,740" },
  ],
  lowStockItems: [
    { name: "Merchant Desk Lamp", stock: 15, threshold: 20 },
    { name: "Starter Pack Bundle", stock: 11, threshold: 15 },
    { name: "Canvas Carry Tote", stock: 0, threshold: 10 },
  ],
};

export const mockReports: {
  sales: ReportData<SalesReportRow>;
  customers: ReportData<CustomerReportRow>;
  products: ReportData<ProductReportRow>;
  inventory: ReportData<InventoryReportRow>;
} = {
  sales: {
    cards: [
      { label: "Gross Sales", value: "₱128,400", change: "+14.8%" },
      { label: "Average Order", value: "₱2,480", change: "+4.1%" },
      { label: "Refund Rate", value: "1.8%", change: "-0.3%" },
    ],
    chart: mockDashboard.salesChart,
    table: mockOrders.map((order) => ({
      order: order.orderNumber,
      customer: order.customer,
      total: `₱${order.total}`,
      status: order.status,
    })),
  },
  customers: {
    cards: [
      { label: "New Customers", value: "94", change: "+12.5%" },
      { label: "Repeat Rate", value: "38%", change: "+2.1%" },
      { label: "Average LTV", value: "₱8,250", change: "+7.3%" },
    ],
    chart: [
      { label: "Week 1", value: 12 },
      { label: "Week 2", value: 18 },
      { label: "Week 3", value: 26 },
      { label: "Week 4", value: 38 },
    ],
    table: mockCustomers.map((customer) => ({
      customer: customer.name,
      orders: customer.totalOrders,
      spent: `₱${customer.totalSpent}`,
      status: customer.status,
    })),
  },
  products: {
    cards: [
      { label: "Top SKU", value: "SFS-100", change: "+9.4%" },
      { label: "Sell-through", value: "72%", change: "+5.2%" },
      { label: "Active Listings", value: "96", change: "+3" },
    ],
    chart: [
      { label: "Beauty", value: 42 },
      { label: "Home", value: 31 },
      { label: "Fashion", value: 29 },
      { label: "Bundles", value: 18 },
    ],
    table: mockProducts.map((product) => ({
      product: product.name,
      sales: product.sales,
      stock: product.stock,
      status: product.status,
    })),
  },
  inventory: {
    cards: [
      { label: "Low Stock SKUs", value: "8", change: "-2 this week" },
      { label: "Out of Stock", value: "3", change: "same" },
      { label: "Healthy Stock", value: "117", change: "+6" },
    ],
    chart: [
      { label: "Healthy", value: 117 },
      { label: "Low", value: 8 },
      { label: "Out", value: 3 },
    ],
    table: mockInventory.map((item) => ({
      product: item.product,
      stock: item.stock,
      threshold: item.threshold,
      status: item.status,
    })),
  },
};
