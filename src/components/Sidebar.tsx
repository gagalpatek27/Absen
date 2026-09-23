import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Camera,
  QrCode,
  TableProperties,
  Users,
  School,
  Settings,
  BookOpen,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile } from '../lib/types';

export type NavTab = 'dashboard' | 'absensi' | 'kamera' | 'kartu-qr' | 'rekap' | 'siswa' | 'kelas' | 'pengaturan';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenGuide: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  currentUser,
  onOpenGuide,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'kamera', label: 'Absensi Kamera', icon: <Camera className="w-4 h-4" />, badge: 'QR USB' },
    { id: 'absensi', label: 'Absensi Manual', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'rekap', label: 'Rekap Bulanan', icon: <TableProperties className="w-4 h-4" /> },
    { id: 'kartu-qr', label: 'Kartu QR Siswa', icon: <QrCode className="w-4 h-4" /> },
    { id: 'siswa', label: 'Data Siswa', icon: <Users className="w-4 h-4" />, adminOnly: false },
    { id: 'kelas', label: 'Data Kelas', icon: <School className="w-4 h-4" />, adminOnly: true },
    { id: 'pengaturan', label: 'Pengaturan', icon: <Settings className="w-4 h-4" />, adminOnly: true },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden no-print"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">
                SI-ABSENSI
              </span>
              <span className="text-[11px] text-slate-400 block">Madrasah Digital</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 pb-2">
            Menu Utama
          </div>

          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-white text-emerald-800' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 pb-2">
            Integrasi & Panduan
          </div>

          <button
            onClick={() => {
              onOpenGuide();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Setup Google Sheets API</span>
          </button>
        </nav>

        {/* User Card at bottom */}
        <div className="p-3 border-t border-slate-800">
          <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{currentUser.nama}</p>
              <p className="text-[10px] text-slate-400">
                Akses: <span className="text-emerald-400 font-semibold">{currentUser.role}</span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
