'use client';

import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, KeyRound, User as UserIcon, X, Check } from 'lucide-react';
import { db } from '@/lib/database';
import { Language, t } from '@/lib/i18n';
import { User, UserRole } from '@/types';

interface UserManagementViewProps {
  currentUser: User;
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  lang,
  onRefreshDatabase,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const loadData = () => {
    setUsers(db.getUsers());
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) return;

    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      phone: phone.trim() || undefined,
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.saveUser(newUser);
    setIsModalOpen(false);
    setUsername('');
    setFullName('');
    setPhone('');
    setPassword('');
    loadData();
    onRefreshDatabase?.();
  };

  const handleSwitchUser = (user: User) => {
    db.setCurrentUser(user);
    onRefreshDatabase?.();
  };

  const handleDeleteUser = (userId: string, name: string) => {
    if (confirm(`Are you sure you want to delete user "${name}"?`)) {
      db.deleteUser(userId);
      loadData();
      onRefreshDatabase?.();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Users, Cashiers & Role-Based Access</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control employee roles (Admin, Manager, Cashier, Inventory User) and restrict financial views.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add System User</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between transition ${
                  isSelf ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'manager'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.role.replace('_', ' ')}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Active User
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{u.fullName}</h3>
                    <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                    {u.phone && <div className="text-xs text-slate-600 mt-1">Phone: {u.phone}</div>}
                  </div>

                  {/* Role Permissions pill list */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 text-slate-600">
                    <div className="font-semibold text-slate-700">Role Capabilities:</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>✓ POS Billing</div>
                      <div>{u.role === 'cashier' ? '✗ No Profit View' : '✓ View Profits'}</div>
                      <div>{u.role === 'cashier' ? '✗ No Delete' : '✓ Edit/Delete'}</div>
                      <div>{u.role === 'admin' ? '✓ Full Backups' : '✗ Restricted'}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                  {!isSelf ? (
                    <button
                      onClick={() => handleSwitchUser(u)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs"
                    >
                      Login As User
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Current Login</span>
                  )}

                  {!isSelf && users.length > 1 && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.fullName)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Create New System User</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Asim Raza"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Login Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. cashier2"
                  className="w-full px-3 py-2 border rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role & Permissions *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-md bg-white font-semibold text-slate-800"
                >
                  <option value="cashier">Cashier (POS & Billing only, profits hidden)</option>
                  <option value="inventory_user">Inventory User (Products & Stock adjustments)</option>
                  <option value="manager">Manager (Sales, Purchases, Reports, Expenses)</option>
                  <option value="account_user">Account User (Customer/Supplier Ledgers & Cash)</option>
                  <option value="admin">Administrator (Full master access to all modules)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-md"
                />
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
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
