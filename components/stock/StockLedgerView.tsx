'use client';

import React, { useMemo, useState } from 'react';
import { Boxes, Search, Filter, Download, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { Language, t } from '@/lib/i18n';
import { StockMovement, StockMovementType } from '@/types';

interface StockLedgerViewProps {
  lang: Language;
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({ lang }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadData = () => {
    setMovements(db.getStockMovements());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesProduct = m.productName.toLowerCase().includes(q);
        const matchesReason = m.reason.toLowerCase().includes(q);
        const matchesRef = m.referenceId?.toLowerCase().includes(q);
        const matchesUser = m.userName.toLowerCase().includes(q);
        if (!matchesProduct && !matchesReason && !matchesRef && !matchesUser) return false;
      }
      return true;
    });
  }, [movements, typeFilter, search]);

  const handleExportCSV = () => {
    const rows = filteredMovements.map((m) => ({
      Date: new Date(m.date).toLocaleString(),
      Product: m.productName,
      Variant: m.variantLabel || '',
      Type: m.type,
      Reference: m.referenceId || '',
      'Previous Qty': m.previousQty,
      'Change Qty': m.changeQty,
      'New Qty': m.newQty,
      Reason: m.reason,
      User: m.userName,
    }));
    exportToCSV(`Stock_Ledger_${new Date().toISOString().split('T')[0]}`, rows);
  };

  const handleExportExcel = () => {
    const rows = filteredMovements.map((m) => ({
      Date: new Date(m.date).toLocaleString(),
      Product: m.productName,
      Variant: m.variantLabel || '',
      Type: m.type,
      Reference: m.referenceId || '',
      'Previous Qty': m.previousQty,
      'Change Qty': m.changeQty,
      'New Qty': m.newQty,
      Reason: m.reason,
      User: m.userName,
    }));
    exportToExcel(`Stock_Ledger_${new Date().toISOString().split('T')[0]}`, 'Stock Ledger', rows);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <span>Immutable Stock Movement Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">
            Audit-safe tracking of every single unit added, sold, returned, damaged, or adjusted in the local SQLite database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Excel</span>
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
            placeholder="Search by product, variant, reason, invoice #, user..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
        >
          <option value="all">All Movement Types</option>
          <option value="opening">Opening Stock</option>
          <option value="sale">Sales (Outflow)</option>
          <option value="purchase">Purchases (Inflow)</option>
          <option value="sale_return">Sale Returns (+ Restock)</option>
          <option value="purchase_return">Purchase Returns (- Supplier)</option>
          <option value="adjustment_add">Manual Increase</option>
          <option value="adjustment_remove">Manual Decrease</option>
          <option value="damaged">Damaged Stock</option>
          <option value="lost">Lost / Missing</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-3">Product / Uniform Variant</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Reference #</th>
                <th className="py-3 px-3 text-center">Previous</th>
                <th className="py-3 px-3 text-center">Change</th>
                <th className="py-3 px-3 text-center">New Balance</th>
                <th className="py-3 px-4">Reason / Audit Note</th>
                <th className="py-3 px-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.changeQty > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(m.date).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{m.productName}</div>
                        {m.variantLabel && (
                          <div className="text-[10px] text-emerald-700 font-semibold">{m.variantLabel}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">
                        {m.referenceId || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {m.previousQty}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-black inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
                            isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {isPositive ? `+${m.changeQty}` : m.changeQty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        {m.newQty}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        {m.reason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px]">
                        {m.userName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
