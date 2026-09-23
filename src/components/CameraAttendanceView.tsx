import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Zap,
  RotateCcw,
  School,
  Clock,
  UserCheck,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { Student, SchoolClass, ScanHistoryItem, AttendanceScanResult } from '../lib/types';
import { formatDateID, formatDateISO } from '../lib/utils';
import { playSound, playSuccessSound, playAlreadyAttendedSound, playErrorSound } from '../lib/audio';
import { api } from '../lib/api';

interface CameraAttendanceViewProps {
  students: Student[];
  classes: SchoolClass[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onRefreshData: () => void;
}

type ScanModalState =
  | { type: 'NONE' }
  | {
      type: 'SUCCESS';
      student: Student;
      jam: string;
      tanggal: string;
    }
  | {
      type: 'ALREADY_ATTENDED';
      student: Student;
      jam: string;
      tanggal: string;
    }
  | {
      type: 'NOT_FOUND';
      rawId: string;
    }
  | {
      type: 'INACTIVE';
      student: Student;
    }
  | {
      type: 'CLASS_MISMATCH';
      student: Student;
      expectedClass: string;
    };

export const CameraAttendanceView: React.FC<CameraAttendanceViewProps> = ({
  students,
  classes,
  onShowToast,
  onRefreshData,
}) => {
  // Settings & Toggles
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL'); // 'ALL' or specific id_kelas
  const [isFastMode, setIsFastMode] = useState<boolean>(true); // Mode Absensi Cepat on by default
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true); // Suara feedback ON by default

  // Scan status states
  const [scanModal, setScanModal] = useState<ScanModalState>({ type: 'NONE' });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCameraOnline, setIsCameraOnline] = useState<boolean>(false);

  // Today's scan history list
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Load today's history from backend
  const loadScanHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.getTodayScanHistory();
      if (res.success && Array.isArray(res.data)) {
        setScanHistory(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat riwayat absensi:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScanHistory();
  }, [loadScanHistory]);

  // Current selected class object
  const currentClassObj = useMemo(() => {
    if (selectedClassId === 'ALL') return null;
    return classes.find(c => c.id_kelas === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Real-time stats calculations
  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Aktif');

    // Scanned student IDs today
    const attendedIds = new Set(
      scanHistory.filter(h => h.status === 'H').map(h => h.id_siswa.toUpperCase())
    );

    if (selectedClassId === 'ALL') {
      const total = activeStudents.length;
      const hadir = activeStudents.filter(s => attendedIds.has(s.id_siswa.toUpperCase())).length;
      const belum = Math.max(0, total - hadir);
      return { total, hadir, belum, label: 'Semua Kelas' };
    } else {
      const classStudents = activeStudents.filter(s => s.id_kelas === selectedClassId);
      const total = classStudents.length;
      const hadir = classStudents.filter(s => attendedIds.has(s.id_siswa.toUpperCase())).length;
      const belum = Math.max(0, total - hadir);
      return { total, hadir, belum, label: `Kelas ${currentClassObj?.nama_kelas || ''}` };
    }
  }, [students, scanHistory, selectedClassId, currentClassObj]);

  // Helper: Extract student ID from QR payload (Raw string or JSON)
  const extractStudentId = (rawQr: string): string => {
    const trimmed = rawQr.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        if (parsed.id_siswa) return String(parsed.id_siswa).trim().toUpperCase();
        if (parsed.id) return String(parsed.id).trim().toUpperCase();
      }
    } catch {
      // Not JSON, continue with raw string
    }
    return trimmed.toUpperCase();
  };

  // Main QR Processing Logic
  const handleQrDetected = useCallback(
    async (rawCode: string) => {
      if (isProcessing) return;

      const studentId = extractStudentId(rawCode);
      if (!studentId) return;

      setIsProcessing(true);

      // Find student locally first for instant checks
      const matchedStudent = students.find(s => s.id_siswa.toUpperCase() === studentId);

      // 1. Check if student exists
      if (!matchedStudent) {
        playSound('error', isSoundOn);
        setScanModal({ type: 'NOT_FOUND', rawId: studentId });
        setIsProcessing(false);

        if (isFastMode) {
          setTimeout(() => setScanModal({ type: 'NONE' }), 2500);
        }
        return;
      }

      // 2. Check if student is active
      if (matchedStudent.status !== 'Aktif') {
        playSound('error', isSoundOn);
        setScanModal({ type: 'INACTIVE', student: matchedStudent });
        setIsProcessing(false);

        if (isFastMode) {
          setTimeout(() => setScanModal({ type: 'NONE' }), 2500);
        }
        return;
      }

      // 3. Check class filter mismatch
      if (selectedClassId !== 'ALL' && matchedStudent.id_kelas !== selectedClassId) {
        playSound('warning', isSoundOn);
        setScanModal({
          type: 'CLASS_MISMATCH',
          student: matchedStudent,
          expectedClass: currentClassObj?.nama_kelas || '',
        });
        setIsProcessing(false);
        return;
      }

      // 4. Send atomic scan request to Backend
      await executeScanAttendance(matchedStudent);
    },
    [students, isProcessing, isSoundOn, isFastMode, selectedClassId, currentClassObj]
  );

  // Perform backend attendance recording
  const executeScanAttendance = async (student: Student) => {
    try {
      const res = await api.scanAttendance(student.id_siswa, 'QR_CAMERA');

      if (res.success) {
        // SUCCESS
        playSound('success', isSoundOn);
        const record = res.data?.attendance;
        const jam = record?.jam || new Date().toLocaleTimeString('id-ID');
        const tanggal = record?.tanggal || formatDateID(formatDateISO(new Date()));

        setScanModal({
          type: 'SUCCESS',
          student: student,
          jam: jam,
          tanggal: tanggal,
        });

        // Add to local history list immediately
        const newHistoryItem: ScanHistoryItem = {
          id_absensi: record?.id_absensi || `ABS_${Date.now()}`,
          tanggal: tanggal,
          jam: jam,
          id_siswa: student.id_siswa,
          nama: student.nama,
          id_kelas: student.id_kelas,
          nama_kelas: student.nama_kelas,
          status: 'H',
          metode: 'QR_CAMERA',
        };

        setScanHistory(prev => [newHistoryItem, ...prev]);
        onRefreshData();

        // Auto close on Fast Mode after 2.2 seconds
        if (isFastMode) {
          setTimeout(() => {
            setScanModal({ type: 'NONE' });
          }, 2200);
        }
      } else {
        // ALREADY ATTENDED OR ERROR
        if (res.data?.code === 'ALREADY_ATTENDED' || res.data?.alreadyAttended) {
          playSound('warning', isSoundOn);
          const att = res.data?.attendance;
          setScanModal({
            type: 'ALREADY_ATTENDED',
            student: student,
            jam: att?.jam || '07:30:00',
            tanggal: att?.tanggal || formatDateID(formatDateISO(new Date())),
          });

          if (isFastMode) {
            setTimeout(() => {
              setScanModal({ type: 'NONE' });
            }, 2500);
          }
        } else {
          playSound('error', isSoundOn);
          onShowToast('error', res.message || 'Gagal menyimpan absensi');
          setScanModal({ type: 'NONE' });
        }
      }
    } catch (err: any) {
      playSound('error', isSoundOn);
      onShowToast('error', 'Terjadi gangguan jaringan ke backend Google Sheets');
      setScanModal({ type: 'NONE' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual bypass when student is in different class
  const handleForceScanMismatch = async () => {
    if (scanModal.type !== 'CLASS_MISMATCH') return;
    const st = scanModal.student;
    setScanModal({ type: 'NONE' });
    setIsProcessing(true);
    await executeScanAttendance(st);
  };

  const handleDismissModal = () => {
    setScanModal({ type: 'NONE' });
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                <Camera className="w-4 h-4 text-emerald-700" />
              </span>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Absensi Kamera USB + QR Code
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">
              Pemindaian Presensi Siswa Otomatis
            </h2>
            <p className="text-xs text-slate-500">
              Arahkan kartu QR Code siswa ke kamera USB atau webcam laptop untuk absensi instan
            </p>
          </div>

          {/* Quick Settings: Filter Kelas, Mode Cepat, Suara */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Kelas */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <School className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none pr-2 py-1 cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map(cls => (
                  <option key={cls.id_kelas} value={cls.id_kelas}>
                    Kelas {cls.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Scan Cepat Toggle */}
            <button
              type="button"
              onClick={() => setIsFastMode(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isFastMode
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Mode Scan Cepat: Otomatis kembali ke pemindaian tanpa perlu klik tombol"
            >
              <Zap className={`w-3.5 h-3.5 ${isFastMode ? 'text-amber-300' : 'text-slate-500'}`} />
              <span>SCAN CEPAT: {isFastMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSoundOn(prev => {
                  const nextState = !prev;
                  if (nextState) {
                    playSuccessSound(true);
                  }
                  return nextState;
                });
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isSoundOn
                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500/20'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
              title="Suara Notifikasi: Bunyi Web Audio API saat scan berhasil, sudah absen, atau gagal"
            >
              {isSoundOn ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Suara: ON</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Suara: OFF</span>
                  <span className="w-2 h-2 rounded-full bg-slate-300 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Camera Video & Live Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Camera Scanner */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <CameraScanner
            onScan={handleQrDetected}
            isScanningPaused={scanModal.type !== 'NONE'}
            onCameraActiveChange={active => setIsCameraOnline(active)}
            onError={err => onShowToast('error', err)}
          />

          {/* Web Audio Signal Tester Bar */}
          <div className="w-full max-w-lg mt-3 bg-white p-2.5 px-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tes Sinyal Audio:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => playSuccessSound(true)}
                className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                title="Dengarkan bunyi absensi berhasil (2-tone chime C5->G5)"
              >
                🔔 Sukses
              </button>
              <button
                type="button"
                onClick={() => playAlreadyAttendedSound(true)}
                className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition-colors cursor-pointer"
                title="Dengarkan bunyi peringatan sudah absen (2-tone alert A4->F4)"
              >
                ⚠️ Sudah Absen
              </button>
              <button
                type="button"
                onClick={() => playErrorSound(true)}
                className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold transition-colors cursor-pointer"
                title="Dengarkan bunyi error gagal scan (descending buzz 260Hz->140Hz)"
              >
                ❌ Absen Gagal
              </button>
            </div>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400 text-center flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mendukung format ID polos (misal: <code>S001</code>) atau format JSON (<code>&#123;"id_siswa":"S001"&#125;</code>)</span>
          </div>

          {/* Quick Simulation Chips (Works even when camera is off or permission is denied) */}
          <div className="w-full max-w-lg mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Simulasi Cepat (Tanpa Kamera):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {students.filter(s => s.status === 'Aktif').slice(0, 3).map(st => (
                <button
                  key={st.id_siswa}
                  type="button"
                  onClick={() => handleQrDetected(st.id_siswa)}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-2xs"
                  title={`Klik untuk uji coba scan langsung ${st.nama}`}
                >
                  ⚡ {st.id_siswa} ({st.nama.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Stats & Instructions */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card: Live Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Statistik Hari Ini
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {stats.label}
                </h4>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {formatDateID(formatDateISO(new Date()))}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-semibold text-slate-500 block">
                  Total Siswa
                </span>
                <span className="text-xl font-bold text-slate-900 tabular-nums mt-0.5 block">
                  {stats.total}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-semibold text-emerald-700 block">
                  Sudah Hadir
                </span>
                <span className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5 block">
                  {stats.hadir}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-semibold text-amber-700 block">
                  Belum Hadir
                </span>
                <span className="text-xl font-bold text-amber-700 tabular-nums mt-0.5 block">
                  {stats.belum}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span>Persentase Kehadiran:</span>
                <strong className="text-emerald-700 font-bold">
                  {stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0}%
                </strong>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0}%`,
                  }}
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Card: Petunjuk Singkat Penggunaan */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Cara Kerja Absensi Kamera USB:</span>
            </h5>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
              <li>Colokkan <strong>Kamera USB</strong> ke laptop/PC Anda.</li>
              <li>Klik tombol <strong>[AKTIFKAN KAMERA]</strong> dan beri izin browser.</li>
              <li>Siswa menunjukkan <strong>Kartu QR</strong> ke depan lensa kamera.</li>
              <li>Sistem memverifikasi status siswa & mencatat kehadiran (H) ke Google Sheet.</li>
              <li>Jika siswa sudah absen sebelumnya hari ini, sistem otomatis menolak duplikasi.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Riwayat Absensi Hari Ini (Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Absensi Hari Ini ({formatDateID(formatDateISO(new Date()))})
            </h3>
            <p className="text-xs text-slate-500">
              Data pemindaian QR Code dan absensi hari ini (data terbaru di atas)
            </p>
          </div>

          <button
            type="button"
            onClick={loadScanHistory}
            disabled={historyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan Riwayat</span>
          </button>
        </div>

        {scanHistory.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">
              Belum ada siswa yang melakukan absensi hari ini.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hasil scan QR Code kamera USB akan langsung muncul di tabel ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-4 w-12 text-center">No</th>
                  <th className="py-2.5 px-4 w-24">Jam</th>
                  <th className="py-2.5 px-4 w-28">ID Siswa</th>
                  <th className="py-2.5 px-4">Nama Siswa</th>
                  <th className="py-2.5 px-4 w-24">Kelas</th>
                  <th className="py-2.5 px-4 w-28 text-center">Status</th>
                  <th className="py-2.5 px-4 w-32 text-center">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scanHistory.map((item, idx) => (
                  <tr key={item.id_absensi || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-700 tabular-nums">
                      {item.jam}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-600">
                      {item.id_siswa}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {item.nama}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      Kelas {item.nama_kelas}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        HADIR (H)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.metode === 'QR_CAMERA' ? '📷 QR Kamera' : '✍ Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SCAN FEEDBACK MODALS */}

      {/* 1. SUCCESS MODAL */}
      {scanModal.type === 'SUCCESS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-2 border-emerald-500 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-extrabold text-emerald-800 tracking-tight">
              ✓ ABSENSI BERHASIL
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Data kehadiran tersimpan ke Google Sheets
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-2 mb-5">
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500">Nama:</span>
                <strong className="text-slate-900 font-bold">{scanModal.student.nama}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500">ID Siswa:</span>
                <strong className="font-mono text-slate-900">{scanModal.student.id_siswa}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500">Kelas:</span>
                <strong className="text-slate-900">Kelas {scanModal.student.nama_kelas}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500">Tanggal:</span>
                <strong className="text-slate-900">{scanModal.tanggal}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500">Jam:</span>
                <strong className="text-slate-900 font-mono">{scanModal.jam}</strong>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                  HADIR
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissModal}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              SCAN SISWA BERIKUTNYA
            </button>
          </div>
        </div>
      )}

      {/* 2. ALREADY ATTENDED MODAL */}
      {scanModal.type === 'ALREADY_ATTENDED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-500 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-extrabold text-amber-800 tracking-tight">
              ⚠ SUDAH ABSEN
            </h3>
            <p className="text-xs text-amber-700 mt-0.5 mb-4">
              Siswa ini sudah melakukan absensi hari ini.
            </p>

            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-left text-xs space-y-2 mb-5">
              <div className="flex justify-between border-b border-amber-200/60 pb-1">
                <span className="text-amber-800">Nama:</span>
                <strong className="text-slate-900 font-bold">{scanModal.student.nama}</strong>
              </div>
              <div className="flex justify-between border-b border-amber-200/60 pb-1">
                <span className="text-amber-800">Kelas:</span>
                <strong className="text-slate-900">Kelas {scanModal.student.nama_kelas}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800">Jam Absen:</span>
                <strong className="text-slate-900 font-mono">{scanModal.jam}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissModal}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              SCAN SISWA BERIKUTNYA
            </button>
          </div>
        </div>
      )}

      {/* 3. STUDENT NOT FOUND MODAL */}
      {scanModal.type === 'NOT_FOUND' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-2 border-rose-500 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <XCircle className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-extrabold text-rose-800 tracking-tight">
              ✕ SISWA TIDAK DITEMUKAN
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              ID Siswa: <strong className="font-mono text-rose-700">{scanModal.rawId}</strong>
            </p>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800 mb-5">
              Periksa data siswa terlebih dahulu di menu <strong>Data Siswa</strong>.
            </div>

            <button
              type="button"
              onClick={handleDismissModal}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup & Scan Ulang
            </button>
          </div>
        </div>
      )}

      {/* 4. STUDENT INACTIVE MODAL */}
      {scanModal.type === 'INACTIVE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-500 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-extrabold text-amber-800 tracking-tight">
              ⚠ SISWA TIDAK AKTIF
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              Nama: <strong>{scanModal.student.nama}</strong> ({scanModal.student.id_siswa})
            </p>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 mb-5">
              Status siswa ini bertanda <strong>Nonaktif</strong>. Absensi tidak dapat dilakukan.
            </div>

            <button
              type="button"
              onClick={handleDismissModal}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* 5. CLASS MISMATCH CONFIRMATION MODAL */}
      {scanModal.type === 'CLASS_MISMATCH' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-300 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center mb-3">
              <School className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Peringatan Perbedaan Kelas
            </h3>
            <p className="text-xs text-slate-600 mt-2 mb-4 leading-relaxed">
              QR Code ini milik <strong>{scanModal.student.nama}</strong> (Kelas <strong>{scanModal.student.nama_kelas}</strong>), bukan siswa kelas <strong>{scanModal.expectedClass}</strong>.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDismissModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleForceScanMismatch}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Absenkan Tetap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
