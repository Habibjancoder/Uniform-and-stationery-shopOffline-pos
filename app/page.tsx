'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { POSView } from '@/components/pos/POSView';
import { db } from '@/lib/database';
import { Language } from '@/lib/i18n';
import { Product, ProductVariant, ShopSettings, User } from '@/types';

// Tab loading placeholder
function TabLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading module...</span>
      </div>
    </div>
  );
}

// Code-split heavy views and modals for optimal bundle size and zero chunk timeout
const DashboardView = dynamic(() => import('@/components/dashboard/DashboardView').then(m => m.DashboardView), { loading: () => <TabLoading /> });
const ProductListView = dynamic(() => import('@/components/inventory/ProductListView').then(m => m.ProductListView), { loading: () => <TabLoading /> });
const UniformSetView = dynamic(() => import('@/components/inventory/UniformSetView').then(m => m.UniformSetView), { loading: () => <TabLoading /> });
const StockAdjustmentModal = dynamic(() => import('@/components/stock/StockAdjustmentModal').then(m => m.StockAdjustmentModal));
const StockLedgerView = dynamic(() => import('@/components/stock/StockLedgerView').then(m => m.StockLedgerView), { loading: () => <TabLoading /> });
const PurchaseListView = dynamic(() => import('@/components/purchases/PurchaseListView').then(m => m.PurchaseListView), { loading: () => <TabLoading /> });
const SaleHistoryView = dynamic(() => import('@/components/sales/SaleHistoryView').then(m => m.SaleHistoryView), { loading: () => <TabLoading /> });
const SaleReturnModal = dynamic(() => import('@/components/sales/SaleReturnModal').then(m => m.SaleReturnModal));
const CustomerListView = dynamic(() => import('@/components/customers/CustomerListView').then(m => m.CustomerListView), { loading: () => <TabLoading /> });
const SchoolManagementView = dynamic(() => import('@/components/customers/SchoolManagementView').then(m => m.SchoolManagementView), { loading: () => <TabLoading /> });
const SupplierListView = dynamic(() => import('@/components/suppliers/SupplierListView').then(m => m.SupplierListView), { loading: () => <TabLoading /> });
const ExpenseListView = dynamic(() => import('@/components/expenses/ExpenseListView').then(m => m.ExpenseListView), { loading: () => <TabLoading /> });
const CashRegisterView = dynamic(() => import('@/components/cash/CashRegisterView').then(m => m.CashRegisterView), { loading: () => <TabLoading /> });
const ReportsView = dynamic(() => import('@/components/reports/ReportsView').then(m => m.ReportsView), { loading: () => <TabLoading /> });
const UserManagementView = dynamic(() => import('@/components/users/UserManagementView').then(m => m.UserManagementView), { loading: () => <TabLoading /> });
const AuditLogView = dynamic(() => import('@/components/users/AuditLogView').then(m => m.AuditLogView), { loading: () => <TabLoading /> });
const SettingsView = dynamic(() => import('@/components/settings/SettingsView').then(m => m.SettingsView), { loading: () => <TabLoading /> });
const UsbBackupModal = dynamic(() => import('@/components/settings/UsbBackupModal').then(m => m.UsbBackupModal));
const SetupWizard = dynamic(() => import('@/components/wizard/SetupWizard').then(m => m.SetupWizard));
const LoginModal = dynamic(() => import('@/components/auth/LoginModal').then(m => m.LoginModal));
const AdminAuthModal = dynamic(() => import('@/components/auth/AdminAuthModal').then(m => m.AdminAuthModal));
const ShortcutsModal = dynamic(() => import('@/components/layout/ShortcutsModal').then(m => m.ShortcutsModal));

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pos'); // Default to POS for instant billing speed
  const [lang, setLang] = useState<Language>('en');
  const [settings, setSettings] = useState<ShopSettings>(db.getSettings());
  const [currentUser, setCurrentUser] = useState<User>(db.getCurrentUser());

  // Global Modals
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isUsbBackupOpen, setIsUsbBackupOpen] = useState<boolean>(false);
  const [adminAuthPendingTab, setAdminAuthPendingTab] = useState<string | null>(null);

  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [stockAdjustVariant, setStockAdjustVariant] = useState<ProductVariant | undefined>(undefined);

  const refreshAll = () => {
    setSettings(db.getSettings());
    setCurrentUser(db.getCurrentUser());
  };

  useEffect(() => {
    setMounted(true);
    const initialSettings = db.getSettings();
    setSettings(initialSettings);
    setLang(initialSettings.language || 'en');
    setCurrentUser(db.getCurrentUser());

    // If first launch and setup not completed, show wizard
    if (!initialSettings.setupCompleted) {
      setIsWizardOpen(true);
    }

    // Keyboard shortcut F1 to jump to POS billing
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Protected tabs that require Admin role
  const adminOnlyTabs = ['reports', 'users', 'audit', 'settings'];

  const handleTabChange = (tab: string) => {
    if (adminOnlyTabs.includes(tab) && currentUser.role !== 'admin') {
      setAdminAuthPendingTab(tab);
      return;
    }
    setActiveTab(tab);
  };

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-sans text-sm font-bold">
        Initializing Offline SQLite Engine...
      </div>
    );
  }

  return (
    <div
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
      className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans select-none"
    >
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        lang={lang}
        setLang={(newLang) => {
          setLang(newLang);
          db.updateSettings({ language: newLang });
        }}
        currentUser={currentUser}
        settings={settings}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Ribbon */}
        <Header
          settings={settings}
          currentUser={currentUser}
          lang={lang}
          onOpenCashModal={() => setActiveTab('cash')}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onNavigate={handleTabChange}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenUsbBackup={() => setIsUsbBackupOpen(true)}
        />

        {/* View Router */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              settings={settings}
              currentUser={currentUser}
              lang={lang}
              onNavigate={handleTabChange}
            />
          )}

          {activeTab === 'pos' && (
            <POSView
              settings={settings}
              currentUser={currentUser}
              lang={lang}
              onRefreshDatabase={refreshAll}
            />
          )}

          {activeTab === 'products' && (
            <ProductListView
              lang={lang}
              onRefreshDatabase={refreshAll}
              onOpenStockAdjustment={(prod, v) => {
                setStockAdjustProduct(prod);
                setStockAdjustVariant(v);
              }}
            />
          )}

          {activeTab === 'uniforms' && (
            <UniformSetView lang={lang} onRefreshDatabase={refreshAll} />
          )}

          {activeTab === 'inventory' && (
            <StockLedgerView lang={lang} />
          )}

          {activeTab === 'purchases' && (
            <PurchaseListView lang={lang} onRefreshDatabase={refreshAll} />
          )}

          {activeTab === 'sales' && (
            <SaleHistoryView settings={settings} lang={lang} onRefreshDatabase={refreshAll} />
          )}

          {activeTab === 'returns' && (
            <SaleReturnModal
              onSuccess={() => {
                setActiveTab('sales');
                refreshAll();
              }}
              onClose={() => setActiveTab('sales')}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerListView settings={settings} lang={lang} onRefreshDatabase={refreshAll} />
          )}

          {activeTab === 'suppliers' && (
            <SupplierListView lang={lang} onRefreshDatabase={refreshAll} />
          )}

          {activeTab === 'expenses' && (
            <ExpenseListView lang={lang} onRefreshDatabase={refreshAll} />
          )}

          {activeTab === 'cash' && (
            <CashRegisterView
              settings={settings}
              currentUser={currentUser}
              lang={lang}
              onRefreshDatabase={refreshAll}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView settings={settings} lang={lang} />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              currentUser={currentUser}
              lang={lang}
              onRefreshDatabase={refreshAll}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogView lang={lang} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              lang={lang}
              onRefreshSettings={refreshAll}
              onOpenWizard={() => setIsWizardOpen(true)}
              onOpenUsbBackup={() => setIsUsbBackupOpen(true)}
            />
          )}
        </main>
      </div>

      {/* SETUP WIZARD POPUP */}
      {isWizardOpen && (
        <SetupWizard
          onComplete={() => {
            setIsWizardOpen(false);
            refreshAll();
          }}
        />
      )}

      {/* SHORTCUTS CHEAT SHEET */}
      {isShortcutsOpen && (
        <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />
      )}

      {/* AUTHENTICATION / USER SWITCH MODAL */}
      {isLoginModalOpen && (
        <LoginModal
          allowCancel={true}
          onSuccess={() => {
            setIsLoginModalOpen(false);
            refreshAll();
          }}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* ADMIN AUTHORIZATION CHALLENGE MODAL (FOR PROTECTED TABS) */}
      {adminAuthPendingTab && (
        <AdminAuthModal
          title="Administrator Authorization Required"
          description={`The "${adminAuthPendingTab.toUpperCase()}" module contains sensitive financial records or administrative configurations. Please authorize as Administrator.`}
          onSuccess={() => {
            const target = adminAuthPendingTab;
            setAdminAuthPendingTab(null);
            refreshAll();
            setActiveTab(target);
          }}
          onClose={() => setAdminAuthPendingTab(null)}
        />
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {stockAdjustProduct && (
        <StockAdjustmentModal
          product={stockAdjustProduct}
          selectedVariant={stockAdjustVariant}
          onSuccess={refreshAll}
          onClose={() => {
            setStockAdjustProduct(null);
            setStockAdjustVariant(undefined);
          }}
        />
      )}

      {/* USB FLASH DRIVE BACKUP & RECOVERY MODAL */}
      <UsbBackupModal
        settings={settings}
        isOpen={isUsbBackupOpen}
        onClose={() => setIsUsbBackupOpen(false)}
        onRefreshAll={refreshAll}
      />
    </div>
  );
}
