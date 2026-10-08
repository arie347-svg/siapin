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
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));

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
    <header className="sticky top-0 z-40 bg-[#FF0000] text-white border-b border-red-700 shadow-[0_4px_20px_-2px_rgba(255,0,0,0.3)] shrink-0 select-none">
      
      {/* BARIS 1: NAMA TRANSPORTER & DEPO */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-5 pt-2 pb-1 flex items-center justify-between gap-1.5">
        {/* BARIS 1: NAMA TRANSPORTER (SINGKATAN DI MOBILE) & BADGE PEMBUNGKUS DEPO */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight truncate drop-shadow-xs">
            <span className="inline sm:hidden">{currentUser.kodeTransporter}</span>
            <span className="hidden sm:inline">{currentUser.namaTransporter}</span>
          </h1>
          <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 shrink-0 backdrop-blur-xs">
            DEPO {currentUser.depo?.toUpperCase() || 'KARAWANG'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton />
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Logout / Keluar Akun"
              className="p-1 sm:px-2.5 sm:py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/30 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-current fill-none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* BARIS 2: INFORMASI TOTAL, READY, TIDAK READY, STATUS UNIT & % SIAP */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-5 pb-1 text-[9.5px] sm:text-xs font-bold text-white/95 border-t border-white/15 pt-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span>
            Total: <strong className="text-white underline decoration-white/40">{totalCount}</strong> Truk
          </span>
          <span className="text-white/40">•</span>
          <span className="text-emerald-100 bg-black/15 px-1 py-0.2 rounded border border-white/10">
            Ready: <strong className="text-white">{readyCount}</strong>
          </span>
          <span className="text-white/40">•</span>
          <span className="text-amber-200">
            Tidak Ready: <strong className="text-white">{tidakReadyCount}</strong>
          </span>
          <span className="text-white/40 hidden sm:inline">|</span>
          <span className="text-white">
            Status: <strong className="text-emerald-200">{aktifCount} Aktif</strong> / {nonaktifCount} Nonaktif
          </span>
          <span className="text-white/40">•</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white text-red-600 font-extrabold text-[9px] sm:text-[10.5px] shadow-xs">
            {readinessPercent}% Siap
          </span>
        </div>
      </div>

      {/* BARIS 3: SEARCH & FILTER */}
      <div className="bg-red-800/90 border-t border-red-700/80 px-2.5 sm:px-5 py-1">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-initial">
            {!isSearchExpanded ? (
              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                title="Cari armada (nopol/sopir)"
                className="p-1 rounded-md bg-white hover:bg-slate-100 text-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0 shadow-xs border border-white/60"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline text-[11px] font-bold text-slate-700">Cari...</span>
              </button>
            ) : (
              <div className="relative flex items-center w-full max-w-[125px] sm:max-w-xs animate-in fade-in duration-150">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Cari nopol/sopir..."
                  className="w-full pl-2 pr-5 py-0.5 text-[10.5px] font-semibold rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-white shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setIsSearchExpanded(false);
                  }}
                  className="absolute right-1 text-slate-400 hover:text-slate-800 text-xs px-1 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onReadinessFilterChange && (
              <select
                value={readinessFilter}
                onChange={(e) => onReadinessFilterChange(e.target.value as any)}
                className="w-20 sm:w-26 py-1 px-0.5 text-[9.5px] sm:text-xs font-bold rounded-md bg-white text-slate-900 border border-white/60 focus:outline-hidden cursor-pointer truncate shadow-xs"
              >
                <option value="ALL">Kesiapan: Semua</option>
                <option value="Ready">Ready</option>
                <option value="Tidak Ready">Tidak Ready</option>
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
              className="w-17 sm:w-22 py-1 px-0.5 text-[9.5px] sm:text-xs font-bold rounded-md bg-white text-slate-900 border border-white/60 focus:outline-hidden cursor-pointer truncate shadow-xs"
            >
              <option value="ALL">Status: Semua</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* BARIS 4: TOMBOL UPDATE DATA & TAMBAH TRUK */}
      <div className="bg-red-900/95 border-t border-red-800 px-2.5 sm:px-5 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5">
          {onConfirmAll && (
            <button
              type="button"
              onClick={onConfirmAll}
              disabled={isLocked || isConfirmingAll}
              className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold text-[11px] sm:text-xs tracking-wide shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                isLocked
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400'
                  : !isUpdatedToday
                  ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border-2 border-amber-300 shadow-md animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-400 shadow-emerald-950/30'
              }`}
            >
              {isConfirmingAll ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan data...</span>
                </>
              ) : !isUpdatedToday ? (
                <>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
                  </span>
                  <span className="truncate">🚨 BELUM DIUPDATE (KLIK UPDATE)</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>UPDATE DATA (SUDAH DIUPDATE ✓)</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={isLocked}
            onClick={onOpenAddModal}
            title="Tambah Truk Baru"
            className={`font-extrabold tracking-wide shadow-sm transition duration-150 flex items-center justify-center cursor-pointer shrink-0 ${
              isLocked
                ? 'bg-white/20 text-white/50 border border-white/20 cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-red-700 border border-white'
            } w-7 h-7 sm:w-auto sm:h-auto sm:py-1.5 sm:px-3 rounded-full sm:rounded-lg text-xs gap-1`}
          >
            <span className="text-sm font-black leading-none">+</span>
            <span className="hidden sm:inline">TAMBAH TRUK</span>
          </button>
        </div>
      </div>

    </header>
  );
};
