import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  CloudUpload,
  BookOpen
} from 'lucide-react';

interface ScriptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ScriptGuideModal: React.FC<ScriptGuideModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sheet' | 'deploy' | 'vercel' | 'code'>('sheet');

  if (!isOpen) return null;

  const scriptCode = `/**
 * SISTEM ABSENSI SISWA MADRASAH - GOOGLE APPS SCRIPT API
 * 
 * JIKA MENEMPEL PADA SPREADSHEET (Extensions > Apps Script), BIARKAN KOSONG ""
 */
const SPREADSHEET_ID = "";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  try {
    const action = e.parameter.action || "";
    let result = { success: false, message: "Aksi tidak ditemukan" };

    switch (action) {
      case "getSiswa": result = getSiswa(); break;
      case "getKelas": result = getKelas(); break;
      case "getAbsensi": result = getAbsensi(e.parameter.tanggal, e.parameter.id_kelas); break;
      case "getRekapBulanan":
        result = getRekapBulanan(
          parseInt(e.parameter.bulan, 10),
          parseInt(e.parameter.tahun, 10),
          e.parameter.id_kelas || e.parameter.kelas
        );
        break;
      case "getDashboard": result = getDashboard(); break;
      case "getPengaturan": result = getPengaturan(); break;
      case "checkStudent": result = checkStudent(e.parameter.id || e.parameter.id_siswa); break;
      case "checkTodayAttendance": result = checkTodayAttendance(e.parameter.id || e.parameter.id_siswa); break;
      case "getTodayScanHistory": result = getTodayScanHistory(); break;
      default:
        result = { success: true, message: "API Sistem Absensi Siswa Madrasah Aktif" };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action || "";
    let result = { success: false, message: "Aksi POST tidak valid" };

    switch (action) {
      case "tambahSiswa": result = tambahSiswa(body.data); break;
      case "updateSiswa": result = updateSiswa(body.data); break;
      case "hapusSiswa": result = hapusSiswa(body.id_siswa); break;
      case "importSiswa": result = importSiswa(body.data); break;
      case "tambahKelas": result = tambahKelas(body.data); break;
      case "updateKelas": result = updateKelas(body.data); break;
      case "hapusKelas": result = hapusKelas(body.id_kelas); break;
      case "simpanAbsensi": result = simpanAbsensi(body.tanggal, body.id_kelas, body.nama_kelas, body.data, body.metode); break;
      case "scanAttendance": result = scanAttendance(body.id_siswa, body.metode || "QR_CAMERA"); break;
      case "updatePengaturan": result = updatePengaturan(body.data); break;
      default: result = { success: false, message: "Action tidak dikenali" };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupDatabase() {
  const ss = getSpreadsheet();
  const schemas = [
    { name: "SISWA", headers: ["ID_SISWA", "NAMA", "ID_KELAS", "NAMA_KELAS", "STATUS"] },
    { name: "KELAS", headers: ["ID_KELAS", "NAMA_KELAS", "TINGKAT", "STATUS"] },
    { name: "ABSENSI", headers: ["ID_ABSENSI", "TANGGAL", "TAHUN", "BULAN", "JAM", "ID_SISWA", "NAMA_SISWA", "ID_KELAS", "NAMA_KELAS", "STATUS", "METODE"] },
    { name: "PENGATURAN", headers: ["NAMA_SEKOLAH", "ALAMAT_SEKOLAH", "TAHUN_PELAJARAN", "KEPALA_SEKOLAH", "NAMA_OPERATOR"] },
    { name: "PENGGUNA", headers: ["ID_USER", "USERNAME", "NAMA", "PASSWORD_HASH", "ROLE", "STATUS"] }
  ];

  schemas.forEach(function(s) {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) sheet = ss.insertSheet(s.name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(s.headers);
      sheet.getRange(1, 1, 1, s.headers.length).setBackground("#0F766E").setFontColor("#FFF").setFontWeight("bold");
    } else if (s.name === "ABSENSI" && sheet.getLastColumn() < 11) {
      sheet.getRange(1, 1, 1, s.headers.length).setValues([s.headers]);
    }
  });

  const pSheet = ss.getSheetByName("PENGATURAN");
  if (pSheet.getLastRow() === 1) {
    pSheet.appendRow([
      "Madrasah Ibtidaiyah Negeri 1",
      "Jl. Pesantren No. 12, Kota Pendidikan",
      "2026/2027",
      "H. Muhammad Ridwan, S.Ag., M.Pd.I",
      "Ustadzah Nurul Hidayati"
    ]);
  }
}

function setupSampleData() {
  setupDatabase();
  const ss = getSpreadsheet();
  const kSheet = ss.getSheetByName("KELAS");
  if (kSheet.getLastRow() <= 1) {
    const kData = [
      ["K01","1A","1","Aktif"],["K02","1B","1","Aktif"],
      ["K03","2A","2","Aktif"],["K04","2B","2","Aktif"],
      ["K05","3A","3","Aktif"],["K06","3B","3","Aktif"],
      ["K07","4A","4","Aktif"],["K08","4B","4","Aktif"],
      ["K09","5A","5","Aktif"],["K10","5B","5","Aktif"],
      ["K11","6A","6","Aktif"],["K12","6B","6","Aktif"]
    ];
    kData.forEach(r => kSheet.appendRow(r));
  }
  const sSheet = ss.getSheetByName("SISWA");
  if (sSheet.getLastRow() <= 1) {
    const sData = [
      ["S001","Ahmad Fauzi","K01","1A","Aktif"],
      ["S002","Budi Santoso","K01","1A","Aktif"],
      ["S003","Citra Kirana","K01","1A","Aktif"],
      ["S004","Dewi Lestari","K01","1A","Aktif"]
    ];
    sData.forEach(r => sSheet.appendRow(r));
  }
}

function getSiswa() {
  const sheet = getSpreadsheet().getSheetByName("SISWA");
  if (!sheet) return { success: true, data: [] };
  const data = sheet.getDataRange().getValues();
  const res = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) res.push({ id_siswa: String(data[i][0]), nama: String(data[i][1]||""), id_kelas: String(data[i][2]||""), nama_kelas: String(data[i][3]||""), status: String(data[i][4]||"Aktif") });
  }
  return { success: true, data: res };
}

function getKelas() {
  const sheet = getSpreadsheet().getSheetByName("KELAS");
  if (!sheet) return { success: true, data: [] };
  const data = sheet.getDataRange().getValues();
  const res = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) res.push({ id_kelas: String(data[i][0]), nama_kelas: String(data[i][1]||""), tingkat: String(data[i][2]||""), status: String(data[i][3]||"Aktif") });
  }
  return { success: true, data: res };
}

function simpanAbsensi(tanggal, id_kelas, nama_kelas, items) {
  const sheet = getSpreadsheet().getSheetByName("ABSENSI");
  const data = sheet.getDataRange().getValues();
  const parts = tanggal.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  const existingMap = {};
  for (let i = 1; i < data.length; i++) {
    existingMap[String(data[i][1]) + "_" + String(data[i][4])] = i + 1;
  }

  const toAppend = [];
  items.forEach(function(item) {
    const key = tanggal + "_" + item.id_siswa;
    const rowNum = existingMap[key];
    const rowData = ["ABS_" + tanggal + "_" + item.id_siswa, tanggal, year, month, item.id_siswa, item.nama, id_kelas, nama_kelas||"", item.status];
    if (rowNum) {
      sheet.getRange(rowNum, 1, 1, 9).setValues([rowData]);
    } else {
      toAppend.push(rowData);
    }
  });

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 9).setValues(toAppend);
  }
  return { success: true, message: "Absensi tersimpan (" + items.length + " siswa)" };
}

function getRekapBulanan(bulan, tahun, id_kelas) {
  const ss = getSpreadsheet();
  const sSheet = ss.getSheetByName("SISWA");
  const aSheet = ss.getSheetByName("ABSENSI");
  const sData = sSheet ? sSheet.getDataRange().getValues() : [];
  const students = [];
  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][2]) === id_kelas && String(sData[i][4]) === "Aktif") {
      students.push({ id_siswa: String(sData[i][0]), nama: String(sData[i][1]), id_kelas: String(sData[i][2]), nama_kelas: String(sData[i][3]) });
    }
  }

  const daysCount = new Date(tahun, bulan, 0).getDate();
  const map = {};
  if (aSheet && aSheet.getLastRow() > 1) {
    const aData = aSheet.getDataRange().getValues();
    for (let j = 1; j < aData.length; j++) {
      if (Number(aData[j][2]) === tahun && Number(aData[j][3]) === bulan && String(aData[j][6]) === id_kelas) {
        const dNum = parseInt(String(aData[j][1]).split("-")[2], 10);
        map[String(aData[j][4]) + "_" + dNum] = String(aData[j][8]);
      }
    }
  }

  const recap = students.map(st => {
    const dailyStatus = {};
    let h = 0, s = 0, iz = 0, a = 0;
    for (let d = 1; d <= daysCount; d++) {
      const stat = map[st.id_siswa + "_" + d] || "-";
      dailyStatus[d] = stat;
      if (stat === "H") h++;
      else if (stat === "S") s++;
      else if (stat === "I") iz++;
      else if (stat === "A") a++;
    }
    return { ...st, dailyStatus, totalH: h, totalS: s, totalI: iz, totalA: a };
  });

  return { success: true, data: recap };
}

function getDashboard() {
  const ss = getSpreadsheet();
  const sSheet = ss.getSheetByName("SISWA");
  const kSheet = ss.getSheetByName("KELAS");
  const aSheet = ss.getSheetByName("ABSENSI");

  let totalSiswa = 0, totalKelas = 0;
  if (sSheet && sSheet.getLastRow() > 1) {
    const s = sSheet.getDataRange().getValues();
    for (let i = 1; i < s.length; i++) if (String(s[i][4]) === "Aktif") totalSiswa++;
  }
  if (kSheet && kSheet.getLastRow() > 1) {
    const k = kSheet.getDataRange().getValues();
    for (let i = 1; i < k.length; i++) if (String(k[i][3]) === "Aktif") totalKelas++;
  }

  const now = new Date();
  const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  let hadirToday = 0, sakitToday = 0, izinToday = 0, alpaToday = 0;
  let hadirMonth = 0, sakitMonth = 0, izinMonth = 0, alpaMonth = 0;

  if (aSheet && aSheet.getLastRow() > 1) {
    const a = aSheet.getDataRange().getValues();
    for (let j = 1; j < a.length; j++) {
      const tgl = String(a[j][1]);
      const stat = String(a[j][8]);
      if (tgl === todayStr) {
        if (stat === "H") hadirToday++;
        else if (stat === "S") sakitToday++;
        else if (stat === "I") izinToday++;
        else if (stat === "A") alpaToday++;
      }
      if (Number(a[j][2]) === now.getFullYear() && Number(a[j][3]) === now.getMonth() + 1) {
        if (stat === "H") hadirMonth++;
        else if (stat === "S") sakitMonth++;
        else if (stat === "I") izinMonth++;
        else if (stat === "A") alpaMonth++;
      }
    }
  }

  return {
    success: true,
    data: {
      total_siswa: totalSiswa,
      total_kelas: totalKelas,
      hadir_hari_ini: hadirToday,
      sakit_hari_ini: sakitToday,
      izin_hari_ini: izinToday,
      alpa_hari_ini: alpaToday,
      persentase_kehadiran: hadirToday > 0 ? Math.round((hadirToday / (hadirToday+sakitToday+izinToday+alpaToday))*100) : 0,
      rekap_bulan_ini: { hadir: hadirMonth, sakit: sakitMonth, izin: izinMonth, alpa: alpaMonth }
    }
  };
}

function getPengaturan() {
  const sheet = getSpreadsheet().getSheetByName("PENGATURAN");
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: { nama_sekolah: "Madrasah Ibtidaiyah", alamat_sekolah: "Jl. Pesantren", tahun_pelajaran: "2026/2027", kepala_sekolah: "Kepala Madrasah", nama_operator: "Operator" } };
  }
  const r = sheet.getRange(2, 1, 1, 5).getValues()[0];
  return { success: true, data: { nama_sekolah: String(r[0]||""), alamat_sekolah: String(r[1]||""), tahun_pelajaran: String(r[2]||""), kepala_sekolah: String(r[3]||""), nama_operator: String(r[4]||"") } };
}

function updatePengaturan(s) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("PENGATURAN");
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName("PENGATURAN"); }
  const row = [s.nama_sekolah||"", s.alamat_sekolah||"", s.tahun_pelajaran||"", s.kepala_sekolah||"", s.nama_operator||""];
  if (sheet.getLastRow() <= 1) sheet.appendRow(row);
  else sheet.getRange(2, 1, 1, 5).setValues([row]);
  return { success: true, message: "Pengaturan tersimpan" };
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    onShowToast('success', 'Kode Google Apps Script berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <FileCode className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Panduan Integrasi Google Sheets & Vercel
              </h3>
              <p className="text-xs text-slate-500">
                Langkah-langkah menyiapkan Google Sheet sebagai database dan deploy ke Vercel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'sheet'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Buat Google Sheet
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'deploy'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Deploy Apps Script
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'vercel'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Deploy Vercel
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Salin Kode Script
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs text-slate-700 space-y-4">
          {activeTab === 'sheet' && (
            <div className="space-y-4 leading-relaxed">
              <h4 className="text-sm font-bold text-slate-900">
                Langkah 1: Menyiapkan Google Sheet & Database
              </h4>
              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  Buka browser dan kunjungi tautan pembuatan Google Sheet baru:{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-semibold underline inline-flex items-center gap-1"
                  >
                    <span>sheets.new</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Beri nama spreadsheet Anda, misalnya <strong>"Database Absensi Siswa Madrasah"</strong>.
                </li>
                <li>
                  Klik menu <strong>Extensions (Ekstensi)</strong> &gt; <strong>Apps Script</strong> di bilah menu atas Google Sheets.
                </li>
                <li>
                  Hapus semua kode bawaan (<code>myFunction</code>), lalu salin seluruh kode dari tab <strong>"4. Salin Kode Script"</strong> ke editor Apps Script.
                </li>
                <li>
                  Pada dropdown fungsi di toolbar atas editor, pilih fungsi <code>setupDatabase</code>, lalu klik tombol <strong>Run (Jalankan)</strong>.
                </li>
                <li>
                  Google akan menampilkan dialog konfirmasi izin (Authorization). Klik <em>Review Permissions</em> &gt; Pilih Akun Google Anda &gt; Klik <em>Advanced</em> &gt; Klik <em>Go to ... (unsafe)</em> &gt; Klik <em>Allow</em>.
                </li>
                <li>
                  Fungsi <code>setupDatabase()</code> akan otomatis membuat sheet: <strong>SISWA</strong>, <strong>KELAS</strong>, <strong>ABSENSI</strong>, <strong>PENGATURAN</strong>, dan <strong>PENGGUNA</strong> dengan header kolom yang rapi!
                </li>
                <li>
                  <em>(Opsional)</em>: Jalankan juga fungsi <code>setupSampleData</code> jika ingin langsung mengisi data awal kelas 1A-6B dan siswa contoh.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-4 leading-relaxed">
              <h4 className="text-sm font-bold text-slate-900">
                Langkah 2: Deploy Google Apps Script sebagai Web App API
              </h4>
              <p>
                Agar aplikasi web (Vercel atau browser) dapat membaca dan menyimpan absensi ke Google Sheet, Apps Script harus di-deploy sebagai Web App publik:
              </p>
              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  Di editor Apps Script, klik tombol biru <strong>Deploy (Terapkan)</strong> di sudut kanan atas &gt; pilih <strong>New deployment (Penerapan baru)</strong>.
                </li>
                <li>
                  Klik ikon roda gigi di samping <em>"Select type"</em>, lalu pilih <strong>Web app</strong>.
                </li>
                <li>
                  Isi pengaturan deployment:
                  <ul className="list-disc list-inside ml-4 mt-1.5 space-y-1">
                    <li><strong>Description:</strong> Sistem Absensi Siswa v1</li>
                    <li><strong>Execute as:</strong> Me (Email akun Google Anda)</li>
                    <li>
                      <strong className="text-emerald-700">Who has access:</strong>{' '}
                      <strong>Anyone (Siapa saja)</strong> &mdash; <em>Penting! Jangan pilih "Only myself" agar request dari web tidak tertolak.</em>
                    </li>
                  </ul>
                </li>
                <li>
                  Klik tombol <strong>Deploy</strong>.
                </li>
                <li>
                  Salin <strong>Web App URL</strong> yang dihasilkan (berakhiran <code>/exec</code>).
                </li>
                <li>
                  Kembali ke aplikasi absensi ini, buka menu <strong>Pengaturan</strong>, tempelkan URL tersebut ke kolom <em>Google Apps Script Web App URL</em>, lalu klik <strong>Uji Koneksi</strong> dan <strong>Simpan Pengaturan</strong>!
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4 leading-relaxed">
              <h4 className="text-sm font-bold text-slate-900">
                Langkah 3: Deploy Frontend ke Vercel
              </h4>
              <p>
                Aplikasi ini telah dikonfigurasi penuh dan siap di-deploy ke Vercel tanpa database tambahan:
              </p>
              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  Push repository project ini ke <strong>GitHub</strong> atau <strong>GitLab</strong>.
                </li>
                <li>
                  Buka dashboard <strong>Vercel</strong> di <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold underline">vercel.com</a> &gt; Klik <strong>"Add New"</strong> &gt; <strong>"Project"</strong>.
                </li>
                <li>
                  Import repository GitHub project ini.
                </li>
                <li>
                  Di bagian <strong>Environment Variables</strong> di Vercel, tambahkan:
                  <div className="bg-slate-100 p-2.5 rounded-lg font-mono text-[11px] text-slate-800 my-2">
                    Key: <code>NEXT_PUBLIC_GOOGLE_SCRIPT_URL</code><br />
                    Value: <code>https://script.google.com/macros/s/AKfycb.../exec</code>
                  </div>
                  <em>(Anda juga bisa menambahkan <code>VITE_GOOGLE_SCRIPT_URL</code> dengan nilai yang sama).</em>
                </li>
                <li>
                  Klik <strong>Deploy</strong>. Vercel akan mem-build dan menghasilkan link live production aplikasi Anda dalam hitungan detik!
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Kode Google Apps Script (Code.gs)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Salin seluruh kode ini ke editor Apps Script spreadsheet Anda
                  </p>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-[11px] font-mono max-h-[380px] leading-relaxed">
                  {scriptCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            File script lengkap juga tersimpan di folder: <code>google-apps-script/Code.gs</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
