'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: 'Tab', desc: 'Fast Focus Cycle: Search → Qty → Unit → Disc → Search' },
    { key: 'F2', desc: 'Focus Product Search / Barcode scanner input' },
    { key: '↓ / ↑', desc: 'Navigate search results dropdown or change Unit' },
    { key: 'Enter', desc: 'Add selected search item to cart / Confirm' },
    { key: 'F5 / Alt+Q', desc: 'Jump keyboard directly to Cart Item Quantity' },
    { key: 'F3', desc: 'Quick 1-Click Cash Sale for Walk-in Customer' },
    { key: 'F4', desc: 'Quick Add New Customer / School profile' },
    { key: 'F6', desc: 'Hold / Park active invoice in cart' },
    { key: 'F7', desc: 'Open Held Bills list' },
    { key: 'Alt+R', desc: 'Customer Sale Return, Restock & Refund' },
    { key: 'F8', desc: 'Open Payment Modal & choose payment method' },
    { key: 'F9', desc: 'Reprint last completed customer receipt' },
    { key: 'F10', desc: 'Clear active cart' },
    { key: 'ESC', desc: 'Close any modal or clear current search' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">POS Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 text-xs">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
            >
              <span className="text-slate-700 font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs font-mono font-bold text-slate-900 text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-100 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
