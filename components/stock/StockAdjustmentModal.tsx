'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, X, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/database';
import { Product, ProductVariant, StockMovementType } from '@/types';

interface StockAdjustmentModalProps {
  product: Product;
  selectedVariant?: ProductVariant;
  onSuccess: () => void;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  selectedVariant,
  onSuccess,
  onClose,
}) => {
  const currentStock = selectedVariant ? selectedVariant.currentStock : product.currentStock;
  const [adjustmentType, setAdjustmentType] = useState<
    'adjustment_add' | 'adjustment_remove' | 'damaged' | 'lost'
  >('adjustment_add');
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>('Inventory audit adjustment');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = Number(qty) || 0;
    if (amount <= 0) {
      setError('Please enter a quantity greater than 0.');
      return;
    }

    const changeQty = adjustmentType === 'adjustment_add' ? amount : -amount;

    try {
      db.adjustStock(product.id, selectedVariant?.id, changeQty, adjustmentType, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error adjusting stock.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Stock Quantity Adjustment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Item details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 text-sm">{product.name}</div>
            {selectedVariant && (
              <div className="text-[11px] text-emerald-700 font-semibold">
                Size: {selectedVariant.size || '-'} | Color: {selectedVariant.color || '-'}
              </div>
            )}
            <div className="text-[11px] text-slate-500 font-medium">
              Current Available Stock: <strong className="text-slate-900">{currentStock}</strong> {product.unit}
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Adjustment Reason Type */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Adjustment Action</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'adjustment_add', label: '+ Manual Increase', sign: '+' },
                { id: 'adjustment_remove', label: '- Manual Decrease', sign: '-' },
                { id: 'damaged', label: '⚠️ Damaged Goods', sign: '-' },
                { id: 'lost', label: '❌ Lost / Theft', sign: '-' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setAdjustmentType(act.id as any)}
                  className={`p-2 rounded-lg border text-center font-bold transition text-xs ${
                    adjustmentType === act.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Quantity to {adjustmentType === 'adjustment_add' ? 'Add' : 'Deduct'} *
            </label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Reason Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Audit Ledger Note / Reason *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count discrepancy or transit damage"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Projected Final Stock */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900">Projected New Stock:</span>
            <span className="font-extrabold text-base text-emerald-800">
              {adjustmentType === 'adjustment_add' ? currentStock + qty : currentStock - qty} {product.unit}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition"
            >
              Confirm Adjustment & Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
