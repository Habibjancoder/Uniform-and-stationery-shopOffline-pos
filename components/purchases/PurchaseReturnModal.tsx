'use client';

import React, { useState } from 'react';
import { RotateCcw, X, Trash2 } from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/i18n';
import { Product, PurchaseReturn, PurchaseReturnItem, Supplier } from '@/types';

interface PurchaseReturnModalProps {
  suppliers: Supplier[];
  products: Product[];
  onSave: (ret: PurchaseReturn) => void;
  onClose: () => void;
}

export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({
  suppliers,
  products,
  onSave,
  onClose,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [returnNumber, setReturnNumber] = useState(`PR-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Defective goods / Fabric fault return');
  const [items, setItems] = useState<PurchaseReturnItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  const totalAmount = items.reduce((acc, i) => acc + i.total, 0);

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const newItem: PurchaseReturnItem = {
      productId: prod.id,
      productName: prod.name,
      quantity: 1,
      purchaseRate: prod.purchasePrice,
      total: prod.purchasePrice,
      reason: reason.trim(),
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, key: keyof PurchaseReturnItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[key] = val;
    const qty = Number(updated[index].quantity) || 0;
    const rate = Number(updated[index].purchaseRate) || 0;
    updated[index].total = qty * rate;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !supplierId) return;

    const supplierObj = suppliers.find((s) => s.id === supplierId);
    const currentUser = db.getCurrentUser();

    const ret = db.processPurchaseReturn({
      returnNumber: returnNumber.trim(),
      supplierId,
      supplierName: supplierObj?.name || 'Supplier',
      date: new Date(date).toISOString(),
      items,
      totalAmount,
      reason: reason.trim(),
      userId: currentUser.id,
      userName: currentUser.fullName,
    });

    onSave(ret);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Purchase Return (Return to Supplier)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white font-semibold text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Payable: ₨ {s.currentBalance})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Return Debit Note #</label>
              <input
                type="text"
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-md font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Return Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Add items */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800">Add Return Item:</div>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.currentStock})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold"
              >
                + Add Row
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5 text-center w-20">Return Qty</th>
                  <th className="p-2.5 text-right w-24">Rate (₨)</th>
                  <th className="p-2.5 text-right w-24">Total</th>
                  <th className="p-2.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No items added for supplier return.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-900">{item.productName}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-14 px-1 py-0.5 border rounded text-center font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {formatCurrency(item.purchaseRate)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-purple-900">Total Deducted from Supplier Payable:</span>
            <span className="font-extrabold text-base text-purple-800">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={items.length === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-md transition"
            >
              Submit Supplier Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
