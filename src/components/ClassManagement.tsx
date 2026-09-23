import React, { useState } from 'react';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Users
} from 'lucide-react';
import { SchoolClass, Student } from '../lib/types';
import { api } from '../lib/api';

interface ClassManagementProps {
  classes: SchoolClass[];
  students: Student[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onRefreshData: () => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  classes,
  students,
  onShowToast,
  onRefreshData,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [formData, setFormData] = useState<SchoolClass>({
    id_kelas: '',
    nama_kelas: '',
    tingkat: '1',
    status: 'Aktif',
  });
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleOpenAdd = () => {
    const nextIdNum = classes.length + 1;
    setFormData({
      id_kelas: `K${String(nextIdNum).padStart(2, '0')}`,
      nama_kelas: '',
      tingkat: '1',
      status: 'Aktif',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setFormData({ ...cls });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (cls: SchoolClass) => {
    setClassToDelete(cls);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_kelas.trim() || !formData.nama_kelas.trim()) {
      onShowToast('error', 'ID Kelas dan Nama Kelas wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SchoolClass = {
        ...formData,
        id_kelas: formData.id_kelas.trim().toUpperCase(),
        nama_kelas: formData.nama_kelas.trim().toUpperCase(),
      };
      const res = await api.tambahKelas(payload);
      if (res.success) {
        onShowToast('success', res.message || 'Kelas berhasil ditambahkan');
        setIsAddModalOpen(false);
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal menambahkan kelas');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kelas.trim()) {
      onShowToast('error', 'Nama Kelas wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.updateKelas(formData);
      if (res.success) {
        onShowToast('success', res.message || 'Data kelas berhasil diupdate');
        setIsEditModalOpen(false);
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal memperbarui kelas');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await api.hapusKelas(classToDelete.id_kelas);
      if (res.success) {
        onShowToast('success', `Kelas ${classToDelete.nama_kelas} berhasil dihapus`);
        setIsDeleteModalOpen(false);
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal menghapus kelas');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Kelola Data Kelas (Rombel)
          </h3>
          <p className="text-xs text-slate-500">
            Daftar seluruh rombongan belajar madrasah yang aktif
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas</span>
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {classes.map(cls => {
          const studentCount = students.filter(
            s => s.id_kelas === cls.id_kelas && s.status === 'Aktif'
          ).length;

          return (
            <div
              key={cls.id_kelas}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-sm">
                    {cls.nama_kelas}
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      cls.status === 'Aktif'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {cls.status}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-base font-bold text-slate-900">
                    Kelas {cls.nama_kelas}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>Tingkat: {cls.tingkat}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-slate-400">ID: {cls.id_kelas}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{studentCount}</span>
                  <span className="text-slate-400">Siswa Aktif</span>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-end gap-1.5 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(cls)}
                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                  title="Edit Kelas"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleOpenDelete(cls)}
                  className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                  title="Hapus Kelas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Tambah Kelas */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-base font-bold text-slate-900">Tambah Kelas Baru</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Kelas (Unik)
                </label>
                <input
                  type="text"
                  required
                  value={formData.id_kelas}
                  onChange={e => setFormData({ ...formData, id_kelas: e.target.value })}
                  placeholder="Contoh: K13"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_kelas}
                  onChange={e => setFormData({ ...formData, nama_kelas: e.target.value })}
                  placeholder="Contoh: 1A, 2B, 6A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tingkat / Jenjang
                </label>
                <input
                  type="text"
                  required
                  value={formData.tingkat}
                  onChange={e => setFormData({ ...formData, tingkat: e.target.value })}
                  placeholder="Contoh: 1, 2, 3, 4, 5, 6"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e =>
                    setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Kelas */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-base font-bold text-slate-900">Edit Data Kelas</h4>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Kelas
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.id_kelas}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_kelas}
                  onChange={e => setFormData({ ...formData, nama_kelas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tingkat
                </label>
                <input
                  type="text"
                  required
                  value={formData.tingkat}
                  onChange={e => setFormData({ ...formData, tingkat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e =>
                    setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Perbarui</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {isDeleteModalOpen && classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-900">Hapus Kelas?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>Kelas {classToDelete.nama_kelas}</strong>?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
