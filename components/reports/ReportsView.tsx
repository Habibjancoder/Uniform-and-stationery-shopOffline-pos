'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Boxes,
  Shirt,
  ShoppingBag,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { db } from '@/lib/database';
import { exportReportToPDF, exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Category, Product, Sale, ShopSettings } from '@/types';

interface ReportsViewProps {
  settings: ShopSettings;
  lang: Language;
}

type ReportType =
  | 'sales_summary'
  | 'product_sales'
  | 'category_sales'
  | 'school_uniform'
  | 'school_bags'
  | 'profit_loss'
  | 'stock_valuation'
  | 'receivables_payables';

export const ReportsView: React.FC<ReportsViewProps> = ({ settings, lang }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales_summary');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [search, setSearch] = useState('');

  const sales = db.getSales();
  const purchases = db.getPurchases();
  const expenses = db.getExpenses();
  const products = db.getProducts();
  const customers = db.getCustomers();
  const suppliers = db.getSuppliers();
  const schools = db.getSchools();
  const saleReturns = db.getSaleReturns();

  // Filter by date
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return sales.filter((s) => {
      const d = new Date(s.date);
      const str = s.date.split('T')[0];
      if (dateFilter === 'today') return str === todayStr;
      if (dateFilter === 'week') return d >= startOfWeek;
      if (dateFilter === 'month') return d >= startOfMonth;
      if (dateFilter === 'year') return d >= startOfYear;
      return true;
    });
  }, [sales, dateFilter]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses.filter((e) => {
      if (dateFilter === 'month') return new Date(e.date) >= startOfMonth;
      return true;
    });
  }, [expenses, dateFilter]);

  // Calculations for Profit & Loss
  const grossSales = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
  const totalDiscounts = filteredSales.reduce((acc, s) => acc + s.discount, 0);
  const netSales = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalCOGS = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = filteredSales.reduce((acc, s) => acc + s.grossProfit, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Product Wise Sales Aggregation
  const productSales = useMemo(() => {
    const map: Record<
      string,
      { name: string; sku: string; category: string; qty: number; total: number; profit: number }
    > = {};

    for (const s of filteredSales) {
      for (const item of s.items) {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            sku: item.sku,
            category: item.categoryName,
            qty: 0,
            total: 0,
            profit: 0,
          };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].total += item.lineTotal;
        map[item.productId].profit += item.lineProfit;
      }
    }

    return Object.values(map)
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales, search]);

  // Uniform by School & Size Analysis
  const uniformAnalysis = useMemo(() => {
    const uniformProds = products.filter((p) => p.type === 'uniform');
    const rows: {
      schoolName: string;
      productName: string;
      size: string;
      color: string;
      gender: string;
      stock: number;
      valuation: number;
    }[] = [];

    for (const p of uniformProds) {
      if (p.hasVariants && p.variants) {
        for (const v of p.variants) {
          rows.push({
            schoolName: v.schoolName || p.schoolName || 'General Uniform',
            productName: p.name,
            size: v.size || '-',
            color: v.color || '-',
            gender: v.gender || 'unisex',
            stock: v.currentStock,
            valuation: v.currentStock * v.purchasePrice,
          });
        }
      } else {
        rows.push({
          schoolName: p.schoolName || 'General Uniform',
          productName: p.name,
          size: 'Standard',
          color: '-',
          gender: 'unisex',
          stock: p.currentStock,
          valuation: p.currentStock * p.purchasePrice,
        });
      }
    }

    return rows.filter(
      (r) =>
        !search ||
        r.schoolName.toLowerCase().includes(search.toLowerCase()) ||
        r.productName.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // Export handlers
  const handleExportExcel = () => {
    if (selectedReport === 'product_sales') {
      const rows = productSales.map((p) => ({
        'Product Name': p.name,
        Category: p.category,
        SKU: p.sku,
        'Qty Sold': p.qty,
        'Total Revenue (₨)': p.total,
        'Gross Profit (₨)': p.profit,
      }));
      exportToExcel(`Product_Sales_Report_${dateFilter}`, 'Product Sales', rows);
    } else if (selectedReport === 'school_uniform') {
      const rows = uniformAnalysis.map((u) => ({
        School: u.schoolName,
        Uniform: u.productName,
        Size: u.size,
        Color: u.color,
        Gender: u.gender,
        'In Stock': u.stock,
        'Stock Valuation (₨)': u.valuation,
      }));
      exportToExcel(`Uniform_Stock_Report`, 'Uniforms', rows);
    } else {
      const rows = filteredSales.map((s) => ({
        'Invoice #': s.invoiceNumber,
        Date: new Date(s.date).toLocaleDateString(),
        Customer: (s.customerName || 'Walk-in Customer').replace(/\(عام گاہک\)/g, '').replace(/عام گاہک/g, '').trim(),
        'Grand Total (₨)': s.grandTotal,
        'Profit (₨)': s.grossProfit,
        Paid: s.paidAmount,
        Balance: s.balanceAmount,
        Method: s.paymentMethod,
      }));
      exportToExcel(`Sales_Report_${dateFilter}`, 'Sales', rows);
    }
  };

  const handleExportPDF = () => {
    if (selectedReport === 'product_sales') {
      const headers = ['Product', 'Category', 'Qty Sold', 'Revenue', 'Profit'];
      const rows = productSales.map((p) => [
        p.name,
        p.category,
        p.qty,
        `Rs. ${p.total}`,
        `Rs. ${p.profit}`,
      ]);
      exportReportToPDF('Product-Wise Sales Report', headers, rows, 'Product_Sales_Report');
    } else {
      const headers = ['Date', 'Invoice #', 'Customer', 'Grand Total', 'Profit', 'Paid'];
      const rows = filteredSales.map((s) => [
        new Date(s.date).toLocaleDateString(),
        s.invoiceNumber,
        (s.customerName || 'Walk-in Customer').replace(/\(عام گاہک\)/g, '').replace(/عام گاہک/g, '').trim(),
        `Rs. ${s.grandTotal}`,
        `Rs. ${s.grossProfit}`,
        `Rs. ${s.paidAmount}`,
      ]);
      exportReportToPDF('Sales Analysis Report', headers, rows, 'Sales_Report');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Reports & Financial Accounting</span>
          </h2>
          <p className="text-xs text-slate-500">
            Exportable business intelligence, P&L statements, school uniform breakdowns, and stock valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>PDF Export</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Reports Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Report Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'sales_summary', label: 'Sales Summary', icon: TrendingUp },
            { id: 'product_sales', label: 'Product-Wise Sales', icon: BarChart3 },
            { id: 'school_uniform', label: 'Uniform & School Analysis', icon: Shirt },
            { id: 'profit_loss', label: 'Profit & Loss (P&L)', icon: DollarSign },
            { id: 'stock_valuation', label: 'Stock Valuation', icon: Boxes },
          ].map((rep) => {
            const Icon = rep.icon;
            const isSel = selectedReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep.id as ReportType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  isSel
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{rep.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Financial Year</option>
            <option value="all">All Historical Time</option>
          </select>
        </div>
      </div>

      {/* Report Content Body */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* REPORT 1: PROFIT & LOSS ACCRUAL STATEMENT */}
        {selectedReport === 'profit_loss' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6 max-w-3xl mx-auto">
            <div className="border-b pb-4 text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Profit & Loss Statement (Accrual Basis)</h3>
              <p className="text-xs text-slate-500">
                Period: {dateFilter.toUpperCase()} | Store: {settings.shopName}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b">
                <span className="font-bold text-slate-800">Gross Sales Revenue:</span>
                <span className="font-bold text-slate-900">{formatCurrency(grossSales)}</span>
              </div>
              {totalDiscounts > 0 && (
                <div className="flex justify-between py-2 border-b text-slate-600">
                  <span>Less: Discounts Allowed:</span>
                  <span className="text-red-600">-{formatCurrency(totalDiscounts)}</span>
                </div>
              )}
              <div className="flex justify-between py-2.5 bg-slate-50 px-3 rounded-lg font-bold text-sm">
                <span>Net Sales Revenue:</span>
                <span className="text-emerald-800">{formatCurrency(netSales)}</span>
              </div>

              <div className="flex justify-between py-2 border-b text-slate-700 pt-3">
                <span className="font-bold">Less: Cost of Goods Sold (COGS):</span>
                <span className="text-red-600 font-bold">-{formatCurrency(totalCOGS)}</span>
              </div>

              <div className="flex justify-between py-3 bg-emerald-50/70 border border-emerald-200 px-4 rounded-xl text-sm font-extrabold text-emerald-900">
                <span>GROSS PROFIT:</span>
                <span>{formatCurrency(grossProfit)}</span>
              </div>

              <div className="flex justify-between py-2 border-b text-slate-700 pt-3">
                <span className="font-bold">Less: Operating Expenses (Rent, Bills, Salaries):</span>
                <span className="text-red-600 font-bold">-{formatCurrency(totalExpenses)}</span>
              </div>

              <div
                className={`flex justify-between py-4 px-4 rounded-xl text-base font-black border ${
                  netProfit >= 0
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <span>NET OPERATING PROFIT / (LOSS):</span>
                <span>{formatCurrency(netProfit)}</span>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 2: PRODUCT WISE SALES */}
        {selectedReport === 'product_sales' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Product-Wise Sales & Margin Performance</h3>
              <div className="w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter product name..."
                  className="w-full px-3 py-1 border rounded-lg text-xs"
                />
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 font-mono">SKU</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-3 text-right">Gross Revenue</th>
                  <th className="py-3 px-3 text-right">Gross Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No sales recorded for this period.
                    </td>
                  </tr>
                ) : (
                  productSales.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 text-slate-600">{p.category}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{p.sku}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{p.qty}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(p.total)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatCurrency(p.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 3: SCHOOL UNIFORM INVENTORY & SIZE ANALYSIS */}
        {selectedReport === 'school_uniform' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">School Uniform Size & Color Stock Matrix</h3>
              <div className="w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter school or uniform item..."
                  className="w-full px-3 py-1 border rounded-lg text-xs"
                />
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-3">Uniform Item</th>
                  <th className="py-3 px-3 text-center">Size</th>
                  <th className="py-3 px-3 text-center">Color</th>
                  <th className="py-3 px-3 text-center">Gender</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uniformAnalysis.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-emerald-900">{u.schoolName}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{u.productName}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{u.size}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{u.color}</td>
                    <td className="py-3 px-3 text-center capitalize">{u.gender}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${
                          u.stock <= 0
                            ? 'bg-red-100 text-red-700'
                            : u.stock < 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.stock} units
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(u.valuation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 4: SALES SUMMARY INVOICES TABLE */}
        {selectedReport === 'sales_summary' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Detailed Invoiced Sales Register</h3>
              <span className="text-xs text-slate-500 font-semibold">
                Total Invoiced: {formatCurrency(netSales)}
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Discount</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-right">Profit</th>
                  <th className="py-3 px-3">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{s.customerName}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(s.subtotal)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {s.discount > 0 ? `-${formatCurrency(s.discount)}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                      {formatCurrency(s.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatCurrency(s.grossProfit)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {s.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 5: STOCK VALUATION */}
        {selectedReport === 'stock_valuation' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Full Inventory Stock Valuation by Product</h3>
              <div className="text-xs font-extrabold text-emerald-800">
                Total Valuation:{' '}
                {formatCurrency(
                  products.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0)
                )}
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Available Stock</th>
                  <th className="py-3 px-3 text-right">Cost Price (₨)</th>
                  <th className="py-3 px-3 text-right">Retail Price (₨)</th>
                  <th className="py-3 px-3 text-right">Total Cost Valuation</th>
                  <th className="py-3 px-3 text-right">Potential Retail Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const costVal = p.currentStock * p.purchasePrice;
                  const saleVal = p.currentStock * p.salePrice;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 text-slate-600">{p.categoryName}</td>
                      <td className="py-3 px-3 text-center font-bold">{p.currentStock} {p.unit}</td>
                      <td className="py-3 px-3 text-right">{formatCurrency(p.purchasePrice)}</td>
                      <td className="py-3 px-3 text-right font-bold">{formatCurrency(p.salePrice)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(costVal)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-800">{formatCurrency(saleVal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
