export type BusinessType = 'stationery' | 'uniform' | 'bags' | 'books' | 'general';

export type UserRole = 'admin' | 'manager' | 'cashier' | 'inventory_user' | 'account_user';

export interface UserPermission {
  viewSales: boolean;
  createSales: boolean;
  editSales: boolean;
  deleteSales: boolean;
  returnSales: boolean;
  viewPurchases: boolean;
  createPurchases: boolean;
  editPurchases: boolean;
  deletePurchases: boolean;
  viewProfit: boolean;
  viewExpenses: boolean;
  editProducts: boolean;
  changePrices: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  backupDatabase: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string; // SHA-256
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  shopLogo: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  invoiceFooter: string;
  currency: string;
  currencySymbol: string;
  businessTypes: BusinessType[];
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultInvoiceTemplate: 'a4' | 'thermal_80mm';
  showLogoOnInvoice: boolean;
  showCustomerOnInvoice: boolean;
  showDiscountOnInvoice: boolean;
  showProfitOnInvoice: boolean;
  taxEnabled: boolean;
  taxPercentage: number;
  backupLocation: string;
  preventNegativeStock: boolean;
  language: 'en' | 'ur';
  theme: 'light' | 'dark';
  setupCompleted: boolean;
  financialYear: string;
}

export interface Category {
  id: string;
  name: string;
  nameUrdu?: string;
  code: string;
  type: BusinessType;
  subcategories: string[];
}

export interface School {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  address: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  schoolId?: string;
  schoolName?: string;
  size?: string;      // e.g., '28', '30', 'M', 'L'
  color?: string;     // e.g., 'White', 'Navy Blue'
  gender?: 'boy' | 'girl' | 'unisex';
  model?: string;     // For school bags
  purchasePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  minSalePrice?: number;
  currentStock: number;
  minStock: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  nameUrdu?: string;
  sku: string;
  barcode: string;
  type: BusinessType;
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  supplierId?: string;
  supplierName?: string;
  schoolId?: string; // Optional linked school for uniforms
  schoolName?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice: number;
  minSalePrice: number;
  currentStock: number; // Aggregate if variants exist, or direct
  minStock: number;
  image?: string;
  isActive: boolean;
  hasVariants: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface UniformSetComponent {
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
}

export interface UniformSet {
  id: string;
  name: string;
  nameUrdu?: string;
  schoolId: string;
  schoolName: string;
  season: 'summer' | 'winter' | 'sports' | 'custom';
  description?: string;
  sku: string;
  barcode: string;
  setPrice: number;
  components: UniformSetComponent[];
  active: boolean;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'bank' | 'card' | 'jazzcash' | 'easypaisa' | 'other' | 'credit';

export type CustomerType = 'walk-in' | 'regular' | 'school' | 'teacher' | 'institution' | 'wholesale' | 'other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  type: CustomerType;
  schoolId?: string;
  openingBalance: number;
  currentBalance: number; // Positive = owes us, negative = we owe them
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number; // Positive = we owe them
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  variantId?: string;
  uniformSetId?: string;
  productName: string;
  sku: string;
  barcode: string;
  categoryName: string;
  schoolName?: string;
  variantDetails?: string; // e.g. "Size: 30, Color: White, Boy"
  quantity: number;
  unit: string;
  costPrice: number; // Purchase price at time of sale
  wholesalePrice?: number;
  minSalePrice?: number;
  unitPrice: number;
  discount: number;  // Line discount in PKR
  lineTotal: number; // (quantity * unitPrice) - discount
  lineProfit: number;// lineTotal - (quantity * costPrice)
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  date: string;
}

export interface SaleReturnItem {
  saleItemId: string;
  productId: string;
  variantId?: string;
  uniformSetId?: string;
  variantDetails?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  refundAmount: number;
  reason: string;
  date?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerType: CustomerType;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  totalCost: number;
  grossProfit: number;
  paidAmount: number;
  balanceAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  payments: SalePayment[];
  notes?: string;
  status: 'completed' | 'returned_partial' | 'returned_full' | 'cancelled';
  userId: string;
  userName: string;
  createdAt: string;
  returnedItems?: SaleReturnItem[];
}

export interface HeldBill {
  id: string;
  name: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  discount: number;
  notes?: string;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  items: SaleReturnItem[];
  totalRefundAmount: number;
  refundMethod: 'cash' | 'credit_balance';
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  variantId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  saleRate: number;
  discount: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseInvoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface PurchaseReturnItem {
  productId: string;
  variantId?: string;
  productName: string;
  quantity: number;
  purchaseRate: number;
  total: number;
  reason: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseId?: string;
  purchaseInvoiceNo?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseReturnItem[];
  totalAmount: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export type StockMovementType = 
  | 'opening' 
  | 'purchase' 
  | 'sale' 
  | 'sale_return' 
  | 'purchase_return' 
  | 'adjustment_add' 
  | 'adjustment_remove' 
  | 'damaged' 
  | 'lost'
  | 'set_assembly';

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  type: StockMovementType;
  referenceId?: string; // invoice # or purchase #
  previousQty: number;
  changeQty: number; // + or -
  newQty: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameUrdu?: string;
  isDefault: boolean;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'sale' | 'customer_payment' | 'expense' | 'supplier_payment' | 'cash_in' | 'cash_out' | 'opening' | 'closing';
  amount: number; // positive = inflow, negative = outflow
  description: string;
  referenceId?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface CashRegisterShift {
  id: string;
  shiftDate: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  customerPayments: number;
  supplierPayments: number;
  expenses: number;
  cashWithdrawals: number;
  cashDeposits: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  notes?: string;
  userId: string;
  userName: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'auth' | 'sale' | 'purchase' | 'product' | 'inventory' | 'customer' | 'supplier' | 'expense' | 'system';
  details: string;
  recordId?: string;
}

export interface BackupRecord {
  id: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  totalProducts: number;
  totalSales: number;
  totalCustomers: number;
}
