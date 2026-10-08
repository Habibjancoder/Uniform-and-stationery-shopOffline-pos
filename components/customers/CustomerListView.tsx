'use client';

import React, { useMemo, useState } from 'react';
import { Users, Plus, Search, FileText, Phone, Building, Download, DollarSign } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToExcel } from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Customer, CustomerType, ShopSettings } from '@/types';
import { CustomerQuickModal } from '../pos/CustomerQuickModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';

interface CustomerListViewProps {
  settings: ShopSettings;
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  settings,
  lang,
  onRefreshDatabase,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);

  const loadData = () => {
    setCustomers(db.getCustomers());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchAddr = c.address?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAddr) return false;
      }
      return true;
    });
  }, [customers, typeFilter, search]);

  const handleExportExcel = () => {
    const rows = filteredCustomers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Type: c.type,
      Address: c.address || '',
      'Opening Balance': c.openingBalance,
      'Current Balance Due': c.currentBalance,
      Notes: c.notes || '',
    }));
    exportToExcel(`Customers_Ledger_${new Date().toISOString().split('T')[0]}`, 'Customers', rows);
  };

  const totalReceivables = customers.reduce(
    (acc, c) => (c.currentBalance > 0 ? acc + c.currentBalance : acc),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Customers & Accounts Receivable</span>
          </h2>
          <p className="text-xs text-slate-500">
            Maintain customer ledgers, track credit balances, receive payments, and print statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-red-50 text-red-800 border border-red-200 px-3.5 py-1.5 rounded-lg text-xs font-bold">
            Total Receivables: {formatCurrency(totalReceivables)}
          </div>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, or address..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 capitalize"
          >
            <option value="all">All Customer Types</option>
            <option value="regular">Regular Parents</option>
            <option value="school">Schools</option>
            <option value="teacher">Teachers</option>
            <option value="wholesale">Wholesale</option>
            <option value="walk-in">Walk-in</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 border rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Account Type</th>
                <th className="py-3 px-3">Address</th>
                <th className="py-3 px-3 text-right">Credit Balance Due</th>
                <th className="py-3 px-4 text-center">Ledger & Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {c.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {c.phone}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {c.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {c.address || '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black text-sm ${
                          c.currentBalance > 0 ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {formatCurrency(c.currentBalance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedLedgerCustomer(c)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-bold transition flex items-center gap-1 mx-auto text-xs border border-emerald-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Statement</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickAddOpen && (
        <CustomerQuickModal
          onSave={(newCust) => {
            db.saveCustomer(newCust);
            loadData();
            setIsQuickAddOpen(false);
            onRefreshDatabase?.();
          }}
          onClose={() => setIsQuickAddOpen(false)}
        />
      )}

      {/* CUSTOMER LEDGER & PAYMENT MODAL */}
      {selectedLedgerCustomer && (
        <CustomerLedgerModal
          customer={selectedLedgerCustomer}
          settings={settings}
          onPaymentReceived={() => {
            loadData();
            const updated = db.getCustomers().find((c) => c.id === selectedLedgerCustomer.id);
            if (updated) setSelectedLedgerCustomer(updated);
            onRefreshDatabase?.();
          }}
          onClose={() => setSelectedLedgerCustomer(null)}
        />
      )}
    </div>
  );
};
