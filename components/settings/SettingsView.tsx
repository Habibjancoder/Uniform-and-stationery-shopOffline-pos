'use client';

import React, { useState } from 'react';
import {
  Settings,
  Building,
  Receipt,
  Percent,
  FolderArchive,
  Database,
  Trash2,
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HardDrive,
  Terminal,
  FileText,
} from 'lucide-react';
import { db } from '@/lib/database';
import { Language, t } from '@/lib/i18n';
import { BusinessType, ShopSettings } from '@/types';
import {
  downloadOfflineBatchLauncher,
  downloadUrduGuideFile,
} from '@/lib/backupUtils';

interface SettingsViewProps {
  settings: ShopSettings;
  lang: Language;
  onRefreshSettings: () => void;
  onOpenWizard: () => void;
  onOpenUsbBackup?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  lang,
  onRefreshSettings,
  onOpenWizard,
  onOpenUsbBackup,
}) => {
  const [shopName, setShopName] = useState(settings.shopName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [address, setAddress] = useState(settings.address);
  const [city, setCity] = useState(settings.city);
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoiceFooter);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [defaultTemplate, setDefaultTemplate] = useState(settings.defaultInvoiceTemplate);
  const [showLogo, setShowLogo] = useState(settings.showLogoOnInvoice);
  const [showCustomer, setShowCustomer] = useState(settings.showCustomerOnInvoice);
  const [showDiscount, setShowDiscount] = useState(settings.showDiscountOnInvoice);
  const [taxEnabled, setTaxEnabled] = useState(settings.taxEnabled);
  const [taxPercentage, setTaxPercentage] = useState(settings.taxPercentage);
  const [preventNegativeStock, setPreventNegativeStock] = useState(settings.preventNegativeStock);
  const [backupLocation, setBackupLocation] = useState(settings.backupLocation);

  const [message, setMessage] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings({
      shopName,
      ownerName,
      phone,
      whatsapp,
      address,
      city,
      invoiceFooter,
      invoicePrefix,
      defaultInvoiceTemplate: defaultTemplate,
      showLogoOnInvoice: showLogo,
      showCustomerOnInvoice: showCustomer,
      showDiscountOnInvoice: showDiscount,
      taxEnabled,
      taxPercentage: Number(taxPercentage) || 0,
      preventNegativeStock,
      backupLocation,
    });

    setMessage('Settings updated successfully!');
    setTimeout(() => setMessage(null), 3000);
    onRefreshSettings();
  };

  // Instant Full Backup Download
  const handleDownloadBackup = () => {
    const { fileName, jsonData } = db.createFullBackup();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Backup downloaded: ${fileName}`);
    setTimeout(() => setMessage(null), 3000);
  };

  // Restore from File
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('WARNING: Restoring will overwrite existing data with the backup file. Do you wish to continue?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        db.restoreFromBackup(text);
        setMessage('Database restored successfully from backup!');
        onRefreshSettings();
      } catch (err: any) {
        alert(`Restore error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Clear Demo Data
  const handleClearDemoData = () => {
    if (
      confirm(
        'Are you sure you want to PURGE all sample products and invoices? This prepares the system for real production use with a clean slate.'
      )
    ) {
      db.cleanDemoData();
      setMessage('Demo data purged! System is clean for real store launch.');
      onRefreshSettings();
    }
  };

  // Reload Demo Data
  const handleReloadDemoData = () => {
    if (confirm('Load Pakistani retail stationery, uniform size variants, and bag sample catalog?')) {
      db.loadDemoData();
      setMessage('Sample catalog loaded successfully!');
      onRefreshSettings();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <span>Store Configuration, Printer & Database Backup</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure shop profile, tax, negative stock safety, backups, and thermal receipt formats.
          </p>
        </div>

        <button
          onClick={onOpenWizard}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Launch Setup Wizard</span>
        </button>
      </div>

      {message && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Settings Form Body */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          {/* Shop Profile */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b pb-3">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Shop Branding & Address</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md font-bold text-slate-900"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Proprietor / Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shop Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Invoice Receipt Footer Note</label>
                <input
                  type="text"
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {/* POS & Billing Preferences */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b pb-3">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Billing, Invoicing & Inventory Safety</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Print Template</label>
                <select
                  value={defaultTemplate}
                  onChange={(e) => setDefaultTemplate(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md bg-white font-semibold text-slate-800"
                >
                  <option value="thermal_80mm">Thermal Receipt 80mm Roll</option>
                  <option value="a4">Full Page A4 Invoice Sheet</option>
                </select>
              </div>

              {/* Prevent negative stock */}
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Prevent Negative Inventory Overselling</div>
                  <div className="text-[11px] text-slate-500">
                    Blocks selling items when stock reaches 0 units. (Recommended: ON)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preventNegativeStock}
                  onChange={(e) => setPreventNegativeStock(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
              </div>

              {/* Tax settings */}
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">Enable Sales Tax / GST</div>
                    <div className="text-[11px] text-slate-500">Calculate tax percentage automatically at billing</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                </div>

                {taxEnabled && (
                  <div className="pt-2 border-t flex items-center gap-3">
                    <span className="font-semibold text-slate-700">Tax Percentage (%):</span>
                    <input
                      type="number"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(Number(e.target.value))}
                      className="w-24 px-2.5 py-1 border rounded bg-white font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>

        {/* Database Safety, USB Backup & Offline Controls */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-5 max-w-4xl">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>USB Flash Drive Backup, Data Recovery & Offline Setup</span>
            </div>
            {onOpenUsbBackup && (
              <button
                type="button"
                onClick={onOpenUsbBackup}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Open USB Backup Center</span>
              </button>
            )}
          </div>

          {/* USB & Direct Offline Run Ribbon */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-extrabold flex items-center gap-2 text-emerald-400">
                <Terminal className="w-4 h-4" />
                <span>100% Offline Windows Execution (No Internet & No API Key Needed)</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Aap is app ko apne computer par bina internet direct double-click karke chala sakte hain.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadOfflineBatchLauncher}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg font-bold text-xs transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download RUN_OFFLINE.bat</span>
              </button>
              <button
                type="button"
                onClick={downloadUrduGuideFile}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Urdu Guide (.txt)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Backup download */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-600" />
                <span>Full Database Backup (.json)</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Creates a complete standalone JSON snapshot containing all products, uniform sizes, customers, sales history, and audit ledger for saving to USB flash drive.
              </p>
              <div className="flex items-center gap-2">
                {onOpenUsbBackup ? (
                  <button
                    type="button"
                    onClick={onOpenUsbBackup}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Save to USB Flash Drive</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Backup File</span>
                  </button>
                )}
              </div>
            </div>

            {/* Restore from file */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Restore Database from File / USB</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Restore previously backed up database file on any Windows computer running this offline ERP.
              </p>
              {onOpenUsbBackup ? (
                <button
                  type="button"
                  onClick={onOpenUsbBackup}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Open Restore / Recovery Tool</span>
                </button>
              ) : (
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Select Backup File to Restore</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Sample Data vs Clean State */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-800">Production Ready Data Controls:</div>
              <div className="text-[11px] text-slate-500">
                You can purge demo products to start real retail selling or reload sample items anytime.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReloadDemoData}
                className="px-3.5 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Sample Data</span>
              </button>

              <button
                type="button"
                onClick={handleClearDemoData}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Sample Products & Invoices</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
