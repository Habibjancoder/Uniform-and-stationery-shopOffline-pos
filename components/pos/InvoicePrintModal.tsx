'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, FileText, Receipt, Download, Check } from 'lucide-react';
import { generateInvoicePDF, safePdfText } from '@/lib/exportUtils';
import { formatCurrency } from '@/lib/i18n';
import { Sale, ShopSettings } from '@/types';

interface InvoicePrintModalProps {
  sale: Sale;
  settings: ShopSettings;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ sale, settings, onClose }) => {
  const [template, setTemplate] = useState<'thermal_80mm' | 'a4'>(
    settings.defaultInvoiceTemplate || 'thermal_80mm'
  );
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const cleanCustomerName =
    (sale.customerName || 'Walk-in Customer')
      .replace(/\(عام گاہک\)/g, '')
      .replace(/عام گاہک/g, '')
      .replace(/\(Walk-in\)/gi, '')
      .trim() || 'Walk-in Customer';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    setIsPdfGenerating(true);
    try {
      generateInvoicePDF(sale, settings);
    } catch (e) {
      console.error('Error generating invoice PDF:', e);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Keyboard shortcut: Enter to print, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Dynamic Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-receipt,
          #printable-receipt *,
          #printable-a4,
          #printable-a4 * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          #printable-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-hidden,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Controls Toolbar (hidden during print) */}
        <div className="print:hidden px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">Invoice #{sale.invoiceNumber}</h3>
              <p className="text-[11px] text-slate-300">
                Customer: <strong className="text-white">{cleanCustomerName}</strong> | Total:{' '}
                <strong className="text-emerald-400">{formatCurrency(sale.grandTotal)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Template switch */}
            <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setTemplate('thermal_80mm')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
                  template === 'thermal_80mm'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplate('a4')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
                  template === 'a4'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 Sheet</span>
              </button>
            </div>

            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isPdfGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
              title="Download Beautiful A4 PDF File"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isPdfGenerating ? 'Generating...' : 'Download PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition"
              title="Direct Thermal / A4 Print (Press Enter)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now [Enter]</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              title="Close [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          {/* TEMPLATE 1: 80MM THERMAL RECEIPT */}
          {template === 'thermal_80mm' ? (
            <div
              id="printable-receipt"
              className="w-[78mm] min-w-[78mm] max-w-[78mm] bg-white p-3 shadow-md text-black font-mono text-[11px] leading-tight select-text border border-slate-300 rounded-sm"
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-black border-dashed space-y-1">
                <div className="font-extrabold text-sm tracking-tight">{settings.shopName}</div>
                <div className="text-[10px]">
                  {settings.address}, {settings.city}
                </div>
                <div className="text-[10px]">
                  Tel: {settings.phone} {settings.whatsapp && `| WA: ${settings.whatsapp}`}
                </div>
                <div className="text-[10px] font-bold mt-1 uppercase tracking-wider text-black">
                  RETAIL CASH MEMO
                </div>
              </div>

              {/* Meta */}
              <div className="py-2 border-b border-black border-dashed text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>
                    Inv #: <strong>{sale.invoiceNumber}</strong>
                  </span>
                  <span>{new Date(sale.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[50mm]">
                    Customer: <strong>{cleanCustomerName}</strong>
                  </span>
                  <span>
                    {new Date(sale.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {sale.customerPhone && <div>Contact: {sale.customerPhone}</div>}
                <div>Cashier: {sale.userName}</div>
              </div>

              {/* Items Table */}
              <table className="w-full my-2 text-[10px]">
                <thead>
                  <tr className="border-b border-black border-dashed text-left">
                    <th className="py-1">Item Description</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Rate</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-slate-300">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 pr-1">
                        <div className="font-bold leading-snug">{item.productName}</div>
                        {item.variantDetails && (
                          <div className="text-[9px] text-slate-700">{item.variantDetails}</div>
                        )}
                        {item.discount > 0 && settings.showDiscountOnInvoice && (
                          <div className="text-[9px] text-slate-600">
                            Disc: -{formatCurrency(item.discount)}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-1 font-bold">{item.quantity}</td>
                      <td className="text-right py-1">{item.unitPrice}</td>
                      <td className="text-right py-1 font-bold">{item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-black border-dashed pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && settings.showDiscountOnInvoice && (
                  <div className="flex justify-between text-slate-700">
                    <span>Discount:</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                {sale.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax / GST:</span>
                    <span>+{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold border-y border-black py-1">
                  <span>GRAND TOTAL:</span>
                  <span>{formatCurrency(sale.grandTotal)}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span>Paid ({sale.paymentMethod.toUpperCase()}):</span>
                  <span>{formatCurrency(sale.paidAmount)}</span>
                </div>
                {sale.balanceAmount > 0 && (
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(sale.balanceAmount)}</span>
                  </div>
                )}
                {sale.changeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Change Returned:</span>
                    <span>{formatCurrency(sale.changeAmount)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-3 mt-3 border-t border-black border-dashed space-y-1 text-[9px]">
                <div>{settings.invoiceFooter || 'Thank you for shopping with us! No return without bill.'}</div>
                <div className="text-[8px] text-slate-500 font-sans">
                  Offline POS System • KitabGhar ERP
                </div>
              </div>
            </div>
          ) : (
            /* TEMPLATE 2: A4 FULL INVOICE */
            <div
              id="printable-a4"
              className="w-full max-w-[210mm] bg-white p-6 sm:p-8 shadow-md text-slate-900 font-sans text-xs select-text border border-slate-200 rounded-sm"
            >
              {/* Header Banner */}
              <div className="flex items-start justify-between border-b pb-4 mb-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {settings.shopName}
                  </h1>
                  <p className="text-slate-600 text-xs mt-1">
                    {settings.address}, {settings.city}
                  </p>
                  <p className="text-slate-600 text-xs">
                    Phone: {settings.phone} {settings.whatsapp && `| WhatsApp: ${settings.whatsapp}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-800">RETAIL SALE INVOICE</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                    #{sale.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(sale.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              {/* Billed To Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Billed To</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{cleanCustomerName}</div>
                  {sale.customerPhone && (
                    <div className="text-slate-600 text-xs">Phone: {sale.customerPhone}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Payment Details</div>
                  <div className="text-xs font-bold text-slate-800 uppercase mt-0.5">
                    {sale.paymentMethod} Payment
                  </div>
                  <div className="text-[11px] text-slate-500">Cashier: {sale.userName}</div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full mb-4 border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-left">
                    <th className="py-2 px-3 w-10">#</th>
                    <th className="py-2 px-3">Item Description / Variant</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Rate</th>
                    <th className="py-2 px-3 text-right">Discount</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        {item.variantDetails && (
                          <div className="text-[11px] text-emerald-800 font-medium">{item.variantDetails}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        {item.quantity} {item.unit || ''}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary and Signatures */}
              <div className="flex justify-between items-start pt-2">
                <div className="max-w-xs space-y-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold">Terms & Conditions:</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {settings.invoiceFooter || 'Thank you for shopping with us! Goods once sold cannot be returned without original cash memo.'}
                    </p>
                  </div>
                  <div className="pt-8 text-center w-48 border-t border-slate-300">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Authorized Signature
                    </span>
                  </div>
                </div>

                <div className="w-64 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(sale.subtotal)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold">-{formatCurrency(sale.discount)}</span>
                    </div>
                  )}
                  {sale.tax > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax / GST:</span>
                      <span className="font-semibold text-slate-900">+{formatCurrency(sale.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-b border-slate-300 py-1 text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-800">{formatCurrency(sale.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 pt-0.5">
                    <span>Paid ({sale.paymentMethod}):</span>
                    <span className="font-semibold">{formatCurrency(sale.paidAmount)}</span>
                  </div>
                  {sale.balanceAmount > 0 && (
                    <div className="flex justify-between text-red-700 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(sale.balanceAmount)}</span>
                    </div>
                  )}
                  {sale.changeAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Change:</span>
                      <span>{formatCurrency(sale.changeAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
