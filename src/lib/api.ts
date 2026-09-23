import {
  Student,
  SchoolClass,
  AttendanceRecord,
  SchoolSettings,
  DailyAttendanceItem,
  StudentMonthlyRecap,
  DashboardSummary,
  ApiResponse,
  UserProfile
} from './types';
import { getDaysInMonth } from './utils';

const STORAGE_KEYS = {
  SCRIPT_URL: 'madrasah_gas_url',
  SETTINGS: 'madrasah_settings',
  STUDENTS: 'madrasah_students',
  CLASSES: 'madrasah_classes',
  ATTENDANCE: 'madrasah_attendance',
  USER: 'madrasah_current_user'
};

// Default initial data for classes 1A to 6B
const INITIAL_CLASSES: SchoolClass[] = [
  { id_kelas: 'K01', nama_kelas: '1A', tingkat: '1', status: 'Aktif' },
  { id_kelas: 'K02', nama_kelas: '1B', tingkat: '1', status: 'Aktif' },
  { id_kelas: 'K03', nama_kelas: '2A', tingkat: '2', status: 'Aktif' },
  { id_kelas: 'K04', nama_kelas: '2B', tingkat: '2', status: 'Aktif' },
  { id_kelas: 'K05', nama_kelas: '3A', tingkat: '3', status: 'Aktif' },
  { id_kelas: 'K06', nama_kelas: '3B', tingkat: '3', status: 'Aktif' },
  { id_kelas: 'K07', nama_kelas: '4A', tingkat: '4', status: 'Aktif' },
  { id_kelas: 'K08', nama_kelas: '4B', tingkat: '4', status: 'Aktif' },
  { id_kelas: 'K09', nama_kelas: '5A', tingkat: '5', status: 'Aktif' },
  { id_kelas: 'K10', nama_kelas: '5B', tingkat: '5', status: 'Aktif' },
  { id_kelas: 'K11', nama_kelas: '6A', tingkat: '6', status: 'Aktif' },
  { id_kelas: 'K12', nama_kelas: '6B', tingkat: '6', status: 'Aktif' },
];

const INITIAL_STUDENTS: Student[] = [
  { id_siswa: 'S001', nama: 'Ahmad Fauzi', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S002', nama: 'Budi Santoso', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S003', nama: 'Citra Kirana', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S004', nama: 'Dewi Lestari', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S005', nama: 'Eko Prasetyo', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S006', nama: 'Farah Amalia', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S007', nama: 'Gilang Ramadhan', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S008', nama: 'Hana Nafisa', id_kelas: 'K01', nama_kelas: '1A', status: 'Aktif' },
  { id_siswa: 'S009', nama: 'Ihsan Kamil', id_kelas: 'K02', nama_kelas: '1B', status: 'Aktif' },
  { id_siswa: 'S010', nama: 'Jasmine Zahra', id_kelas: 'K02', nama_kelas: '1B', status: 'Aktif' },
  { id_siswa: 'S011', nama: 'Kurniawan Dwi', id_kelas: 'K03', nama_kelas: '2A', status: 'Aktif' },
  { id_siswa: 'S012', nama: 'Laila Majnun', id_kelas: 'K03', nama_kelas: '2A', status: 'Aktif' },
];

const INITIAL_SETTINGS: SchoolSettings = {
  nama_sekolah: 'Madrasah Ibtidaiyah Negeri 1',
  alamat_sekolah: 'Jl. Pesantren No. 12, Kota Pendidikan',
  tahun_pelajaran: '2026/2027',
  kepala_sekolah: 'H. Muhammad Ridwan, S.Ag., M.Pd.I',
  nip_kepala_sekolah: '197508152003121002',
  nama_operator: 'Ustadzah Nurul Hidayati',
  hitung_minggu_libur: true,
};

// Seed initial sample attendance for current month so rekap & dashboard have live preview
function generateSampleAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const currentDay = Math.min(today.getDate(), 24);

  const sample1AStudents = INITIAL_STUDENTS.filter(s => s.id_kelas === 'K01');

  for (let d = 1; d <= currentDay; d++) {
    const dObj = new Date(year, month - 1, d);
    if (dObj.getDay() === 0) continue; // skip Sunday

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    sample1AStudents.forEach((st, idx) => {
      let status: 'H' | 'S' | 'I' | 'A' = 'H';
      // Introduce realistic variations
      if (idx === 1 && d === 4) status = 'S';
      if (idx === 2 && d === 12) status = 'I';
      if (idx === 4 && d === 18) status = 'A';
      if (idx === 5 && (d === 8 || d === 9)) status = 'S';

      records.push({
        id_absensi: `ABS_${dateStr}_${st.id_siswa}`,
        tanggal: dateStr,
        tahun: year,
        bulan: month,
        id_siswa: st.id_siswa,
        nama_siswa: st.nama,
        id_kelas: 'K01',
        nama_kelas: '1A',
        status
      });
    });
  }
  return records;
}

export function getScriptUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEYS.SCRIPT_URL);
  if (stored) return stored.trim();

  const envUrl =
    (import.meta.env.VITE_GOOGLE_SCRIPT_URL as string) ||
    ((import.meta.env as any).NEXT_PUBLIC_GOOGLE_SCRIPT_URL as string) ||
    '';
  return envUrl.trim();
}

export function setScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  }
}

// Local mock storage helpers
function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Low-level fetcher to Google Apps Script Web App
async function callGAS<T>(action: string, method: 'GET' | 'POST' = 'GET', payload?: any): Promise<ApiResponse<T>> {
  const scriptUrl = getScriptUrl();

  if (!scriptUrl) {
    // If no script URL is configured, use local simulated engine
    return callLocalSimulation<T>(action, method, payload);
  }

  try {
    let url = scriptUrl;
    let options: RequestInit = {
      method,
      redirect: 'follow',
      headers: {
        'Accept': 'application/json'
      }
    };

    if (method === 'GET') {
      const u = new URL(url);
      u.searchParams.set('action', action);
      if (payload) {
        Object.keys(payload).forEach(k => {
          if (payload[k] !== undefined && payload[k] !== null) {
            u.searchParams.set(k, String(payload[k]));
          }
        });
      }
      url = u.toString();
    } else {
      // POST request
      options.headers = {
        'Content-Type': 'text/plain;charset=utf-8', // Apps script handles text/plain with JSON body seamlessly avoiding aggressive preflight CORS
      };
      options.body = JSON.stringify({ action, ...payload });
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data as ApiResponse<T>;
  } catch (err: any) {
    console.warn(`[API] Remote GAS call failed for action "${action}", falling back to local storage:`, err);
    // Fallback to local simulation if remote server fails or connection is down
    const localRes = await callLocalSimulation<T>(action, method, payload);
    return {
      ...localRes,
      message: localRes.message + ' (Koneksi ke Google Apps Script bermasalah, menggunakan data lokal)'
    };
  }
}

// Local simulation engine with complete business logic
async function callLocalSimulation<T>(action: string, method: 'GET' | 'POST', payload?: any): Promise<ApiResponse<T>> {
  // Simulate tiny network latency for realistic feel
  await new Promise(r => setTimeout(r, 60));

  let students = getLocal<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  let classes = getLocal<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  let attendance = getLocal<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, generateSampleAttendance());
  let settings = getLocal<SchoolSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);

  switch (action) {
    case 'getSiswa': {
      return { success: true, message: 'Data siswa berhasil dimuat', data: students as any };
    }
    case 'tambahSiswa': {
      const newSt: Student = payload.data;
      if (!newSt.id_siswa || !newSt.nama) {
        return { success: false, message: 'ID Siswa dan Nama wajib diisi' };
      }
      if (students.some(s => s.id_siswa.toLowerCase() === newSt.id_siswa.toLowerCase())) {
        return { success: false, message: `ID Siswa ${newSt.id_siswa} sudah ada!` };
      }
      students.push(newSt);
      setLocal(STORAGE_KEYS.STUDENTS, students);
      return { success: true, message: 'Siswa berhasil ditambahkan', data: newSt as any };
    }
    case 'updateSiswa': {
      const updSt: Student = payload.data;
      const idx = students.findIndex(s => s.id_siswa === updSt.id_siswa);
      if (idx === -1) return { success: false, message: 'Siswa tidak ditemukan' };
      students[idx] = updSt;
      setLocal(STORAGE_KEYS.STUDENTS, students);
      return { success: true, message: 'Data siswa berhasil diupdate', data: updSt as any };
    }
    case 'hapusSiswa': {
      const id = payload.id_siswa;
      students = students.filter(s => s.id_siswa !== id);
      setLocal(STORAGE_KEYS.STUDENTS, students);
      return { success: true, message: 'Siswa berhasil dihapus' };
    }
    case 'importSiswa': {
      const items: Student[] = payload.data || [];
      let added = 0;
      items.forEach(st => {
        const existingIdx = students.findIndex(s => s.id_siswa === st.id_siswa);
        if (existingIdx >= 0) {
          students[existingIdx] = st;
        } else {
          students.push(st);
          added++;
        }
      });
      setLocal(STORAGE_KEYS.STUDENTS, students);
      return { success: true, message: `Berhasil mengimpor ${items.length} siswa (${added} data baru)` };
    }

    case 'getKelas': {
      return { success: true, message: 'Data kelas berhasil dimuat', data: classes as any };
    }
    case 'tambahKelas': {
      const newCl: SchoolClass = payload.data;
      if (classes.some(c => c.id_kelas === newCl.id_kelas || c.nama_kelas === newCl.nama_kelas)) {
        return { success: false, message: 'ID atau Nama Kelas sudah ada' };
      }
      classes.push(newCl);
      setLocal(STORAGE_KEYS.CLASSES, classes);
      return { success: true, message: 'Kelas berhasil ditambahkan', data: newCl as any };
    }
    case 'updateKelas': {
      const updCl: SchoolClass = payload.data;
      const idx = classes.findIndex(c => c.id_kelas === updCl.id_kelas);
      if (idx === -1) return { success: false, message: 'Kelas tidak ditemukan' };
      classes[idx] = updCl;
      setLocal(STORAGE_KEYS.CLASSES, classes);
      return { success: true, message: 'Data kelas berhasil diupdate', data: updCl as any };
    }
    case 'hapusKelas': {
      const id = payload.id_kelas;
      classes = classes.filter(c => c.id_kelas !== id);
      setLocal(STORAGE_KEYS.CLASSES, classes);
      return { success: true, message: 'Kelas berhasil dihapus' };
    }

    case 'getAbsensi': {
      const { tanggal, id_kelas } = payload;
      let filtered = attendance.filter(a => a.tanggal === tanggal);
      if (id_kelas) {
        filtered = filtered.filter(a => a.id_kelas === id_kelas);
      }
      return { success: true, message: 'Data absensi harian berhasil dimuat', data: filtered as any };
    }

    case 'simpanAbsensi': {
      // Prevents duplicates by key: Tanggal + ID_SISWA
      const { tanggal, id_kelas, nama_kelas, data } = payload;
      if (!tanggal || !id_kelas || !Array.isArray(data)) {
        return { success: false, message: 'Data absensi tidak lengkap' };
      }

      const parts = tanggal.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);

      data.forEach((item: DailyAttendanceItem) => {
        const id_absensi = `ABS_${tanggal}_${item.id_siswa}`;
        const existingIdx = attendance.findIndex(
          a => a.tanggal === tanggal && a.id_siswa === item.id_siswa
        );

        const record: AttendanceRecord = {
          id_absensi,
          tanggal,
          tahun: year,
          bulan: month,
          id_siswa: item.id_siswa,
          nama_siswa: item.nama,
          id_kelas,
          nama_kelas: nama_kelas || '',
          status: item.status
        };

        if (existingIdx >= 0) {
          attendance[existingIdx] = record;
        } else {
          attendance.push(record);
        }
      });

      setLocal(STORAGE_KEYS.ATTENDANCE, attendance);
      return { success: true, message: `Absensi tanggal ${tanggal} berhasil disimpan (${data.length} siswa)` };
    }

    case 'getRekapBulanan': {
      const bulan = parseInt(payload.bulan, 10);
      const tahun = parseInt(payload.tahun, 10);
      const id_kelas = payload.id_kelas || payload.kelas;

      // Filter students in the target class
      const classStudents = students.filter(s => s.id_kelas === id_kelas && s.status === 'Aktif');
      const targetClass = classes.find(c => c.id_kelas === id_kelas);
      const daysCount = getDaysInMonth(tahun, bulan);

      // Build dynamic recap from ABSENSI records
      const recap: StudentMonthlyRecap[] = classStudents.map(st => {
        const dailyStatus: Record<number, any> = {};
        let totalH = 0;
        let totalS = 0;
        let totalI = 0;
        let totalA = 0;

        for (let d = 1; d <= daysCount; d++) {
          const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const rec = attendance.find(a => a.tanggal === dateStr && a.id_siswa === st.id_siswa);
          if (rec) {
            dailyStatus[d] = rec.status;
            if (rec.status === 'H') totalH++;
            else if (rec.status === 'S') totalS++;
            else if (rec.status === 'I') totalI++;
            else if (rec.status === 'A') totalA++;
          } else {
            dailyStatus[d] = '-';
          }
        }

        return {
          id_siswa: st.id_siswa,
          nama: st.nama,
          id_kelas: st.id_kelas,
          nama_kelas: targetClass?.nama_kelas || st.nama_kelas,
          dailyStatus,
          totalH,
          totalS,
          totalI,
          totalA
        };
      });

      return { success: true, message: 'Rekap absensi bulanan berhasil dihitung', data: recap as any };
    }

    case 'getDashboard': {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const activeStudents = students.filter(s => s.status === 'Aktif');
      const todayAttendance = attendance.filter(a => a.tanggal === todayStr);

      const hadirToday = todayAttendance.filter(a => a.status === 'H').length;
      const sakitToday = todayAttendance.filter(a => a.status === 'S').length;
      const izinToday = todayAttendance.filter(a => a.status === 'I').length;
      const alpaToday = todayAttendance.filter(a => a.status === 'A').length;

      // Month stats
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const monthAttendance = attendance.filter(a => a.bulan === currentMonth && a.tahun === currentYear);

      const hadirMonth = monthAttendance.filter(a => a.status === 'H').length;
      const sakitMonth = monthAttendance.filter(a => a.status === 'S').length;
      const izinMonth = monthAttendance.filter(a => a.status === 'I').length;
      const alpaMonth = monthAttendance.filter(a => a.status === 'A').length;

      const totalRecorded = hadirToday + sakitToday + izinToday + alpaToday;
      const persentase = totalRecorded > 0 ? Math.round((hadirToday / totalRecorded) * 100) : 0;

      const summary: DashboardSummary = {
        total_siswa: activeStudents.length,
        total_kelas: classes.filter(c => c.status === 'Aktif').length,
        hadir_hari_ini: hadirToday,
        sakit_hari_ini: sakitToday,
        izin_hari_ini: izinToday,
        alpa_hari_ini: alpaToday,
        persentase_kehadiran: persentase,
        rekap_bulan_ini: {
          hadir: hadirMonth,
          sakit: sakitMonth,
          izin: izinMonth,
          alpa: alpaMonth
        }
      };

      return { success: true, message: 'Data dashboard berhasil dimuat', data: summary as any };
    }

    case 'getPengaturan': {
      return { success: true, message: 'Pengaturan berhasil dimuat', data: settings as any };
    }

    case 'updatePengaturan': {
      settings = { ...settings, ...payload.data };
      setLocal(STORAGE_KEYS.SETTINGS, settings);
      return { success: true, message: 'Pengaturan berhasil diperbarui', data: settings as any };
    }

    case 'checkStudent': {
      const searchId = String(payload.id || payload.id_siswa || '').trim().toUpperCase();
      const st = students.find(s => s.id_siswa.toUpperCase() === searchId);
      if (!st) {
        return { success: true, message: 'Siswa tidak ditemukan', data: { found: false } as any };
      }
      return {
        success: true,
        message: 'Siswa ditemukan',
        data: {
          found: true,
          student: {
            id: st.id_siswa,
            id_siswa: st.id_siswa,
            nama: st.nama,
            id_kelas: st.id_kelas,
            nama_kelas: st.nama_kelas,
            kelas: st.nama_kelas,
            status: st.status
          }
        } as any
      };
    }

    case 'checkTodayAttendance': {
      const searchId = String(payload.id || payload.id_siswa || '').trim().toUpperCase();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const rec = attendance.find(a => a.tanggal === todayStr && a.id_siswa.toUpperCase() === searchId);

      if (rec) {
        return {
          success: true,
          message: 'Siswa sudah absen hari ini',
          data: {
            alreadyAttended: true,
            attendance: {
              tanggal: rec.tanggal,
              jam: rec.jam || '07:30:00',
              status: rec.status
            }
          } as any
        };
      }
      return {
        success: true,
        message: 'Siswa belum absen hari ini',
        data: { alreadyAttended: false } as any
      };
    }

    case 'scanAttendance': {
      const searchId = String(payload.id_siswa || '').trim().toUpperCase();
      const metode = payload.metode || 'QR_CAMERA';
      const st = students.find(s => s.id_siswa.toUpperCase() === searchId);

      if (!st) {
        return {
          success: false,
          message: 'Siswa tidak ditemukan',
          data: {
            code: 'STUDENT_NOT_FOUND',
            id_siswa: searchId
          } as any
        };
      }

      if (st.status !== 'Aktif') {
        return {
          success: false,
          message: 'Siswa tidak aktif',
          data: {
            code: 'STUDENT_INACTIVE',
            student: st
          } as any
        };
      }

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;
      const displayDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      const already = attendance.find(a => a.tanggal === todayStr && a.id_siswa.toUpperCase() === searchId);
      if (already) {
        return {
          success: false,
          message: 'Siswa ini sudah melakukan absensi hari ini.',
          data: {
            code: 'ALREADY_ATTENDED',
            alreadyAttended: true,
            student: st,
            attendance: {
              tanggal: displayDate,
              jam: already.jam || timeStr,
              status: already.status
            }
          } as any
        };
      }

      const newRecord: AttendanceRecord = {
        id_absensi: `ABS_${todayStr}_${st.id_siswa}`,
        tanggal: todayStr,
        tahun: today.getFullYear(),
        bulan: today.getMonth() + 1,
        jam: timeStr,
        id_siswa: st.id_siswa,
        nama_siswa: st.nama,
        id_kelas: st.id_kelas,
        nama_kelas: st.nama_kelas,
        status: 'H',
        metode: metode
      };

      attendance.push(newRecord);
      setLocal(STORAGE_KEYS.ATTENDANCE, attendance);

      return {
        success: true,
        message: 'Absensi berhasil dicatat',
        data: {
          code: 'ATTENDANCE_RECORDED',
          student: st,
          attendance: {
            id_absensi: newRecord.id_absensi,
            tanggal: displayDate,
            jam: timeStr,
            status: 'H',
            metode: metode
          }
        } as any
      };
    }

    case 'getTodayScanHistory': {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayRecs = attendance
        .filter(a => a.tanggal === todayStr)
        .map(a => ({
          id_absensi: a.id_absensi || '',
          tanggal: a.tanggal,
          jam: a.jam || '07:30:00',
          id_siswa: a.id_siswa,
          nama: a.nama_siswa,
          id_kelas: a.id_kelas,
          nama_kelas: a.nama_kelas,
          status: a.status,
          metode: a.metode || 'MANUAL'
        }))
        .reverse();

      return { success: true, message: 'Riwayat absensi hari ini', data: todayRecs as any };
    }

    default:
      return { success: false, message: `Action "${action}" tidak dikenali` };
  }
}

// Exported high level API methods
export const api = {
  // Students
  getSiswa: () => callGAS<Student[]>('getSiswa'),
  tambahSiswa: (student: Student) => callGAS<Student>('tambahSiswa', 'POST', { data: student }),
  updateSiswa: (student: Student) => callGAS<Student>('updateSiswa', 'POST', { data: student }),
  hapusSiswa: (id_siswa: string) => callGAS('hapusSiswa', 'POST', { id_siswa }),
  importSiswa: (students: Student[]) => callGAS('importSiswa', 'POST', { data: students }),

  // Classes
  getKelas: () => callGAS<SchoolClass[]>('getKelas'),
  tambahKelas: (schoolClass: SchoolClass) => callGAS<SchoolClass>('tambahKelas', 'POST', { data: schoolClass }),
  updateKelas: (schoolClass: SchoolClass) => callGAS<SchoolClass>('updateKelas', 'POST', { data: schoolClass }),
  hapusKelas: (id_kelas: string) => callGAS('hapusKelas', 'POST', { id_kelas }),

  // Attendance
  getAbsensi: (tanggal: string, id_kelas?: string) => callGAS<AttendanceRecord[]>('getAbsensi', 'GET', { tanggal, id_kelas }),
  simpanAbsensi: (tanggal: string, id_kelas: string, nama_kelas: string, data: DailyAttendanceItem[]) =>
    callGAS('simpanAbsensi', 'POST', { tanggal, id_kelas, nama_kelas, data }),

  // QR Camera Attendance APIs
  checkStudent: (id: string) => callGAS<any>('checkStudent', 'GET', { id, id_siswa: id }),
  checkTodayAttendance: (id: string) => callGAS<any>('checkTodayAttendance', 'GET', { id, id_siswa: id }),
  scanAttendance: (id_siswa: string, metode: string = 'QR_CAMERA') =>
    callGAS<any>('scanAttendance', 'POST', { id_siswa, metode }),
  getTodayScanHistory: () => callGAS<any[]>('getTodayScanHistory', 'GET'),

  // Monthly Recap
  getRekapBulanan: (bulan: number, tahun: number, id_kelas: string) =>
    callGAS<StudentMonthlyRecap[]>('getRekapBulanan', 'GET', { bulan, tahun, id_kelas, kelas: id_kelas }),

  // Dashboard
  getDashboard: () => callGAS<DashboardSummary>('getDashboard'),

  // Settings
  getPengaturan: () => callGAS<SchoolSettings>('getPengaturan'),
  updatePengaturan: (settings: SchoolSettings) => callGAS<SchoolSettings>('updatePengaturan', 'POST', { data: settings }),

  // Test live connection to Google Apps Script
  testConnection: async (testUrl?: string): Promise<{ ok: boolean; message: string }> => {
    const url = (testUrl || getScriptUrl()).trim();
    if (!url) {
      return { ok: false, message: 'URL Google Apps Script belum diisi.' };
    }
    try {
      const testEndpoint = `${url}?action=getPengaturan`;
      const res = await fetch(testEndpoint, { redirect: 'follow' });
      if (!res.ok) {
        return { ok: false, message: `Gagal: Server mengembalikan status ${res.status}` };
      }
      const json = await res.json();
      if (json && json.success) {
        return { ok: true, message: 'Koneksi ke Google Apps Script berhasil dan aktif!' };
      }
      return { ok: false, message: json.message || 'Respons API tidak valid.' };
    } catch (err: any) {
      return {
        ok: false,
        message: 'Gagal terhubung ke Google Apps Script. Pastikan URL benar dan izin Deploy diatur ke "Anyone".'
      };
    }
  }
};
