import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, X, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../lib/types';

interface LoginModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSwitchUser: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSwitchUser,
}) => {
  if (!isOpen) return null;

  const demoUsers: UserProfile[] = [
    {
      id_user: 'USR001',
      username: 'admin',
      nama: 'Administrator Madrasah',
      role: 'ADMIN',
      status: 'Aktif',
    },
    {
      id_user: 'USR002',
      username: 'guru',
      nama: 'Ustadzah Nurul Hidayati (Wali Kelas)',
      role: 'GURU',
      kelas_ampu: 'K01',
      status: 'Aktif',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">Beralih Akun / Hak Akses</h4>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Pilih peran pengguna untuk menguji hak akses (RBAC) pada sistem absensi:
        </p>

        <div className="space-y-3">
          {demoUsers.map(user => {
            const isSelected = currentUser.role === user.role;

            return (
              <button
                key={user.id_user}
                onClick={() => {
                  onSwitchUser(user);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      user.role === 'ADMIN'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role === 'ADMIN' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{user.nama}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                        {user.role}
                      </span>
                      <span className="text-[11px] text-slate-400">@{user.username}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {user.role === 'ADMIN'
                        ? 'Akses penuh: Kelola Siswa, Kelas, Absensi, Rekap & Pengaturan'
                        : 'Akses Guru: Mencatat absensi harian & melihat rekap'}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          Data pengguna tersimpan di Google Sheet (Sheet: <strong>PENGGUNA</strong>)
        </div>
      </div>
    </div>
  );
};
