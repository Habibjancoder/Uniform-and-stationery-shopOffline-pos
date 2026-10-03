'use client';

import React, { useState } from 'react';
import {
  Shirt,
  Plus,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Barcode,
  X,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { generateInternalBarcode } from '@/lib/barcodeUtils';
import { db } from '@/lib/database';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Product, School, UniformSet, UniformSetComponent } from '@/types';

interface UniformSetViewProps {
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const UniformSetView: React.FC<UniformSetViewProps> = ({ lang, onRefreshDatabase }) => {
  const [sets, setSets] = useState<UniformSet[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<UniformSet | null>(null);

  // Form State
  const [setName, setSetName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [season, setSeason] = useState<'summer' | 'winter' | 'sports' | 'custom'>('summer');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [setPrice, setSetPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [components, setComponents] = useState<UniformSetComponent[]>([]);

  const loadData = () => {
    setSets(db.getUniformSets());
    setSchools(db.getSchools());
    setProducts(db.getProducts().filter((p) => p.type === 'uniform' || p.categoryId === 'cat_uniforms'));
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingSet(null);
    setSetName('');
    setSchoolId(schools[0]?.id || '');
    setSeason('summer');
    setSku(`KIT-${Date.now().toString().slice(-6)}`);
    setBarcode(generateInternalBarcode('8969'));
    setSetPrice(0);
    setDescription('');
    setComponents([]);
    setIsModalOpen(true);
  };

  const handleAddComponent = (product: Product, variantId?: string) => {
    let variantLabel = '';
    if (variantId && product.variants) {
      const v = product.variants.find((va) => va.id === variantId);
      if (v) variantLabel = `Size: ${v.size || '-'}, Color: ${v.color || '-'}`;
    }

    const comp: UniformSetComponent = {
      productId: product.id,
      variantId,
      productName: product.name,
      variantLabel,
      quantity: 1,
    };

    setComponents([...components, comp]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponentQty = (index: number, qty: number) => {
    const updated = [...components];
    updated[index].quantity = Math.max(1, qty);
    setComponents(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim() || components.length === 0) return;

    const schoolObj = schools.find((s) => s.id === schoolId);

    const uniformKit: UniformSet = {
      id: editingSet?.id || `set_${Date.now()}`,
      name: setName.trim(),
      schoolId,
      schoolName: schoolObj?.name || 'General School',
      season,
      description: description.trim() || undefined,
      sku: sku.trim(),
      barcode: barcode.trim(),
      setPrice: Number(setPrice) || 0,
      components,
      active: true,
      createdAt: editingSet?.createdAt || new Date().toISOString(),
    };

    db.saveUniformSet(uniformKit);
    setIsModalOpen(false);
    loadData();
    onRefreshDatabase?.();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete kit "${name}"?`)) {
      db.deleteUniformSet(id);
      loadData();
      onRefreshDatabase?.();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shirt className="w-5 h-5 text-emerald-600" />
            <span>School Uniform Set & Bundle Kits</span>
          </h2>
          <p className="text-xs text-slate-500">
            Create pre-packaged kits (Summer, Winter, Sports kits). Selling a kit automatically deducts individual shirts, trousers, ties, and belts from inventory.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Uniform Kit</span>
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sets.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              No uniform kits created yet. Click "+ Create New Uniform Kit" above.
            </div>
          ) : (
            sets.map((set) => (
              <div
                key={set.id}
                className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                {/* Kit Header */}
                <div className="p-5 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {set.season} Kit
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {set.sku}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{set.name}</h3>
                  <div className="text-xs text-slate-500 font-semibold">{set.schoolName}</div>
                  {set.description && (
                    <p className="text-[11px] text-slate-400 leading-normal">{set.description}</p>
                  )}
                </div>

                {/* Kit Components List */}
                <div className="p-5 flex-1 bg-slate-50/50 space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Included Kit Components ({set.components.length}):
                  </div>
                  <div className="space-y-1.5">
                    {set.components.map((comp, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{comp.productName}</div>
                          {comp.variantLabel && (
                            <div className="text-[10px] text-emerald-700">{comp.variantLabel}</div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded">
                          x{comp.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kit Footer / Price */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Bundle Price
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {formatCurrency(set.setPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(set.id, set.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition"
                      title="Delete Kit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE UNIFORM KIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Create School Uniform Kit</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Kit Name *</label>
                  <input
                    type="text"
                    required
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="e.g. APS Summer Uniform Kit (Size 30)"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">School *</label>
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Season</label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="summer">Summer Uniform Kit</option>
                    <option value="winter">Winter Uniform Kit</option>
                    <option value="sports">Sports Day Kit</option>
                    <option value="custom">Custom Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kit SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kit Bundle Price (₨) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={setPrice}
                    onChange={(e) => setSetPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md font-bold text-emerald-800 text-sm"
                  />
                </div>
              </div>

              {/* Kit Components Builder */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 flex justify-between items-center">
                  <span>Kit Component Items:</span>
                  <span className="text-[11px] text-slate-500">Pick from existing uniforms below</span>
                </div>

                {/* Selected components */}
                <div className="space-y-1.5">
                  {components.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-white border border-dashed rounded-lg">
                      No components added to this kit yet. Click available items below to add.
                    </div>
                  ) : (
                    components.map((comp, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{comp.productName}</span>
                          {comp.variantLabel && (
                            <span className="text-[11px] text-emerald-700 ml-2">({comp.variantLabel})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={comp.quantity}
                            onChange={(e) => updateComponentQty(idx, Number(e.target.value))}
                            className="w-12 px-1.5 py-0.5 border rounded text-center font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => removeComponent(idx)}
                            className="text-red-500 p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Available Items selector */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-600 mb-2">Available Uniform Items to Add:</div>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-2 border rounded-lg">
                    {products.map((p) => {
                      if (p.hasVariants && p.variants) {
                        return p.variants.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleAddComponent(p, v.id)}
                            className="p-1.5 hover:bg-emerald-50 rounded flex justify-between items-center cursor-pointer text-[11px] border-b border-slate-50"
                          >
                            <span>
                              {p.name} - <strong>Size {v.size || '-'}</strong> ({v.color || '-'})
                            </span>
                            <span className="text-emerald-700 font-bold">+ Add to Kit</span>
                          </div>
                        ));
                      }
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleAddComponent(p)}
                          className="p-1.5 hover:bg-emerald-50 rounded flex justify-between items-center cursor-pointer text-[11px] border-b border-slate-50"
                        >
                          <span>{p.name}</span>
                          <span className="text-emerald-700 font-bold">+ Add to Kit</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition"
                >
                  Save Uniform Kit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
