import React, { useState } from 'react';
import { UserRecord, TruckRecord } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { isConfirmedToday, formatWIBDateTime } from '../utils/timeUtils';

interface NavbarProps {
  currentUser: UserRecord;
  users: UserRecord[];
  onSelectUser: (user: UserRecord) => void;
  onLogout?: () => void;
  isLocked: boolean;
  onOpenAddModal: () => void;
  onOpenEmailModal: () => void;
  onOpenApiSettings: () => void;
  hasCustomGasUrl: boolean;
  selectedVendorFilter: string;
  onSelectVendorFilter: (vendor: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | 'Aktif' | 'Nonaktif';
  onStatusFilterChange: (status: 'ALL' | 'Aktif' | 'Nonaktif') => void;
  readinessFilter?: 'ALL' | 'Ready' | 'Tidak Ready';
  onReadinessFilterChange?: (filter: 'ALL' | 'Ready' | 'Tidak Ready') => void;
  depoFilter?: 'ALL' | 'Karawang' | 'Baros' | 'Cirebon';
  onDepoFilterChange?: (depo: 'ALL' | 'Karawang' | 'Baros' | 'Cirebon') => void;
  trucks?: TruckRecord[];
  onConfirmAll?: () => void;
  isConfirmingAll?: boolean;
  lastConfirmedTime?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  isLocked,
  onOpenAddModal,
  onOpenEmailModal,
  onOpenApiSettings,
  hasCustomGasUrl,
  selectedVendorFilter,
  onSelectVendorFilter,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  readinessFilter = 'ALL',
  onReadinessFilterChange,
  depoFilter = 'ALL',
  onDepoFilterChange,
  trucks = [],
  onConfirmAll,
  isConfirmingAll = false,
  lastConfirmedTime = '',
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const hasActiveFilter = Boolean(
    (searchQuery && searchQuery.trim() !== '') ||
    (readinessFilter && readinessFilter !== 'ALL') ||
    (statusFilter && statusFilter !== 'ALL')
  );

  // =========================================================================
  // 1. KHUSUS HALAMAN ADMIN: HEADER MINIMALIS (HANYA PUSAT KENDALI ADMIN + LOGOUT)
  // =========================================================================
  if (isAdmin) {
    return (
      <header className="sticky top-0 z-40 bg-[#FF0000] text-white border-b border-red-700 shadow-[0_4px_20px_-2px_rgba(255,0,0,0.3)] shrink-0 select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
          
          {/* Sisi Kiri: Judul Dashboard Admin */}
          <div className="flex items-center min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-tight">
              Dashboard Admin
            </h1>
          </div>

          {/* Sisi Kanan: PWA Install + Icon Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Keluar dari Akun Admin"
                className="p-1.5 sm:p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/40 transition flex items-center justify-center cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

        </div>
      </header>
    );
  }

  // =========================================================================
  // 2. HALAMAN TRANSPORTER: TETAP LENGKAP DENGAN STATISTIK, FILTER & TOMBOL UPDATE
  // =========================================================================
  const relevantTrucks = trucks.filter((t) => {
    const matchTransporter = t.transporter === currentUser.kodeTransporter;
    const matchDepo = !currentUser.depo || (t.depo || 'Karawang').toLowerCase() === currentUser.depo.toLowerCase();
    return matchTransporter && matchDepo;
  });
  const totalCount = relevantTrucks.length;
  
  // % Kesiapan HANYA dihitung pada truk aktif
  const aktifTrucks = relevantTrucks.filter((t) => t.status === 'Aktif');
  const aktifCount = aktifTrucks.length;
  const nonaktifCount = totalCount - aktifCount;
  
  const readyCount = aktifTrucks.filter((t) => t.kesiapan === 'Ready').length;
  const tidakReadyCount = aktifCount - readyCount;
  const readinessPercent = aktifCount > 0 ? Math.round((readyCount / aktifCount) * 100) : 0;

  // Cek apakah di hari itu sudah ada update
  const isUpdatedToday = isConfirmedToday(lastConfirmedTime);

  return (
    <header className="sticky top-0 z-40 bg-red-600 text-white border-b border-red-700 shadow-sm shrink-0 select-none">
      
      {/* BARIS 1: NAMA TRANSPORTER & DEPO */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-2.5 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
            <span className="inline sm:hidden">{currentUser.kodeTransporter}</span>
            <span className="hidden sm:inline">{currentUser.namaTransporter}</span>
          </h1>
          <span className="text-white/40 text-xs hidden sm:inline">·</span>
          <span className="text-[11px] font-medium text-white/90 px-2 py-0.5 rounded-md bg-white/15">
            Depo {currentUser.depo?.toUpperCase() || 'KARAWANG'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition text-xs font-medium cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* BARIS 2: METADATA TOTAL, READY, TIDAK READY, STATUS & % SIAP */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 pb-2 text-xs font-medium text-white/90 border-t border-white/10 pt-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            Total: <strong className="text-white font-semibold">{totalCount}</strong> Truk
          </span>
          <span className="text-white/40">·</span>
          <span>
            Ready: <strong className="text-white font-semibold">{readyCount}</strong>
          </span>
          <span className="text-white/40">·</span>
          <span>
            Tidak Ready: <strong className="text-white font-semibold">{tidakReadyCount}</strong>
          </span>
          <span className="text-white/40 hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            Status: <strong className="text-white font-semibold">{aktifCount} Aktif</strong> / {nonaktifCount} Nonaktif
          </span>
          <span className="text-white/40">·</span>
          <span className="font-semibold text-white">
            {readinessPercent}% Siap
          </span>
        </div>
      </div>

      {/* BARIS 3: ACTION & FILTER BAR (FILTER KIRI, UPDATE TENGAH, TAMBAH TRUK KANAN) */}
      <div className="bg-red-700/80 border-t border-red-700 px-3 sm:px-5 py-2 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-3 items-center gap-2">
          
          {/* SISI KIRI: ICON FILTER (AWALNYA HANYA ICON FILTER SAJA, DIKLIK BARU MUNCUL MENGAMBANG) */}
          <div className="flex justify-start items-center relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              title="Filter & Pencarian"
              className={`p-2 rounded-lg transition flex items-center justify-center cursor-pointer relative shadow-xs ${
                isFilterOpen || hasActiveFilter
                  ? 'bg-white text-red-700 shadow-md ring-2 ring-white/50'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {hasActiveFilter && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-red-700" />
              )}
            </button>

            {/* FLOATING FILTER POPOVER (MENGAMBANG KETIKA DIKLIK) */}
            {isFilterOpen && (
              <>
                {/* Backdrop Klik di Luar untuk Menutup */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsFilterOpen(false)}
                />

                <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 space-y-3 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span className="text-xs font-bold text-slate-800">Filter & Pencarian</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 1. CARI ARMADA */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Cari Armada
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cari nopol atau nama sopir..."
                        className="w-full pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-hidden"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => onSearchChange('')}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. FILTER KESIAPAN */}
                  {onReadinessFilterChange && (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Filter Kesiapan
                      </label>
                      <select
                        value={readinessFilter}
                        onChange={(e) => onReadinessFilterChange(e.target.value as any)}
                        className="w-full py-1.5 px-2.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:border-red-600 focus:outline-hidden cursor-pointer"
                      >
                        <option value="ALL">Semua Kesiapan</option>
                        <option value="Ready">Ready</option>
                        <option value="Tidak Ready">Tidak Ready</option>
                      </select>
                    </div>
                  )}

                  {/* 3. FILTER STATUS */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Filter Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => onStatusFilterChange(e.target.value as any)}
                      className="w-full py-1.5 px-2.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:border-red-600 focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>

                  {/* RESET FILTER JIKA AKTIF */}
                  {hasActiveFilter && (
                    <div className="pt-1 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          onReadinessFilterChange && onReadinessFilterChange('ALL');
                          onStatusFilterChange('ALL');
                        }}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* SISI TENGAH: TOMBOL UPDATE DATA (HARUS DI TENGAH) */}
          <div className="flex justify-center items-center">
            {onConfirmAll && (
              <button
                type="button"
                onClick={onConfirmAll}
                disabled={isLocked || isConfirmingAll}
                className={`py-1.5 px-4 sm:px-6 rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition duration-150 flex items-center justify-center cursor-pointer whitespace-nowrap ${
                  isLocked
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : !isUpdatedToday
                    ? 'bg-white hover:bg-slate-100 text-red-700 shadow-sm font-bold'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isConfirmingAll ? (
                  <span>Menyimpan...</span>
                ) : !isUpdatedToday ? (
                  <span>Update Data</span>
                ) : (
                  <span>Data Terkonfirmasi</span>
                )}
              </button>
            )}
          </div>

          {/* SISI KANAN: TOMBOL TAMBAH TRUK */}
          <div className="flex justify-end items-center">
            <button
              type="button"
              disabled={isLocked}
              onClick={onOpenAddModal}
              title="Tambah Armada"
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                isLocked
                  ? 'bg-white/20 text-white/50 cursor-not-allowed'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              Tambah Truk
            </button>
          </div>

        </div>
      </div>

    </header>
  );
};
