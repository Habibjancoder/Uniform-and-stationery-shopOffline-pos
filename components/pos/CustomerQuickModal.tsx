'use client';

import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Customer, CustomerType } from '@/types';

interface CustomerQuickModalProps {
  onSave: (customer: Customer) => void;
  onClose: () => void;
}

export const CustomerQuickModal: React.FC<CustomerQuickModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<CustomerType>('regular');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '0300-0000000',
      type,
      address: address.trim(),
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0,
      createdAt: new Date().toISOString(),
    };

    onSave(newCustomer);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Quick Add Customer [F4]</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Customer / School Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="e.g. Asim Raza (Parent) or Greenview School"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
                placeholder="0300-1234567"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomerType)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="regular">Regular Parent/Customer</option>
                <option value="school">School Account</option>
                <option value="teacher">Teacher</option>
                <option value="wholesale">Wholesale Buyer</option>
                <option value="institution">College / Academy</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address / Class Details</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
              placeholder="Area, Street or Campus"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Opening Credit Balance (₨)</label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
              placeholder="0 (Positive if they owe us)"
            />
          </div>

          <div className="pt-3 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold shadow-xs"
            >
              Save Customer & Select
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
