import * as XLSX from 'xlsx';
import { SchoolSettings, StudentMonthlyRecap } from './types';

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const DAY_NAMES_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
];

/**
 * Get number of days in a given month and year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Check if a specific date is Sunday (0 = Sunday in JS getDay())
 */
export function isSunday(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0;
}

/**
 * Format date to standard YYYY-MM-DD
 */
export function formatDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format date string (YYYY-MM-DD) to Indonesian long format: "23 September 2026"
 */
export function formatDateID(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  const dayName = DAY_NAMES_ID[dateObj.getDay()];
  const monthName = MONTH_NAMES_ID[month] || '';
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Export Monthly Attendance Recap to Excel (.xlsx) matching official school ledger
 */
export function exportToExcel(
  recapList: StudentMonthlyRecap[],
  className: string,
  month: number,
  year: number,
  settings: SchoolSettings
) {
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = MONTH_NAMES_ID[month - 1];

  // Prepare header rows
  const headerData: any[][] = [
    ['DAFTAR HADIR SISWA'],
    [settings.nama_sekolah || 'MADRASAH'],
    [settings.alamat_sekolah || ''],
    [`TAHUN PELAJARAN ${settings.tahun_pelajaran || '2026/2027'}`],
    [],
    [`BULAN: ${monthName.toUpperCase()} ${year}`, '', '', '', `KELAS: ${className}`],
    []
  ];

  // Table column headers
  const tableHeaders: string[] = ['NO', 'ID SISWA', 'NAMA SISWA'];
  for (let d = 1; d <= daysInMonth; d++) {
    tableHeaders.push(String(d));
  }
  tableHeaders.push('H', 'S', 'I', 'A');
  headerData.push(tableHeaders);

  // Table rows
  recapList.forEach((st, idx) => {
    const row: any[] = [idx + 1, st.id_siswa, st.nama];
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(st.dailyStatus[d] || '-');
    }
    row.push(st.totalH, st.totalS, st.totalI, st.totalA);
    headerData.push(row);
  });

  // Footer notes & signatures
  headerData.push([]);
  headerData.push(['Keterangan:', 'H = Hadir', 'S = Sakit', 'I = Izin', 'A = Alpa']);
  headerData.push([]);
  headerData.push([
    '',
    'Mengetahui,',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `Wali Kelas / Guru ${className}`
  ]);
  headerData.push([
    '',
    `Kepala ${settings.nama_sekolah || 'Madrasah'}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);
  headerData.push([]);
  headerData.push([]);
  headerData.push([
    '',
    settings.kepala_sekolah || '(....................................)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    settings.nama_operator || '(....................................)'
  ]);

  if (settings.nip_kepala_sekolah) {
    headerData.push(['', `NIP. ${settings.nip_kepala_sekolah}`]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(headerData);

  // Column width configuration
  const colWidths: { wch: number }[] = [
    { wch: 5 },   // NO
    { wch: 10 },  // ID
    { wch: 28 },  // NAMA
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    colWidths.push({ wch: 4 }); // date columns
  }
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }); // H, S, I, A
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_${className}_${monthName}`);

  const fileName = `Rekap_Absensi_${className}_${monthName}_${year}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
