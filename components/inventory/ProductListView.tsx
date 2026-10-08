'use client';

import React, { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Barcode,
  Tag,
  Edit,
  Trash2,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  Shirt,
  ShoppingBag,
  BookOpen,
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { BusinessType, Category, Product, ProductVariant, School, Supplier } from '@/types';
import { BarcodePrintModal } from './BarcodePrintModal';
import { ImportExportModal } from './ImportExportModal';
import { ProductModal } from './ProductModal';

interface ProductListViewProps {
  lang: Language;
  onRefreshDatabase?: () => void;
  onOpenStockAdjustment?: (product: Product, variant?: ProductVariant) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  lang,
  onRefreshDatabase,
  onOpenStockAdjustment,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeVariant, setBarcodeVariant] = useState<ProductVariant | undefined>(undefined);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  const loadData = () => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
    setSchools(db.getSchools());
    setSuppliers(db.getSuppliers());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Type
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      // School
      if (schoolFilter !== 'all' && p.schoolId !== schoolFilter) return false;
      // Stock Status
      if (stockFilter === 'low' && (p.currentStock > p.minStock || p.currentStock <= 0)) return false;
      if (stockFilter === 'out' && p.currentStock > 0) return false;

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode.toLowerCase().includes(q);
        const matchesBrand = p.brand?.toLowerCase().includes(q);
        const matchesSchool = p.schoolName?.toLowerCase().includes(q);
        const matchesVariants = p.variants?.some(
          (v) =>
            v.size?.toLowerCase().includes(q) ||
            v.color?.toLowerCase().includes(q) ||
            v.sku.toLowerCase().includes(q) ||
            v.barcode.includes(q)
        );

        if (!matchesName && !matchesSku && !matchesBarcode && !matchesBrand && !matchesSchool && !matchesVariants) {
          return false;
        }
      }

      return true;
    });
  }, [products, typeFilter, schoolFilter, stockFilter, search]);

  const handleSaveProduct = (prod: Product) => {
    db.saveProduct(prod);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    loadData();
    onRefreshDatabase?.();
  };

  const handleDeleteProduct = (productId: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      db.deleteProduct(productId);
      loadData();
      onRefreshDatabase?.();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Product Catalog & Uniform Inventory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage stationery, school uniforms (size & color variants), bags, books, and barcodes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-1 max-w-3xl">
          <div className="relative w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Product Name, Book Title, SKU, Barcode, School, or Uniform Size..."
              className="w-full pl-12 pr-4 py-3 h-12 border-2 border-slate-300 rounded-xl text-sm sm:text-base font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 bg-white text-slate-900 shadow-xs placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Department Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
          >
            <option value="all">All Departments</option>
            <option value="stationery">Stationery</option>
            <option value="uniform">School Uniforms</option>
            <option value="bags">School Bags</option>
            <option value="books">Books</option>
            <option value="general">General Items</option>
          </select>

          {/* School Filter */}
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 max-w-44 truncate"
          >
            <option value="all">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700"
          >
            <option value="all">All Stock Levels</option>
            <option value="low">⚠️ Low Stock Alerts</option>
            <option value="out">❌ Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Main Products Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3">Dept / Category</th>
                <th className="py-3 px-3">School / Brand</th>
                <th className="py-3 px-3">SKU & Barcode</th>
                <th className="py-3 px-3 text-right">Cost (₨)</th>
                <th className="py-3 px-3 text-right">Retail (₨)</th>
                <th className="py-3 px-3 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products matched your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStock && p.currentStock > 0;
                  const isOut = p.currentStock <= 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-slate-50 transition">
                        {/* Name and Variant count */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          {p.hasVariants && p.variants && (
                            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                              {p.variants.length} Variant Sizes/Colors Tracked Separately
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[11px]">
                            {p.categoryName}
                          </span>
                          {p.subcategory && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{p.subcategory}</div>
                          )}
                        </td>

                        {/* School / Brand */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {p.schoolName ? p.schoolName : p.brand || '-'}
                          </div>
                        </td>

                        {/* SKU / Barcode */}
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="text-slate-700">{p.sku}</div>
                          <div className="text-slate-400 text-[10px]">{p.barcode}</div>
                        </td>

                        {/* Cost */}
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          {formatCurrency(p.purchasePrice)}
                        </td>

                        {/* Retail Sale */}
                        <td className="py-3 px-3 text-right font-bold text-emerald-800 text-sm">
                          {formatCurrency(p.salePrice)}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                          {isLow && (
                            <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                              Low Stock (&lt;{p.minStock})
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Barcode Print */}
                            <button
                              onClick={() => {
                                setBarcodeProduct(p);
                                setBarcodeVariant(undefined);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                              title="Print Barcode Labels"
                            >
                              <Tag className="w-4 h-4" />
                            </button>

                            {/* Stock Adjustment */}
                            <button
                              onClick={() => onOpenStockAdjustment?.(p)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                              title="Adjust Stock Qty"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                              title="Edit Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Variants Sub-Table */}
                      {p.hasVariants && p.variants && p.variants.length > 0 && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="py-2.5 px-6">
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                              <div className="px-3 py-1 bg-slate-800 text-white text-[10px] font-bold flex justify-between items-center">
                                <span>Individual Uniform / Bag Variants for {p.name}</span>
                                <span>Tracked Independently</span>
                              </div>
                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 font-bold border-b">
                                    <th className="p-2">Variant / Size</th>
                                    <th className="p-2">Color / Model</th>
                                    <th className="p-2">SKU</th>
                                    <th className="p-2">Barcode</th>
                                    <th className="p-2 text-right">Cost</th>
                                    <th className="p-2 text-right">Retail</th>
                                    <th className="p-2 text-center">Variant Stock</th>
                                    <th className="p-2 text-center">Print Label</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {p.variants.map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-50">
                                      <td className="p-2 font-bold text-slate-800">
                                        Size: {v.size || '-'} {v.gender ? `(${v.gender})` : ''}
                                      </td>
                                      <td className="p-2 text-slate-600">{v.color || v.model || '-'}</td>
                                      <td className="p-2 font-mono text-[10px] text-slate-500">{v.sku}</td>
                                      <td className="p-2 font-mono text-[10px] text-slate-500">{v.barcode}</td>
                                      <td className="p-2 text-right">{formatCurrency(v.purchasePrice)}</td>
                                      <td className="p-2 text-right font-bold text-emerald-800">
                                        {formatCurrency(v.salePrice)}
                                      </td>
                                      <td className="p-2 text-center font-extrabold text-slate-900">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] ${
                                            v.currentStock <= 0
                                              ? 'bg-red-100 text-red-700'
                                              : v.currentStock <= v.minStock
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-emerald-50 text-emerald-700'
                                          }`}
                                        >
                                          {v.currentStock} units
                                        </span>
                                      </td>
                                      <td className="p-2 text-center">
                                        <button
                                          onClick={() => {
                                            setBarcodeProduct(p);
                                            setBarcodeVariant(v);
                                          }}
                                          className="text-emerald-700 hover:underline font-bold text-[10px]"
                                        >
                                          Label
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT ADD / EDIT MODAL */}
      {isProductModalOpen && (
        <ProductModal
          initialProduct={editingProduct}
          categories={categories}
          schools={schools}
          suppliers={suppliers}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* BARCODE PRINT MODAL */}
      {barcodeProduct && (
        <BarcodePrintModal
          product={barcodeProduct}
          selectedVariant={barcodeVariant}
          onClose={() => {
            setBarcodeProduct(null);
            setBarcodeVariant(undefined);
          }}
        />
      )}

      {/* IMPORT / EXPORT MODAL */}
      {isImportExportOpen && (
        <ImportExportModal
          products={products}
          categories={categories}
          schools={schools}
          onImportProducts={(imported) => {
            for (const item of imported) {
              db.saveProduct(item);
            }
            loadData();
            onRefreshDatabase?.();
          }}
          onClose={() => setIsImportExportOpen(false)}
        />
      )}
    </div>
  );
};
