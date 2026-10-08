'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  FileCheck,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  X,
  FileText,
  Terminal,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/lib/database';
import { ShopSettings, BackupRecord } from '@/types';
import {
  saveBackupToUsbOrDrive,
  downloadOfflineBatchLauncher,
  downloadUrduGuideFile,
} from '@/lib/backupUtils';

interface UsbBackupModalProps {
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
  onRefreshAll: () => void;
  initialTab?: 'backup' | 'restore' | 'offline_guide';
}

export const UsbBackupModal: React.FC<UsbBackupModalProps> = ({
  settings,
  isOpen,
  onClose,
  onRefreshAll,
  initialTab = 'backup',
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'offline_guide'>(initialTab);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auto-backup configuration state
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(settings.autoBackupEnabled !== false);
  const [autoBackupInterval, setAutoBackupInterval] = useState<'daily' | 'hourly' | 'on_sale' | 'on_shift_close'>(
    settings.autoBackupInterval || 'daily'
  );
  const [lastBackupTime, setLastBackupTime] = useState<string>(settings.lastAutoBackupTime || '');

  // Restore preview state
  const [restoreFileRaw, setRestoreFileRaw] = useState<string | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [restoreSummary, setRestoreSummary] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

  // Backups list
  const [backupsList, setBackupsList] = useState<BackupRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setBackupsList(db.getBackups());
      setAutoBackupEnabled(settings.autoBackupEnabled !== false);
      setAutoBackupInterval(settings.autoBackupInterval || 'daily');
      setLastBackupTime(settings.lastAutoBackupTime || '');
      setMessage(null);
      setRestoreFileRaw(null);
      setRestoreSummary(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // 1. Save Backup to USB Flash Drive (User chooses Drive E:, F:, D: etc.)
  const handleSaveToUsbPicker = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const { fileName, jsonData } = db.createFullBackup();
      const res = await saveBackupToUsbOrDrive(fileName, jsonData);

      if (res.success) {
        if (res.method === 'filesystem_api') {
          setMessage({
            type: 'success',
            text: `✅ Backup successfully saved directly to your USB Flash Drive / Selected Folder: "${res.fileName}"!`,
          });
        } else {
          setMessage({
            type: 'success',
            text: `✅ Backup file downloaded: "${res.fileName}". You can save or copy it to your USB Flash Drive.`,
          });
        }
        setBackupsList(db.getBackups());
        onRefreshAll();
      } else if (res.method === 'canceled') {
        setMessage({
          type: 'info',
          text: 'Backup folder selection was canceled.',
        });
      } else {
        setMessage({
          type: 'error',
          text: `Backup error: ${res.error || 'Failed to save file'}`,
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Error creating backup: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Direct Instant Download
  const handleDirectDownload = () => {
    try {
      const { fileName, jsonData } = db.createFullBackup();
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);

      setMessage({
        type: 'success',
        text: `✅ Full backup downloaded as "${fileName}". Copy this file to your USB drive for safe storage!`,
      });
      setBackupsList(db.getBackups());
      onRefreshAll();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Error downloading backup: ${err.message}`,
      });
    }
  };

  // 3. Save Auto-Backup preferences
  const handleSaveAutoBackupSettings = () => {
    db.updateSettings({
      autoBackupEnabled,
      autoBackupInterval,
    });
    setMessage({
      type: 'success',
      text: 'Auto-backup preferences saved successfully!',
    });
    onRefreshAll();
    setTimeout(() => setMessage(null), 3500);
  };

  // 4. File Selected for Restore Preview
  const handleFileForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setIsProcessing(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        setRestoreFileRaw(text);
        const summary = db.getBackupSummary(text);
        if (!summary.valid) {
          setMessage({
            type: 'error',
            text: `Invalid backup file: ${summary.error || 'Does not match KitabGhar ERP data structure'}`,
          });
          setRestoreSummary(null);
        } else {
          setRestoreSummary(summary);
          setMessage({
            type: 'info',
            text: `Backup file "${file.name}" analyzed. Verify details below before confirming recovery.`,
          });
        }
      } catch (err: any) {
        setMessage({
          type: 'error',
          text: `Failed to read file: ${err.message}`,
        });
        setRestoreSummary(null);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Error reading selected file from disk.' });
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  // 5. Execute Restore
  const handleExecuteRestore = () => {
    if (!restoreFileRaw) return;

    const confirmPrompt =
      restoreMode === 'replace'
        ? 'WARNING: This will overwrite your current local database with the records from the USB backup file. Are you sure you wish to proceed?'
        : 'This will merge missing products, sales, and customers into your current database. Proceed with Safe Merge?';

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = db.restoreFromBackup(restoreFileRaw, restoreMode);
      setMessage({
        type: 'success',
        text: `🎉 DATA RESTORE COMPLETED! ${res.message}`,
      });
      setRestoreFileRaw(null);
      setRestoreSummary(null);
      onRefreshAll();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Restore failed: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>USB & Local Backup Center</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  100% Offline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                یو ایس بی ڈرائیو میں بیک اپ بنائیں اور کسی بھی وقت مکمل ڈیٹا بحال (Recover) کریں
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>Create USB Backup (بیک اپ بنائیں)</span>
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'restore'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Recover / Restore Data (ڈیٹا بحال کریں)</span>
          </button>

          <button
            onClick={() => setActiveTab('offline_guide')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'offline_guide'
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-600" />
            <span>1-Click Offline Runner (.bat) & Guide</span>
          </button>
        </div>

        {/* Status / Alert Banner */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : message.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {message.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            {message.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span className="flex-1">{message.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Primary USB Action Card */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-2xl border-2 border-emerald-200 p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                      Recommended Daily Action
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Select USB Flash Drive / Drive & Save Backup
                    </h3>
                    <p className="text-xs text-slate-600 max-w-xl">
                      Click below to open the Windows File Explorer dialog. Select your USB Flash Drive (e.g. Drive E:, F:, or D:) to save an instant complete snapshot of all products, uniforms, sales, and accounts.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleSaveToUsbPicker}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HardDrive className="w-4 h-4 text-white" />
                      <span>Select USB Flash Drive & Save</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleDirectDownload}
                      className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                      title="Direct browser download fallback"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Download File (.json)</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Includes: Inventory, Books, Uniforms, Invoices, Udhaar Ledger, Customer Balances</span>
                  </div>
                  <div className="font-medium text-slate-600">
                    Format: Self-contained JSON (Works on any PC offline)
                  </div>
                </div>
              </div>

              {/* Auto Backup Configuration Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Auto-Backup Settings (خودکار بیک اپ ترتیبات)
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBackupEnabled}
                      onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-700">
                      {autoBackupEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Auto-Backup Trigger / Frequency
                    </label>
                    <select
                      value={autoBackupInterval}
                      onChange={(e) => setAutoBackupInterval(e.target.value as any)}
                      disabled={!autoBackupEnabled}
                      className="w-full px-3 py-2 border rounded-lg bg-white font-semibold text-slate-800 disabled:opacity-50"
                    >
                      <option value="on_sale">After Every Completed Sale Invoice (ہر بل بننے پر)</option>
                      <option value="hourly">Every 1 Hour (ہر گھنٹے بعد)</option>
                      <option value="daily">Daily / Shift Close (دن کے اختتام پر)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Whenever triggered, an automated snapshot is registered in the offline database registry.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Last Auto-Backup Snapshot
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                        {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'Not created yet today'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAutoBackupSettings}
                      className="mt-3 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition self-end"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Backups History */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Recent Backup History ({backupsList.length} logs)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Stored in offline system index</span>
                </div>

                {backupsList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 italic text-center">
                    No recent backups recorded yet. Click &quot;Select USB Flash Drive & Save&quot; above to create your first backup!
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-48 custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-slate-50 text-slate-600 font-bold">
                          <th className="py-2 px-3">File Name</th>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Products</th>
                          <th className="py-2 px-3">Sales</th>
                          <th className="py-2 px-3">Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {backupsList.slice(0, 5).map((bkp) => (
                          <tr key={bkp.id} className="hover:bg-slate-50 text-slate-700">
                            <td className="py-2 px-3 font-mono font-medium text-slate-900">{bkp.fileName}</td>
                            <td className="py-2 px-3 text-slate-500">{new Date(bkp.createdAt).toLocaleString()}</td>
                            <td className="py-2 px-3 font-semibold">{bkp.totalProducts} items</td>
                            <td className="py-2 px-3 font-semibold">{bkp.totalSales} bills</td>
                            <td className="py-2 px-3 text-slate-500">{(bkp.sizeBytes / 1024).toFixed(1)} KB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE / RECOVER DATA */}
          {activeTab === 'restore' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 font-black text-blue-900 text-sm">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Restore Data from USB Flash Drive (یو ایس بی سے ڈیٹا واپس لائیں)</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Agar aap ka computer badal jaye, Windows reinstall ho jaye, ya app ka data delete ho jaye to apni USB Flash Drive lagayein aur backup file select kar k pura business data foran wapis le aayein.
                </p>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer">
                    <FolderOpen className="w-4 h-4 text-white" />
                    <span>Select Backup File from USB Flash Drive</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileForRestore}
                      className="hidden"
                    />
                  </label>
                  {restoreFileName && (
                    <span className="ml-3 text-xs font-mono font-semibold text-slate-700">
                      Selected: {restoreFileName}
                    </span>
                  )}
                </div>
              </div>

              {/* Restore Preview Card */}
              {restoreSummary && (
                <div className="bg-white rounded-2xl border-2 border-blue-300 p-6 space-y-5 shadow-md animate-in fade-in">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Valid KitabGhar Backup File
                      </span>
                      <h4 className="text-base font-black text-slate-900 mt-1">
                        Backup Content Inspection (ڈیٹا کا جائزہ)
                      </h4>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-slate-900">{restoreSummary.shopName}</div>
                      <div className="text-slate-500 text-[11px]">
                        Backup Date: {new Date(restoreSummary.exportedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold">Products / Books</div>
                      <div className="text-lg font-black text-emerald-600 mt-0.5">
                        {restoreSummary.totalProducts}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold">Sales Invoices</div>
                      <div className="text-lg font-black text-blue-600 mt-0.5">
                        {restoreSummary.totalSales}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold">Customers (Ledger)</div>
                      <div className="text-lg font-black text-purple-600 mt-0.5">
                        {restoreSummary.totalCustomers}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold">Suppliers & Stock</div>
                      <div className="text-lg font-black text-amber-600 mt-0.5">
                        {restoreSummary.totalSuppliers}
                      </div>
                    </div>
                  </div>

                  {/* Restore Mode Selection */}
                  <div className="space-y-2 pt-2 border-t">
                    <label className="block text-xs font-bold text-slate-800">
                      Choose Restore Strategy (بحالی کا طریقہ منتخب کریں):
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          restoreMode === 'replace'
                            ? 'border-red-500 bg-red-50/50 text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-red-600"
                        />
                        <div>
                          <div className="font-extrabold text-red-900">
                            1. Complete Clean Restore (مکمل بحالی)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Recommended when reinstalling on a new computer or recovering from disaster. Replaces current database cleanly with backup.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          restoreMode === 'merge'
                            ? 'border-blue-500 bg-blue-50/50 text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <div className="font-extrabold text-blue-900">
                            2. Safe Merge (موجودہ ڈیٹا میں شامل کریں)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Keeps existing records and imports any missing items, invoices, and customer balances without duplicates.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Final Restore Button */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreFileRaw(null);
                        setRestoreSummary(null);
                      }}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleExecuteRestore}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Confirm & Restore All Data Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OFFLINE RUNNER (.BAT) & LOCAL SETUP GUIDE */}
          {activeTab === 'offline_guide' && (
            <div className="space-y-6">
              {/* Direct Runner Download Ribbon */}
              <div className="bg-purple-900 text-white rounded-2xl p-6 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-700 text-purple-200">
                      1-Click Windows Offline Launcher
                    </div>
                    <h3 className="text-base font-black text-white">
                      Direct Double-Click File: RUN_KITABGHAR_OFFLINE.bat
                    </h3>
                    <p className="text-xs text-purple-200 max-w-xl">
                      Aap ko bar bar code ya commands likhne ki zaroorat nahi! Bas yeh file download karein ya folder main se &quot;RUN_KITABGHAR_OFFLINE.bat&quot; par 2 dafa click karein. Yeh bina internet aur bina kisi API key k POS foran open kar dega.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={downloadOfflineBatchLauncher}
                      className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Download RUN_OFFLINE.bat</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadUrduGuideFile}
                      className="px-4 py-2 bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4 text-purple-200" />
                      <span>Download Urdu Guide (.txt)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step by Step Urdu Guide */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs text-xs">
                <h4 className="font-black text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-600" />
                  <span>Baghair Internet & Baghair Gemini API Key k Chalane Ka Aasan Tareeqa:</span>
                </h4>

                <div className="space-y-3 text-slate-700 leading-relaxed">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900">Node.js Check Karein (Sirf Pehli Baar):</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Apne computer par Node.js (LTS version) install karein (https://nodejs.org). Agar pehle se installed hai to kuch karne ki zaroorat nahi.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900">Direct 1-Click Run Karein:</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Folder main mojood <code className="bg-slate-200 px-1 py-0.5 rounded font-bold font-mono">RUN_KITABGHAR_OFFLINE.bat</code> par double-click karein. Yeh khud hi local server shuru kar k browser (Chrome ya Edge) main POS open kar dega (http://localhost:3000).
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900">100% Offline & No API Key:</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Yeh software 100% offline kaam karta hai. Is main kisi Gemini API Key ya internet connection ki bilkul zaroorat nahi hai. Tamam items, barcode scanner, thermal printer, udhaar khata local SQLite engine main chalte hain.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      4
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900">Rozana USB Main Backup:</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Dukan band karne se pehle &quot;USB Backup&quot; par click karein aur apni Flash Drive (Drive E: ya F:) main save kar lein. Kal agar computer kharab bhi ho jaye to naye PC par 5 second main data recover ho jaye ga!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Offline Local Storage Active (IndexedDB & SQLite Mirror)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
