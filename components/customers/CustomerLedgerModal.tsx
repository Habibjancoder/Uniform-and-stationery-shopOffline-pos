'use client';

import React, { useState } from 'react';
import { FileText, Printer, Plus, X, Download } from 'lucide-react';
import { db } from '@/lib/database';
import { exportReportToPDF } from '@/lib/exportUtils';
import { formatCurrency } from '@/lib/i18n';
import { Customer, Sale, ShopSettings } from '@/types';

interface CustomerLedgerModalProps {
  customer: Customer;
  settings: ShopSettings;
  onPaymentReceived: () => void;
  onClose: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  settings,
  onPaymentReceived,
  onClose,
}) => {
  const [sales] = useState<Sale[]>(
    db.getSales().filter((s) => s.customerId === customer.id)
  );

  // Payment Form
  const [isReceivingPayment, setIsReceivingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(customer.currentBalance > 0 ? customer.currentBalance : 0);
  const [payMethod, setPayMethod] = useState('cash');
  const [notes, setNotes] = useState('Account balance clearance');

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payAmount) || 0;
    if (amount <= 0) return;

    db.receiveCustomerPayment(customer.id, amount, payMethod, notes);
    onPaymentReceived();
    setIsReceivingPayment(false);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const headers = ['Date', 'Invoice #', 'Total Amount', 'Paid', 'Balance Due'];
    const rows = sales.map((s) => [
      new Date(s.date).toLocaleDateString(),
      s.invoiceNumber,
      `Rs. ${s.grandTotal}`,
      `Rs. ${s.paidAmount}`,
      `Rs. ${s.balanceAmount}`,
    ]);
    exportReportToPDF(
      `Customer Statement - ${customer.name}`,
      headers,
      rows,
      `Statement_${customer.name.replace(/\s+/g, '_')}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="print:hidden px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Customer Ledger Statement</h3>
              <p className="text-[11px] text-slate-400">{customer.name} ({customer.phone})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReceivingPayment(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Receive Payment</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1 border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handlePrintStatement}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statement Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs select-text">
          {/* Printable Statement Header */}
          <div className="border-b pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{settings.shopName}</h2>
              <div className="text-slate-500 text-xs">{settings.address}, {settings.city}</div>
              <div className="text-slate-500 text-xs">Phone: {settings.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-emerald-800">CUSTOMER ACCOUNT STATEMENT</div>
              <div className="text-xs text-slate-500">As of: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Customer Overview Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Name</span>
              <span className="font-bold text-sm text-slate-900">{customer.name}</span>
              <div className="text-slate-500 text-[11px] capitalize">{customer.type}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone / Address</span>
              <div className="text-slate-800 font-semibold">{customer.phone}</div>
              <div className="text-slate-500 text-[11px]">{customer.address || '-'}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Balance Due</span>
              <span
                className={`text-xl font-black ${
                  customer.currentBalance > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(customer.currentBalance)}
              </span>
            </div>
          </div>

          {/* Receive Payment Form Popup */}
          {isReceivingPayment && (
            <form
              onSubmit={handleSavePayment}
              className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 space-y-3"
            >
              <div className="font-bold text-emerald-950 flex justify-between items-center">
                <span>Receive Cash / Online Payment from {customer.name}</span>
                <button
                  type="button"
                  onClick={() => setIsReceivingPayment(false)}
                  className="text-emerald-800 font-bold"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount Received (₨) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border rounded bg-white font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsReceivingPayment(false)}
                  className="px-3 py-1 border rounded bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs"
                >
                  Post Payment & Update Balance
                </button>
              </div>
            </form>
          )}

          {/* Sales History Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3 text-right">Invoice Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No invoices recorded for this customer yet.
                    </td>
                  </tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px]">
                        {new Date(s.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(s.grandTotal)}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-700">
                        {formatCurrency(s.paidAmount)}
                      </td>
                      <td className="p-3 text-right font-bold text-red-600">
                        {s.balanceAmount > 0 ? formatCurrency(s.balanceAmount) : '-'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {s.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="print:hidden p-4 bg-slate-100 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
