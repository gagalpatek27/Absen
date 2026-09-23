import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import { SchoolSettings, StudentMonthlyRecap } from '../lib/types';
import { MONTH_NAMES_ID, getDaysInMonth, isSunday } from '../lib/utils';

interface PrintReportModalProps {
  data: {
    recapList: StudentMonthlyRecap[];
    className: string;
    month: number;
    year: number;
  } | null;
  settings: SchoolSettings;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  data,
  settings,
  onClose,
}) => {
  if (!data) return null;

  const { recapList, className, month, year } = data;
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = MONTH_NAMES_ID[month - 1] || '';

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-300">
        {/* Modal Top Control Bar (Hidden when printing via .no-print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print rounded-t-xl shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Preview Cetak Laporan (A4 Landscape)
            </h3>
            <p className="text-xs text-slate-500">
              Format lembar absensi resmi madrasah siap cetak / simpan ke PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerPrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-100/50 print:p-0 print:bg-white printable-area">
          <div className="bg-white p-6 sm:p-8 border border-slate-300 shadow-sm mx-auto text-slate-900 print:border-none print:shadow-none print:p-0">
            {/* Header Sekolah */}
            <div className="text-center pb-4 border-b-2 border-slate-800">
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider">
                DAFTAR HADIR SISWA
              </h1>
              <h2 className="text-sm sm:text-base font-bold uppercase mt-0.5">
                {settings.nama_sekolah || 'MADRASAH IBTIDAIYAH'}
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                {settings.alamat_sekolah}
              </p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                TAHUN PELAJARAN {settings.tahun_pelajaran || '2026/2027'}
              </p>
            </div>

            {/* Sub-header: Bulan & Kelas */}
            <div className="flex items-center justify-between text-xs font-bold my-3 px-1">
              <span>BULAN: {monthName.toUpperCase()} {year}</span>
              <span>KELAS: {className}</span>
            </div>

            {/* Official Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border border-slate-800 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-800">
                    <th className="border border-slate-800 py-1.5 px-1 w-7 text-center">NO</th>
                    <th className="border border-slate-800 py-1.5 px-2 text-left min-w-[140px]">NAMA SISWA</th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const sun = isSunday(year, month, d);
                      return (
                        <th
                          key={d}
                          className={`border border-slate-800 py-1 px-0.5 min-w-[18px] ${
                            sun ? 'bg-rose-100 font-bold' : ''
                          }`}
                        >
                          {d}
                        </th>
                      );
                    })}
                    <th className="border border-slate-800 py-1 px-1 w-6 bg-slate-50 font-bold">H</th>
                    <th className="border border-slate-800 py-1 px-1 w-6 bg-slate-50 font-bold">S</th>
                    <th className="border border-slate-800 py-1 px-1 w-6 bg-slate-50 font-bold">I</th>
                    <th className="border border-slate-800 py-1 px-1 w-6 bg-slate-50 font-bold">A</th>
                  </tr>
                </thead>
                <tbody>
                  {recapList.map((st, idx) => (
                    <tr key={st.id_siswa} className="border-b border-slate-800">
                      <td className="border border-slate-800 py-1 px-1 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 py-1 px-2 text-left font-semibold truncate max-w-[180px]">
                        {st.nama}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                        const stat = st.dailyStatus[d] || '-';
                        const sun = isSunday(year, month, d);
                        return (
                          <td
                            key={d}
                            className={`border border-slate-800 py-0.5 px-0 font-mono text-[9px] ${
                              sun ? 'bg-rose-50' : ''
                            } ${stat === 'H' ? 'font-bold' : ''}`}
                          >
                            {stat}
                          </td>
                        );
                      })}
                      <td className="border border-slate-800 py-1 px-1 font-bold">{st.totalH}</td>
                      <td className="border border-slate-800 py-1 px-1 font-bold">{st.totalS}</td>
                      <td className="border border-slate-800 py-1 px-1 font-bold">{st.totalI}</td>
                      <td className="border border-slate-800 py-1 px-1 font-bold">{st.totalA}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-300">
              <div className="flex items-center justify-between text-[11px] mb-6">
                <div>
                  <strong>Keterangan:</strong> H = Hadir, S = Sakit, I = Izin, A = Alpa
                </div>
                <div className="text-slate-500">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala {settings.nama_sekolah}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">
                    {settings.kepala_sekolah || '( .............................................. )'}
                  </p>
                  {settings.nip_kepala_sekolah && (
                    <p className="text-[10px]">NIP. {settings.nip_kepala_sekolah}</p>
                  )}
                </div>

                <div>
                  <p>
                    {settings.alamat_sekolah ? settings.alamat_sekolah.split(',')[0] : 'Madrasah'}, {monthName} {year}
                  </p>
                  <p className="font-bold">Wali Kelas / Guru</p>
                  <div className="h-16" />
                  <p className="font-bold underline">
                    {settings.nama_operator || '( .............................................. )'}
                  </p>
                  <p className="text-[10px]">NIP/NUPTK. -</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
