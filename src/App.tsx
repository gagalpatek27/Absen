/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AttendanceDaily } from './components/AttendanceDaily';
import { CameraAttendanceView } from './components/CameraAttendanceView';
import { StudentQrCardsView } from './components/StudentQrCardsView';
import { MonthlyRecap } from './components/MonthlyRecap';
import { StudentManagement } from './components/StudentManagement';
import { ClassManagement } from './components/ClassManagement';
import { SettingsView } from './components/SettingsView';
import { PrintReportModal } from './components/PrintReportModal';
import { ScriptGuideModal } from './components/ScriptGuideModal';
import { LoginModal } from './components/LoginModal';
import { Toast, ToastMessage } from './components/Toast';
import { Student, SchoolClass, SchoolSettings, DashboardSummary, UserProfile, StudentMonthlyRecap } from './lib/types';
import { api } from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // App Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>({
    nama_sekolah: 'Madrasah Ibtidaiyah Negeri 1',
    alamat_sekolah: 'Jl. Pesantren No. 12, Kota Pendidikan',
    tahun_pelajaran: '2026/2027',
    kepala_sekolah: 'H. Muhammad Ridwan, S.Ag., M.Pd.I',
    nip_kepala_sekolah: '197508152003121002',
    nama_operator: 'Ustadzah Nurul Hidayati',
    hitung_minggu_libur: true,
  });
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  // User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id_user: 'USR001',
    username: 'admin',
    nama: 'Administrator Madrasah',
    role: 'ADMIN',
    status: 'Aktif',
  });

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [printData, setPrintData] = useState<{
    recapList: StudentMonthlyRecap[];
    className: string;
    month: number;
    year: number;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial Data Fetching
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [siswaRes, kelasRes, settRes, dashRes] = await Promise.all([
        api.getSiswa(),
        api.getKelas(),
        api.getPengaturan(),
        api.getDashboard(),
      ]);

      if (siswaRes.success && Array.isArray(siswaRes.data)) {
        setStudents(siswaRes.data);
      }
      if (kelasRes.success && Array.isArray(kelasRes.data)) {
        setClasses(kelasRes.data);
      }
      if (settRes.success && settRes.data) {
        setSettings(prev => ({ ...prev, ...settRes.data }));
      }
      if (dashRes.success && dashRes.data) {
        setDashboardSummary(dashRes.data);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      showToast('error', 'Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          settings={settings}
          currentUser={currentUser}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onToggleRole={() => setIsLoginModalOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={dashboardSummary}
              loading={loading}
              settings={settings}
              onNavigate={tab => setActiveTab(tab)}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'absensi' && (
            <AttendanceDaily
              students={students}
              classes={classes}
              onShowToast={showToast}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'kamera' && (
            <CameraAttendanceView
              students={students}
              classes={classes}
              onShowToast={showToast}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'kartu-qr' && (
            <StudentQrCardsView
              students={students}
              classes={classes}
              settings={settings}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'rekap' && (
            <MonthlyRecap
              classes={classes}
              settings={settings}
              onShowToast={showToast}
              onOpenPrintModal={data => setPrintData(data)}
            />
          )}

          {activeTab === 'siswa' && (
            <StudentManagement
              students={students}
              classes={classes}
              onShowToast={showToast}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'kelas' && (
            <ClassManagement
              classes={classes}
              students={students}
              onShowToast={showToast}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'pengaturan' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={newS => setSettings(newS)}
              onShowToast={showToast}
              onOpenGuide={() => setIsGuideOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Print Preview Modal */}
      {printData && (
        <PrintReportModal
          data={printData}
          settings={settings}
          onClose={() => setPrintData(null)}
        />
      )}

      {/* Google Sheets API Setup Guide Modal */}
      <ScriptGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onShowToast={showToast}
      />

      {/* Role / User Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        currentUser={currentUser}
        onClose={() => setIsLoginModalOpen(false)}
        onSwitchUser={user => {
          setCurrentUser(user);
          showToast('info', `Beralih ke akun ${user.nama} (${user.role})`);
        }}
      />

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
