'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/database';

interface LoginModalProps {
  onSuccess: () => void;
  onClose?: () => void;
  allowCancel?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onSuccess,
  onClose,
  allowCancel = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'cashier'>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (role: 'admin' | 'cashier') => {
    setSelectedRole(role);
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin');
    } else {
      setUsername('cashier1');
      setPassword('cashier');
    }
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = db.login(username, password);
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  // Quick 1-click test sign-in
  const quickSignInAs = (role: 'admin' | 'cashier') => {
    if (role === 'admin') {
      const res = db.login('admin', 'admin');
      if (res.success) onSuccess();
    } else {
      const res = db.login('cashier1', 'cashier');
      if (res.success) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 text-center relative">
          {allowCancel && onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg transition-colors ${
              selectedRole === 'admin'
                ? 'bg-purple-700 shadow-purple-700/30'
                : 'bg-emerald-600 shadow-emerald-600/30'
            }`}
          >
            {selectedRole === 'admin' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">
            KitabGhar POS • Security System
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Separate authentication portal for Master Admin & Cashier Staff
          </p>
        </div>

        {/* Portals Selection */}
        <div className="p-6 space-y-4 text-xs">
          {/* Two Distinct Big Portal Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Admin Portal Card */}
            <div
              onClick={() => handleRoleSelect('admin')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                selectedRole === 'admin'
                  ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                  selectedRole === 'admin'
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="font-extrabold text-slate-900 text-xs">Admin Login</div>
              <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                Full Master Access
              </div>
            </div>

            {/* Cashier Portal Card */}
            <div
              onClick={() => handleRoleSelect('cashier')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                selectedRole === 'cashier'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                  selectedRole === 'cashier'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="font-extrabold text-slate-900 text-xs">User / Cashier Login</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                POS Billing Counter
              </div>
            </div>
          </div>

          {/* Role Privileges Banner */}
          <div
            className={`p-3 rounded-xl border text-[11px] leading-relaxed transition ${
              selectedRole === 'admin'
                ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            {selectedRole === 'admin' ? (
              <div>
                <strong>🛡️ Master Admin Privileges:</strong> Full access to financial statements, Profit & Loss calculations, stock valuations, editing settings, purging data, backups, and user management.
              </div>
            ) : (
              <div>
                <strong>👤 Cashier Staff Privileges:</strong> Fast POS barcode checkout, Walk-in customer billing, cash shifts, and searching uniform sizes. Confidential cost prices and destructive settings are protected.
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {selectedRole === 'admin' ? 'Admin Username *' : 'Cashier Username *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 bg-white"
                  placeholder="Enter username..."
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password / PIN *</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 bg-white"
                  placeholder="Enter password..."
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>
                  Default: <code>{selectedRole === 'admin' ? 'admin' : 'cashier'}</code>
                </span>
                <button
                  type="button"
                  onClick={() => quickSignInAs(selectedRole)}
                  className="text-emerald-700 hover:underline font-bold"
                >
                  ⚡ Fast 1-Click Login
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                  selectedRole === 'admin'
                    ? 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {selectedRole === 'admin' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span>Sign In as {selectedRole === 'admin' ? 'Administrator' : 'Cashier'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
