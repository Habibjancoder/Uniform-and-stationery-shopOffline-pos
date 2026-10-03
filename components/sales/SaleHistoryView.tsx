'use client';

import React, { useMemo, useState } from 'react';
import {
  FileText,
  Printer,
  RotateCcw,
  Search,
  Download,
  Calendar,
  RefreshCw,
  TrendingUp,
  Banknote,
  CreditCard,
  Package,
  CheckCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { db } from '@/lib/database';
import {
  exportToExcel,
  generateInvoicePDF,
  generateMonthlySalesReportPDF,
  safePdfText,
} from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Sale, ShopSettings } from '@/types';
import { InvoicePrintModal } from '../pos/InvoicePrintModal';
import { SaleReturnModal } from './SaleReturnModal';

interface SaleHistoryViewProps {
  settings: ShopSettings;
  lang: Language;
  onRefreshDatabase?: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH = CURRENT_DATE.getMonth();

export const SaleHistoryView: React.FC<SaleHistoryViewProps> = ({
  settings,
  lang,
  onRefreshDatabase,
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Calendar & Date Filtering
  const [filterMode, setFilterMode] = useState<'month_year' | 'quick' | 'custom'>('month_year');
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(CURRENT_MONTH); // 0-indexed or 'all'
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'this_month' | 'last_month' | 'this_year'>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Modals
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [viewInvoiceModal, setViewInvoiceModal] = useState<Sale | null>(null);

  const loadData = React.useCallback(() => {
    setSales(db.getSales());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract available years from recorded sales
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(CURRENT_YEAR);
    yearsSet.add(CURRENT_YEAR - 1);
    yearsSet.add(CURRENT_YEAR + 1);

    for (const s of sales) {
      if (s.date) {
        const y = new Date(s.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales]);

  // Compute Active Period Label for reports and headers
  const activePeriodLabel = useMemo(() => {
    if (filterMode === 'month_year') {
      if (selectedMonth === 'all') {
        return `Whole Year ${selectedYear}`;
      }
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    if (filterMode === 'quick') {
      switch (quickFilter) {
        case 'today':
          return 'Today';
        case 'yesterday':
          return 'Yesterday';
        case 'week':
          return 'This Week';
        case 'this_month':
          return 'This Month';
        case 'last_month':
          return 'Last Month';
        case 'this_year':
          return `Year ${CURRENT_YEAR}`;
        case 'all':
        default:
          return 'All Time';
      }
    }
    if (filterMode === 'custom') {
      return `Custom Range (${customStartDate || 'Start'} to ${customEndDate || 'End'})`;
    }
    return 'Sales Record';
  }, [filterMode, selectedYear, selectedMonth, quickFilter, customStartDate, customEndDate]);

  // Filter Sales according to calendar selection
  const dateFilteredSales = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return sales.filter((s) => {
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return true;

      if (filterMode === 'month_year') {
        const saleYear = d.getFullYear();
        if (saleYear !== selectedYear) return false;
        if (selectedMonth !== 'all') {
          const saleMonth = d.getMonth();
          if (saleMonth !== selectedMonth) return false;
        }
        return true;
      }

      if (filterMode === 'quick') {
        const saleStr = s.date.split('T')[0];

        if (quickFilter === 'today') {
          return saleStr === todayStr;
        }
        if (quickFilter === 'yesterday') {
          const yDate = new Date(today);
          yDate.setDate(today.getDate() - 1);
          return saleStr === yDate.toISOString().split('T')[0];
        }
        if (quickFilter === 'week') {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return d >= startOfWeek;
        }
        if (quickFilter === 'this_month') {
          return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
        }
        if (quickFilter === 'last_month') {
          const lastM = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const lastMY = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          return d.getFullYear() === lastMY && d.getMonth() === lastM;
        }
        if (quickFilter === 'this_year') {
          return d.getFullYear() === today.getFullYear();
        }
        return true; // 'all'
      }

      if (filterMode === 'custom') {
        const saleStr = s.date.split('T')[0];
        if (customStartDate && saleStr < customStartDate) return false;
        if (customEndDate && saleStr > customEndDate) return false;
        return true;
      }

      return true;
    });
  }, [sales, filterMode, selectedYear, selectedMonth, quickFilter, customStartDate, customEndDate]);

  // Combined Search and Payment Method Filter
  const filteredSales = useMemo(() => {
    return dateFilteredSales.filter((s) => {
      if (methodFilter !== 'all' && s.paymentMethod !== methodFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchInv = s.invoiceNumber.toLowerCase().includes(q);
        const matchCust = (s.customerName || '').toLowerCase().includes(q);
        const matchUser = (s.userName || '').toLowerCase().includes(q);
        const matchItem = s.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchInv && !matchCust && !matchUser && !matchItem) return false;
      }
      return true;
    });
  }, [dateFilteredSales, methodFilter, search]);

  // Period Summary Metrics
  const periodTotalRevenue = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const periodTotalPaid = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const periodTotalBalance = filteredSales.reduce((acc, s) => acc + s.balanceAmount, 0);
  const periodTotalProfit = filteredSales.reduce((acc, s) => acc + s.grossProfit, 0);
  const periodTotalUnits = filteredSales.reduce(
    (acc, s) => acc + s.items.reduce((ia, i) => ia + i.quantity, 0),
    0
  );

  // Month Wise Distribution counts for active year
  const monthWiseCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    const totals = Array(12).fill(0);
    for (const s of sales) {
      const d = new Date(s.date);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        counts[m] += 1;
        totals[m] += s.grandTotal;
      }
    }
    return { counts, totals };
  }, [sales, selectedYear]);

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredSales.map((s) => ({
      'Invoice #': s.invoiceNumber,
      Date: new Date(s.date).toLocaleString(),
      Customer: (s.customerName || 'Walk-in Customer').replace(/\(عام گاہک\)/g, '').replace(/عام گاہک/g, '').trim(),
      Items: s.items.length,
      Subtotal: s.subtotal,
      Discount: s.discount,
      'Grand Total': s.grandTotal,
      'Gross Profit': s.grossProfit,
      Paid: s.paidAmount,
      Balance: s.balanceAmount,
      Method: s.paymentMethod,
      Cashier: s.userName,
      Status: s.status,
    }));
    exportToExcel(`Sales_Report_${activePeriodLabel.replace(/[^a-zA-Z0-9]/g, '_')}`, 'Sales', rows);
  };

  // Export Period PDF
  const handleExportPDF = () => {
    generateMonthlySalesReportPDF(activePeriodLabel, filteredSales, settings);
  };

  // Print Period Report Sheet (Browser Print)
  const handlePrintPeriodSheet = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden select-none">
      {/* Dynamic Print CSS for Monthly Sheet */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 10mm;
            size: A4 landscape;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-sales-report,
          #printable-sales-report * {
            visibility: visible;
          }
          #printable-sales-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            display: block !important;
          }
          .print-hidden,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>Sales History & Month-wise Calendar</span>
          </h2>
          <p className="text-xs text-slate-500">
            Check sales, invoice records, and profits month-wise, year-wise, or by custom date with PDF export and print.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setReturningSale(null);
              setIsReturnModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
            <span>Process Return</span>
          </button>

          {/* Print Monthly Statement */}
          <button
            onClick={handlePrintPeriodSheet}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            title="Print Period Summary & Invoices"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print Report</span>
          </button>

          {/* Download Period PDF */}
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            title="Download Beautiful PDF Statement"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF Report</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* CALENDAR & PERIOD SELECTION BAR */}
      <div className="bg-slate-900 text-white px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs border-b border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Switcher */}
          <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700">
            <button
              onClick={() => setFilterMode('month_year')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                filterMode === 'month_year'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Month & Year Picker</span>
            </button>
            <button
              onClick={() => setFilterMode('quick')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                filterMode === 'quick'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Quick Presets</span>
            </button>
            <button
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                filterMode === 'custom'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Custom Dates</span>
            </button>
          </div>

          {/* Mode 1: Month & Year Selectors */}
          {filterMode === 'month_year' && (
            <div className="flex items-center gap-2">
              {/* Year Select */}
              <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[11px] font-semibold">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Select */}
              <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[11px] font-semibold">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) =>
                    setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    All Months (Whole Year)
                  </option>
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx} className="bg-slate-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Mode 2: Quick Presets */}
          {filterMode === 'quick' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all', label: 'All Records' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setQuickFilter(p.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    quickFilter === p.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Mode 3: Custom Date Range */}
          {filterMode === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded text-xs focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Selected Period Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Period:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
            {activePeriodLabel}
          </span>
        </div>
      </div>

      {/* Visual Month Navigation Bar (when Month & Year picker active) */}
      {filterMode === 'month_year' && (
        <div className="bg-slate-800 px-6 py-1.5 flex items-center justify-between overflow-x-auto gap-1 text-[11px]">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-2.5 py-1 rounded font-bold transition whitespace-nowrap ${
              selectedMonth === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            Whole {selectedYear}
          </button>
          {MONTH_NAMES.map((name, idx) => {
            const count = monthWiseCounts.counts[idx];
            const isSelected = selectedMonth === idx;
            return (
              <button
                key={name}
                onClick={() => setSelectedMonth(idx)}
                className={`px-2 py-1 rounded font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{name.substring(0, 3)}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] px-1 rounded font-bold ${
                      isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-900 text-emerald-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* KPI METRIC CARDS FOR SELECTED MONTH / YEAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Sales</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {formatCurrency(periodTotalRevenue)}
          </div>
          <div className="text-[10px] text-slate-500">{filteredSales.length} Invoices</div>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Cash Collected</div>
          <div className="text-base font-black text-emerald-700 mt-0.5">
            {formatCurrency(periodTotalPaid)}
          </div>
          <div className="text-[10px] text-slate-500">Paid Amount</div>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Remaining Due</div>
          <div className={`text-base font-black mt-0.5 ${periodTotalBalance > 0 ? 'text-red-600' : 'text-slate-700'}`}>
            {formatCurrency(periodTotalBalance)}
          </div>
          <div className="text-[10px] text-slate-500">Customer Credit</div>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Items Sold</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {periodTotalUnits}
          </div>
          <div className="text-[10px] text-slate-500">Units Dispatched</div>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Gross Profit</div>
          <div className="text-base font-black text-emerald-800 mt-0.5">
            {formatCurrency(periodTotalProfit)}
          </div>
          <div className="text-[10px] text-slate-500">
            {periodTotalRevenue > 0
              ? `${((periodTotalProfit / periodTotalRevenue) * 100).toFixed(1)}% margin`
              : '0%'}
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Average Bill</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {filteredSales.length > 0
              ? formatCurrency(Math.round(periodTotalRevenue / filteredSales.length))
              : '₨ 0'}
          </div>
          <div className="text-[10px] text-slate-500">Per Transaction</div>
        </div>
      </div>

      {/* FILTER SEARCH & METHOD BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer name, cashier, or items..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Payment:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-md font-bold text-slate-800 bg-white"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash Only</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="credit">Store Credit</option>
            </select>
          </div>

          <div className="text-slate-500">
            Records: <strong>{filteredSales.length}</strong>
          </div>
        </div>
      </div>

      {/* INVOICES TABLE AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Items / Details</th>
                <th className="py-3 px-4 text-right">Bill Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Method</th>
                <th className="py-3 px-4 text-center">Cashier</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">No sales found for {activePeriodLabel}.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try selecting another month or year from the calendar above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const cleanCustomer =
                    (sale.customerName || 'Walk-in Customer')
                      .replace(/\(عام گاہک\)/g, '')
                      .replace(/عام گاہک/g, '')
                      .trim() || 'Walk-in Customer';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div>{new Date(sale.date).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(sale.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-44 truncate">
                        {cleanCustomer}
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {sale.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate font-medium text-slate-800">
                          {sale.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {sale.items.length} line items
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(sale.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                        {formatCurrency(sale.paidAmount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {sale.balanceAmount > 0 ? (
                          <span className="font-bold text-red-600">
                            {formatCurrency(sale.balanceAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">₨ 0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {sale.userName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Invoice */}
                          <button
                            onClick={() => setPrintingSale(sale)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded transition"
                            title="Print Invoice / Cash Memo (80mm / A4)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Direct PDF Download */}
                          <button
                            onClick={() => generateInvoicePDF(sale, settings)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Return Button */}
                          <button
                            onClick={() => {
                              setReturningSale(sale);
                              setIsReturnModalOpen(true);
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded transition"
                            title="Process Return for this Invoice"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HIDDEN PRINTABLE CONTAINER FOR PERIOD REPORT */}
      <div id="printable-sales-report" className="hidden p-8 text-black font-sans">
        <div className="border-b pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black">{settings.shopName}</h1>
            <p className="text-xs text-slate-600">
              {settings.address}, {settings.city} | Phone: {settings.phone}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-emerald-800">SALES STATEMENT</h2>
            <div className="text-xs font-semibold">{activePeriodLabel}</div>
            <div className="text-[10px] text-slate-500">Generated: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-4 gap-4 p-3 bg-slate-100 border border-slate-300 rounded mb-4 text-xs">
          <div>
            <div className="text-slate-500 font-bold uppercase text-[9px]">Total Revenue</div>
            <div className="text-sm font-black">{formatCurrency(periodTotalRevenue)}</div>
          </div>
          <div>
            <div className="text-slate-500 font-bold uppercase text-[9px]">Cash Paid</div>
            <div className="text-sm font-black text-emerald-800">{formatCurrency(periodTotalPaid)}</div>
          </div>
          <div>
            <div className="text-slate-500 font-bold uppercase text-[9px]">Remaining Balance</div>
            <div className="text-sm font-black text-red-700">{formatCurrency(periodTotalBalance)}</div>
          </div>
          <div>
            <div className="text-slate-500 font-bold uppercase text-[9px]">Invoices / Units</div>
            <div className="text-sm font-black">{filteredSales.length} bills / {periodTotalUnits} units</div>
          </div>
        </div>

        {/* Invoices List */}
        <table className="w-full text-xs border border-slate-300 mb-6">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-300 font-bold text-left">
              <th className="p-2">Inv #</th>
              <th className="p-2">Date</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Items</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Paid</th>
              <th className="p-2 text-right">Balance</th>
              <th className="p-2 text-center">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSales.map((s) => (
              <tr key={s.id}>
                <td className="p-2 font-mono font-bold">{s.invoiceNumber}</td>
                <td className="p-2">{new Date(s.date).toLocaleDateString()}</td>
                <td className="p-2">{(s.customerName || 'Walk-in Customer').replace(/\(عام گاہک\)/g, '').trim()}</td>
                <td className="p-2">{s.items.length} items</td>
                <td className="p-2 text-right font-bold">{formatCurrency(s.grandTotal)}</td>
                <td className="p-2 text-right">{formatCurrency(s.paidAmount)}</td>
                <td className="p-2 text-right">{formatCurrency(s.balanceAmount)}</td>
                <td className="p-2 text-center uppercase">{s.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center text-xs pt-8 border-t border-slate-300">
          <div>Report generated by KitabGhar Offline POS ERP</div>
          <div className="w-48 border-t border-black text-center pt-1 font-bold">Authorized Signature</div>
        </div>
      </div>

      {/* INVOICE PRINT MODAL */}
      {printingSale && (
        <InvoicePrintModal
          sale={printingSale}
          settings={settings}
          onClose={() => setPrintingSale(null)}
        />
      )}

      {/* SALES RETURN MODAL */}
      {isReturnModalOpen && (
        <SaleReturnModal
          initialSale={returningSale || null}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            setReturningSale(null);
            loadData();
            if (onRefreshDatabase) onRefreshDatabase();
          }}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturningSale(null);
          }}
        />
      )}
    </div>
  );
};
