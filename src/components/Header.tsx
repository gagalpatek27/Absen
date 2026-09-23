import React from 'react';
import { Menu, Database, ShieldCheck, UserCheck, HelpCircle } from 'lucide-react';
import { SchoolSettings, UserProfile } from '../lib/types';
import { formatDateID, formatDateISO } from '../lib/utils';
import { getScriptUrl } from '../lib/api';

interface HeaderProps {
  settings: SchoolSettings;
  currentUser: UserProfile;
  onToggleSidebar: () => void;
  onOpenGuide: () => void;
  onToggleRole: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  onToggleSidebar,
  onOpenGuide,
  onToggleRole,
}) => {
  const hasScriptUrl = Boolean(getScriptUrl());
  const todayStr = formatDateISO(new Date());

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 no-print">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Left: Mobile menu toggle + School Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              {settings.nama_sekolah || 'Sistem Absensi Siswa Madrasah'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>T.P. {settings.tahun_pelajaran || '2026/2027'}</span>
              <span aria-hidden="true">·</span>
              <span className="hidden sm:inline">{formatDateID(todayStr)}</span>
            </div>
          </div>
        </div>

        {/* Right: GAS Connection status & User Role switch */}
        <div className="flex items-center gap-2.5">
          {/* Database / Apps Script Status */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
              hasScriptUrl
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title={
              hasScriptUrl
                ? 'Terhubung dengan Google Apps Script Web App'
                : 'Mode Demo / Belum Mengatur Google Script URL'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>{hasScriptUrl ? 'Google Sheets Terhubung' : 'Simulasi Lokal (Demo)'}</span>
          </div>

          {/* Quick Guide Button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Panduan Google Sheets & Apps Script"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Panduan API</span>
          </button>

          {/* Current User & Role Switcher */}
          <button
            onClick={onToggleRole}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs font-medium text-slate-800"
            title="Klik untuk beralih role ADMIN / GURU"
          >
            {currentUser.role === 'ADMIN' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <UserCheck className="w-4 h-4 text-blue-600" />
            )}
            <div className="text-left hidden xs:block">
              <span className="font-semibold text-slate-900">{currentUser.nama}</span>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
