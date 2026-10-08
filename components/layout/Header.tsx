'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Clock,
  Database,
  HardDrive,
  Keyboard,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  Wallet,
  Lock,
} from 'lucide-react';
import { db } from '@/lib/database';
import { Language, t } from '@/lib/i18n';
import { CashRegisterShift, ShopSettings, User as UserType } from '@/types';

interface HeaderProps {
  settings: ShopSettings;
  currentUser: UserType;
  lang: Language;
  onOpenCashModal: () => void;
  onOpenShortcuts: () => void;
  onNavigate: (tab: string) => void;
  onOpenLoginModal?: () => void;
  onOpenUsbBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  lang,
  onOpenCashModal,
  onOpenShortcuts,
  onNavigate,
  onOpenLoginModal,
  onOpenUsbBackup,
}) => {
  const [time, setTime] = useState<string>('');
  const [activeShift, setActiveShift] = useState<CashRegisterShift | undefined>(undefined);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
          ' | ' +
          now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const shift = db.getActiveCashShift();
    setActiveShift(shift);

    const prods = db.getProducts();
    let low = 0;
    for (const p of prods) {
      if (p.hasVariants && p.variants) {
        for (const v of p.variants) {
          if (v.currentStock <= v.minStock) low++;
        }
      } else if (p.currentStock <= p.minStock) {
        low++;
      }
    }
    setLowStockCount(low);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs select-none">
      {/* Left side info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span suppressHydrationWarning>{time || 'Loading time...'}</span>
        </div>

        {/* Database Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Offline SQLite Active</span>
        </div>
      </div>

      {/* Right side widgets */}
      <div className="flex items-center gap-2.5">
        {/* User Role & Login Switch Badge */}
        {onOpenLoginModal && (
          <button
            onClick={onOpenLoginModal}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition border shadow-xs ${
              isAdmin
                ? 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Click to Switch User / Login Mode (Admin vs Cashier)"
          >
            {isAdmin ? (
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>
              {isAdmin ? 'Master Admin' : `Cashier (${currentUser.fullName.split(' ')[0]})`}
            </span>
            <span className="text-[10px] text-slate-400 font-normal pl-1 border-l border-slate-300">
              Switch
            </span>
          </button>
        )}

        {/* USB Backup & Data Recovery Center Button */}
        {onOpenUsbBackup && (
          <button
            onClick={onOpenUsbBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition border bg-slate-900 text-white hover:bg-slate-800 border-slate-700 shadow-xs"
            title="USB Flash Drive Backup, Data Recovery & 1-Click Offline Launcher"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">USB Backup</span>
          </button>
        )}

        {/* Cash Register Shift Button */}
        <button
          onClick={onOpenCashModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition border ${
            activeShift
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
          title="Manage Cash Shift & Daily Closing"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>
            {activeShift
              ? `Shift Open (₨ ${activeShift.openingCash})`
              : 'Open Cash Shift'}
          </span>
        </button>

        {/* Low Stock Alerts */}
        <button
          onClick={() => onNavigate('inventory')}
          className={`relative p-2 rounded-md transition ${
            lowStockCount > 0
              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
          title={`${lowStockCount} items low or out of stock`}
        >
          <Bell className="w-4 h-4" />
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {lowStockCount > 9 ? '9+' : lowStockCount}
            </span>
          )}
        </button>

        {/* Keyboard Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
          title="View Keyboard Shortcuts [F1-F10]"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
          title="Toggle Fullscreen Mode"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
