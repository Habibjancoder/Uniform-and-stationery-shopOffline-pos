'use client';

import React, { useState } from 'react';
import { Printer, X, Tag } from 'lucide-react';
import { renderBarcodeSVG } from '@/lib/barcodeUtils';
import { formatCurrency } from '@/lib/i18n';
import { Product, ProductVariant } from '@/types';

interface BarcodePrintModalProps {
  product: Product;
  selectedVariant?: ProductVariant;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  product,
  selectedVariant,
  onClose,
}) => {
  const [copies, setCopies] = useState<number>(4);
  const [labelSize, setLabelSize] = useState<'50x25' | '40x28' | 'sheet_grid'>('50x25');

  const barcodeValue = selectedVariant?.barcode || product.barcode;
  const skuValue = selectedVariant?.sku || product.sku;
  const priceValue = selectedVariant?.salePrice || product.salePrice;
  const details = selectedVariant
    ? `Size: ${selectedVariant.size || '-'} | Color: ${selectedVariant.color || '-'}`
    : product.categoryName;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="print:hidden px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Print Barcode Labels</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Labels</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Toolbar */}
        <div className="print:hidden p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Number of Labels to Print</label>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value) || 1)}
              className="w-full px-3 py-1.5 border rounded-md bg-white font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Label Paper Size</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as any)}
              className="w-full px-3 py-1.5 border rounded-md bg-white"
            >
              <option value="50x25">50mm × 25mm (Standard Thermal)</option>
              <option value="40x28">40mm × 28mm (Jewelry / Small)</option>
              <option value="sheet_grid">A4 Sticker Sheet (Grid 3×8)</option>
            </select>
          </div>
        </div>

        {/* Preview / Printable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-200/60 flex flex-wrap gap-3 justify-center">
          {Array.from({ length: copies }).map((_, idx) => (
            <div
              key={idx}
              className={`bg-white p-2 border border-slate-300 rounded shadow-xs text-black font-sans text-center flex flex-col justify-between select-text ${
                labelSize === '50x25'
                  ? 'w-[50mm] h-[28mm]'
                  : labelSize === '40x28'
                  ? 'w-[40mm] h-[28mm]'
                  : 'w-[65mm] h-[35mm]'
              }`}
            >
              <div className="text-[10px] font-bold truncate leading-tight">{product.name}</div>
              <div className="text-[8px] text-slate-600 truncate">{details}</div>
              <div
                className="my-0.5 flex justify-center"
                dangerouslySetInnerHTML={{
                  __html: renderBarcodeSVG(barcodeValue, 150, 36),
                }}
              />
              <div className="flex items-center justify-between text-[9px] font-bold px-1">
                <span>SKU: {skuValue}</span>
                <span className="text-slate-900 text-[10px]">{formatCurrency(priceValue)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
