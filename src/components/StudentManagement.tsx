import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  School,
  Edit2,
  Trash2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Student, SchoolClass } from '../lib/types';
import { api } from '../lib/api';

interface StudentManagementProps {
  students: Student[];
  classes: SchoolClass[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onRefreshData: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  classes,
  onShowToast,
  onRefreshData,
}) => {
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Student>({
    id_siswa: '',
    nama: '',
    id_kelas: '',
    nama_kelas: '',
    status: 'Aktif',
  });
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [importText, setImportText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = students;

    if (filterClass !== 'ALL') {
      result = result.filter(s => s.id_kelas === filterClass);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        s =>
          s.nama.toLowerCase().includes(q) ||
          s.id_siswa.toLowerCase().includes(q) ||
          s.nama_kelas.toLowerCase().includes(q)
      );
    }

    return result;
  }, [students, filterClass, searchQuery]);

  // Open Add modal with generated ID
  const handleOpenAdd = () => {
    const nextIdNum = students.length + 1;
    const generatedId = `S${String(nextIdNum).padStart(3, '0')}`;
    const defaultClass = classes.length > 0 ? classes[0] : null;

    setFormData({
      id_siswa: generatedId,
      nama: '',
      id_kelas: defaultClass ? defaultClass.id_kelas : '',
      nama_kelas: defaultClass ? defaultClass.nama_kelas : '',
      status: 'Aktif',
    });
    setIsAddModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (student: Student) => {
    setFormData({ ...student });
    setIsEditModalOpen(true);
  };

  // Open Delete modal
  const handleOpenDelete = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  // Submit Add
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_siswa.trim() || !formData.nama.trim()) {
      onShowToast('error', 'ID Siswa dan Nama Siswa tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetClass = classes.find(c => c.id_kelas === formData.id_kelas);
      const payload: Student = {
        ...formData,
        id_siswa: formData.id_siswa.trim().toUpperCase(),
        nama: formData.nama.trim(),
        nama_kelas: targetClass ? targetClass.nama_kelas : formData.nama_kelas,
      };

      const res = await api.tambahSiswa(payload);
      if (res.success) {
        onShowToast('success', res.message || 'Siswa berhasil ditambahkan');
        setIsAddModalOpen(false);
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal menambahkan siswa');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      onShowToast('error', 'Nama Siswa tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetClass = classes.find(c => c.id_kelas === formData.id_kelas);
      const payload: Student = {
        ...formData,
        nama: formData.nama.trim(),
        nama_kelas: targetClass ? targetClass.nama_kelas : formData.nama_kelas,
      };

      const res = await api.updateSiswa(payload);
      if (res.success) {
        onShowToast('success', res.message || 'Data siswa berhasil diperbarui');
        setIsEditModalOpen(false);
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal memperbarui data');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan saat memperbarui data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    setIsSubmitting(true);
    try {
      const res = await api.hapusSiswa(studentToDelete.id_siswa);
      if (res.success) {
        onShowToast('success', `Siswa ${studentToDelete.nama} berhasil dihapus`);
        setIsDeleteModalOpen(false);
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal menghapus siswa');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Bulk Import
  const handleProcessImport = async () => {
    if (!importText.trim()) {
      onShowToast('error', 'Masukkan teks data siswa yang ingin diimpor');
      return;
    }

    const lines = importText.split('\n');
    const parsedStudents: Student[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // Format can be comma or tab separated: ID, Nama, Kelas, Status
      const parts = trimmed.split(/[,;\t]+/).map(p => p.trim());
      if (parts.length >= 2) {
        const id_siswa = parts[0];
        const nama = parts[1];
        const className = parts[2] || (classes.length > 0 ? classes[0].nama_kelas : '1A');
        const matchedClass = classes.find(
          c => c.nama_kelas.toLowerCase() === className.toLowerCase()
        );
        const id_kelas = matchedClass ? matchedClass.id_kelas : (classes[0]?.id_kelas || 'K01');
        const status = (parts[3] === 'Nonaktif' ? 'Nonaktif' : 'Aktif') as 'Aktif' | 'Nonaktif';

        parsedStudents.push({
          id_siswa,
          nama,
          id_kelas,
          nama_kelas: matchedClass?.nama_kelas || className,
          status,
        });
      }
    });

    if (parsedStudents.length === 0) {
      onShowToast('error', 'Format data tidak valid. Contoh: S013, Muhammad Ali, 1A');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.importSiswa(parsedStudents);
      if (res.success) {
        onShowToast('success', res.message || 'Data siswa berhasil diimpor!');
        setIsImportModalOpen(false);
        setImportText('');
        onRefreshData();
      } else {
        onShowToast('error', res.message || 'Gagal mengimpor siswa');
      }
    } catch {
      onShowToast('error', 'Terjadi kesalahan saat memproses data impor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Live Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari berdasarkan ID Siswa, Nama, atau Kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Class Filter Dropdown */}
            <div className="w-full sm:w-48">
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
              >
                <option value="ALL">Semua Kelas ({students.length})</option>
                {classes.map(cls => (
                  <option key={cls.id_kelas} value={cls.id_kelas}>
                    Kelas {cls.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Siswa</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Data Siswa Madrasah
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredStudents.length} dari total {students.length} siswa
            </p>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada siswa yang cocok.</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter kelas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">ID Siswa</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4 w-32">Kelas</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id_siswa} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {st.id_siswa}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {st.nama}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      Kelas {st.nama_kelas}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          st.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(st)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Siswa */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-base font-bold text-slate-900">Tambah Siswa Baru</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Siswa (Identitas Unik)
                </label>
                <input
                  type="text"
                  required
                  value={formData.id_siswa}
                  onChange={e => setFormData({ ...formData, id_siswa: e.target.value })}
                  placeholder="Contoh: S001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Nama lengkap siswa..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kelas
                </label>
                <select
                  value={formData.id_kelas}
                  onChange={e => {
                    const c = classes.find(cl => cl.id_kelas === e.target.value);
                    setFormData({
                      ...formData,
                      id_kelas: e.target.value,
                      nama_kelas: c ? c.nama_kelas : '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {classes.map(cls => (
                    <option key={cls.id_kelas} value={cls.id_kelas}>
                      Kelas {cls.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Siswa
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
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Siswa */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-base font-bold text-slate-900">Edit Data Siswa</h4>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Siswa (Tidak dapat diubah)
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.id_siswa}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Siswa
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kelas
                </label>
                <select
                  value={formData.id_kelas}
                  onChange={e => {
                    const c = classes.find(cl => cl.id_kelas === e.target.value);
                    setFormData({
                      ...formData,
                      id_kelas: e.target.value,
                      nama_kelas: c ? c.nama_kelas : '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {classes.map(cls => (
                    <option key={cls.id_kelas} value={cls.id_kelas}>
                      Kelas {cls.nama_kelas}
                    </option>
                  ))}
                </select>
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
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Perbarui Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {isDeleteModalOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-900">Hapus Siswa?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data siswa <strong>{studentToDelete.nama}</strong> ({studentToDelete.id_siswa})?
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

      {/* Modal: Import Siswa (Bulk Text/CSV) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="text-base font-bold text-slate-900">Import Data Siswa</h4>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Tempelkan (paste) daftar siswa dari Excel atau file teks. Pisahkan dengan tanda koma (,), titik koma (;), atau tab per baris:
            </p>

            <div className="bg-slate-100 p-2.5 rounded-lg text-[11px] font-mono text-slate-700 mb-3">
              Format: <code>ID_SISWA, NAMA_SISWA, KELAS</code><br />
              Contoh:<br />
              S013, Muhammad Ali, 1A<br />
              S014, Nurul Hidayah, 1A<br />
              S015, Rizky Pratama, 1B
            </div>

            <textarea
              rows={7}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Tempel baris data siswa di sini..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={isSubmitting || !importText.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Proses Impor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
