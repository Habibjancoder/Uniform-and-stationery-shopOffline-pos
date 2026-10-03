'use client';

import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Shirt,
  Boxes,
  Truck,
  FileText,
  RotateCcw,
  Users,
  Briefcase,
  Wallet,
  DollarSign,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  Globe,
  Lock,
  User,
  LogOut,
  ArrowRightLeft,
} from 'lucide-react';
import { db } from '@/lib/database';
import { Language, t } from '@/lib/i18n';
import { ShopSettings, User as UserType } from '@/types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  currentUser: UserType;
  settings: ShopSettings;
  onOpenLoginModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  currentUser,
  settings,
  onOpenLoginModal,
}) => {
  const isUrdu = lang === 'ur';
  const isAdmin = currentUser.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard', lang), icon: LayoutDashboard },
    { id: 'pos', label: t('nav.pos', lang), icon: ShoppingCart, highlight: true },
    { id: 'products', label: t('nav.products', lang), icon: Package },
    { id: 'uniforms', label: t('nav.uniforms', lang), icon: Shirt },
    { id: 'inventory', label: t('nav.inventory', lang), icon: Boxes },
    { id: 'purchases', label: t('nav.purchases', lang), icon: Truck },
    { id: 'sales', label: t('nav.sales', lang), icon: FileText },
    { id: 'returns', label: t('nav.returns', lang), icon: RotateCcw },
    { id: 'customers', label: t('nav.customers', lang), icon: Users },
    { id: 'suppliers', label: t('nav.suppliers', lang), icon: Briefcase },
    { id: 'expenses', label: t('nav.expenses', lang), icon: DollarSign },
    { id: 'cash', label: t('nav.cash', lang), icon: Wallet },
    { id: 'reports', label: t('nav.reports', lang), icon: BarChart3, adminOnly: true },
    { id: 'users', label: t('nav.users', lang), icon: ShieldCheck, adminOnly: true },
    { id: 'audit', label: t('nav.audit', lang), icon: History, adminOnly: true },
    { id: 'settings', label: t('nav.settings', lang), icon: Settings, adminOnly: true },
  ];

  return (
    <aside
      className={`w-64 bg-slate-900 text-slate-200 flex flex-col h-screen select-none border-r border-slate-800 ${
        isUrdu ? 'order-last text-right font-sans' : 'text-left'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
            KG
          </div>
          <div className="truncate">
            <h1 className="font-extrabold text-sm text-white tracking-tight truncate">
              {settings.shopName || 'KitabGhar POS'}
            </h1>
            <div className="text-[10px] text-emerald-400 font-medium">
              Offline Windows POS ERP
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLocked = item.adminOnly && !isAdmin;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : item.highlight
                  ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50'
                  : isLocked
                  ? 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-400'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              } ${isUrdu ? 'flex-row-reverse' : ''}`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : item.highlight
                    ? 'text-emerald-400'
                    : isLocked
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>

              {item.highlight && !isActive && (
                <span className="ml-auto text-[10px] bg-emerald-700/60 text-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  F1
                </span>
              )}

              {isLocked && !isActive && (
                <span title="Admin access required" className="ml-auto">
                  <Lock className="w-3 h-3 text-slate-500" />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile & Role Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        {/* Language Switch */}
        <div className="flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded text-xs border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="w-3.5 h-3.5" />
            <span>Language</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ur')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                lang === 'ur' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              اردو
            </button>
          </div>
        </div>

        {/* Current User & Role Card */}
        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                isAdmin ? 'bg-purple-700' : 'bg-emerald-600'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.fullName}
              </div>
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isAdmin ? 'text-purple-400' : 'text-emerald-400'
                }`}
              >
                {isAdmin ? 'Master Admin' : 'Cashier Counter'}
              </div>
            </div>
          </div>

          {/* Switch Role Button */}
          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Switch User / Login Portal"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
