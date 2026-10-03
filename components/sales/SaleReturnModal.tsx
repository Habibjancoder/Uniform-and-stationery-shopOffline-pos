'use client';

import React, { useState } from 'react';
import { RotateCcw, X, Search, CheckCircle } from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/i18n';
import { Sale, SaleReturn, SaleReturnItem } from '@/types';

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
  const [sales] = useState<Sale[]>(db.getSales());
  const [invoiceQuery, setInvoiceQuery] = useState(initialSale?.invoiceNumber || '');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(initialSale || null);

  // Return Items State
  const [returnItems, setReturnItems] = useState<{
    [itemId: string]: {
      selected: boolean;
      returnQty: number;
      reason: string;
    };
  }>({});

  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit_balance'>('cash');
  const [error, setError] = useState<string | null>(null);

  const handleSearchInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = sales.find(
      (s) => s.invoiceNumber.toLowerCase() === invoiceQuery.trim().toLowerCase()
    );
    if (!found) {
      setError(`Invoice "${invoiceQuery}" not found in database.`);
      setSelectedSale(null);
      return;
    }
    setSelectedSale(found);

    // Initialize item map
    const initialMap: any = {};
    found.items.forEach((item) => {
      initialMap[item.id] = {
        selected: false,
        returnQty: 1,
        reason: 'Customer return / Size change',
      };
    });
    setReturnItems(initialMap);
  };

  const toggleItem = (itemId: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected },
    }));
  };

  const updateQty = (itemId: string, qty: number, maxQty: number) => {
    const validQty = Math.min(maxQty, Math.max(1, qty));
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], returnQty: validQty },
    }));
  };

  const updateReason = (itemId: string, reason: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason },
    }));
  };

  // Compute total refund
  const itemsToReturn: SaleReturnItem[] = [];
  let totalRefund = 0;

  if (selectedSale) {
    selectedSale.items.forEach((item) => {
      const state = returnItems[item.id];
      if (state?.selected && state.returnQty > 0) {
        const itemRefund = state.returnQty * item.unitPrice;
        totalRefund += itemRefund;
        itemsToReturn.push({
          saleItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          quantity: state.returnQty,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          refundAmount: itemRefund,
          reason: state.reason,
        });
      }
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || itemsToReturn.length === 0) {
      setError('Please select at least one item to return.');
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

      onSuccess(ret);
    } catch (err: any) {
      setError(err.message || 'Error executing sale return.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Customer Sale Return & Inventory Restock</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Invoice search */}
          <form onSubmit={handleSearchInvoice} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                placeholder="Enter Invoice Number (e.g. INV-1001)..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs"
            >
              Lookup Invoice
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Selected Invoice Details & Items */}
          {selectedSale ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer</span>
                  <span className="font-bold text-slate-800">{selectedSale.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Invoice Date</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(selectedSale.date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Original Total</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(selectedSale.grandTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  Select Items to Return from Invoice:
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2.5 w-10 text-center">Return</th>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5 text-center w-20">Sold Qty</th>
                        <th className="p-2.5 text-center w-24">Return Qty</th>
                        <th className="p-2.5 text-right w-24">Refund (₨)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSale.items.map((item) => {
                        const isChecked = returnItems[item.id]?.selected || false;
                        const returnQty = returnItems[item.id]?.returnQty || 1;

                        return (
                          <tr key={item.id} className={isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}>
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleItem(item.id)}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-900">{item.productName}</div>
                              {item.variantDetails && (
                                <div className="text-[10px] text-emerald-700">{item.variantDetails}</div>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-600">{item.quantity}</td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                disabled={!isChecked}
                                value={returnQty}
                                onChange={(e) => updateQty(item.id, Number(e.target.value), item.quantity)}
                                className="w-16 px-1.5 py-0.5 border rounded text-center font-bold disabled:opacity-40"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {isChecked ? formatCurrency(returnQty * item.unitPrice) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settlement Method */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total Refund Amount:</span>
                  <span className="text-xl font-extrabold text-red-600">{formatCurrency(totalRefund)}</span>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Refund Settlement Method:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRefundMethod('cash')}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                        refundMethod === 'cash'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Cash Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod('credit_balance')}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                        refundMethod === 'credit_balance'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Adjust Customer Balance (Credit)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Enter an invoice number above to view sold items and start return.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-xs"
          >
            Cancel
          </button>
          {selectedSale && itemsToReturn.length > 0 && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition"
            >
              Complete Sale Return & Restock
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
