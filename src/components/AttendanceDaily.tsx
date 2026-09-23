import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  School,
  CheckCircle2,
  Save,
  Search,
  CheckCheck,
  AlertCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { Student, SchoolClass, DailyAttendanceItem, AttendanceStatus } from '../lib/types';
import { formatDateID, formatDateISO } from '../lib/utils';
import { api } from '../lib/api';

interface AttendanceDailyProps {
  students: Student[];
  classes: SchoolClass[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onRefreshData: () => void;
}

export const AttendanceDaily: React.FC<AttendanceDailyProps> = ({
  students,
  classes,
  onShowToast,
  onRefreshData,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateISO(new Date()));
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, 'H' | 'S' | 'I' | 'A'>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Set default class when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id_kelas);
    }
  }, [classes, selectedClassId]);

  // Selected class object
  const currentClass = useMemo(() => {
    return classes.find(c => c.id_kelas === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => s.id_kelas === selectedClassId && s.status === 'Aktif');
  }, [students, selectedClassId]);

  // Filtered by local search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      s => s.nama.toLowerCase().includes(q) || s.id_siswa.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  // Load existing attendance for date + class
  useEffect(() => {
    if (!selectedDate || !selectedClassId) return;

    let isMounted = true;
    const fetchExisting = async () => {
      setLoading(true);
      try {
        const res = await api.getAbsensi(selectedDate, selectedClassId);
        if (isMounted) {
          const newMap: Record<string, 'H' | 'S' | 'I' | 'A'> = {};

          // Default all active students to 'A' as specified, or populate existing if already recorded
          classStudents.forEach(st => {
            newMap[st.id_siswa] = 'A'; // default status Alpa as requested in prompt item 6
          });

          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            res.data.forEach(item => {
              newMap[item.id_siswa] = item.status as 'H' | 'S' | 'I' | 'A';
            });
          }
          setAttendanceData(newMap);
        }
      } catch (err) {
        console.error('Failed to load existing attendance:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExisting();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedClassId, classStudents]);

  // Quick action: Set status for single student
  const handleStatusChange = (id_siswa: string, status: 'H' | 'S' | 'I' | 'A') => {
    setAttendanceData(prev => ({
      ...prev,
      [id_siswa]: status
    }));
  };

  // Bulk action: Mark all as Hadir (H)
  const handleMarkAllHadir = () => {
    const updated: Record<string, 'H' | 'S' | 'I' | 'A'> = {};
    classStudents.forEach(st => {
      updated[st.id_siswa] = 'H';
    });
    setAttendanceData(updated);
    onShowToast('info', `Semua siswa kelas ${currentClass?.nama_kelas || ''} ditandai Hadir (H)`);
  };

  // Bulk action: Mark all as Alpa (A)
  const handleMarkAllAlpa = () => {
    const updated: Record<string, 'H' | 'S' | 'I' | 'A'> = {};
    classStudents.forEach(st => {
      updated[st.id_siswa] = 'A';
    });
    setAttendanceData(updated);
    onShowToast('info', `Semua siswa kelas ${currentClass?.nama_kelas || ''} direset ke Alpa (A)`);
  };

  // Calculate live counts
  const summaryCounts = useMemo(() => {
    let h = 0, s = 0, i = 0, a = 0;
    classStudents.forEach(st => {
      const stat = attendanceData[st.id_siswa] || 'A';
      if (stat === 'H') h++;
      else if (stat === 'S') s++;
      else if (stat === 'I') i++;
      else if (stat === 'A') a++;
    });
    return { h, s, i, a, total: classStudents.length };
  }, [classStudents, attendanceData]);

  // Trigger Save with confirmation
  const handleInitiateSave = () => {
    if (classStudents.length === 0) {
      onShowToast('error', 'Tidak ada siswa aktif dalam kelas yang dipilih');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);

    try {
      const payloadItems: DailyAttendanceItem[] = classStudents.map(st => ({
        id_siswa: st.id_siswa,
        nama: st.nama,
        status: attendanceData[st.id_siswa] || 'A'
      }));

      const res = await api.simpanAbsensi(
        selectedDate,
        selectedClassId,
        currentClass?.nama_kelas || '',
        payloadItems
      );

      if (res.success) {
        onShowToast('success', res.message || 'Absensi berhasil disimpan ke Google Sheet!');
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal menyimpan absensi');
      }
    } catch (err: any) {
      onShowToast('error', 'Gagal terhubung ke Google Apps Script. Periksa koneksi internet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {/* Tanggal Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tanggal Absensi</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {formatDateID(selectedDate)}
              </span>
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
                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900"
              >
                {classes.map(cls => (
                  <option key={cls.id_kelas} value={cls.id_kelas}>
                    Kelas {cls.nama_kelas} (Tingkat {cls.tingkat})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total {classStudents.length} siswa terdaftar
              </span>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleMarkAllHadir}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              title="Set semua siswa di kelas ini menjadi Hadir (H)"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Semua Hadir</span>
            </button>
            <button
              onClick={handleMarkAllAlpa}
              className="px-3 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Reset semua status ke Alpa (A)"
            >
              Reset ke Alpa
            </button>
          </div>
        </div>
      </div>

      {/* Student List & Attendance Marking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Search Filter */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Siswa Kelas {currentClass?.nama_kelas || ''}
            </h3>
            <p className="text-xs text-slate-500">
              Pilih status kehadiran setiap siswa: H (Hadir), S (Sakit), I (Izin), A (Alpa)
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa di kelas ini..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Table Container */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat data absensi kelas...</span>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-medium text-slate-700">Belum ada siswa di kelas ini.</p>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan siswa terlebih dahulu di menu <strong>Data Siswa</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">ID Siswa</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4 text-center w-60">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((st, idx) => {
                  const currentStatus = attendanceData[st.id_siswa] || 'A';

                  return (
                    <tr
                      key={st.id_siswa}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {st.id_siswa}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {st.nama}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {/* Touch-Friendly Status Selector Buttons */}
                        <div className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200">
                          {/* Hadir (H) */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id_siswa, 'H')}
                            className={`w-9 h-8 sm:w-10 sm:h-9 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
                              currentStatus === 'H'
                                ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-1 ring-emerald-600'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                            }`}
                            title="Hadir"
                          >
                            H
                          </button>

                          {/* Sakit (S) */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id_siswa, 'S')}
                            className={`w-9 h-8 sm:w-10 sm:h-9 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
                              currentStatus === 'S'
                                ? 'bg-sky-600 text-white shadow-xs scale-102 ring-1 ring-sky-600'
                                : 'text-slate-600 hover:text-sky-700 hover:bg-white'
                            }`}
                            title="Sakit"
                          >
                            S
                          </button>

                          {/* Izin (I) */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id_siswa, 'I')}
                            className={`w-9 h-8 sm:w-10 sm:h-9 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
                              currentStatus === 'I'
                                ? 'bg-indigo-600 text-white shadow-xs scale-102 ring-1 ring-indigo-600'
                                : 'text-slate-600 hover:text-indigo-700 hover:bg-white'
                            }`}
                            title="Izin"
                          >
                            I
                          </button>

                          {/* Alpa (A) */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id_siswa, 'A')}
                            className={`w-9 h-8 sm:w-10 sm:h-9 rounded-md text-xs font-bold transition-all flex items-center justify-center ${
                              currentStatus === 'A'
                                ? 'bg-rose-600 text-white shadow-xs scale-102 ring-1 ring-rose-600'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-white'
                            }`}
                            title="Alpa (Tanpa Keterangan)"
                          >
                            A
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Bar: Live Counter & Save Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Live Attendance Counter */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700">Ringkasan Hari Ini:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Hadir: <strong className="tabular-nums">{summaryCounts.h}</strong>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-600" />
              Sakit: <strong className="tabular-nums">{summaryCounts.s}</strong>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Izin: <strong className="tabular-nums">{summaryCounts.i}</strong>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              Alpa: <strong className="tabular-nums">{summaryCounts.a}</strong>
            </span>
            <span className="text-slate-400">| Total: {summaryCounts.total}</span>
          </div>

          {/* SIMPAN ABSENSI Button */}
          <button
            onClick={handleInitiateSave}
            disabled={saving || classStudents.length === 0}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs md:text-sm font-bold shadow-xs transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Google Sheets...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SIMPAN ABSENSI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Konfirmasi Simpan Absensi
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Apakah data absensi kelas <strong>{currentClass?.nama_kelas}</strong> untuk tanggal <strong>{formatDateID(selectedDate)}</strong> sudah benar?
                </p>

                {/* Brief Summary */}
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Hadir:</span>
                    <strong className="text-emerald-700">{summaryCounts.h} Siswa</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Sakit:</span>
                    <strong className="text-sky-700">{summaryCounts.s} Siswa</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Izin:</span>
                    <strong className="text-indigo-700">{summaryCounts.i} Siswa</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Alpa:</span>
                    <strong className="text-rose-700">{summaryCounts.a} Siswa</strong>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Tidak, Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    Ya, Simpan ke Google Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
