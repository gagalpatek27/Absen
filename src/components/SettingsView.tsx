import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Database,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  School
} from 'lucide-react';
import { SchoolSettings } from '../lib/types';
import { api, getScriptUrl, setScriptUrl } from '../lib/api';

interface SettingsViewProps {
  settings: SchoolSettings;
  onUpdateSettings: (newSettings: SchoolSettings) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenGuide: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
  onOpenGuide,
}) => {
  const [formData, setFormData] = useState<SchoolSettings>({ ...settings });
  const [scriptUrlInput, setScriptUrlInput] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setFormData({ ...settings });
    setScriptUrlInput(getScriptUrl());
  }, [settings]);

  // Test GAS URL Connection
  const handleTestConnection = async () => {
    if (!scriptUrlInput.trim()) {
      onShowToast('error', 'Masukkan URL Google Apps Script terlebih dahulu');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(scriptUrlInput);
      setTestResult(res);
      if (res.ok) {
        onShowToast('success', res.message);
      } else {
        onShowToast('error', res.message);
      }
    } catch {
      setTestResult({
        ok: false,
        message: 'Gagal terhubung. Pastikan URL benar dan Akses diatur ke "Anyone".',
      });
      onShowToast('error', 'Koneksi gagal');
    } finally {
      setIsTesting(false);
    }
  };

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Save Script URL in client storage
      setScriptUrl(scriptUrlInput.trim());

      const payload: SchoolSettings = {
        ...formData,
        script_url: scriptUrlInput.trim(),
      };

      const res = await api.updatePengaturan(payload);
      if (res.success) {
        onUpdateSettings(payload);
        onShowToast('success', 'Pengaturan madrasah berhasil disimpan');
      } else {
        onShowToast('error', res.message || 'Gagal menyimpan pengaturan');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan sistem saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Pengaturan Lembaga & Integrasi API
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi identitas madrasah untuk kop laporan serta URL backend Google Apps Script
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Buka Panduan Setup</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Identitas Madrasah */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <School className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Identitas Madrasah / Sekolah
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Madrasah / Sekolah
              </label>
              <input
                type="text"
                required
                value={formData.nama_sekolah}
                onChange={e => setFormData({ ...formData, nama_sekolah: e.target.value })}
                placeholder="Contoh: Madrasah Ibtidaiyah Negeri 1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Alamat Madrasah
              </label>
              <input
                type="text"
                required
                value={formData.alamat_sekolah}
                onChange={e => setFormData({ ...formData, alamat_sekolah: e.target.value })}
                placeholder="Contoh: Jl. Pesantren No. 12, Kota Pendidikan"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                required
                value={formData.tahun_pelajaran}
                onChange={e => setFormData({ ...formData, tahun_pelajaran: e.target.value })}
                placeholder="Contoh: 2026/2027"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Operator / Wali Kelas Default
              </label>
              <input
                type="text"
                required
                value={formData.nama_operator}
                onChange={e => setFormData({ ...formData, nama_operator: e.target.value })}
                placeholder="Contoh: Ustadzah Nurul Hidayati"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Kepala Madrasah
              </label>
              <input
                type="text"
                required
                value={formData.kepala_sekolah}
                onChange={e => setFormData({ ...formData, kepala_sekolah: e.target.value })}
                placeholder="Contoh: H. Muhammad Ridwan, S.Ag., M.Pd.I"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NIP Kepala Madrasah (Opsional)
              </label>
              <input
                type="text"
                value={formData.nip_kepala_sekolah || ''}
                onChange={e => setFormData({ ...formData, nip_kepala_sekolah: e.target.value })}
                placeholder="Contoh: 197508152003121002"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Konfigurasi Google Apps Script URL */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Koneksi Google Apps Script API
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Database: Google Sheets
            </span>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={scriptUrlInput}
                onChange={e => {
                  setScriptUrlInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                URL ini didapat setelah melakukan <strong>Deploy &gt; New deployment &gt; Web app</strong> pada Apps Script dengan hak akses <strong>Who has access: Anyone</strong>.
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Menguji Koneksi...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Uji Koneksi API</span>
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    testResult.ok ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Pengaturan Hari & Libur */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Kebijakan Hari Libur
          </h4>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-800 block">
                Tandai Hari Minggu sebagai Libur
              </span>
              <span className="text-slate-500 text-[11px]">
                Kolom tanggal hari Minggu pada rekap bulanan diberi aksen warna merah muda
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.hitung_minggu_libur}
              onChange={e =>
                setFormData({ ...formData, hitung_minggu_libur: e.target.checked })
              }
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs md:text-sm shadow-xs transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
