import React from 'react';
import {
  Users,
  School,
  CheckCircle2,
  HeartPulse,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CalendarCheck,
  TableProperties,
  Camera,
  QrCode
} from 'lucide-react';
import { DashboardSummary, SchoolSettings } from '../lib/types';
import { formatDateID, formatDateISO } from '../lib/utils';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  settings: SchoolSettings;
  onNavigate: (tab: NavTab) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  settings,
  onNavigate,
  onRefresh,
}) => {
  const todayStr = formatDateISO(new Date());

  const s = summary || {
    total_siswa: 0,
    total_kelas: 0,
    hadir_hari_ini: 0,
    sakit_hari_ini: 0,
    izin_hari_ini: 0,
    alpa_hari_ini: 0,
    persentase_kehadiran: 0,
    rekap_bulan_ini: { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
  };

  const totalMonthly =
    s.rekap_bulan_ini.hadir +
    s.rekap_bulan_ini.sakit +
    s.rekap_bulan_ini.izin +
    s.rekap_bulan_ini.alpa;

  const pctHadir = totalMonthly > 0 ? Math.round((s.rekap_bulan_ini.hadir / totalMonthly) * 100) : 0;
  const pctSakit = totalMonthly > 0 ? Math.round((s.rekap_bulan_ini.sakit / totalMonthly) * 100) : 0;
  const pctIzin = totalMonthly > 0 ? Math.round((s.rekap_bulan_ini.izin / totalMonthly) * 100) : 0;
  const pctAlpa = totalMonthly > 0 ? Math.round((s.rekap_bulan_ini.alpa / totalMonthly) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Dashboard Absensi
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Selamat Datang di {settings.nama_sekolah}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Pantau kehadiran siswa harian dan rekap bulanan madrasah secara real-time via Google Sheets API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('kamera')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Absensi Kamera USB</span>
          </button>
          <button
            onClick={() => onNavigate('absensi')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs md:text-sm font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-slate-600" />
            <span>Input Manual</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
        {/* Total Siswa */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Siswa</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {loading ? '...' : s.total_siswa}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Siswa aktif terdaftar</p>
        </div>

        {/* Total Kelas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Kelas</span>
            <School className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {loading ? '...' : s.total_kelas}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rombongan belajar</p>
        </div>

        {/* Hadir Hari Ini */}
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">Hadir (H)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">
            {loading ? '...' : s.hadir_hari_ini}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Hari ini ({formatDateID(todayStr)})</p>
        </div>

        {/* Sakit Hari Ini */}
        <div className="bg-sky-50/50 rounded-xl border border-sky-100 p-4 shadow-xs">
          <div className="flex items-center justify-between text-sky-700 mb-2">
            <span className="text-xs font-semibold">Sakit (S)</span>
            <HeartPulse className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-700 tabular-nums">
            {loading ? '...' : s.sakit_hari_ini}
          </div>
          <p className="text-[11px] text-sky-600 mt-1">Keterangan sakit</p>
        </div>

        {/* Izin Hari Ini */}
        <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-semibold">Izin (I)</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 tabular-nums">
            {loading ? '...' : s.izin_hari_ini}
          </div>
          <p className="text-[11px] text-indigo-600 mt-1">Surat izin resmi</p>
        </div>

        {/* Alpa Hari Ini */}
        <div className="bg-rose-50/50 rounded-xl border border-rose-100 p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold">Alpa (A)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 tabular-nums">
            {loading ? '...' : s.alpa_hari_ini}
          </div>
          <p className="text-[11px] text-rose-600 mt-1">Tanpa keterangan</p>
        </div>
      </div>

      {/* Monthly Statistics & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kehadiran Bulan Berjalan Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Statistik Kehadiran Bulan Ini
              </h3>
              <p className="text-xs text-slate-500">
                Distribusi kumulatif absensi siswa di seluruh kelas pada bulan berjalan
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Catatan</span>
              <span className="text-base font-bold text-slate-900 tabular-nums">{totalMonthly}</span>
            </div>
          </div>

          {/* Visual Percentage Bar */}
          <div className="mt-5 space-y-4">
            <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
              <div
                style={{ width: `${pctHadir}%` }}
                className="bg-emerald-600 h-full transition-all duration-300"
                title={`Hadir: ${s.rekap_bulan_ini.hadir} (${pctHadir}%)`}
              />
              <div
                style={{ width: `${pctSakit}%` }}
                className="bg-sky-500 h-full transition-all duration-300"
                title={`Sakit: ${s.rekap_bulan_ini.sakit} (${pctSakit}%)`}
              />
              <div
                style={{ width: `${pctIzin}%` }}
                className="bg-indigo-500 h-full transition-all duration-300"
                title={`Izin: ${s.rekap_bulan_ini.izin} (${pctIzin}%)`}
              />
              <div
                style={{ width: `${pctAlpa}%` }}
                className="bg-rose-500 h-full transition-all duration-300"
                title={`Alpa: ${s.rekap_bulan_ini.alpa} (${pctAlpa}%)`}
              />
            </div>

            {/* Legend & Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100">
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Hadir (H)</span>
                </div>
                <div className="text-lg font-bold text-emerald-900 mt-1 tabular-nums">
                  {s.rekap_bulan_ini.hadir}
                  <span className="text-xs font-normal text-emerald-700 ml-1">({pctHadir}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-sky-50/40 border border-sky-100">
                <div className="flex items-center gap-1.5 text-xs text-sky-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Sakit (S)</span>
                </div>
                <div className="text-lg font-bold text-sky-900 mt-1 tabular-nums">
                  {s.rekap_bulan_ini.sakit}
                  <span className="text-xs font-normal text-sky-700 ml-1">({pctSakit}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/40 border border-indigo-100">
                <div className="flex items-center gap-1.5 text-xs text-indigo-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Izin (I)</span>
                </div>
                <div className="text-lg font-bold text-indigo-900 mt-1 tabular-nums">
                  {s.rekap_bulan_ini.izin}
                  <span className="text-xs font-normal text-indigo-700 ml-1">({pctIzin}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/40 border border-rose-100">
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Alpa (A)</span>
                </div>
                <div className="text-lg font-bold text-rose-900 mt-1 tabular-nums">
                  {s.rekap_bulan_ini.alpa}
                  <span className="text-xs font-normal text-rose-700 ml-1">({pctAlpa}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Menu / Shortcuts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Akses Cepat
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pintasan menu operasional absensi madrasah
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('absensi')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-100 text-emerald-700">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block group-hover:text-emerald-700">
                      Input Absensi Harian
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Catat kehadiran siswa hari ini
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('rekap')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-100 text-blue-700">
                    <TableProperties className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block group-hover:text-blue-700">
                      Rekap & Cetak Bulanan
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Format tabel buku induk Excel
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('siswa')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-100 text-amber-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block group-hover:text-amber-700">
                      Kelola Siswa & Kelas
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Tambah, edit, atau impor data
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </button>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sistem Absensi Google Sheets</span>
            <button
              onClick={onRefresh}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Perbarui Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
