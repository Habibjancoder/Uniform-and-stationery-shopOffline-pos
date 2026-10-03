'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Banknote,
  CreditCard,
  Receipt,
  Package,
  AlertTriangle,
  XCircle,
  Users,
  Truck,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  ShoppingBag,
  Clock,
  PieChart,
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { ShopSettings, User } from '@/types';

interface DashboardViewProps {
  settings: ShopSettings;
  currentUser: User;
  lang: Language;
  onNavigate: (tab: string) => void;
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all';

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  currentUser,
  lang,
  onNavigate,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const sales = db.getSales();
  const purchases = db.getPurchases();
  const expenses = db.getExpenses();
  const products = db.getProducts();
  const customers = db.getCustomers();
  const suppliers = db.getSuppliers();
  const cashTxs = db.getCashTransactions();
  const activeShift = db.getActiveCashShift();

  // Filter Sales, Purchases & Expenses by selected Date Range
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const matchDate = (isoStr: string) => {
      const d = new Date(isoStr);
      const str = isoStr.split('T')[0];

      if (dateFilter === 'today') return str === todayStr;
      if (dateFilter === 'yesterday') return str === yesterdayStr;
      if (dateFilter === 'week') return d >= startOfWeek;
      if (dateFilter === 'month') return d >= startOfMonth;
      if (dateFilter === 'last_month') return d >= startOfLastMonth && d <= endOfLastMonth;
      if (dateFilter === 'all') return true;

      if (customStart && customEnd) {
        return str >= customStart && str <= customEnd;
      }
      return true;
    };

    const s = sales.filter((item) => matchDate(item.date) && item.status !== 'cancelled');
    const p = purchases.filter((item) => matchDate(item.date));
    const e = expenses.filter((item) => matchDate(item.date));
    const c = cashTxs.filter((item) => matchDate(item.date));

    return { filteredSales: s, filteredPurchases: p, filteredExpenses: e, filteredCash: c };
  }, [sales, purchases, expenses, cashTxs, dateFilter, customStart, customEnd]);

  const { filteredSales, filteredPurchases, filteredExpenses, filteredCash } = filteredData;

  // Financial Metrics
  const totalSalesAmount = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const cashSalesAmount = filteredSales.reduce((acc, s) => (s.paymentMethod === 'cash' ? acc + s.paidAmount : acc), 0);
  const creditSalesAmount = filteredSales.reduce((acc, s) => acc + s.balanceAmount, 0);
  const totalExpensesAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalPurchasesAmount = filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);

  // Profit Calculation: Accrual Basis (Gross Profit = Net Sales - COGS)
  const totalGrossProfit = filteredSales.reduce((acc, s) => acc + s.grossProfit, 0);
  const netProfit = totalGrossProfit - totalExpensesAmount;

  // Customer & Supplier Payments in Period
  const customerPayments = filteredCash
    .filter((c) => c.type === 'customer_payment')
    .reduce((acc, c) => acc + c.amount, 0);
  const supplierPayments = filteredCash
    .filter((c) => c.type === 'supplier_payment')
    .reduce((acc, c) => acc + Math.abs(c.amount), 0);

  // Inventory Metrics
  let totalProductsCount = products.length;
  let totalStockQty = 0;
  let totalStockValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const prod of products) {
    if (prod.hasVariants && prod.variants) {
      for (const v of prod.variants) {
        totalStockQty += v.currentStock;
        totalStockValuation += v.currentStock * v.purchasePrice;
        if (v.currentStock <= 0) outOfStockCount++;
        else if (v.currentStock <= v.minStock) lowStockCount++;
      }
    } else {
      totalStockQty += prod.currentStock;
      totalStockValuation += prod.currentStock * prod.purchasePrice;
      if (prod.currentStock <= 0) outOfStockCount++;
      else if (prod.currentStock <= prod.minStock) lowStockCount++;
    }
  }

  // Account Balances
  const customerReceivables = customers.reduce((acc, c) => (c.currentBalance > 0 ? acc + c.currentBalance : acc), 0);
  const supplierPayables = suppliers.reduce((acc, s) => (s.currentBalance > 0 ? acc + s.currentBalance : acc), 0);
  const totalCashBalance = cashTxs.reduce((acc, c) => acc + c.amount, 0);

  // Sales by Category Chart data
  const salesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        const cat = item.categoryName || 'Other';
        map[cat] = (map[cat] || 0) + item.lineTotal;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredSales]);

  // Top Selling Products
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        const key = item.productName;
        if (!map[key]) {
          map[key] = { name: key, qty: 0, total: 0 };
        }
        map[key].qty += item.quantity;
        map[key].total += item.lineTotal;
      }
    }
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredSales]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 p-6 space-y-6">
      {/* Title & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {t('dash.title', lang)}
          </h2>
          <p className="text-xs text-slate-500">
            Real-time financial status, inventory valuation, receivables, and retail sales tracking.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-xs border border-slate-200 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as DateFilter)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                dateFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: PRIMARY FINANCIAL KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('dash.todaySales', lang)}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(totalSalesAmount)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Cash: <strong className="text-emerald-700">{formatCurrency(cashSalesAmount)}</strong></span>
            <span>Credit: <strong className="text-amber-700">{formatCurrency(creditSalesAmount)}</strong></span>
          </div>
        </div>

        {/* Gross & Net Profit */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('dash.netProfit', lang)}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Gross Profit: <strong>{formatCurrency(totalGrossProfit)}</strong></span>
            <span>Expenses: <strong className="text-red-600">-{formatCurrency(totalExpensesAmount)}</strong></span>
          </div>
        </div>

        {/* Purchases & Expenses */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Purchases & Outflow
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(totalPurchasesAmount)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Supplier Paid: <strong>{formatCurrency(supplierPayments)}</strong></span>
            <span>Customer Recv: <strong>{formatCurrency(customerPayments)}</strong></span>
          </div>
        </div>

        {/* Cash in Hand */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('dash.cashBalance', lang)}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {formatCurrency(totalCashBalance)}
          </div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Active Shift: {activeShift ? 'Open' : 'Closed'}</span>
            <button
              onClick={() => onNavigate('cash')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Cash Book →
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: INVENTORY & ACCOUNTS HEALTH */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('dash.stockValue', lang)}</div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(totalStockValuation)}</div>
            <div className="text-[11px] text-slate-400 font-medium">
              {totalStockQty} total units in stock
            </div>
          </div>
        </div>

        {/* Stock Alerts (Low & Out of stock) */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-amber-400 transition"
        >
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Stock Alerts</div>
            <div className="text-lg font-bold text-slate-900">
              <span className="text-amber-600">{lowStockCount} Low</span> /{' '}
              <span className="text-red-600">{outOfStockCount} Out</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">View inventory warnings →</div>
          </div>
        </div>

        {/* Customer Receivables (Owed to Store) */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition"
        >
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('dash.receivables', lang)}</div>
            <div className="text-lg font-bold text-blue-800">{formatCurrency(customerReceivables)}</div>
            <div className="text-[11px] text-slate-400">Total customer credit due</div>
          </div>
        </div>

        {/* Supplier Payables (Store owes suppliers) */}
        <div
          onClick={() => onNavigate('suppliers')}
          className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3 cursor-pointer hover:border-purple-400 transition"
        >
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{t('dash.payables', lang)}</div>
            <div className="text-lg font-bold text-purple-800">{formatCurrency(supplierPayables)}</div>
            <div className="text-[11px] text-slate-400">Total payable to suppliers</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SALES BY CATEGORY & TOP SELLING ITEMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">Sales by Category</h3>
            </div>
            <span className="text-xs text-slate-400">{filteredSales.length} Invoices</span>
          </div>

          <div className="space-y-3">
            {salesByCategory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No sales recorded for the selected date range.
              </div>
            ) : (
              salesByCategory.map(([catName, amount], index) => {
                const percent = totalSalesAmount > 0 ? Math.round((amount / totalSalesAmount) * 100) : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{catName}</span>
                      <span className="text-slate-900">
                        {formatCurrency(amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Top-Selling Items</h3>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Full Reports →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {topSellingProducts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No products sold in this period yet.
              </div>
            ) : (
              topSellingProducts.map((p, index) => (
                <div key={index} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      {index + 1}
                    </div>
                    <span className="font-bold text-slate-900">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700">{formatCurrency(p.total)}</span>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {p.qty} units sold
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h4 className="font-bold text-base">Quick Operational Actions</h4>
          <p className="text-xs text-slate-400">
            Perform daily shop tasks with maximum speed. Everything runs 100% offline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition"
          >
            + New Sale Bill (POS)
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-bold transition"
          >
            + New Purchase
          </button>
          <button
            onClick={() => onNavigate('products')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-bold transition"
          >
            + Add Product
          </button>
          <button
            onClick={() => onNavigate('uniforms')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-bold transition"
          >
            + Uniform Kit Maker
          </button>
        </div>
      </div>
    </div>
  );
};
