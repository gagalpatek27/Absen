# Sistem Absensi Siswa Madrasah (Google Sheets & Next.js/React)

Aplikasi web modern untuk pencatatan dan rekapitulasi kehadiran siswa madrasah/sekolah yang menggunakan **Google Sheets sebagai database utama** dan **Google Apps Script sebagai REST API backend**, siap di-deploy secara instan ke **Vercel**.

---

## 🌟 Fitur Utama

1. **Absensi Kamera USB + QR Code (BARU)**
   - Akses API kamera browser (`navigator.mediaDevices.getUserMedia()`).
   - Mendukung kamera USB, webcam eksternal, dan webcam bawaan laptop.
   - Deteksi perangkat kamera dengan prioritas otomatis ke kamera USB.
   - Area reticle pemindaian responsif dengan animasi laser.
   - Format QR Code fleksibel: ID polos (`S001`) maupun JSON (`{"id_siswa": "S001"}`).
   - Pengecekan status siswa: Aktif/Nonaktif & Siswa tidak ditemukan.
   - **Anti-Duplikat Atomic**: Memastikan siswa hanya bisa absen 1 kali per hari (didukung `LockService` di Google Apps Script).
   - Suara synthesizer Web Audio API (Chime sukses, Alert sudah absen, Buzz error) dengan switch Suara ON/OFF.
   - **Mode Scan Cepat (Fast Mode)**: Kamera terus aktif untuk pemindaian beruntun siswa satu per satu tanpa klik manual operator.
   - Tabel riwayat pemindaian hari ini (*live history*) tepat di bawah video kamera.
   - Statistik real-time hari ini: Total Siswa, Sudah Hadir, dan Belum Hadir.
2. **Cetak Kartu QR Siswa (BARU)**
   - Menu khusus pembuatan Kartu Absensi Siswa bersertifikat ID & QR Code.
   - Filter cetak: satu siswa, satu kelas, atau seluruh siswa madrasah.
   - Tata letak cetak kisi kertas A4 (6–8 kartu per lembar dengan garis potong rapi).
   - QR Code hanya berisi ID Siswa, bebas dari informasi sensitif.
3. **Dashboard Statistik Real-time**
   - Total siswa aktif & total rombongan belajar (kelas).
   - Indikator kehadiran hari ini: Hadir (H), Sakit (S), Izin (I), Alpa (A).
   - Visual bar persentase kehadiran bulanan kumulatif.
4. **Input Absensi Harian Kelas (Manual)**
   - Pemilihan Tanggal & Kelas yang responsif di HP, tablet, dan PC.
   - Tombol touch-friendly status [H], [S], [I], [A].
   - Tombol cepat **"Semua Hadir"** untuk mempercepat input harian guru/operator.
   - Modal konfirmasi sebelum penyimpanan.
5. **Rekap Bulanan Format Buku Induk (Ledger)**
   - Kolom dinamis tanggal 1 s.d. 28/29/30/31 sesuai bulan & tahun yang dipilih.
   - Hari Minggu otomatis disorot dengan aksen warna merah muda.
   - **Sticky Columns**: Kolom `No` dan `Nama Siswa` terkunci saat tabel digulir menyamping di layar ponsel/tablet.
   - Perhitungan otomatis total H, S, I, A per siswa dan baris total kelas.
6. **Cetak & Export**
   - **Cetak Laporan (A4 Landscape)**: Preview cetak dengan kop madrasah, tanda tangan Kepala Madrasah & Wali Kelas, serta print CSS yang menghilangkan sidebar dan tombol.
   - **Export ke Excel (.xlsx)**: File spreadsheet otomatis terunduh dalam format buku absensi lengkap.
7. **Manajemen Siswa & Kelas**
   - Tambah, edit, dan hapus/nonaktifkan siswa & kelas.
   - Pencarian instan (live search) tanpa reload halaman.
   - Fitur **Import Siswa** via copy-paste teks atau CSV.
8. **Hak Akses (Role-Based Access)**
   - **ADMIN**: Akses penuh ke seluruh menu, kelola siswa, kelas, pengaturan, dan rekap.
   - **GURU**: Fokus pada pencatatan absensi harian dan rekap kehadiran kelas.

---

## 🏗️ Arsitektur Sistem

```
[ Frontend: Next.js / React + Tailwind CSS ]
         |
         | HTTP GET/POST (JSON Payload)
         v
[ Backend: Google Apps Script Web App (doGet / doPost) ]
         |
         | Google Apps Script SpreadsheetApp API
         v
[ Database: Google Sheets (Spreadsheet) ]
  ├── SISWA (ID_SISWA, NAMA, ID_KELAS, NAMA_KELAS, STATUS)
  ├── KELAS (ID_KELAS, NAMA_KELAS, TINGKAT, STATUS)
  ├── ABSENSI (ID_ABSENSI, TANGGAL, TAHUN, BULAN, JAM, ID_SISWA, NAMA_SISWA, ID_KELAS, NAMA_KELAS, STATUS, METODE)
  ├── PENGATURAN (NAMA_SEKOLAH, ALAMAT_SEKOLAH, TAHUN_PELAJARAN, KEPALA_SEKOLAH, NAMA_OPERATOR)
  └── PENGGUNA (ID_USER, USERNAME, NAMA, PASSWORD_HASH, ROLE, STATUS)
```

---

## 📋 Langkah 1: Persiapan Google Sheet & Apps Script

1. Buat Spreadsheet baru di Google Drive: [sheets.new](https://sheets.new).
2. Beri nama spreadsheet Anda, misalnya **"Database Absensi Siswa Madrasah"**.
3. Klik menu **Ekstensi (Extensions)** > **Apps Script**.
4. Hapus seluruh isi file default `Code.gs`, lalu salin seluruh isi dari file `google-apps-script/Code.gs` yang ada pada repository ini.
5. Pada toolbar Apps Script, pilih fungsi **`setupDatabase`**, kemudian klik **Jalankan (Run)**.
6. Berikan izin (Review Permissions) saat diminta oleh Google.
7. Sheet `SISWA`, `KELAS`, `ABSENSI`, `PENGATURAN`, dan `PENGGUNA` akan otomatis dibuat beserta header kolomnya (termasuk kolom `JAM` dan `METODE`).
8. *(Opsional)* Pilih fungsi **`setupSampleData`** lalu klik **Run** untuk mengisi contoh kelas 1A-6B dan data siswa awal.

---

## 🚀 Langkah 2: Deploy Google Apps Script sebagai Web App

1. Di editor Apps Script, klik tombol biru **Deploy (Terapkan)** di pojok kanan atas > **Penerapan Baru (New deployment)**.
2. Klik ikon gerigi (Select type) > pilih **Aplikasi Web (Web app)**.
3. Konfigurasi:
   - **Deskripsi:** `API Absensi Siswa & QR Kamera v2`
   - **Jalankan sebagai (Execute as):** `Saya (email Anda)`
   - **Yang memiliki akses (Who has access):** `Siapa saja (Anyone)` *(Sangat penting agar API dapat diakses oleh frontend Vercel)*
4. Klik **Deploy (Terapkan)**.
5. Salin **URL Aplikasi Web** (berakhiran `/exec`). Simpan URL ini.

---

## 🌐 Langkah 3: Deploy Frontend ke Vercel

1. Push source code proyek ini ke akun **GitHub** atau **GitLab** Anda.
2. Buka dashboard [Vercel](https://vercel.com) dan login.
3. Klik tombol **"Add New"** > **"Project"** > Import repository ini.
4. Di bagian **Environment Variables**, tambahkan:
   - **NAME:** `NEXT_PUBLIC_GOOGLE_SCRIPT_URL`
   - **VALUE:** `https://script.google.com/macros/s/AKfycb.../exec` *(URL Web App dari Langkah 2)*
   - *(Tambahkan juga `VITE_GOOGLE_SCRIPT_URL` dengan nilai yang sama)*
5. Klik **Deploy**. Vercel akan otomatis melakukan proses build dalam hitungan detik!

---

## 📷 Cara Menguji Fitur Kamera USB & QR Code

1. **Buka Menu "Kartu QR Siswa"**:
   - Di sini Anda dapat melihat kartu absensi siswa (misalnya untuk ID `S001` - Ahmad Fauzi).
   - Cetak atau tampilkan QR Code tersebut di layar smartphone lain.
2. **Buka Menu "Absensi Kamera"**:
   - Klik tombol **[AKTIFKAN KAMERA]**.
   - Berikan izin browser ketika pop-up kamera muncul.
   - Jika memiliki kamera USB eksternal, pilih dari dropdown **"Pilih Perangkat Kamera"** (perangkat USB akan otomatis diprioritaskan).
3. **Arahkan QR Code ke Kamera**:
   - Saat QR Code berada dalam kotak target scan, sistem otomatis mendeteksi kode.
   - Terdengar nada *chime* sukses dan layar menampilkan notifikasi:
     ```
     ✓ ABSENSI BERHASIL
     Nama     : Ahmad Fauzi
     ID Siswa : S001
     Kelas    : 1A
     Status   : HADIR
     ```
   - Data langsung masuk ke Google Sheet dengan `METODE = QR_CAMERA` dan kolom waktu `JAM`.
   - Nama siswa langsung masuk ke daftar **Riwayat Absensi Hari Ini** dan angka **Sudah Hadir** bertambah.
4. **Uji Coba Anti-Duplikat**:
   - Arahkan kembali QR Code siswa yang sama.
   - Sistem akan menolak pembuatan baris ganda dan membunyikan nada peringatan:
     ```
     ⚠ SUDAH ABSEN
     Siswa ini sudah melakukan absensi hari ini.
     ```
5. **Uji Coba Siswa Tidak Ditemukan**:
   - Buat QR Code buatan dengan teks `S999` dan scan ke kamera.
   - Sistem akan menampilkan:
     ```
     ✕ SISWA TIDAK DITEMUKAN
     ID Siswa: S999
     ```

---

## 📄 Lisensi
Apache-2.0
