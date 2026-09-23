import React, { useState, useEffect, useMemo } from 'react';
import {
  TableProperties,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  School,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  SchoolClass,
  SchoolSettings,
  StudentMonthlyRecap
} from '../lib/types';
import {
  MONTH_NAMES_ID,
  getDaysInMonth,
  isSunday,
  exportToExcel
} from '../lib/utils';
import { api } from '../lib/api';

interface MonthlyRecapProps {
  classes: SchoolClass[];
  settings: SchoolSettings;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenPrintModal: (recapData: {
    recapList: StudentMonthlyRecap[];
    className: string;
    month: number;
    year: number;
  }) => void;
}

export const MonthlyRecap: React.FC<MonthlyRecapProps> = ({
  classes,
  settings,
  onShowToast,
  onOpenPrintModal,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [recapData, setRecapData] = useState<StudentMonthlyRecap[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Set default class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id_kelas);
    }
  }, [classes, selectedClassId]);

  const currentClass = useMemo(() => {
    return classes.find(c => c.id_kelas === selectedClassId) || null;
  }, [classes, selectedClassId]);

  const daysInMonth = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const monthName = MONTH_NAMES_ID[selectedMonth - 1] || '';

  // Fetch monthly recap data from API
  useEffect(() => {
    if (!selectedClassId) return;

    let isMounted = true;
    const fetchRecap = async () => {
      setLoading(true);
      try {
        const res = await api.getRekapBulanan(selectedMonth, selectedYear, selectedClassId);
        if (isMounted) {
          if (res.success && Array.isArray(res.data)) {
            setRecapData(res.data);
          } else {
            setRecapData([]);
          }
        }
      } catch (err) {
        console.error('Error fetching recap:', err);
        if (isMounted) setRecapData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecap();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear, selectedClassId]);

  // Overall totals for the bottom summary row
  const overallTotals = useMemo(() => {
    let grandH = 0, grandS = 0, grandI = 0, grandA = 0;
    const dayTotals: Record<number, { h: number; s: number; i: number; a: number }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      dayTotals[d] = { h: 0, s: 0, i: 0, a: 0 };
    }

    recapData.forEach(st => {
      grandH += st.totalH;
      grandS += st.totalS;
      grandI += st.totalI;
      grandA += st.totalA;

      for (let d = 1; d <= daysInMonth; d++) {
        const stat = st.dailyStatus[d];
        if (stat === 'H') dayTotals[d].h++;
        else if (stat === 'S') dayTotals[d].s++;
        else if (stat === 'I') dayTotals[d].i++;
        else if (stat === 'A') dayTotals[d].a++;
      }
    });

    return { grandH, grandS, grandI, grandA, dayTotals };
  }, [recapData, daysInMonth]);

  // Handle Export Excel
  const handleExportExcel = () => {
    if (recapData.length === 0) {
      onShowToast('error', 'Tidak ada data absensi untuk diekspor');
      return;
    }
    try {
      exportToExcel(
        recapData,
        currentClass?.nama_kelas || 'Kelas',
        selectedMonth,
        selectedYear,
        settings
      );
      onShowToast('success', 'File Excel rekap absensi berhasil diunduh!');
    } catch (err) {
      onShowToast('error', 'Gagal mengekspor file Excel');
    }
  };

  // Handle Print trigger
  const handlePrint = () => {
    if (recapData.length === 0) {
      onShowToast('error', 'Tidak ada data absensi untuk dicetak');
      return;
    }
    onOpenPrintModal({
      recapList: recapData,
      className: currentClass?.nama_kelas || 'Kelas',
      month: selectedMonth,
      year: selectedYear,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Bulan Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pilih Bulan</span>
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
              >
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
              >
                {[2024, 2025, 2026, 2027, 2028].map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pilih Kelas</span>
              </label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
              >
                {classes.map(cls => (
                  <option key={cls.id_kelas} value={cls.id_kelas}>
                    Kelas {cls.nama_kelas} (Tingkat {cls.tingkat})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Cetak & Export Excel */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={recapData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Cetak format buku absensi resmi A4 Landscape"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Cetak Rekap (A4)</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={recapData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Unduh format tabel Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Authentic Madrasah Ledger Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden printable-area">
        {/* Ledger Header matching official Excel template */}
        <div className="p-5 border-b border-slate-200 text-center bg-white">
          <h2 className="text-base md:text-lg font-bold tracking-tight text-slate-900 uppercase">
            DAFTAR HADIR SISWA
          </h2>
          <h3 className="text-sm md:text-base font-semibold text-slate-800 uppercase mt-0.5">
            {settings.nama_sekolah}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {settings.alamat_sekolah}
          </p>
          <p className="text-xs font-medium text-slate-700 mt-0.5">
            TAHUN PELAJARAN {settings.tahun_pelajaran || '2026/2027'}
          </p>

          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mt-4 px-2 pt-2 border-t border-slate-100">
            <span className="uppercase">
              BULAN: {monthName} {selectedYear}
            </span>
            <span>
              KELAS: {currentClass?.nama_kelas || '-'}
            </span>
          </div>
        </div>

        {/* Dynamic Days Table with Sticky Student Names */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Menghitung rekap absensi dari Google Sheets...</span>
          </div>
        ) : recapData.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">Tidak ada data siswa untuk kelas ini.</p>
            <p className="text-xs text-slate-400 mt-1">
              Pastikan siswa telah ditambahkan ke kelas {currentClass?.nama_kelas} dan berstatus Aktif.
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold">
                  {/* Sticky Column 1: NO */}
                  <th className="sticky left-0 z-20 bg-slate-100 py-2 px-2 border-r border-slate-300 w-10 text-center">
                    NO
                  </th>

                  {/* Sticky Column 2: NAMA SISWA */}
                  <th className="sticky left-10 z-20 bg-slate-100 py-2 px-3 border-r border-slate-300 text-left min-w-[170px] max-w-[220px]">
                    NAMA SISWA
                  </th>

                  {/* Dynamic Date Columns: 1 to 28/29/30/31 */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const sunday = isSunday(selectedYear, selectedMonth, day);
                    return (
                      <th
                        key={day}
                        className={`py-2 px-1 border-r border-slate-300 w-7 min-w-[28px] tabular-nums font-semibold ${
                          sunday ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}
                        title={`Tanggal ${day} ${monthName}${sunday ? ' (Hari Minggu)' : ''}`}
                      >
                        {day}
                      </th>
                    );
                  })}

                  {/* Totals Header */}
                  <th className="py-2 px-2 border-r border-slate-300 w-8 bg-emerald-50 text-emerald-800 font-bold" title="Total Hadir">
                    H
                  </th>
                  <th className="py-2 px-2 border-r border-slate-300 w-8 bg-sky-50 text-sky-800 font-bold" title="Total Sakit">
                    S
                  </th>
                  <th className="py-2 px-2 border-r border-slate-300 w-8 bg-indigo-50 text-indigo-800 font-bold" title="Total Izin">
                    I
                  </th>
                  <th className="py-2 px-2 border-r border-slate-300 w-8 bg-rose-50 text-rose-800 font-bold" title="Total Alpa">
                    A
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {recapData.map((st, idx) => (
                  <tr
                    key={st.id_siswa}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Sticky NO */}
                    <td className="sticky left-0 z-10 bg-white py-1.5 px-2 border-r border-slate-200 font-medium text-slate-600 text-center tabular-nums">
                      {idx + 1}
                    </td>

                    {/* Sticky NAMA SISWA */}
                    <td className="sticky left-10 z-10 bg-white py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-900 text-left truncate min-w-[170px] max-w-[220px]">
                      {st.nama}
                    </td>

                    {/* Days Cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const status = st.dailyStatus[day] || '-';
                      const sunday = isSunday(selectedYear, selectedMonth, day);

                      let cellStyle = 'text-slate-400';
                      if (status === 'H') cellStyle = 'font-bold text-emerald-700 bg-emerald-50/30';
                      else if (status === 'S') cellStyle = 'font-bold text-sky-700 bg-sky-50/40';
                      else if (status === 'I') cellStyle = 'font-bold text-indigo-700 bg-indigo-50/40';
                      else if (status === 'A') cellStyle = 'font-bold text-rose-700 bg-rose-50/50';

                      if (sunday && status === '-') {
                        cellStyle = 'bg-rose-50/60 text-rose-400 font-medium';
                      }

                      return (
                        <td
                          key={day}
                          className={`py-1.5 px-0.5 border-r border-slate-200 font-mono text-[11px] ${cellStyle}`}
                        >
                          {status}
                        </td>
                      );
                    })}

                    {/* Totals H, S, I, A */}
                    <td className="py-1.5 px-1 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/50 tabular-nums">
                      {st.totalH}
                    </td>
                    <td className="py-1.5 px-1 border-r border-slate-200 font-bold text-sky-800 bg-sky-50/50 tabular-nums">
                      {st.totalS}
                    </td>
                    <td className="py-1.5 px-1 border-r border-slate-200 font-bold text-indigo-800 bg-indigo-50/50 tabular-nums">
                      {st.totalI}
                    </td>
                    <td className="py-1.5 px-1 border-r border-slate-200 font-bold text-rose-800 bg-rose-50/50 tabular-nums">
                      {st.totalA}
                    </td>
                  </tr>
                ))}

                {/* Overall Totals Summary Row */}
                <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                  <td className="sticky left-0 z-10 bg-slate-100 py-2 px-2 border-r border-slate-300 text-center" colSpan={2}>
                    TOTAL KEHADIRAN KELAS
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dayTot = overallTotals.dayTotals[day];
                    const countH = dayTot ? dayTot.h : 0;
                    return (
                      <td
                        key={day}
                        className="py-2 px-0.5 border-r border-slate-300 text-[10px] tabular-nums font-mono text-slate-600"
                        title={`Hadir tanggal ${day}: ${countH}`}
                      >
                        {countH > 0 ? countH : '-'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-1 border-r border-slate-300 font-bold text-emerald-800 bg-emerald-100 tabular-nums">
                    {overallTotals.grandH}
                  </td>
                  <td className="py-2 px-1 border-r border-slate-300 font-bold text-sky-800 bg-sky-100 tabular-nums">
                    {overallTotals.grandS}
                  </td>
                  <td className="py-2 px-1 border-r border-slate-300 font-bold text-indigo-800 bg-indigo-100 tabular-nums">
                    {overallTotals.grandI}
                  </td>
                  <td className="py-2 px-1 border-r border-slate-300 font-bold text-rose-800 bg-rose-100 tabular-nums">
                    {overallTotals.grandA}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Notes & Signatures */}
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-600 gap-4 mb-8">
            <div className="space-x-3">
              <span className="font-semibold text-slate-900">Keterangan:</span>
              <span className="font-medium text-emerald-700">H = Hadir</span>
              <span className="font-medium text-sky-700">S = Sakit</span>
              <span className="font-medium text-indigo-700">I = Izin</span>
              <span className="font-medium text-rose-700">A = Alpa</span>
              <span className="font-medium text-rose-500">
                (Kolom Merah Muda = Hari Minggu)
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Tercetak otomatis dari Sistem Absensi Siswa Madrasah
            </div>
          </div>

          {/* Signature Grid */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-900 pt-4">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala {settings.nama_sekolah}</p>
              <div className="h-20" />
              <p className="font-bold underline">
                {settings.kepala_sekolah || '( .............................................. )'}
              </p>
              {settings.nip_kepala_sekolah && (
                <p className="text-[11px] text-slate-600">
                  NIP. {settings.nip_kepala_sekolah}
                </p>
              )}
            </div>

            <div>
              <p>
                {settings.alamat_sekolah ? settings.alamat_sekolah.split(',')[0] : 'Madrasah'}, {monthName} {selectedYear}
              </p>
              <p className="font-bold">
                Wali Kelas {currentClass?.nama_kelas || ''}
              </p>
              <div className="h-20" />
              <p className="font-bold underline">
                {settings.nama_operator || '( .............................................. )'}
              </p>
              <p className="text-[11px] text-slate-600">
                NIP/NUPTK. -
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
