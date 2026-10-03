'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateInternalBarcode } from '@/lib/barcodeUtils';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { Category, Product, School } from '@/types';

interface ImportExportModalProps {
  products: Product[];
  categories: Category[];
  schools: School[];
  onImportProducts: (importedProducts: Product[]) => void;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  products,
  categories,
  schools,
  onImportProducts,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validProducts, setValidProducts] = useState<Product[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Download Sample CSV / Excel Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Product Name': 'APS White Cotton Shirt',
        SKU: 'APS-SH-WHT-30',
        Barcode: '896400010999',
        Category: 'School Uniforms',
        Brand: 'National',
        School: 'Army Public School (APS)',
        Size: '30',
        Color: 'White',
        'Purchase Price': 550,
        'Sale Price': 850,
        'Opening Stock': 20,
        'Minimum Stock': 5,
        Unit: 'Piece',
      },
      {
        'Product Name': 'Piano Ballpen 0.8mm Blue',
        SKU: 'PEN-PIA-BLU-100',
        Barcode: '896400010998',
        Category: 'Stationery',
        Brand: 'Piano',
        School: '',
        Size: '',
        Color: 'Blue',
        'Purchase Price': 18,
        'Sale Price': 25,
        'Opening Stock': 150,
        'Minimum Stock': 25,
        Unit: 'Piece',
      },
    ];

    exportToExcel('Product_Import_Template', 'Template', templateRows);
  };

  // Handle File Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationErrors([]);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        setParsedRows(data);
        validateAndPrepare(data);
      } catch (err: any) {
        setValidationErrors([`File reading failed: ${err.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Validate parsed rows
  const validateAndPrepare = (rows: any[]) => {
    const errors: string[] = [];
    const valid: Product[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const name = row['Product Name'] || row['product_name'] || row['name'];
      const sku = row['SKU'] || row['sku'] || `SKU-${Date.now()}-${idx}`;
      const barcode = String(row['Barcode'] || row['barcode'] || generateInternalBarcode());
      const catName = row['Category'] || row['category'] || 'General';
      const brand = row['Brand'] || row['brand'] || '';
      const schoolName = row['School'] || row['school'] || '';
      const size = String(row['Size'] || row['size'] || '');
      const color = String(row['Color'] || row['color'] || '');
      const cost = Number(row['Purchase Price'] || row['purchase_price'] || row['cost']) || 0;
      const sale = Number(row['Sale Price'] || row['sale_price'] || row['price']) || 0;
      const stock = Number(row['Opening Stock'] || row['stock'] || row['quantity']) || 0;
      const minStock = Number(row['Minimum Stock'] || row['min_stock']) || 5;
      const unit = row['Unit'] || row['unit'] || 'Piece';

      if (!name) {
        errors.push(`Row ${rowNum}: Product Name is required.`);
        return;
      }

      if (sale < 0 || cost < 0) {
        errors.push(`Row ${rowNum} (${name}): Prices cannot be negative.`);
        return;
      }

      // Find category
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase()
      ) || categories[0];

      // Find school
      const matchedSchool = schools.find(
        (s) => s.name.toLowerCase() === schoolName.toLowerCase() || s.code.toLowerCase() === schoolName.toLowerCase()
      );

      const hasVariantDetails = !!(size || color);

      const product: Product = {
        id: `prod_imp_${Date.now()}_${idx}`,
        name: String(name).trim(),
        sku: String(sku).trim(),
        barcode,
        type: matchedCat?.type || 'stationery',
        categoryId: matchedCat?.id || 'cat_general',
        categoryName: matchedCat?.name || 'General',
        brand: brand ? String(brand).trim() : undefined,
        schoolId: matchedSchool?.id,
        schoolName: matchedSchool?.name,
        unit,
        purchasePrice: cost,
        salePrice: sale,
        wholesalePrice: Math.round(sale * 0.9),
        minSalePrice: cost,
        currentStock: stock,
        minStock,
        isActive: true,
        hasVariants: hasVariantDetails,
        variants: hasVariantDetails
          ? [
              {
                id: `var_imp_${Date.now()}_${idx}`,
                productId: `prod_imp_${Date.now()}_${idx}`,
                sku: `${sku}-${size || 'STD'}`,
                barcode,
                schoolId: matchedSchool?.id,
                schoolName: matchedSchool?.name,
                size: size || undefined,
                color: color || undefined,
                gender: 'unisex',
                purchasePrice: cost,
                salePrice: sale,
                currentStock: stock,
                minStock,
              },
            ]
          : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      valid.push(product);
    });

    setValidationErrors(errors);
    setValidProducts(valid);
  };

  const handleExecuteImport = () => {
    if (validProducts.length === 0) return;
    onImportProducts(validProducts);
    setImportSuccessMessage(`Successfully imported ${validProducts.length} products into the database!`);
    setParsedRows([]);
    setValidProducts([]);
  };

  // Export handlers
  const handleExportAllProductsCSV = () => {
    const rows = products.map((p) => ({
      'Product Name': p.name,
      SKU: p.sku,
      Barcode: p.barcode,
      Category: p.categoryName,
      Department: p.type,
      Brand: p.brand || '',
      School: p.schoolName || '',
      Unit: p.unit,
      'Purchase Price': p.purchasePrice,
      'Sale Price': p.salePrice,
      'Current Stock': p.currentStock,
      'Min Stock': p.minStock,
      'Stock Valuation': p.currentStock * p.purchasePrice,
    }));
    exportToCSV(`Products_Export_${new Date().toISOString().split('T')[0]}`, rows);
  };

  const handleExportAllProductsExcel = () => {
    const rows = products.map((p) => ({
      'Product Name': p.name,
      SKU: p.sku,
      Barcode: p.barcode,
      Category: p.categoryName,
      Department: p.type,
      Brand: p.brand || '',
      School: p.schoolName || '',
      Unit: p.unit,
      'Purchase Price': p.purchasePrice,
      'Sale Price': p.salePrice,
      'Current Stock': p.currentStock,
      'Min Stock': p.minStock,
      'Stock Valuation': p.currentStock * p.purchasePrice,
    }));
    exportToExcel(`Products_Catalog_${new Date().toISOString().split('T')[0]}`, 'Catalog', rows);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Product Data Import & Export</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-center flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Product Catalog</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-center flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel / CSV</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-slate-600">
                Export your complete active product catalog including SKU, barcodes, uniform variants, stock quantities, and cost/sale valuations.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleExportAllProductsExcel}
                  className="p-5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-2 transition group"
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition" />
                  <span className="font-bold text-slate-800">Export as Microsoft Excel (.xlsx)</span>
                  <span className="text-[10px] text-slate-500">Formatted spreadsheet for inventory valuation</span>
                </button>

                <button
                  onClick={handleExportAllProductsCSV}
                  className="p-5 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-2 transition group"
                >
                  <FileText className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
                  <span className="font-bold text-slate-800">Export as CSV File</span>
                  <span className="text-[10px] text-slate-500">Raw comma-separated table for any software</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs">
                Total Products Ready for Export: <strong>{products.length}</strong> items
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-600">
                  Upload an Excel (.xlsx, .xls) or CSV file with product rows.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-emerald-700 hover:underline font-bold text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template</span>
                </button>
              </div>

              {/* Upload Input Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer relative bg-slate-50">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-bold text-slate-800 text-xs">
                  Click or drag Excel/CSV file to inspect & import
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Supports .xlsx, .xls, .csv</div>
              </div>

              {/* Success Message */}
              {importSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              {/* Validation Errors Box */}
              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <div className="font-bold text-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Errors found in file ({validationErrors.length})</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] text-red-700 space-y-0.5">
                    {validationErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {validationErrors.length > 5 && <li>...and {validationErrors.length - 5} more issues.</li>}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {validProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">
                      Validated Rows Ready to Import: <strong>{validProducts.length}</strong>
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Category</th>
                          <th className="p-2 text-right">Cost</th>
                          <th className="p-2 text-right">Sale</th>
                          <th className="p-2 text-center">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validProducts.slice(0, 10).map((p, i) => (
                          <tr key={i}>
                            <td className="p-2 font-semibold">{p.name}</td>
                            <td className="p-2 font-mono text-[10px] text-slate-500">{p.sku}</td>
                            <td className="p-2">{p.categoryName}</td>
                            <td className="p-2 text-right">₨ {p.purchasePrice}</td>
                            <td className="p-2 text-right font-bold text-emerald-800">₨ {p.salePrice}</td>
                            <td className="p-2 text-center font-bold">{p.currentStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs"
          >
            Close
          </button>

          {activeTab === 'import' && validProducts.length > 0 && (
            <button
              onClick={handleExecuteImport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition"
            >
              Confirm Import ({validProducts.length} Items)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
