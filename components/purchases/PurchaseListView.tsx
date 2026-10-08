'use client';

import React, { useMemo, useState } from 'react';
import { Truck, Plus, RotateCcw, Search, Download, Calendar, RefreshCw } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Product, Purchase, PurchaseReturn, Supplier } from '@/types';
import { PurchaseModal } from './PurchaseModal';
import { PurchaseReturnModal } from './PurchaseReturnModal';

interface PurchaseListViewProps {
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const PurchaseListView: React.FC<PurchaseListViewProps> = ({ lang, onRefreshDatabase }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<Purchase | null>(null);

  const loadData = () => {
    setPurchases(db.getPurchases());
    setSuppliers(db.getSuppliers());
    setProducts(db.getProducts());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (supplierFilter !== 'all' && p.supplierId !== supplierFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesInvoice = p.purchaseInvoiceNo.toLowerCase().includes(q);
        const matchesSupplier = p.supplierName.toLowerCase().includes(q);
        const matchesUser = p.userName.toLowerCase().includes(q);
        if (!matchesInvoice && !matchesSupplier && !matchesUser) return false;
      }
      return true;
    });
  }, [purchases, supplierFilter, search]);

  const handleExportExcel = () => {
    const rows = filteredPurchases.map((p) => ({
      'Invoice #': p.purchaseInvoiceNo,
      Supplier: p.supplierName,
      Date: new Date(p.date).toLocaleDateString(),
      Subtotal: p.subtotal,
      Discount: p.discount,
      'Grand Total': p.grandTotal,
      Paid: p.paidAmount,
      Remaining: p.remainingAmount,
      'Payment Method': p.paymentMethod,
      'Received By': p.userName,
    }));
    exportToExcel(`Purchases_Ledger_${new Date().toISOString().split('T')[0]}`, 'Purchases', rows);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>Stock Purchases & Supplier Receiving</span>
          </h2>
          <p className="text-xs text-slate-500">
            Record incoming stock, restock inventory, track payables, and return damaged goods.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReturnModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-purple-600" />
            <span>Supplier Return</span>
          </button>

          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number, supplier name, user..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 max-w-48 truncate"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 border rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3 text-center">Items Count</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-right">Payable Balance</th>
                <th className="py-3 px-3">Terms</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase invoices found. Click "+ New Purchase" to record your stock.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.purchaseInvoiceNo}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {p.supplierName}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {p.items.length} items
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(p.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      {formatCurrency(p.paidAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-purple-700">
                      {p.remainingAmount > 0 ? formatCurrency(p.remainingAmount) : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPurchaseDetails(p)}
                        className="text-emerald-700 hover:underline font-bold text-xs"
                      >
                        View Items
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW PURCHASE DETAILS MODAL */}
      {selectedPurchaseDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Purchase #{selectedPurchaseDetails.purchaseInvoiceNo}</h3>
                <p className="text-[11px] text-slate-400">Supplier: {selectedPurchaseDetails.supplierName}</p>
              </div>
              <button
                onClick={() => setSelectedPurchaseDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Cost Rate</th>
                    <th className="p-2.5 text-right">Sale Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchaseDetails.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold">{item.productName}</td>
                      <td className="p-2.5 text-center font-bold">{item.quantity} {item.unit}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.purchaseRate)}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-800">{formatCurrency(item.saleRate)}</td>
                      <td className="p-2.5 text-right font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-slate-50 rounded-xl space-y-1 text-right">
                <div>Subtotal: <strong>{formatCurrency(selectedPurchaseDetails.subtotal)}</strong></div>
                {selectedPurchaseDetails.discount > 0 && (
                  <div>Discount: <strong>-{formatCurrency(selectedPurchaseDetails.discount)}</strong></div>
                )}
                <div className="text-sm font-bold text-slate-900 border-t pt-1">
                  Grand Total: {formatCurrency(selectedPurchaseDetails.grandTotal)}
                </div>
                <div>Amount Paid: <strong>{formatCurrency(selectedPurchaseDetails.paidAmount)}</strong></div>
                {selectedPurchaseDetails.remainingAmount > 0 && (
                  <div className="text-purple-700 font-bold">
                    Payable Due: {formatCurrency(selectedPurchaseDetails.remainingAmount)}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t flex justify-end">
              <button
                onClick={() => setSelectedPurchaseDetails(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PURCHASE MODAL */}
      {isPurchaseModalOpen && (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          onSave={() => {
            setIsPurchaseModalOpen(false);
            loadData();
            onRefreshDatabase?.();
          }}
          onClose={() => setIsPurchaseModalOpen(false)}
        />
      )}

      {/* PURCHASE RETURN MODAL */}
      {isReturnModalOpen && (
        <PurchaseReturnModal
          suppliers={suppliers}
          products={products}
          onSave={() => {
            setIsReturnModalOpen(false);
            loadData();
            onRefreshDatabase?.();
          }}
          onClose={() => setIsReturnModalOpen(false)}
        />
      )}
    </div>
  );
};
