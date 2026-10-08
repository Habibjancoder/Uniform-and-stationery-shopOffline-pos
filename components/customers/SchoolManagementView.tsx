'use client';

import React, { useMemo, useState } from 'react';
import { Building, Plus, Search, Phone, Shirt, Download, X } from 'lucide-react';
import { db } from '@/lib/database';
import { exportToExcel } from '@/lib/exportUtils';
import { formatCurrency, Language, t } from '@/lib/i18n';
import { Product, School, UniformSet } from '@/types';

interface SchoolManagementViewProps {
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const SchoolManagementView: React.FC<SchoolManagementViewProps> = ({
  lang,
  onRefreshDatabase,
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sets, setSets] = useState<UniformSet[]>([]);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setSchools(db.getSchools());
    setProducts(db.getProducts());
    setSets(db.getUniformSets());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const mName = s.name.toLowerCase().includes(q);
        const mCode = s.code.toLowerCase().includes(q);
        const mContact = s.contactPerson.toLowerCase().includes(q);
        if (!mName && !mCode && !mContact) return false;
      }
      return true;
    });
  }, [schools, search]);

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSchool: School = {
      id: `sch_${Date.now()}`,
      name: name.trim(),
      code: code.trim() || name.slice(0, 3).toUpperCase(),
      contactPerson: contactPerson.trim() || 'Principal / Admin',
      phone: phone.trim() || '0300-0000000',
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      notes: notes.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };

    db.saveSchool(newSchool);
    setIsModalOpen(false);
    setName('');
    setCode('');
    setContactPerson('');
    setPhone('');
    loadData();
    onRefreshDatabase?.();
  };

  const handleExportExcel = () => {
    const rows = filteredSchools.map((s) => ({
      School: s.name,
      Code: s.code,
      'Contact Person': s.contactPerson,
      Phone: s.phone,
      WhatsApp: s.whatsapp,
      Address: s.address,
      Notes: s.notes || '',
    }));
    exportToExcel(`Schools_Directory_${new Date().toISOString().split('T')[0]}`, 'Schools', rows);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <span>Dedicated School Directory & Partnerships</span>
          </h2>
          <p className="text-xs text-slate-500">
            Official partner schools for prescribed uniforms, crest badges, and customized school bags.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add School Profile</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school name, code, contact person..."
            className="w-full pl-11 pr-4 py-2.5 h-11 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3.5 py-1.5 border rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Directory</span>
        </button>
      </div>

      {/* Schools Cards Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchools.map((s) => {
            const schoolProds = products.filter((p) => p.schoolId === s.id);
            const schoolSets = sets.filter((set) => set.schoolId === s.id);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] tracking-wider uppercase">
                      Code: {s.code}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">Active Partner</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{s.name}</h3>
                  <div className="text-xs text-slate-600 font-medium">
                    Contact: <strong>{s.contactPerson}</strong>
                  </div>
                  <div className="text-xs text-slate-500">
                    Phone: {s.phone} {s.whatsapp && `| WA: ${s.whatsapp}`}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{s.address}</div>
                  {s.notes && (
                    <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t">{s.notes}</p>
                  )}
                </div>

                {/* Linked Products Count & Kits */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Shirt className="w-4 h-4 text-emerald-600" />
                    <span>{schoolProds.length} Uniform Products</span>
                  </div>
                  <span className="text-emerald-700 font-bold">
                    {schoolSets.length} Kit Bundles
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD SCHOOL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Add New School Profile</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchool} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">School Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Army Public School (APS)"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">School Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. APS, TCS, BSS"
                    className="w-full px-3 py-2 border rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Principal / Admin Officer"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Campus branch location"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Uniform Specifications / Crest Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. White shirt with school crest on left pocket, grey trousers"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
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
                  Save School Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
