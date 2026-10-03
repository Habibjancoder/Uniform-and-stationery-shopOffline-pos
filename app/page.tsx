'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ShortcutsModal } from '@/components/layout/ShortcutsModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { POSView } from '@/components/pos/POSView';
import { ProductListView } from '@/components/inventory/ProductListView';
import { UniformSetView } from '@/components/inventory/UniformSetView';
import { StockAdjustmentModal } from '@/components/stock/StockAdjustmentModal';
import { StockLedgerView } from '@/components/stock/StockLedgerView';
import { PurchaseListView } from '@/components/purchases/PurchaseListView';
import { SaleHistoryView } from '@/components/sales/SaleHistoryView';
import { SaleReturnModal } from '@/components/sales/SaleReturnModal';
import { CustomerListView } from '@/components/customers/CustomerListView';
import { SchoolManagementView } from '@/components/customers/SchoolManagementView';
import { SupplierListView } from '@/components/suppliers/SupplierListView';
import { ExpenseListView } from '@/components/expenses/ExpenseListView';
import { CashRegisterView } from '@/components/cash/CashRegisterView';
import { ReportsView } from '@/components/reports/ReportsView';
import { UserManagementView } from '@/components/users/UserManagementView';
import { AuditLogView } from '@/components/users/AuditLogView';
import { SettingsView } from '@/components/settings/SettingsView';
import { SetupWizard } from '@/components/wizard/SetupWizard';
import { LoginModal } from '@/components/auth/LoginModal';
import { AdminAuthModal } from '@/components/auth/AdminAuthModal';
import { db } from '@/lib/database';
import { Language } from '@/lib/i18n';
import { Product, ProductVariant, ShopSettings, User } from '@/types';

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
    </div>
  );
}
