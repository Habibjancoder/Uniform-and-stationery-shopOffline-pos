'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Building,
  Layers,
  FileSpreadsheet,
  Receipt,
  Percent,
  UserCheck,
  FolderArchive,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/database';
import { BusinessType, ShopSettings, User } from '@/types';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const currentSettings = db.getSettings();

  // Form State
  const [shopName, setShopName] = useState(currentSettings.shopName || 'Al-Madina Stationery & Uniform Center');
  const [shopLogo, setShopLogo] = useState(currentSettings.shopLogo || '');
  const [ownerName, setOwnerName] = useState(currentSettings.ownerName || 'Muhammad Salman');
  const [phone, setPhone] = useState(currentSettings.phone || '0300-1234567');
  const [whatsapp, setWhatsapp] = useState(currentSettings.whatsapp || '0300-1234567');
  const [address, setAddress] = useState(currentSettings.address || 'Main Commercial Market, College Road');
  const [city, setCity] = useState(currentSettings.city || 'Lahore');
  const [invoiceFooter, setInvoiceFooter] = useState(
    currentSettings.invoiceFooter || 'Thank you for shopping with us! No return without receipt within 7 days.'
  );
  const [currency, setCurrency] = useState(currentSettings.currency || 'PKR');

  // Step 2: Business Types
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>(
    currentSettings.businessTypes || ['stationery', 'uniform', 'bags', 'books', 'general']
  );

  // Step 3: Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState(currentSettings.invoicePrefix || 'INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(currentSettings.nextInvoiceNumber || 1001);
  const [defaultTemplate, setDefaultTemplate] = useState<'a4' | 'thermal_80mm'>(
    currentSettings.defaultInvoiceTemplate || 'thermal_80mm'
  );
  const [showLogo, setShowLogo] = useState(currentSettings.showLogoOnInvoice ?? true);
  const [showCustomer, setShowCustomer] = useState(currentSettings.showCustomerOnInvoice ?? true);
  const [showDiscount, setShowDiscount] = useState(currentSettings.showDiscountOnInvoice ?? true);
  const [showProfit, setShowProfit] = useState(currentSettings.showProfitOnInvoice ?? false);

  // Step 4: Tax Settings
  const [taxEnabled, setTaxEnabled] = useState(currentSettings.taxEnabled || false);
  const [taxPercentage, setTaxPercentage] = useState(currentSettings.taxPercentage || 0);

  // Step 5: Admin User
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Step 6: Backup Location
  const [backupLocation, setBackupLocation] = useState(currentSettings.backupLocation || 'C:\\KitabGhar_Backups');

  const toggleBusinessType = (type: BusinessType) => {
    if (businessTypes.includes(type)) {
      if (businessTypes.length > 1) {
        setBusinessTypes(businessTypes.filter((t) => t !== type));
      }
    } else {
      setBusinessTypes([...businessTypes, type]);
    }
  };

  const handleFinish = () => {
    // 1. Update Shop Settings
    db.updateSettings({
      shopName,
      shopLogo,
      ownerName,
      phone,
      whatsapp,
      address,
      city,
      invoiceFooter,
      currency,
      currencySymbol: '₨',
      businessTypes,
      invoicePrefix,
      nextInvoiceNumber: Number(nextInvoiceNumber) || 1001,
      defaultInvoiceTemplate: defaultTemplate,
      showLogoOnInvoice: showLogo,
      showCustomerOnInvoice: showCustomer,
      showDiscountOnInvoice: showDiscount,
      showProfitOnInvoice: showProfit,
      taxEnabled,
      taxPercentage: Number(taxPercentage) || 0,
      backupLocation,
      setupCompleted: true,
    });

    // 2. Save Admin User
    const existingUsers = db.getUsers();
    const admin = existingUsers.find((u) => u.role === 'admin');
    if (admin) {
      admin.username = adminUsername;
      // In production sha256 or bcrypt hash
      admin.passwordHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
      db.saveUser(admin);
      db.setCurrentUser(admin);
    }

    onComplete();
  };

  const stepsList = [
    { num: 1, title: 'Shop Info', icon: Building },
    { num: 2, title: 'Categories', icon: Layers },
    { num: 3, title: 'Invoices', icon: Receipt },
    { num: 4, title: 'Tax Config', icon: Percent },
    { num: 5, title: 'Admin Setup', icon: UserCheck },
    { num: 6, title: 'Local Backup', icon: FolderArchive },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Wizard Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">First-Time Setup Wizard</h2>
                <p className="text-xs text-slate-400">
                  Configure your offline stationery, uniform, and school bag management system.
                </p>
              </div>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              Step {step} of 6
            </span>
          </div>

          {/* Stepper pills */}
          <div className="grid grid-cols-6 gap-2">
            {stepsList.map((s) => {
              const Icon = s.icon;
              const isPast = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  className={`flex flex-col items-center p-1.5 rounded-lg text-center transition ${
                    isCurrent
                      ? 'bg-emerald-600 text-white'
                      : isPast
                      ? 'bg-slate-800 text-emerald-400'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-medium truncate w-full">{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: SHOP INFORMATION */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Step 1: Shop & Contact Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shop / Business Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Kitab Ghar & Uniform Mart"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <input
                    type="text"
                    disabled
                    value="PKR (₨) - Pakistani Rupee"
                    className="w-full px-3 py-2 text-sm border bg-slate-50 text-slate-600 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS TYPES */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Step 2: Business & Product Lines</h3>
              <p className="text-xs text-slate-600">
                Select the products your shop sells. The system will activate tailored features like Uniform Sizes, Kits, and School Bag categories.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'stationery', title: 'Stationery Items', desc: 'Pens, pencils, notebooks, registers, geometry sets, art supplies' },
                  { id: 'uniform', title: 'School Uniforms (With Variants & Sets)', desc: 'School shirts, trousers, ties, sweaters, kit bundles (Sizes 20-40, gender, colors)' },
                  { id: 'bags', title: 'School Bags & Backpacks', desc: 'Waterproof bags, trolleys, pencil pouches, lunch boxes (Brands, sizes, models)' },
                  { id: 'books', title: 'Books & Syllabi', desc: 'Textbooks (PCTB, Oxford, Cambridge), workbooks, copies and guides' },
                  { id: 'general', title: 'General School Supplies', desc: 'Water bottles, badges, ribbons, book covering sheets' },
                ].map((item) => {
                  const checked = businessTypes.includes(item.id as BusinessType);
                  return (
                    <label
                      key={item.id}
                      onClick={() => toggleBusinessType(item.id as BusinessType)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        checked ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 text-emerald-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-500">{item.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: INVOICE SETTINGS */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Step 3: Receipt & Invoice Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. INV-"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Starting Invoice Number</label>
                  <input
                    type="number"
                    value={nextInvoiceNumber}
                    onChange={(e) => setNextInvoiceNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Print Template</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDefaultTemplate('thermal_80mm')}
                      className={`p-3 rounded-lg border text-left flex items-center gap-3 transition ${
                        defaultTemplate === 'thermal_80mm'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200'
                      }`}
                    >
                      <Receipt className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="text-xs">Thermal Receipt (80mm)</div>
                        <div className="text-[10px] text-slate-500 font-normal">Fast roll printing for retail counter</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultTemplate('a4')}
                      className={`p-3 rounded-lg border text-left flex items-center gap-3 transition ${
                        defaultTemplate === 'a4'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs">Full Page (A4 Invoice)</div>
                        <div className="text-[10px] text-slate-500 font-normal">Detailed institutional & school bills</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="col-span-2 space-y-2 pt-2 border-t">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Display Preferences on Receipt:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="rounded text-emerald-600" />
                      <span>Show Shop Logo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showCustomer} onChange={(e) => setShowCustomer(e.target.checked)} className="rounded text-emerald-600" />
                      <span>Show Customer Details</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showDiscount} onChange={(e) => setShowDiscount(e.target.checked)} className="rounded text-emerald-600" />
                      <span>Show Discount Lines</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showProfit} onChange={(e) => setShowProfit(e.target.checked)} className="rounded text-emerald-600" />
                      <span>Show Profit on Invoice (Internal)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: TAX SETTINGS */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Step 4: Optional Sales Tax / GST</h3>
              <p className="text-xs text-slate-600">
                In Pakistan, small stationery and uniform retail is often tax-exempt. You can enable or disable tax as required.
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enable Sales Tax / GST on Sales</div>
                    <div className="text-[11px] text-slate-500">Automatically calculate tax percentage on billing checkout</div>
                  </div>
                </label>

                {taxEnabled && (
                  <div className="pt-3 border-t">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Percentage (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(Number(e.target.value))}
                      className="w-48 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 17 or 18"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: ADMIN USER SETUP */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Step 5: Master Admin Account</h3>
              <p className="text-xs text-slate-600">
                Create your primary master login credentials. You can add more cashiers and inventory staff later.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Username *</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Password *</label>
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: BACKUP LOCATION */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Step 6: Local Database & Backup Folder</h3>
              <p className="text-xs text-slate-600">
                All data is stored 100% offline inside your Windows machine. Specify your preferred backup destination directory.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Windows Backup Directory</label>
                <input
                  type="text"
                  value={backupLocation}
                  onChange={(e) => setBackupLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default: C:\KitabGhar_Backups (You can take instant 1-click JSON/SQLite backups at any time).
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <span className="font-bold">Offline Database Ready:</span> Stationery, school uniforms with size matrix, school bags, and default accounts have been initialized. You are ready to launch!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-md transition"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Complete Setup & Launch POS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
