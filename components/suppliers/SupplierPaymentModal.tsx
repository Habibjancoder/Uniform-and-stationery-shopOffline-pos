'use client';

import React, { useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency } from '@/lib/i18n';
import { Supplier } from '@/types';

interface SupplierPaymentModalProps {
  supplier: Supplier;
  onSuccess: () => void;
  onClose: () => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  supplier,
  onSuccess,
  onClose,
}) => {
  const [amount, setAmount] = useState<number>(supplier.currentBalance > 0 ? supplier.currentBalance : 0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('Payment against invoice clearance');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pay = Number(amount) || 0;
    if (pay <= 0) return;

    db.paySupplier(supplier.id, pay, paymentMethod, notes.trim());
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm">Pay Supplier / Clear Payable</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 text-sm">{supplier.name}</div>
            <div className="text-[11px] text-slate-500">{supplier.company}</div>
            <div className="text-xs font-semibold text-purple-900 pt-1">
              Current Payable Balance: <strong>{formatCurrency(supplier.currentBalance)}</strong>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Amount (₨) *</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg font-bold text-slate-900 text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-2 rounded-lg border font-bold text-xs ${
                  paymentMethod === 'cash'
                    ? 'border-purple-600 bg-purple-50 text-purple-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cash Outflow
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`flex-1 py-2 rounded-lg border font-bold text-xs ${
                  paymentMethod === 'bank'
                    ? 'border-purple-600 bg-purple-50 text-purple-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Bank Transfer / Cheque
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Voucher Notes / Cheque #</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

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
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-md transition"
            >
              Post Supplier Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
