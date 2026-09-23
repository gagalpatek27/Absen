export type AttendanceStatus = 'H' | 'S' | 'I' | 'A' | '-';

export interface Student {
  id_siswa: string;
  nama: string;
  id_kelas: string;
  nama_kelas: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface SchoolClass {
  id_kelas: string;
  nama_kelas: string;
  tingkat: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface AttendanceRecord {
  id_absensi?: string;
  tanggal: string; // Format: YYYY-MM-DD or DD/MM/YYYY
  tahun: number;
  bulan: number; // 1 - 12
  jam?: string;
  id_siswa: string;
  nama_siswa: string;
  id_kelas: string;
  nama_kelas: string;
  status: 'H' | 'S' | 'I' | 'A';
  metode?: 'MANUAL' | 'QR_CAMERA' | string;
}

export interface AttendanceScanResult {
  success: boolean;
  code?: 'ATTENDANCE_RECORDED' | 'ALREADY_ATTENDED' | 'STUDENT_NOT_FOUND' | 'STUDENT_INACTIVE' | 'CLASS_MISMATCH' | 'LOCK_ERROR' | string;
  message: string;
  alreadyAttended?: boolean;
  student?: {
    id?: string;
    id_siswa: string;
    nama: string;
    id_kelas: string;
    nama_kelas: string;
    status: string;
  };
  attendance?: {
    id_absensi?: string;
    tanggal: string;
    jam: string;
    status: string;
    metode?: string;
  };
}

export interface ScanHistoryItem {
  id_absensi: string;
  tanggal: string;
  jam: string;
  id_siswa: string;
  nama: string;
  id_kelas: string;
  nama_kelas: string;
  status: string;
  metode: string;
}

export interface SchoolSettings {
  nama_sekolah: string;
  alamat_sekolah: string;
  tahun_pelajaran: string;
  kepala_sekolah: string;
  nip_kepala_sekolah?: string;
  nama_operator: string;
  hitung_minggu_libur: boolean;
  script_url?: string;
}

export interface UserProfile {
  id_user: string;
  username: string;
  nama: string;
  role: 'ADMIN' | 'GURU';
  kelas_ampu?: string; // id_kelas assigned for GURU if any
  status: 'Aktif' | 'Nonaktif';
}

export interface DailyAttendanceItem {
  id_siswa: string;
  nama: string;
  status: 'H' | 'S' | 'I' | 'A';
  keterangan?: string;
}

export interface StudentMonthlyRecap {
  id_siswa: string;
  nama: string;
  id_kelas: string;
  nama_kelas: string;
  dailyStatus: Record<number, AttendanceStatus>; // day (1..31) -> status
  totalH: number;
  totalS: number;
  totalI: number;
  totalA: number;
}

export interface DashboardSummary {
  total_siswa: number;
  total_kelas: number;
  hadir_hari_ini: number;
  sakit_hari_ini: number;
  izin_hari_ini: number;
  alpa_hari_ini: number;
  persentase_kehadiran: number;
  rekap_bulan_ini: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
