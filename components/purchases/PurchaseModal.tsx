'use client';

import React, { useState } from 'react';
import { Truck, Plus, Trash2, X, Search, CheckCircle } from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/i18n';
import { PaymentMethod, Product, Purchase, PurchaseItem, Supplier } from '@/types';

interface PurchaseModalProps {
  suppliers: Supplier[];
  products: Product[];
  onSave: (purchase: Purchase) => void;
  onClose: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  suppliers,
  products,
  onSave,
  onClose,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  // Item Subtotal calculation
  const subtotal = items.reduce((acc, i) => acc + i.total, 0);
  const grandTotal = Math.max(0, subtotal - orderDiscount);
  const remainingAmount = Math.max(0, grandTotal - paidAmount);

  const handleAddItem = (prod: Product, variantId?: string) => {
    let sku = prod.sku;
    let name = prod.name;
    let cost = prod.purchasePrice;
    let sale = prod.salePrice;

    if (variantId && prod.variants) {
      const v = prod.variants.find((va) => va.id === variantId);
      if (v) {
        sku = v.sku;
        name = `${prod.name} (Size: ${v.size || '-'}, Color: ${v.color || '-'})`;
        cost = v.purchasePrice;
        sale = v.salePrice;
      }
    }

    const newItem: PurchaseItem = {
      productId: prod.id,
      variantId,
      productName: name,
      sku,
      quantity: 10,
      unit: prod.unit,
      purchaseRate: cost,
      saleRate: sale,
      discount: 0,
      total: 10 * cost,
    };

    setItems([...items, newItem]);
    setItemSearch('');
  };

  const updateItem = (index: number, key: keyof PurchaseItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[key] = val;
    const qty = Number(updated[index].quantity) || 0;
    const rate = Number(updated[index].purchaseRate) || 0;
    const disc = Number(updated[index].discount) || 0;
    updated[index].total = qty * rate - disc;
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

    const purchase = db.processPurchase({
      purchaseInvoiceNo: purchaseInvoiceNo.trim(),
      supplierId,
      supplierName: supplierObj?.name || 'Supplier',
      date: new Date(date).toISOString(),
      items,
      subtotal,
      discount: orderDiscount,
      grandTotal,
      paidAmount: Number(paidAmount) || 0,
      remainingAmount,
      paymentMethod,
      notes: notes.trim(),
      userId: currentUser.id,
      userName: currentUser.fullName,
    });

    onSave(purchase);
  };

  // Filter available items for search
  const availableItems = products.filter(
    (p) =>
      p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">New Stock Purchase Invoice</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Supplier & Header details */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white font-semibold text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company}) - Balance: ₨ {s.currentBalance}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier Bill / Invoice #</label>
              <input
                type="text"
                required
                value={purchaseInvoiceNo}
                onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 border rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Add Product Line */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Purchased Items & Inventory Receiving:</span>
              <div className="relative w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search products to add to purchase..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl bg-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />

                {itemSearch.trim() && (
                  <div className="absolute top-full mt-1.5 left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {availableItems.map((p) => {
                      if (p.hasVariants && p.variants) {
                        return p.variants.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleAddItem(p, v.id)}
                            className="p-2 hover:bg-emerald-50 cursor-pointer flex justify-between border-b"
                          >
                            <span>
                              {p.name} - <strong>Size {v.size || '-'}</strong> ({v.color || '-'})
                            </span>
                            <span className="text-emerald-700 font-bold">+ Add</span>
                          </div>
                        ));
                      }
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleAddItem(p)}
                          className="p-2 hover:bg-emerald-50 cursor-pointer flex justify-between border-b"
                        >
                          <span>{p.name}</span>
                          <span className="text-emerald-700 font-bold">+ Add</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-center w-24">Qty</th>
                    <th className="p-3 text-right w-28">Buy Cost (₨)</th>
                    <th className="p-3 text-right w-28">New Sale (₨)</th>
                    <th className="p-3 text-right w-28">Line Total</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No items added yet. Search items in the search box above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{item.productName}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{item.sku}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 border rounded text-center font-bold"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.purchaseRate}
                            onChange={(e) => updateItem(idx, 'purchaseRate', Number(e.target.value))}
                            className="w-20 px-1.5 py-1 border rounded text-right font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.saleRate}
                            onChange={(e) => updateItem(idx, 'saleRate', Number(e.target.value))}
                            className="w-20 px-1.5 py-1 border rounded text-right font-bold text-emerald-800"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="p-3 text-center">
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
          </div>

          {/* Payment & Settlement */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {['cash', 'bank', 'credit'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m as PaymentMethod)}
                      className={`flex-1 py-1.5 rounded-lg border font-bold capitalize transition text-xs ${
                        paymentMethod === m
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Notes / Reference</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bilty number, freight charges or consignment details"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Invoice Discount (₨):</span>
                <input
                  type="number"
                  min="0"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 border rounded text-right font-bold bg-white"
                />
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t pt-2">
                <span>Grand Total:</span>
                <span className="text-emerald-800">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-700">Amount Paid Now (₨):</span>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-28 px-2 py-1 border rounded text-right font-bold text-emerald-700 bg-white"
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-purple-700 border-t pt-1">
                <span>Added to Supplier Payable:</span>
                <span>{formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t flex justify-end gap-3">
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
              Receive Stock & Post Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
