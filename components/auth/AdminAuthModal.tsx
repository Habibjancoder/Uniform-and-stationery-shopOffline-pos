'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, X, KeyRound } from 'lucide-react';
import { db } from '@/lib/database';

interface AdminAuthModalProps {
  title?: string;
  description?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  title = 'Administrator Authorization Required',
  description = 'This section contains confidential financial reports, profit margins, or protected system settings. Please enter the Administrator password to continue.',
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verify against admin user
    const res = db.login('admin', password);
    if (res.success && res.user && res.user.role === 'admin') {
      onSuccess();
    } else {
      setError('Invalid Administrator password. (Default is "admin")');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white mx-auto mb-2.5 shadow-md">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-white">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">{description}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Administrator Password / PIN *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 font-medium text-slate-900"
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Default password: <code>admin</code>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-md transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authorize Admin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
