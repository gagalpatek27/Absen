import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  Printer,
  Search,
  School,
  User,
  Filter,
  Download,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';
import QRCode from 'qrcode';
import { Student, SchoolClass, SchoolSettings } from '../lib/types';

interface StudentQrCardsViewProps {
  students: Student[];
  classes: SchoolClass[];
  settings: SchoolSettings;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentQrCardsView: React.FC<StudentQrCardsViewProps> = ({
  students,
  classes,
  settings,
  onShowToast,
}) => {
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  // Filter students based on selection
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'Aktif') return false;
      if (filterClass !== 'ALL' && s.id_kelas !== filterClass) return false;
      if (selectedStudentId !== 'ALL' && s.id_siswa !== selectedStudentId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.nama.toLowerCase().includes(q) || s.id_siswa.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, filterClass, selectedStudentId, searchQuery]);

  // Generate QR code data URLs for filtered students
  useEffect(() => {
    let isSubscribed = true;
    setIsGenerating(true);

    const generateAllQrs = async () => {
      const urls: Record<string, string> = {};
      for (const st of filteredStudents) {
        try {
          // Plain student ID as required (e.g. S001)
          const dataUrl = await QRCode.toDataURL(st.id_siswa, {
            width: 256,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          urls[st.id_siswa] = dataUrl;
        } catch (err) {
          console.warn(`Failed to generate QR for ${st.id_siswa}:`, err);
        }
      }
      if (isSubscribed) {
        setQrCodeUrls(urls);
        setIsGenerating(false);
      }
    };

    generateAllQrs();

    return () => {
      isSubscribed = false;
    };
  }, [filteredStudents]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls - Hidden on print */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                <QrCode className="w-4 h-4 text-emerald-700" />
              </span>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Kartu QR Siswa
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">
              Cetak Kartu Absensi QR Code
            </h2>
            <p className="text-xs text-slate-500">
              Pilih satu siswa, satu kelas, atau cetak semua kartu dalam tata letak kisi A4
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={filteredStudents.length === 0 || isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu ({filteredStudents.length} Siswa)</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Class selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pilih Kelas:
            </label>
            <div className="relative">
              <School className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterClass}
                onChange={e => {
                  setFilterClass(e.target.value);
                  setSelectedStudentId('ALL');
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Kelas ({students.filter(s => s.status === 'Aktif').length} siswa)</option>
                {classes.map(cls => {
                  const count = students.filter(s => s.id_kelas === cls.id_kelas && s.status === 'Aktif').length;
                  return (
                    <option key={cls.id_kelas} value={cls.id_kelas}>
                      Kelas {cls.nama_kelas} ({count} siswa)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Student selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pilih Siswa Spesifik:
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Siswa Terpilih</option>
                {students
                  .filter(s => filterClass === 'ALL' || s.id_kelas === filterClass)
                  .map(st => (
                    <option key={st.id_siswa} value={st.id_siswa}>
                      {st.id_siswa} - {st.nama} ({st.nama_kelas})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Live search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cari Nama / ID Siswa:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ketik nama atau ID siswa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid Display */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">Tidak ada siswa yang sesuai</h4>
          <p className="text-xs text-slate-400 mt-1">
            Ubah filter kelas atau kata kunci pencarian Anda.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 text-xs text-slate-500 print:hidden">
            <span>
              Menampilkan <strong>{filteredStudents.length} kartu</strong> siap cetak:
            </span>
            <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
              Ukuran cetak otomatis menyesuaikan layout lembar A4 (6–8 kartu per halaman)
            </span>
          </div>

          {/* Printable Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-4 print:p-0">
            {filteredStudents.map(student => {
              const qrUrl = qrCodeUrls[student.id_siswa];

              return (
                <div
                  key={student.id_siswa}
                  className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between print:border-slate-800 print:shadow-none print:break-inside-avoid"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  {/* Card Header */}
                  <div className="bg-emerald-800 text-white p-3 text-center print:bg-emerald-800 print:text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 truncate">
                      {settings.nama_sekolah || 'MADRASAH IBTIDAIYAH'}
                    </p>
                    <h5 className="text-xs font-black tracking-wide mt-0.5">
                      KARTU ABSENSI SISWA
                    </h5>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex flex-col items-center text-center">
                    {/* Student Name */}
                    <h4 className="text-sm font-black text-slate-900 leading-tight uppercase line-clamp-2">
                      {student.nama}
                    </h4>

                    {/* ID & Class Pill */}
                    <div className="flex items-center gap-2 mt-1.5 mb-3">
                      <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800 px-2 py-0.5 rounded">
                        {student.id_siswa}
                      </span>
                      <span className="text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded">
                        KELAS {student.nama_kelas}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="w-36 h-36 bg-white p-2 rounded-xl border-2 border-slate-200 flex items-center justify-center shadow-inner print:border-slate-400">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt={`QR Code ${student.id_siswa}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <QrCode className="w-8 h-8 animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Bottom Help Text */}
                    <p className="text-[9px] text-slate-400 mt-2.5 print:text-slate-600">
                      Tunjukkan QR Code ini ke kamera saat melakukan absensi
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 text-center text-[9px] text-slate-500 font-mono print:bg-white print:border-slate-300">
                    Tahun Ajaran: {settings.tahun_pelajaran || '2026/2027'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
