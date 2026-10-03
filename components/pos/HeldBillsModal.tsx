'use client';

import React from 'react';
import { Play, Trash2, X, Clock, User, Package } from 'lucide-react';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { HeldBill } from '@/types';

interface HeldBillsModalProps {
  heldBills: HeldBill[];
  onResume: (bill: HeldBill) => void;
  onDelete: (billId: string) => void;
  onClose: () => void;
  lang: Language;
}

export const HeldBillsModal: React.FC<HeldBillsModalProps> = ({
  heldBills,
  onResume,
  onDelete,
  onClose,
  lang,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Parked / Held Bills ({heldBills.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {heldBills.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No bills currently parked on hold.
            </div>
          ) : (
            heldBills.map((bill) => {
              const totalAmount = bill.items.reduce((acc, item) => acc + item.lineTotal, 0) - bill.discount;
              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-lg border border-slate-200 hover:border-emerald-500 bg-slate-50/60 flex items-center justify-between transition group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{bill.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {bill.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-slate-400" />
                        {bill.items.length} items
                      </span>
                    </div>
                    <div className="text-xs font-bold text-emerald-700">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onResume(bill)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                    <button
                      onClick={() => onDelete(bill.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Discard Held Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
