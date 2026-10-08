'use client';

import React, { useMemo, useState } from 'react';
import { History, Search, Download, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToExcel } from '@/lib/exportUtils';
import { Language, t } from '@/lib/i18n';
import { AuditLog } from '@/types';

interface AuditLogViewProps {
  lang: Language;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ lang }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadData = () => {
    setLogs(db.getAuditLogs());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const mAction = l.action.toLowerCase().includes(q);
        const mDetails = l.details.toLowerCase().includes(q);
        const mUser = l.userName.toLowerCase().includes(q);
        if (!mAction && !mDetails && !mUser) return false;
      }
      return true;
    });
  }, [logs, categoryFilter, search]);

  const handleExportExcel = () => {
    const rows = filteredLogs.map((l) => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      Action: l.action,
      Category: l.category,
      Details: l.details,
      User: l.userName,
    }));
    exportToExcel(`Audit_Trail_${new Date().toISOString().split('T')[0]}`, 'Audit Logs', rows);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Security Audit Log & Activity Trail</span>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable tracking of financial entries, sales, returns, stock edits, and user logins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Audit Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit Trail</span>
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
            placeholder="Search action, details, cashier name..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 capitalize"
        >
          <option value="all">All Audit Categories</option>
          <option value="sale">Sales & Invoices</option>
          <option value="purchase">Purchases & Receiving</option>
          <option value="product">Products & Variants</option>
          <option value="inventory">Inventory Adjustments</option>
          <option value="customer">Customers</option>
          <option value="expense">Expenses</option>
          <option value="auth">Security & Logins</option>
          <option value="system">System & Backups</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-3">Authorized User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records matching your search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px] leading-normal">{log.details}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{log.userName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
