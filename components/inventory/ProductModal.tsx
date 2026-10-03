'use client';

import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  X,
  Sparkles,
  Barcode as BarcodeIcon,
  Layers,
  Shirt,
  ShoppingBag,
} from 'lucide-react';
import { generateInternalBarcode } from '@/lib/barcodeUtils';
import { BusinessType, Category, Product, ProductVariant, School, Supplier } from '@/types';

interface ProductModalProps {
  initialProduct?: Product | null;
  categories: Category[];
  schools: School[];
  suppliers: Supplier[];
  onSave: (product: Product) => void;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  initialProduct,
  categories,
  schools,
  suppliers,
  onSave,
  onClose,
}) => {
  const isEditing = !!initialProduct;

  // Basic Info State
  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(initialProduct?.sku || `SKU-${Date.now().toString().slice(-6)}`);
  const [barcode, setBarcode] = useState(initialProduct?.barcode || generateInternalBarcode());
  const [type, setType] = useState<BusinessType>(initialProduct?.type || 'stationery');
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId || (categories[0]?.id || ''));
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory || '');
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [supplierId, setSupplierId] = useState(initialProduct?.supplierId || '');
  const [schoolId, setSchoolId] = useState(initialProduct?.schoolId || '');
  const [unit, setUnit] = useState(initialProduct?.unit || 'Piece');

  // Single Product Pricing & Stock
  const [purchasePrice, setPurchasePrice] = useState<number>(initialProduct?.purchasePrice || 0);
  const [salePrice, setSalePrice] = useState<number>(initialProduct?.salePrice || 0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(initialProduct?.wholesalePrice || 0);
  const [minSalePrice, setMinSalePrice] = useState<number>(initialProduct?.minSalePrice || 0);
  const [currentStock, setCurrentStock] = useState<number>(initialProduct?.currentStock || 0);
  const [minStock, setMinStock] = useState<number>(initialProduct?.minStock || 5);

  // Special Variants Matrix (Uniform sizes / colors / school, Bag models)
  const [hasVariants, setHasVariants] = useState<boolean>(initialProduct?.hasVariants || false);
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants ? JSON.parse(JSON.stringify(initialProduct.variants)) : []
  );

  // Quick Variant Generator Fields
  const [genSizes, setGenSizes] = useState<string>('28, 30, 32, 34');
  const [genColor, setGenColor] = useState<string>('White');
  const [genGender, setGenGender] = useState<'boy' | 'girl' | 'unisex'>('unisex');

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleGenerateBarcode = () => {
    setBarcode(generateInternalBarcode());
  };

  const handleQuickGenerateVariants = () => {
    const sizes = genSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (sizes.length === 0) return;

    const schoolObj = schools.find((s) => s.id === schoolId);

    const generated: ProductVariant[] = sizes.map((s) => ({
      id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: initialProduct?.id || '',
      sku: `${sku}-${genColor.slice(0, 3).toUpperCase()}-${s}`,
      barcode: generateInternalBarcode('8962'),
      schoolId: schoolId || undefined,
      schoolName: schoolObj?.name || undefined,
      size: s,
      color: genColor.trim() || 'Standard',
      gender: genGender,
      purchasePrice: purchasePrice || 500,
      salePrice: salePrice || 750,
      wholesalePrice: wholesalePrice || 650,
      minSalePrice: minSalePrice || 700,
      currentStock: 10,
      minStock: 3,
    }));

    setVariants([...variants, ...generated]);
    setHasVariants(true);
  };

  const handleAddManualVariant = () => {
    const schoolObj = schools.find((s) => s.id === schoolId);
    const newVar: ProductVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: initialProduct?.id || '',
      sku: `${sku}-V${variants.length + 1}`,
      barcode: generateInternalBarcode('8962'),
      schoolId: schoolId || undefined,
      schoolName: schoolObj?.name || undefined,
      size: type === 'uniform' ? '30' : 'Standard',
      color: type === 'uniform' ? 'White' : 'Navy',
      gender: 'unisex',
      purchasePrice: purchasePrice || 100,
      salePrice: salePrice || 150,
      wholesalePrice: wholesalePrice || 120,
      minSalePrice: minSalePrice || 130,
      currentStock: 10,
      minStock: 2,
    };
    setVariants([...variants, newVar]);
    setHasVariants(true);
  };

  const updateVariant = (index: number, key: keyof ProductVariant, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [key]: val };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    if (updated.length === 0) setHasVariants(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const supplierObj = suppliers.find((s) => s.id === supplierId);
    const schoolObj = schools.find((s) => s.id === schoolId);

    const product: Product = {
      id: initialProduct?.id || `prod_${Date.now()}`,
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      type,
      categoryId,
      categoryName: selectedCategory?.name || 'General',
      subcategory: subcategory.trim() || undefined,
      brand: brand.trim() || undefined,
      description: description.trim() || undefined,
      supplierId: supplierId || undefined,
      supplierName: supplierObj?.name || undefined,
      schoolId: schoolId || undefined,
      schoolName: schoolObj?.name || undefined,
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      minSalePrice: Number(minSalePrice) || 0,
      currentStock: hasVariants
        ? variants.reduce((a, b) => a + (Number(b.currentStock) || 0), 0)
        : Number(currentStock) || 0,
      minStock: Number(minStock) || 0,
      isActive: true,
      hasVariants: hasVariants && variants.length > 0,
      variants: hasVariants && variants.length > 0 ? variants : undefined,
      createdAt: initialProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(product);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">
                {isEditing ? `Edit Product: ${initialProduct.name}` : 'Add New Inventory Product'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Supports Stationery, Uniform Size/School Variants, Bags & Books
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Business Type Tabs */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Product Department / Type</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'stationery', label: 'Stationery' },
                { id: 'uniform', label: 'School Uniform' },
                { id: 'bags', label: 'School Bags' },
                { id: 'books', label: 'Books' },
                { id: 'general', label: 'General' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setType(t.id as BusinessType);
                    if (t.id === 'uniform') setHasVariants(true);
                  }}
                  className={`py-2 px-1 rounded-lg border text-center font-bold transition text-xs ${
                    type === t.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Oxford Math Book 3 or APS White Shirt"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">Brand / Publisher</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Piano, Dux, Oxford, Champion"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Barcode (EAN / 128)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border flex items-center gap-1 font-bold shrink-0"
                  title="Generate Unique Barcode"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gen</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subcategory</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g. School Shirts, Ballpens, Notebooks"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* School Association (Especially for uniforms & bags) */}
            {(type === 'uniform' || type === 'bags') && (
              <div className="col-span-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <label className="block font-bold text-emerald-950 mb-1">
                  Associated School (For Uniforms / School Bags)
                </label>
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-slate-800"
                >
                  <option value="">General / Non-School Specific</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Piece">Piece (عدد)</option>
                <option value="Pack">Pack (پیکٹ)</option>
                <option value="Box">Box (ڈبہ)</option>
                <option value="Dozen">Dozen (درجن)</option>
                <option value="Set">Set (سیٹ)</option>
                <option value="Pair">Pair (جوڑا)</option>
                <option value="Meter">Meter (میٹر)</option>
                <option value="Kg">Kg (کلو)</option>
              </select>
            </div>
          </div>

          {/* Pricing & Stock Fields (Base or Single) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800">
              {hasVariants ? 'Base / Default Pricing' : 'Pricing & Inventory Stock'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cost / Purchase (₨)</label>
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border rounded-md bg-white font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Retail Sale Price (₨) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border rounded-md bg-white font-bold text-emerald-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Wholesale Price (₨)</label>
                <input
                  type="number"
                  min="0"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Sale Price (₨)</label>
                <input
                  type="number"
                  min="0"
                  value={minSalePrice}
                  onChange={(e) => setMinSalePrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border rounded-md bg-white"
                />
              </div>

              {!hasVariants && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Opening Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-md bg-white font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Stock Alert Level</label>
                    <input
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded-md bg-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION: UNIFORM / PRODUCT VARIANTS MATRIX */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-400" />
                <span className="font-bold">Product Variants Matrix (Sizes, Colors, Stock)</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span>Enable Multi-Variant Tracking</span>
              </label>
            </div>

            {hasVariants && (
              <div className="p-4 space-y-4 bg-slate-50">
                {/* Fast Matrix Generator */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Quick Size & Color Variant Generator</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold">Sizes (Comma separated)</label>
                      <input
                        type="text"
                        value={genSizes}
                        onChange={(e) => setGenSizes(e.target.value)}
                        placeholder="28, 30, 32, 34, 36"
                        className="w-full px-2.5 py-1 text-xs border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Color</label>
                      <input
                        type="text"
                        value={genColor}
                        onChange={(e) => setGenColor(e.target.value)}
                        placeholder="White, Grey"
                        className="w-full px-2.5 py-1 text-xs border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Gender</label>
                      <select
                        value={genGender}
                        onChange={(e) => setGenGender(e.target.value as any)}
                        className="w-full px-2.5 py-1 text-xs border rounded bg-white"
                      >
                        <option value="unisex">Unisex</option>
                        <option value="boy">Boy</option>
                        <option value="girl">Girl</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleQuickGenerateVariants}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Generate Size Variants</span>
                    </button>
                  </div>
                </div>

                {/* Variants List Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                        <th className="p-2">Size</th>
                        <th className="p-2">Color / Model</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Barcode</th>
                        <th className="p-2">Cost (₨)</th>
                        <th className="p-2">Sale (₨)</th>
                        <th className="p-2 text-center">Stock</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {variants.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-400">
                            No variants created yet. Use generator above or add manual variant.
                          </td>
                        </tr>
                      ) : (
                        variants.map((v, i) => (
                          <tr key={v.id}>
                            <td className="p-2">
                              <input
                                type="text"
                                value={v.size || ''}
                                onChange={(e) => updateVariant(i, 'size', e.target.value)}
                                className="w-16 px-1.5 py-0.5 border rounded font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={v.color || v.model || ''}
                                onChange={(e) => updateVariant(i, 'color', e.target.value)}
                                className="w-24 px-1.5 py-0.5 border rounded"
                              />
                            </td>
                            <td className="p-2 font-mono text-[11px] text-slate-600">{v.sku}</td>
                            <td className="p-2 font-mono text-[11px]">{v.barcode}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={v.purchasePrice}
                                onChange={(e) => updateVariant(i, 'purchasePrice', Number(e.target.value))}
                                className="w-16 px-1.5 py-0.5 border rounded text-right"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={v.salePrice}
                                onChange={(e) => updateVariant(i, 'salePrice', Number(e.target.value))}
                                className="w-16 px-1.5 py-0.5 border rounded text-right font-bold text-emerald-800"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                value={v.currentStock}
                                onChange={(e) => updateVariant(i, 'currentStock', Number(e.target.value))}
                                className="w-16 px-1.5 py-0.5 border rounded text-center font-bold text-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeVariant(i)}
                                className="text-slate-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleAddManualVariant}
                  className="px-3 py-1.5 border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg text-slate-600 hover:text-emerald-700 w-full text-center font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Single Variant Row</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition"
            >
              Save Product & Update Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
