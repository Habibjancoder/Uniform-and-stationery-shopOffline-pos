'use client';

import React, { useMemo, useState } from 'react';
import { DollarSign, Plus, Trash2, Search, Download, Calendar, Layers } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToExcel } from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Expense, ExpenseCategory, PaymentMethod } from '@/types';

interface ExpenseListViewProps {
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const ExpenseListView: React.FC<ExpenseListViewProps> = ({ lang, onRefreshDatabase }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Add custom category state
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const loadData = React.useCallback(() => {
    setExpenses(db.getExpenses());
    const cats = db.getExpenseCategories();
    setCategories(cats);
    if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
  }, [categoryId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (catFilter !== 'all' && e.categoryId !== catFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const mCat = e.categoryName.toLowerCase().includes(q);
        const mDesc = e.description.toLowerCase().includes(q);
        const mUser = e.userName.toLowerCase().includes(q);
        if (!mCat && !mDesc && !mUser) return false;
      }
      return true;
    });
  }, [expenses, catFilter, search]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expAmount = Number(amount) || 0;
    if (expAmount <= 0) return;

    const catObj = categories.find((c) => c.id === categoryId);

    db.addExpense({
      date: new Date(date).toISOString(),
      categoryId,
      categoryName: catObj?.name || 'General Expense',
      description: description.trim() || catObj?.name || 'Expense',
      amount: expAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
    setDescription('');
    setAmount(0);
    setNotes('');
    loadData();
    onRefreshDatabase?.();
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: ExpenseCategory = {
      id: `exp_cat_${Date.now()}`,
      name: newCatName.trim(),
      isDefault: false,
    };
    db.saveExpenseCategory(newCat);
    setNewCatName('');
    setIsAddingCat(false);
    loadData();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      db.deleteExpense(id);
      loadData();
      onRefreshDatabase?.();
    }
  };

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleExportExcel = () => {
    const rows = filteredExpenses.map((e) => ({
      Date: new Date(e.date).toLocaleDateString(),
      Category: e.categoryName,
      Description: e.description,
      Amount: e.amount,
      'Payment Method': e.paymentMethod,
      User: e.userName,
      Notes: e.notes || '',
    }));
    exportToExcel(`Expenses_${new Date().toISOString().split('T')[0]}`, 'Expenses', rows);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>Store Expenses & Operating Overheads</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track daily operating expenses (rent, bills, tea, transport, salaries) with automatic cash deduction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-50 text-red-800 border border-red-200 px-3.5 py-1.5 rounded-lg text-xs font-bold">
            Total Filtered Expenses: {formatCurrency(totalExpenseAmount)}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
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
            placeholder="Search expenses by category, description, user..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 max-w-44 truncate"
          >
            <option value="all">All Expense Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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

      {/* Expenses Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right">Amount (₨)</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense entries recorded for this filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {e.categoryName}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {e.description}
                      {e.notes && <div className="text-[10px] text-slate-400 mt-0.5">{e.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-red-600">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">{e.userName}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Record Store Expense</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Expense Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCat(!isAddingCat)}
                    className="text-emerald-700 font-bold text-[11px] hover:underline"
                  >
                    + Custom Category
                  </button>
                </div>

                {isAddingCat && (
                  <div className="mb-2 flex gap-1.5">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="New Category Name..."
                      className="flex-1 px-2.5 py-1 border rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1 bg-emerald-600 text-white rounded font-bold"
                    >
                      Save
                    </button>
                  </div>
                )}

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-white font-semibold text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Month electricity bill or tea for staff"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₨) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md font-bold text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Voucher #</label>
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition"
                >
                  Save Expense & Deduct Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
