/**
 * SISTEM ABSENSI SISWA MADRASAH - GOOGLE APPS SCRIPT API
 * Versi 2.0: Mendukung Absensi Manual & Absensi Kamera USB + QR Code
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

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    let result = { success: false, message: "Aksi tidak ditemukan" };

    switch (action) {
      case "getSiswa":
        result = getSiswa();
        break;
      case "getKelas":
        result = getKelas();
        break;
      case "getAbsensi":
        result = getAbsensi(e.parameter.tanggal, e.parameter.id_kelas);
        break;
      case "getRekapBulanan":
        result = getRekapBulanan(
          parseInt(e.parameter.bulan, 10),
          parseInt(e.parameter.tahun, 10),
          e.parameter.id_kelas || e.parameter.kelas
        );
        break;
      case "getDashboard":
        result = getDashboard();
        break;
      case "getPengaturan":
        result = getPengaturan();
        break;
      case "checkStudent":
        result = checkStudent(e.parameter.id || e.parameter.id_siswa);
        break;
      case "checkTodayAttendance":
        result = checkTodayAttendance(e.parameter.id || e.parameter.id_siswa);
        break;
      case "getTodayScanHistory":
        result = getTodayScanHistory();
        break;
      default:
        result = { success: true, message: "API Sistem Absensi Siswa Madrasah Aktif" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action || "";
    let result = { success: false, message: "Aksi POST tidak valid" };

    switch (action) {
      case "tambahSiswa":
        result = tambahSiswa(body.data);
        break;
      case "updateSiswa":
        result = updateSiswa(body.data);
        break;
      case "hapusSiswa":
        result = hapusSiswa(body.id_siswa);
        break;
      case "importSiswa":
        result = importSiswa(body.data);
        break;
      case "tambahKelas":
        result = tambahKelas(body.data);
        break;
      case "updateKelas":
        result = updateKelas(body.data);
        break;
      case "hapusKelas":
        result = hapusKelas(body.id_kelas);
        break;
      case "simpanAbsensi":
        result = simpanAbsensi(body.tanggal, body.id_kelas, body.nama_kelas, body.data, body.metode);
        break;
      case "scanAttendance":
        result = scanAttendance(body.id_siswa, body.metode || "QR_CAMERA");
        break;
      case "updatePengaturan":
        result = updatePengaturan(body.data);
        break;
      default:
        result = { success: false, message: "Action POST tidak dikenali" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Setup Database Schemas
 */
function setupDatabase() {
  const ss = getSpreadsheet();
  const schemas = [
    {
      name: "SISWA",
      headers: ["ID_SISWA", "NAMA", "ID_KELAS", "NAMA_KELAS", "STATUS"]
    },
    {
      name: "KELAS",
      headers: ["ID_KELAS", "NAMA_KELAS", "TINGKAT", "STATUS"]
    },
    {
      name: "ABSENSI",
      headers: [
        "ID_ABSENSI",
        "TANGGAL",
        "TAHUN",
        "BULAN",
        "JAM",
        "ID_SISWA",
        "NAMA_SISWA",
        "ID_KELAS",
        "NAMA_KELAS",
        "STATUS",
        "METODE"
      ]
    },
    {
      name: "PENGATURAN",
      headers: ["NAMA_SEKOLAH", "ALAMAT_SEKOLAH", "TAHUN_PELAJARAN", "KEPALA_SEKOLAH", "NAMA_OPERATOR"]
    },
    {
      name: "PENGGUNA",
      headers: ["ID_USER", "USERNAME", "NAMA", "PASSWORD_HASH", "ROLE", "STATUS"]
    }
  ];

  schemas.forEach(function (schema) {
    let sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema.headers);
      sheet.getRange(1, 1, 1, schema.headers.length)
        .setBackground("#0F766E")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
    } else if (schema.name === "ABSENSI" && sheet.getLastColumn() < 11) {
      // Upgrade existing ABSENSI headers if older 9-column format
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
    }
  });

  // Setup Default Pengaturan
  const pSheet = ss.getSheetByName("PENGATURAN");
  if (pSheet && pSheet.getLastRow() === 1) {
    pSheet.appendRow([
      "Madrasah Ibtidaiyah Negeri 1",
      "Jl. Pesantren No. 12, Kota Pendidikan",
      "2026/2027",
      "H. Muhammad Ridwan, S.Ag., M.Pd.I",
      "Ustadzah Nurul Hidayati"
    ]);
  }

  // Setup Default Pengguna
  const uSheet = ss.getSheetByName("PENGGUNA");
  if (uSheet && uSheet.getLastRow() === 1) {
    uSheet.appendRow(["USR001", "admin", "Administrator Madrasah", "admin123", "ADMIN", "Aktif"]);
    uSheet.appendRow(["USR002", "guru", "Ustadzah Nurul Hidayati", "guru123", "GURU", "Aktif"]);
  }
}

/**
 * Setup Sample Initial Data
 */
function setupSampleData() {
  setupDatabase();
  const ss = getSpreadsheet();
  const kSheet = ss.getSheetByName("KELAS");
  if (kSheet && kSheet.getLastRow() <= 1) {
    const kData = [
      ["K01", "1A", "1", "Aktif"],
      ["K02", "1B", "1", "Aktif"],
      ["K03", "2A", "2", "Aktif"],
      ["K04", "2B", "2", "Aktif"],
      ["K05", "3A", "3", "Aktif"],
      ["K06", "3B", "3", "Aktif"],
      ["K07", "4A", "4", "Aktif"],
      ["K08", "4B", "4", "Aktif"],
      ["K09", "5A", "5", "Aktif"],
      ["K10", "5B", "5", "Aktif"],
      ["K11", "6A", "6", "Aktif"],
      ["K12", "6B", "6", "Aktif"]
    ];
    kData.forEach(r => kSheet.appendRow(r));
  }

  const sSheet = ss.getSheetByName("SISWA");
  if (sSheet && sSheet.getLastRow() <= 1) {
    const sData = [
      ["S001", "Ahmad Fauzi", "K01", "1A", "Aktif"],
      ["S002", "Budi Santoso", "K01", "1A", "Aktif"],
      ["S003", "Citra Kirana", "K01", "1A", "Aktif"],
      ["S004", "Dewi Lestari", "K01", "1A", "Aktif"],
      ["S005", "Eko Prasetyo", "K01", "1A", "Aktif"],
      ["S006", "Fajar Nugraha", "K01", "1A", "Aktif"],
      ["S007", "Gita Gutawa", "K01", "1A", "Aktif"],
      ["S008", "Hadi Suwarno", "K01", "1A", "Aktif"],
      ["S009", "Indah Permata", "K01", "1A", "Aktif"],
      ["S010", "Joko Widodo", "K01", "1A", "Aktif"],
      ["S011", "Kurnia Meiga", "K02", "1B", "Aktif"],
      ["S012", "Laila Majnun", "K02", "1B", "Aktif"]
    ];
    sData.forEach(r => sSheet.appendRow(r));
  }
}

/**
 * Check single student by ID
 */
function checkStudent(id) {
  if (!id) return { success: false, found: false, message: "ID Siswa kosong" };
  const sSheet = getSpreadsheet().getSheetByName("SISWA");
  if (!sSheet || sSheet.getLastRow() <= 1) {
    return { success: true, found: false, message: "Sheet SISWA kosong" };
  }

  const data = sSheet.getDataRange().getValues();
  const searchId = String(id).trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === searchId) {
      return {
        success: true,
        found: true,
        student: {
          id: String(data[i][0]),
          id_siswa: String(data[i][0]),
          nama: String(data[i][1]),
          id_kelas: String(data[i][2]),
          nama_kelas: String(data[i][3]),
          kelas: String(data[i][3]),
          status: String(data[i][4] || "Aktif")
        }
      };
    }
  }

  return { success: true, found: false, message: "Siswa tidak ditemukan" };
}

/**
 * Check if student has already attended today
 */
function checkTodayAttendance(id) {
  if (!id) return { success: false, alreadyAttended: false, message: "ID Siswa kosong" };
  const ss = getSpreadsheet();
  const aSheet = ss.getSheetByName("ABSENSI");
  if (!aSheet || aSheet.getLastRow() <= 1) {
    return { success: true, alreadyAttended: false };
  }

  const now = new Date();
  const todayISO = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  const todayDisplay = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy");
  const searchId = String(id).trim().toUpperCase();

  const data = aSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowDate = String(data[i][1]).trim();
    // Handle both YYYY-MM-DD and DD/MM/YYYY in row
    const isToday = rowDate === todayISO || rowDate === todayDisplay;
    const rowStudentId = String(data[i][5] !== undefined ? data[i][5] : data[i][4]).trim().toUpperCase();

    if (isToday && rowStudentId === searchId) {
      const jam = data[i][4] ? String(data[i][4]) : "07:30:00";
      const status = data[i][9] ? String(data[i][9]) : String(data[i][8] || "H");
      return {
        success: true,
        alreadyAttended: true,
        attendance: {
          tanggal: todayDisplay,
          jam: jam,
          status: status
        }
      };
    }
  }

  return { success: true, alreadyAttended: false };
}

/**
 * Atomic Scan Attendance with LockService to prevent duplicate entry
 */
function scanAttendance(id_siswa, metode) {
  const lock = LockService.getScriptLock();
  try {
    // Acquire lock for up to 10 seconds
    lock.waitLock(10000);

    const ss = getSpreadsheet();
    const sSheet = ss.getSheetByName("SISWA");
    let aSheet = ss.getSheetByName("ABSENSI");

    if (!aSheet) {
      setupDatabase();
      aSheet = ss.getSheetByName("ABSENSI");
    }

    // 1. Check student existence and status
    const studentCheck = checkStudent(id_siswa);
    if (!studentCheck.found || !studentCheck.student) {
      return {
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Siswa tidak ditemukan",
        id_siswa: id_siswa
      };
    }

    const student = studentCheck.student;
    if (student.status !== "Aktif") {
      return {
        success: false,
        code: "STUDENT_INACTIVE",
        message: "Siswa tidak aktif",
        student: student
      };
    }

    // 2. Check if already attended today (Asia/Jakarta timezone)
    const now = new Date();
    const todayISO = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const todayDisplay = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy");
    const timeDisplay = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");
    const year = parseInt(Utilities.formatDate(now, "Asia/Jakarta", "yyyy"), 10);
    const month = parseInt(Utilities.formatDate(now, "Asia/Jakarta", "MM"), 10);

    const aData = aSheet.getDataRange().getValues();
    const targetKey = todayISO + "_" + student.id_siswa;

    for (let i = 1; i < aData.length; i++) {
      const rowDate = String(aData[i][1]).trim();
      const isSameDate = (rowDate === todayISO || rowDate === todayDisplay);
      // Support 11-column (student at col 5) or 9-column (student at col 4)
      const rowStudentId = String(aData[i][5] !== undefined && aData[i][10] !== undefined ? aData[i][5] : aData[i][4]).trim().toUpperCase();

      if (isSameDate && rowStudentId === student.id_siswa.toUpperCase()) {
        const existingJam = aData[i][4] ? String(aData[i][4]) : timeDisplay;
        const existingStatus = aData[i][9] ? String(aData[i][9]) : String(aData[i][8] || "H");

        return {
          success: false,
          code: "ALREADY_ATTENDED",
          alreadyAttended: true,
          message: "Siswa sudah melakukan absensi hari ini",
          student: student,
          attendance: {
            tanggal: todayDisplay,
            jam: existingJam,
            status: existingStatus
          }
        };
      }
    }

    // 3. Save new attendance row:
    // [ID_ABSENSI, TANGGAL, TAHUN, BULAN, JAM, ID_SISWA, NAMA_SISWA, ID_KELAS, NAMA_KELAS, STATUS, METODE]
    const idAbsensi = "ABS_" + targetKey;
    const newRow = [
      idAbsensi,
      todayISO,
      year,
      month,
      timeDisplay,
      student.id_siswa,
      student.nama,
      student.id_kelas,
      student.nama_kelas,
      "H",
      metode || "QR_CAMERA"
    ];

    aSheet.appendRow(newRow);

    return {
      success: true,
      code: "ATTENDANCE_RECORDED",
      message: "Absensi berhasil dicatat",
      student: student,
      attendance: {
        id_absensi: idAbsensi,
        tanggal: todayDisplay,
        tanggal_iso: todayISO,
        jam: timeDisplay,
        status: "H",
        metode: metode || "QR_CAMERA"
      }
    };
  } catch (err) {
    return {
      success: false,
      code: "LOCK_ERROR",
      message: "Gagal memproses absensi: " + err.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get Today's Scan History for live display under camera
 */
function getTodayScanHistory() {
  const aSheet = getSpreadsheet().getSheetByName("ABSENSI");
  if (!aSheet || aSheet.getLastRow() <= 1) {
    return { success: true, data: [] };
  }

  const now = new Date();
  const todayISO = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  const todayDisplay = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy");

  const data = aSheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const rowDate = String(data[i][1]).trim();
    if (rowDate === todayISO || rowDate === todayDisplay) {
      const is11Col = data[i][10] !== undefined;
      results.push({
        id_absensi: String(data[i][0]),
        tanggal: rowDate,
        jam: is11Col ? String(data[i][4]) : "07:30:00",
        id_siswa: is11Col ? String(data[i][5]) : String(data[i][4]),
        nama: is11Col ? String(data[i][6]) : String(data[i][5]),
        id_kelas: is11Col ? String(data[i][7]) : String(data[i][6]),
        nama_kelas: is11Col ? String(data[i][8]) : String(data[i][7]),
        status: is11Col ? String(data[i][9]) : String(data[i][8] || "H"),
        metode: is11Col ? String(data[i][10]) : "MANUAL"
      });
    }
  }

  // Reverse so newest is at the top
  results.reverse();
  return { success: true, data: results };
}

/**
 * Siswa CRUD
 */
function getSiswa() {
  const sheet = getSpreadsheet().getSheetByName("SISWA");
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };
  const data = sheet.getDataRange().getValues();
  const res = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      res.push({
        id_siswa: String(data[i][0]),
        nama: String(data[i][1] || ""),
        id_kelas: String(data[i][2] || ""),
        nama_kelas: String(data[i][3] || ""),
        status: String(data[i][4] || "Aktif")
      });
    }
  }
  return { success: true, data: res };
}

function tambahSiswa(s) {
  const sheet = getSpreadsheet().getSheetByName("SISWA");
  if (!sheet) { setupDatabase(); }
  sheet.appendRow([s.id_siswa, s.nama, s.id_kelas, s.nama_kelas, s.status || "Aktif"]);
  return { success: true, message: "Siswa berhasil ditambahkan" };
}

function updateSiswa(s) {
  const sheet = getSpreadsheet().getSheetByName("SISWA");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(s.id_siswa)) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[s.id_siswa, s.nama, s.id_kelas, s.nama_kelas, s.status]]);
      return { success: true, message: "Data siswa berhasil diupdate" };
    }
  }
  return { success: false, message: "Siswa tidak ditemukan" };
}

function hapusSiswa(id_siswa) {
  const sheet = getSpreadsheet().getSheetByName("SISWA");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id_siswa)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Siswa berhasil dihapus" };
    }
  }
  return { success: false, message: "Siswa tidak ditemukan" };
}

function importSiswa(students) {
  const sheet = getSpreadsheet().getSheetByName("SISWA");
  if (!sheet) setupDatabase();
  const rows = students.map(s => [s.id_siswa, s.nama, s.id_kelas, s.nama_kelas, s.status || "Aktif"]);
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
  }
  return { success: true, message: rows.length + " siswa berhasil diimpor" };
}

/**
 * Kelas CRUD
 */
function getKelas() {
  const sheet = getSpreadsheet().getSheetByName("KELAS");
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };
  const data = sheet.getDataRange().getValues();
  const res = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      res.push({
        id_kelas: String(data[i][0]),
        nama_kelas: String(data[i][1] || ""),
        tingkat: String(data[i][2] || ""),
        status: String(data[i][3] || "Aktif")
      });
    }
  }
  return { success: true, data: res };
}

function tambahKelas(k) {
  const sheet = getSpreadsheet().getSheetByName("KELAS");
  if (!sheet) setupDatabase();
  sheet.appendRow([k.id_kelas, k.nama_kelas, k.tingkat, k.status || "Aktif"]);
  return { success: true, message: "Kelas berhasil ditambahkan" };
}

function updateKelas(k) {
  const sheet = getSpreadsheet().getSheetByName("KELAS");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(k.id_kelas)) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[k.id_kelas, k.nama_kelas, k.tingkat, k.status]]);
      return { success: true, message: "Kelas berhasil diupdate" };
    }
  }
  return { success: false, message: "Kelas tidak ditemukan" };
}

function hapusKelas(id_kelas) {
  const sheet = getSpreadsheet().getSheetByName("KELAS");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id_kelas)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Kelas berhasil dihapus" };
    }
  }
  return { success: false, message: "Kelas tidak ditemukan" };
}

/**
 * Manual Attendance Save
 */
function simpanAbsensi(tanggal, id_kelas, nama_kelas, items, metode) {
  const sheet = getSpreadsheet().getSheetByName("ABSENSI");
  const data = sheet.getDataRange().getValues();
  const parts = tanggal.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const now = new Date();
  const timeDisplay = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");

  const existingMap = {};
  for (let i = 1; i < data.length; i++) {
    const rowKey = String(data[i][1]) + "_" + String(data[i][10] !== undefined ? data[i][5] : data[i][4]);
    existingMap[rowKey] = i + 1;
  }

  const toAppend = [];
  items.forEach(function (item) {
    const key = tanggal + "_" + item.id_siswa;
    const rowNum = existingMap[key];
    const rowData = [
      "ABS_" + tanggal + "_" + item.id_siswa,
      tanggal,
      year,
      month,
      timeDisplay,
      item.id_siswa,
      item.nama,
      id_kelas,
      nama_kelas || "",
      item.status,
      metode || "MANUAL"
    ];

    if (rowNum) {
      sheet.getRange(rowNum, 1, 1, 11).setValues([rowData]);
    } else {
      toAppend.push(rowData);
    }
  });

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 11).setValues(toAppend);
  }
  return { success: true, message: "Absensi tersimpan (" + items.length + " siswa)" };
}

/**
 * Monthly Recap
 */
function getRekapBulanan(bulan, tahun, id_kelas) {
  const ss = getSpreadsheet();
  const sSheet = ss.getSheetByName("SISWA");
  const aSheet = ss.getSheetByName("ABSENSI");
  const sData = sSheet ? sSheet.getDataRange().getValues() : [];
  const students = [];

  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][2]) === id_kelas && String(sData[i][4]) === "Aktif") {
      students.push({
        id_siswa: String(sData[i][0]),
        nama: String(sData[i][1]),
        id_kelas: String(sData[i][2]),
        nama_kelas: String(sData[i][3])
      });
    }
  }

  const daysCount = new Date(tahun, bulan, 0).getDate();
  const map = {};

  if (aSheet && aSheet.getLastRow() > 1) {
    const aData = aSheet.getDataRange().getValues();
    for (let j = 1; j < aData.length; j++) {
      const is11Col = aData[j][10] !== undefined;
      const rYear = Number(aData[j][2]);
      const rMonth = Number(aData[j][3]);
      const rClass = String(is11Col ? aData[j][7] : aData[j][6]);

      if (rYear === tahun && rMonth === bulan && rClass === id_kelas) {
        const dNum = parseInt(String(aData[j][1]).split("-")[2], 10);
        const rStudentId = String(is11Col ? aData[j][5] : aData[j][4]);
        const rStatus = String(is11Col ? aData[j][9] : aData[j][8]);
        map[rStudentId + "_" + dNum] = rStatus;
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

/**
 * Dashboard Summary
 */
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
  const todayISO = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  const todayDisplay = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy");

  let hadirToday = 0, sakitToday = 0, izinToday = 0, alpaToday = 0;
  let hadirMonth = 0, sakitMonth = 0, izinMonth = 0, alpaMonth = 0;

  if (aSheet && aSheet.getLastRow() > 1) {
    const a = aSheet.getDataRange().getValues();
    for (let j = 1; j < a.length; j++) {
      const tgl = String(a[j][1]).trim();
      const is11Col = a[j][10] !== undefined;
      const stat = String(is11Col ? a[j][9] : a[j][8]);

      if (tgl === todayISO || tgl === todayDisplay) {
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

  const totToday = hadirToday + sakitToday + izinToday + alpaToday;
  return {
    success: true,
    data: {
      total_siswa: totalSiswa,
      total_kelas: totalKelas,
      hadir_hari_ini: hadirToday,
      sakit_hari_ini: sakitToday,
      izin_hari_ini: izinToday,
      alpa_hari_ini: alpaToday,
      persentase_kehadiran: totToday > 0 ? Math.round((hadirToday / totToday) * 100) : 0,
      rekap_bulan_ini: { hadir: hadirMonth, sakit: sakitMonth, izin: izinMonth, alpa: alpaMonth }
    }
  };
}

/**
 * Pengaturan
 */
function getPengaturan() {
  const sheet = getSpreadsheet().getSheetByName("PENGATURAN");
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      success: true,
      data: {
        nama_sekolah: "Madrasah Ibtidaiyah",
        alamat_sekolah: "Jl. Pesantren",
        tahun_pelajaran: "2026/2027",
        kepala_sekolah: "Kepala Madrasah",
        nama_operator: "Operator"
      }
    };
  }
  const r = sheet.getRange(2, 1, 1, 5).getValues()[0];
  return {
    success: true,
    data: {
      nama_sekolah: String(r[0] || ""),
      alamat_sekolah: String(r[1] || ""),
      tahun_pelajaran: String(r[2] || ""),
      kepala_sekolah: String(r[3] || ""),
      nama_operator: String(r[4] || "")
    }
  };
}

function updatePengaturan(s) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("PENGATURAN");
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName("PENGATURAN"); }
  const row = [
    s.nama_sekolah || "",
    s.alamat_sekolah || "",
    s.tahun_pelajaran || "",
    s.kepala_sekolah || "",
    s.nama_operator || ""
  ];
  if (sheet.getLastRow() <= 1) sheet.appendRow(row);
  else sheet.getRange(2, 1, 1, 5).setValues([row]);
  return { success: true, message: "Pengaturan berhasil disimpan" };
}
