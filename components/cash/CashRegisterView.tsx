'use client';

import React, { useMemo, useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { CashRegisterShift, CashTransaction, ShopSettings, User } from '@/types';

interface CashRegisterViewProps {
  settings: ShopSettings;
  currentUser: User;
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({
  settings,
  currentUser,
  lang,
  onRefreshDatabase,
}) => {
  const [shifts, setShifts] = useState<CashRegisterShift[]>([]);
  const [activeShift, setActiveShift] = useState<CashRegisterShift | undefined>(undefined);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);

  // Shift Actions
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(5000);

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [countedActualCash, setCountedActualCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');

  // Cash In / Cash Out Adjustment
  const [isCashInOutOpen, setIsCashInOutOpen] = useState(false);
  const [cashInOutType, setCashInOutType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  const loadData = () => {
    setShifts(db.getCashShifts());
    setActiveShift(db.getActiveCashShift());
    setTransactions(db.getCashTransactions());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Compute Active Shift Live Figures
  const shiftMetrics = useMemo(() => {
    if (!activeShift) return null;

    const shiftTxs = transactions.filter(
      (t) => new Date(t.createdAt) >= new Date(activeShift.openedAt) && t.type !== 'opening'
    );

    let salesCash = 0;
    let custPay = 0;
    let suppPay = 0;
    let expCash = 0;
    let inCash = 0;
    let outCash = 0;

    for (const t of shiftTxs) {
      if (t.type === 'sale') salesCash += t.amount;
      else if (t.type === 'customer_payment') custPay += t.amount;
      else if (t.type === 'supplier_payment') suppPay += Math.abs(t.amount);
      else if (t.type === 'expense') expCash += Math.abs(t.amount);
      else if (t.type === 'cash_in') inCash += t.amount;
      else if (t.type === 'cash_out') outCash += Math.abs(t.amount);
    }

    const expectedCash =
      activeShift.openingCash + salesCash + custPay + inCash - suppPay - expCash - outCash;

    return {
      salesCash,
      custPay,
      suppPay,
      expCash,
      inCash,
      outCash,
      expectedCash,
      shiftTxs,
    };
  }, [activeShift, transactions]);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    db.openCashShift(Number(openingFloat) || 0);
    setIsOpeningModalOpen(false);
    loadData();
    onRefreshDatabase?.();
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    db.closeCashShift(activeShift.id, Number(countedActualCash) || 0, closingNotes.trim());
    setIsClosingModalOpen(false);
    loadData();
    onRefreshDatabase?.();
  };

  const handleCashInOut = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(adjustAmount) || 0;
    if (amt <= 0 || !adjustReason.trim()) return;

    db.recordCashTransaction({
      date: new Date().toISOString(),
      type: cashInOutType,
      amount: cashInOutType === 'cash_in' ? amt : -amt,
      description: `Manual Cash ${cashInOutType === 'cash_in' ? 'Deposit' : 'Withdrawal'}: ${adjustReason.trim()}`,
      referenceId: activeShift?.id,
    });

    setIsCashInOutOpen(false);
    setAdjustAmount(0);
    setAdjustReason('');
    loadData();
    onRefreshDatabase?.();
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>Cash Register & Daily Shift Closing</span>
          </h2>
          <p className="text-xs text-slate-500">
            Audit store cash in hand, manage opening cash floats, log cash withdrawals/deposits, and close daily shifts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeShift ? (
            <>
              <button
                onClick={() => setIsCashInOutOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition"
              >
                Cash In / Out
              </button>
              <button
                onClick={() => {
                  setCountedActualCash(shiftMetrics?.expectedCash || 0);
                  setIsClosingModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md transition"
              >
                Close Cash Shift
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition"
            >
              Open New Shift Float
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Active Shift Dashboard Card */}
        {activeShift && shiftMetrics ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Active Shift in Progress
                  </h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Opened at {new Date(activeShift.openedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Cashier: <strong>{activeShift.userName}</strong> | Date:{' '}
                  <strong>{activeShift.shiftDate}</strong>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Expected Cash in Drawer
                </span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatCurrency(shiftMetrics.expectedCash)}
                </span>
              </div>
            </div>

            {/* Inflow vs Outflow Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Opening Float</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(activeShift.openingCash)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold uppercase block">+ Cash Sales</span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatCurrency(shiftMetrics.salesCash)}
                </span>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-800 font-bold uppercase block">+ Cust Payments</span>
                <span className="text-sm font-bold text-blue-700">
                  {formatCurrency(shiftMetrics.custPay)}
                </span>
              </div>

              <div className="p-3 bg-red-50/50 rounded-xl border border-red-200">
                <span className="text-[10px] text-red-800 font-bold uppercase block">- Cash Expenses</span>
                <span className="text-sm font-bold text-red-600">
                  {formatCurrency(shiftMetrics.expCash)}
                </span>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200">
                <span className="text-[10px] text-purple-800 font-bold uppercase block">- Supplier Paid</span>
                <span className="text-sm font-bold text-purple-700">
                  {formatCurrency(shiftMetrics.suppPay)}
                </span>
              </div>

              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200">
                <span className="text-[10px] text-teal-800 font-bold uppercase block">+ Deposits (In)</span>
                <span className="text-sm font-bold text-teal-700">
                  {formatCurrency(shiftMetrics.inCash)}
                </span>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">- Withdrawals (Out)</span>
                <span className="text-sm font-bold text-amber-700">
                  {formatCurrency(shiftMetrics.outCash)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 text-center space-y-3">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No Active Cash Shift Currently Open</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start your business day by opening a cash shift and declaring your physical cash drawer float.
            </p>
            <button
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition"
            >
              Open Daily Cash Shift
            </button>
          </div>
        )}

        {/* Previous Closed Shifts History Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Shift Closing & Variance History</h3>
            <span className="text-xs text-slate-400">{shifts.length} Recorded Shifts</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Shift Date</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3 text-right">Opening Float</th>
                <th className="py-3 px-3 text-right">Cash Sales</th>
                <th className="py-3 px-3 text-right">Expected Cash</th>
                <th className="py-3 px-3 text-right">Counted Actual</th>
                <th className="py-3 px-3 text-right">Difference (Variance)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No cash register shift history yet.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const diff = s.difference ?? 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.shiftDate}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{s.userName}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatCurrency(s.openingCash)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-800">
                        {formatCurrency(s.cashSales)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(s.expectedCash)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {s.actualCash !== undefined ? formatCurrency(s.actualCash) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {s.difference !== undefined ? (
                          <span
                            className={`font-black ${
                              diff === 0
                                ? 'text-emerald-700'
                                : diff > 0
                                ? 'text-blue-700'
                                : 'text-red-600'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.status === 'open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN SHIFT MODAL */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Open Shift Cash Float</h3>
              <button onClick={() => setIsOpeningModalOpen(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <form onSubmit={handleOpenShift} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Starting Cash Float in Register (₨) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Small change and cash banknotes placed in the cash drawer at start of shift.
                </p>
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md"
                >
                  Open Cash Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {isClosingModalOpen && activeShift && shiftMetrics && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Daily Cash Shift Closing</h3>
              <button onClick={() => setIsClosingModalOpen(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <form onSubmit={handleCloseShift} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-700">Expected Book Cash:</span>
                <span className="text-lg font-black text-emerald-800">
                  {formatCurrency(shiftMetrics.expectedCash)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Actual Physically Counted Cash (₨) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={countedActualCash}
                  onChange={(e) => setCountedActualCash(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Variance display */}
              <div className="p-3 rounded-xl border flex justify-between items-center font-bold text-xs bg-slate-50">
                <span>Calculated Variance / Difference:</span>
                <span
                  className={
                    countedActualCash - shiftMetrics.expectedCash === 0
                      ? 'text-emerald-700'
                      : countedActualCash - shiftMetrics.expectedCash > 0
                      ? 'text-blue-700'
                      : 'text-red-600'
                  }
                >
                  {formatCurrency(countedActualCash - shiftMetrics.expectedCash)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Closing Remarks / Explanations</label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Clean closing, drawer balanced"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md"
                >
                  Confirm & Finalize Closing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASH IN / CASH OUT MODAL */}
      {isCashInOutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Register Cash In / Cash Out</h3>
              <button onClick={() => setIsCashInOutOpen(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <form onSubmit={handleCashInOut} className="p-5 space-y-4 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCashInOutType('cash_in')}
                  className={`flex-1 py-2 rounded-lg border font-bold ${
                    cashInOutType === 'cash_in'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  + Cash In (Deposit)
                </button>
                <button
                  type="button"
                  onClick={() => setCashInOutType('cash_out')}
                  className={`flex-1 py-2 rounded-lg border font-bold ${
                    cashInOutType === 'cash_out'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  - Cash Out (Withdrawal)
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (₨) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Owner Withdrawal *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Owner drawing or petty cash topup"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCashInOutOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
