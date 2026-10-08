'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  RotateCcw,
  X,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  FileText,
  Receipt,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/i18n';
import { Sale, SaleReturn, SaleReturnItem, ShopSettings } from '@/types';
import { InvoicePrintModal } from '../pos/InvoicePrintModal';

interface SaleReturnModalProps {
  initialSale?: Sale | null;
  onSuccess: (ret: SaleReturn) => void;
  onClose: () => void;
}

export const SaleReturnModal: React.FC<SaleReturnModalProps> = ({
  initialSale,
  onSuccess,
  onClose,
}) => {
  const settings: ShopSettings = db.getSettings();
  const [invoiceQuery, setInvoiceQuery] = useState(initialSale?.invoiceNumber || '');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(initialSale || null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  // Return Items State: mapped by sale item unique ID or index
  const [returnItems, setReturnItems] = useState<{
    [itemId: string]: {
      selected: boolean;
      returnQty: number;
      reason: string;
    };
  }>({});

  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit_balance'>('cash');
  const [error, setError] = useState<string | null>(null);

  // Completed Return State for Confirmation & Receipt Printing
  const [completedReturn, setCompletedReturn] = useState<{
    ret: SaleReturn;
    updatedSale: Sale;
  } | null>(null);

  // Sub-modal for printing updated invoice if user clicks
  const [printingUpdatedSale, setPrintingUpdatedSale] = useState<Sale | null>(null);
  const [isPrintingReturnReceipt, setIsPrintingReturnReceipt] = useState(false);

  // Load recent sales on mount
  useEffect(() => {
    const all = db.getSales();
    setRecentSales(all.slice(0, 10));
  }, []);

  // Initialize returnItems when initialSale or selectedSale changes
  const initSaleItems = (sale: Sale) => {
    setSelectedSale(sale);
    setInvoiceQuery(sale.invoiceNumber);
    const initialMap: any = {};
    sale.items.forEach((item, idx) => {
      const key = item.id || `item_${idx}`;
      initialMap[key] = {
        selected: false,
        returnQty: Math.min(1, item.quantity),
        reason: 'Customer return / Exchange',
      };
    });
    setReturnItems(initialMap);
  };

  useEffect(() => {
    if (initialSale) {
      const allSales = db.getSales();
      const freshSale =
        allSales.find(
          (s) =>
            s.id === initialSale.id ||
            s.invoiceNumber.trim().toLowerCase() === initialSale.invoiceNumber.trim().toLowerCase()
        ) || initialSale;
      initSaleItems(freshSale);
    }
  }, [initialSale]);

  // Flexible Invoice Search
  const performSearch = (query: string) => {
    setError(null);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setSelectedSale(null);
      return;
    }

    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    const allSales = db.getSales();

    const found = allSales.find((s) => {
      const sInv = s.invoiceNumber.toLowerCase();
      if (sInv === trimmed) return true;
      if (sInv.replace(/[^0-9]/g, '') === digitsOnly && digitsOnly.length > 0) return true;
      if (s.customerName && s.customerName.toLowerCase().includes(trimmed)) return true;
      if (s.customerPhone && s.customerPhone.includes(trimmed)) return true;
      return false;
    });

    if (!found) {
      setError(`No invoice found matching "${query}". Try invoice number, customer name, or phone.`);
      setSelectedSale(null);
      return;
    }

    if (found.items.length === 0 || found.status === 'returned_full') {
      setError(`Invoice "${found.invoiceNumber}" is already fully returned and refunded. No items left to return.`);
      initSaleItems(found);
      return;
    }

    initSaleItems(found);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(invoiceQuery);
  };

  const toggleItem = (key: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], selected: !prev[key]?.selected },
    }));
  };

  const selectAll = (select: boolean) => {
    if (!selectedSale) return;
    setReturnItems((prev) => {
      const updated = { ...prev };
      selectedSale.items.forEach((item, idx) => {
        const key = item.id || `item_${idx}`;
        if (updated[key]) {
          updated[key] = {
            ...updated[key],
            selected: select,
            returnQty: select ? item.quantity : updated[key].returnQty,
          };
        }
      });
      return updated;
    });
  };

  const updateQty = (key: string, qty: number, maxQty: number) => {
    const validQty = Math.min(maxQty, Math.max(1, qty));
    setReturnItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], returnQty: validQty, selected: true },
    }));
  };

  const updateReason = (key: string, reason: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], reason },
    }));
  };

  // Compute total refund
  const itemsToReturn: SaleReturnItem[] = [];
  let totalRefund = 0;

  if (selectedSale) {
    selectedSale.items.forEach((item, idx) => {
      const key = item.id || `item_${idx}`;
      const state = returnItems[key];
      if (state?.selected && state.returnQty > 0) {
        const unitPriceAfterDisc =
          item.quantity > 0 ? item.lineTotal / item.quantity : item.unitPrice;
        const itemRefund = Math.round(state.returnQty * unitPriceAfterDisc);
        totalRefund += itemRefund;
        itemsToReturn.push({
          saleItemId: item.id || key,
          productId: item.productId,
          variantId: item.variantId,
          uniformSetId: item.uniformSetId,
          variantDetails: item.variantDetails,
          productName: item.productName,
          quantity: state.returnQty,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          refundAmount: itemRefund,
          reason: state.reason || 'Customer Return',
        });
      }
    });
  }

  const allItemsSelected = useMemo(() => {
    if (!selectedSale || selectedSale.items.length === 0) return false;
    return selectedSale.items.every((item, idx) => {
      const key = item.id || `item_${idx}`;
      return returnItems[key]?.selected;
    });
  }, [selectedSale, returnItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || itemsToReturn.length === 0) {
      setError('Please select at least one item from the invoice to return.');
      return;
    }

    try {
      const currentUser = db.getCurrentUser();
      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

      const ret = db.processSaleReturn({
        returnNumber,
        saleId: selectedSale.id,
        invoiceNumber: selectedSale.invoiceNumber,
        date: new Date().toISOString(),
        customerId: selectedSale.customerId,
        customerName: selectedSale.customerName,
        items: itemsToReturn,
        totalRefundAmount: totalRefund,
        refundMethod,
        reason: itemsToReturn[0]?.reason || 'Customer Return',
        userId: currentUser.id,
        userName: currentUser.fullName,
      });

      // Retrieve the freshly updated sale from database
      const freshSale =
        db.getSales().find((s) => s.id === selectedSale.id || s.invoiceNumber === selectedSale.invoiceNumber) ||
        selectedSale;

      // Show completion screen with print options
      setCompletedReturn({
        ret,
        updatedSale: freshSale,
      });
    } catch (err: any) {
      setError(err.message || 'Error processing sale return.');
    }
  };

  const handleFinish = () => {
    if (completedReturn) {
      onSuccess(completedReturn.ret);
    } else {
      onClose();
    }
  };

  const printReturnSlip = () => {
    setIsPrintingReturnReceipt(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Dynamic Print CSS for Return Receipt */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body * {
            visibility: hidden;
          }
          #printable-return-receipt,
          #printable-return-receipt * {
            visibility: visible;
          }
          #printable-return-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            color: #000000 !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Customer Sale Return & Inventory Restock</h3>
              <p className="text-[11px] text-slate-300">
                Process items return, refund cash or credit, and automatically update invoice & stock
              </p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* SUCCESS SCREEN UPON COMPLETION */}
          {completedReturn ? (
            <div className="space-y-5 py-2">
              <div className="text-center p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
                <h4 className="text-lg font-black text-slate-900">
                  Return Successfully Processed & Bill Updated!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Invoice <strong className="text-slate-900 font-mono">#{completedReturn.ret.invoiceNumber}</strong> has
                  been updated. Inventory has been restocked and cash ledger adjusted.
                </p>

                <div className="mt-4 inline-flex items-center gap-6 px-6 py-3 bg-white border border-emerald-300 rounded-xl shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Return Memo #</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {completedReturn.ret.returnNumber}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Refund Amount</span>
                    <span className="font-black text-rose-600 text-base">
                      {formatCurrency(completedReturn.ret.totalRefundAmount)}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Updated Bill Net</span>
                    <span className="font-black text-emerald-800 text-base">
                      {formatCurrency(completedReturn.updatedSale.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={printReturnSlip}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Print Return Slip (Thermal 80mm)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintingUpdatedSale(completedReturn.updatedSale)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print Updated Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-300 transition"
                >
                  Done & Close [Esc]
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={invoiceQuery}
                    onChange={(e) => {
                      setInvoiceQuery(e.target.value);
                      if (!e.target.value.trim()) setSelectedSale(null);
                    }}
                    placeholder="Enter Invoice # (e.g. 1001 or INV-1001), Customer Name, or Phone..."
                    className="w-full pl-11 pr-4 py-2.5 sm:py-3 h-11 sm:h-12 border-2 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono text-sm sm:text-base font-semibold bg-white border-slate-300 text-slate-900 shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 sm:py-3 h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center shrink-0 cursor-pointer"
                >
                  Lookup Invoice
                </button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Selected Sale Details & Items Table */}
              {selectedSale ? (
                <div className="space-y-4">
                  {/* Invoice Metadata Banner */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Invoice #</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {selectedSale.invoiceNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {selectedSale.customerName}
                      </span>
                      {selectedSale.customerPhone && (
                        <span className="text-[10px] text-slate-500">{selectedSale.customerPhone}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Invoice Date</span>
                      <span className="text-slate-700 font-medium">
                        {new Date(selectedSale.date).toLocaleDateString()} (
                        {new Date(selectedSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Total</span>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(selectedSale.grandTotal)}
                      </span>
                      {selectedSale.status.includes('returned') && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold ml-1.5">
                          {selectedSale.status === 'returned_full' ? 'Fully Returned' : 'Partially Returned'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Previously Returned Items Notice if applicable */}
                  {selectedSale.returnedItems && selectedSale.returnedItems.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>Items Already Returned on this Invoice:</span>
                      </div>
                      <div className="space-y-0.5 pl-5">
                        {selectedSale.returnedItems.map((ri, rIdx) => (
                          <div key={rIdx}>
                            • {ri.productName} — <strong>x{ri.quantity} returned</strong> (-₨{' '}
                            {ri.refundAmount}) on{' '}
                            {ri.date ? new Date(ri.date).toLocaleDateString() : 'Previously'} (
                            {ri.reason || 'Customer return'})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items to Return Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-bold text-slate-800">
                        Select Items to Return from this Invoice:
                      </label>
                      <button
                        type="button"
                        onClick={() => selectAll(!allItemsSelected)}
                        className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
                      >
                        {allItemsSelected ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Deselect All</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Select All / Return Full Bill</span>
                          </>
                        )}
                      </button>
                    </div>

                    {selectedSale.items.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                        All items on this invoice have already been returned and refunded.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold text-slate-700">
                            <tr>
                              <th className="p-2.5 w-10 text-center">Return</th>
                              <th className="p-2.5">Item Description</th>
                              <th className="p-2.5 text-center w-20">Sold Qty</th>
                              <th className="p-2.5 text-center w-28">Return Qty</th>
                              <th className="p-2.5 text-right w-24">Refund Rate</th>
                              <th className="p-2.5 text-right w-24">Refund Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedSale.items.map((item, idx) => {
                              const key = item.id || `item_${idx}`;
                              const isChecked = returnItems[key]?.selected || false;
                              const returnQty = returnItems[key]?.returnQty || 1;
                              const unitRefund =
                                item.quantity > 0
                                  ? Math.round(item.lineTotal / item.quantity)
                                  : item.unitPrice;
                              const lineRefund = isChecked ? Math.round(returnQty * unitRefund) : 0;

                              return (
                                <tr
                                  key={key}
                                  onClick={() => toggleItem(key)}
                                  className={`cursor-pointer transition ${
                                    isChecked ? 'bg-rose-50/60 font-semibold' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleItem(key)}
                                      className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-2.5">
                                    <div className="font-bold text-slate-900">{item.productName}</div>
                                    {item.variantDetails && (
                                      <div className="text-[10px] text-emerald-800">{item.variantDetails}</div>
                                    )}
                                    {item.discount > 0 && (
                                      <div className="text-[10px] text-slate-400">
                                        Sold with line discount: -₨ {item.discount}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-bold text-slate-600">
                                    {item.quantity} {item.unit || ''}
                                  </td>
                                  <td
                                    className="p-2.5 text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                                      <button
                                        type="button"
                                        disabled={!isChecked || returnQty <= 1}
                                        onClick={() => updateQty(key, returnQty - 1, item.quantity)}
                                        className="p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        max={item.quantity}
                                        value={returnQty}
                                        onChange={(e) => updateQty(key, Number(e.target.value), item.quantity)}
                                        className="w-12 py-0.5 text-center font-bold border-x border-slate-200 text-xs focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        disabled={!isChecked || returnQty >= item.quantity}
                                        onClick={() => updateQty(key, returnQty + 1, item.quantity)}
                                        className="p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-right font-medium text-slate-700">
                                    ₨ {unitRefund}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-rose-700 font-mono">
                                    {isChecked ? formatCurrency(lineRefund) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Return Settlement & Reason */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Total Refund Payable to Customer:
                        </span>
                        <span className="text-2xl font-black text-rose-600">
                          {formatCurrency(totalRefund)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 text-xs">Refund Settlement:</span>
                        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
                          <button
                            type="button"
                            onClick={() => setRefundMethod('cash')}
                            className={`px-3 py-1 rounded-md font-bold text-xs transition ${
                              refundMethod === 'cash'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Cash Refund
                          </button>
                          <button
                            type="button"
                            onClick={() => setRefundMethod('credit_balance')}
                            className={`px-3 py-1 rounded-md font-bold text-xs transition ${
                              refundMethod === 'credit_balance'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Credit to Ledger
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Quick Invoices Picker when no invoice is selected yet */
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Recent Invoices (Click any invoice to return items):</span>
                  </div>

                  {recentSales.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      No invoices recorded in database yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                      {recentSales.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => initSaleItems(s)}
                          className="p-3 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-xl cursor-pointer transition flex items-center justify-between shadow-xs group"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                              <span>#{s.invoiceNumber}</span>
                              {s.status.includes('returned') && (
                                <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold">
                                  {s.status === 'returned_full' ? 'Returned' : 'Partial'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 font-semibold truncate max-w-44">
                              {s.customerName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(s.date).toLocaleDateString()} • {s.items.length} items
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <div className="font-extrabold text-slate-900">
                                {formatCurrency(s.grandTotal)}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">
                                {s.paymentMethod}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {selectedSale && !completedReturn && itemsToReturn.length > 0 && (
              <span>
                <strong>{itemsToReturn.length}</strong> items selected for return. Restock will happen
                instantly.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
            >
              {completedReturn ? 'Close' : 'Cancel'}
            </button>

            {selectedSale && !completedReturn && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={itemsToReturn.length === 0}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {itemsToReturn.length > 0
                    ? `Complete Return & Refund (₨ ${totalRefund})`
                    : 'Select Items to Return'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PRINTABLE CONTAINER FOR RETURN SLIP (Thermal 80mm) */}
      {completedReturn && (
        <div id="printable-return-receipt" className="hidden font-mono text-black text-[10px]">
          <div className="text-center pb-2 border-b border-black border-dashed">
            <div className="font-black text-sm">{settings.shopName}</div>
            <div>{settings.address}, {settings.city}</div>
            <div>Tel: {settings.phone}</div>
            <div className="font-bold uppercase tracking-wider mt-1 text-xs">
              CUSTOMER RETURN MEMO
            </div>
          </div>

          <div className="py-2 border-b border-black border-dashed space-y-0.5">
            <div className="flex justify-between">
              <span>Return #: <strong>{completedReturn.ret.returnNumber}</strong></span>
              <span>{new Date(completedReturn.ret.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Original Inv #: <strong>{completedReturn.ret.invoiceNumber}</strong></span>
              <span>
                {new Date(completedReturn.ret.date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div>Customer: <strong>{completedReturn.ret.customerName}</strong></div>
            <div>Cashier: {completedReturn.ret.userName}</div>
          </div>

          <table className="w-full my-2 text-[10px]">
            <thead>
              <tr className="border-b border-black border-dashed text-left">
                <th className="py-1">Returned Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-slate-300">
              {completedReturn.ret.items.map((ri, idx) => (
                <tr key={idx}>
                  <td className="py-1">
                    <div className="font-bold">{ri.productName}</div>
                    {ri.variantDetails && <div>{ri.variantDetails}</div>}
                    <div className="text-[9px] text-slate-700">Reason: {ri.reason}</div>
                  </td>
                  <td className="text-center py-1 font-bold">{ri.quantity}</td>
                  <td className="text-right py-1 font-bold">₨ {ri.refundAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black border-dashed pt-2 space-y-1">
            <div className="flex justify-between font-bold text-xs border-y border-black py-1">
              <span>TOTAL CASH REFUND:</span>
              <span>₨ {completedReturn.ret.totalRefundAmount}</span>
            </div>
            <div className="flex justify-between">
              <span>Settlement Method:</span>
              <span className="uppercase font-bold">{completedReturn.ret.refundMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated Bill Net Total:</span>
              <span>₨ {completedReturn.updatedSale.grandTotal}</span>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-black border-dashed text-[9px]">
            <div>Inventory Restocked Successfully</div>
            <div>Thank you for your visit!</div>
          </div>
        </div>
      )}

      {/* Sub-modal to print updated sale if requested */}
      {printingUpdatedSale && (
        <InvoicePrintModal
          sale={printingUpdatedSale}
          settings={settings}
          onClose={() => setPrintingUpdatedSale(null)}
        />
      )}
    </div>
  );
};
