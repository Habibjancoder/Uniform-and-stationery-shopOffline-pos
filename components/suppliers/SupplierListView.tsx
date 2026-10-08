'use client';

import React, { useMemo, useState } from 'react';
import { Briefcase, Plus, Search, DollarSign, Download, Phone, Building } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToExcel } from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Supplier } from '@/types';
import { SupplierPaymentModal } from './SupplierPaymentModal';

interface SupplierListViewProps {
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const SupplierListView: React.FC<SupplierListViewProps> = ({
  lang,
  onRefreshDatabase,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);

  // New Supplier form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setSuppliers(db.getSuppliers());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const mName = s.name.toLowerCase().includes(q);
        const mComp = s.company.toLowerCase().includes(q);
        const mPhone = s.phone.includes(q);
        if (!mName && !mComp && !mPhone) return false;
      }
      return true;
    });
  }, [suppliers, search]);

  const handleSaveNewSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSup: Supplier = {
      id: `sup_${Date.now()}`,
      name: name.trim(),
      company: company.trim() || name.trim(),
      phone: phone.trim() || '0300-0000000',
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    db.saveSupplier(newSup);
    loadData();
    setIsAddModalOpen(false);
    setName('');
    setCompany('');
    setPhone('');
    onRefreshDatabase?.();
  };

  const handleExportExcel = () => {
    const rows = filteredSuppliers.map((s) => ({
      Supplier: s.name,
      Company: s.company,
      Phone: s.phone,
      WhatsApp: s.whatsapp || '',
      Address: s.address || '',
      'Opening Balance': s.openingBalance,
      'Current Payable Due': s.currentBalance,
      Notes: s.notes || '',
    }));
    exportToExcel(`Suppliers_Ledger_${new Date().toISOString().split('T')[0]}`, 'Suppliers', rows);
  };

  const totalPayables = suppliers.reduce(
    (acc, s) => (s.currentBalance > 0 ? acc + s.currentBalance : acc),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            <span>Supplier Management & Payables</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track uniform factories, stationery wholesalers, and bag manufacturers balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-purple-50 text-purple-800 border border-purple-200 px-3.5 py-1.5 rounded-lg text-xs font-bold">
            Total Payable to Suppliers: {formatCurrency(totalPayables)}
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, company, or phone..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3.5 py-1.5 border rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Supplier / Contact Person</th>
                <th className="py-3 px-3">Company / Factory</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Address</th>
                <th className="py-3 px-3 text-right">Payable Balance (₨)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No suppliers found. Click "+ Add Supplier" to register vendors.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">{s.name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{s.company}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{s.phone}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{s.address || '-'}</td>
                    <td className="py-3 px-3 text-right font-black text-sm text-purple-800">
                      {formatCurrency(s.currentBalance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setPayingSupplier(s)}
                        className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-md font-bold transition flex items-center gap-1 mx-auto text-xs border border-purple-200"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay Supplier</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW SUPPLIER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Add New Supplier Profile</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveNewSupplier} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Haji Aslam"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Mill Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. National Garments"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Factory / City Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Cloth Market, Faisalabad"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Payable Balance (₨)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplied Goods Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Uniform shirts, fabrics, etc."
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER PAYMENT MODAL */}
      {payingSupplier && (
        <SupplierPaymentModal
          supplier={payingSupplier}
          onSuccess={() => {
            loadData();
            onRefreshDatabase?.();
          }}
          onClose={() => setPayingSupplier(null)}
        />
      )}
    </div>
  );
};
