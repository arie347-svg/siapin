import React, { useState, useMemo } from 'react';
import { TruckRecord, CutOffMode } from '../types';
import { TRANSPORTER_NAMES } from '../services/mockData';
import { isConfirmedToday, formatWIBDateIndo, getWIBDateString, getYesterdayWIBDateString } from '../utils/timeUtils';
import { AdminAnalyticsReport } from './AdminAnalyticsReport';
import { ShareReportModal } from './ShareReportModal';
import { DailySnapshotRecapModal } from './DailySnapshotRecapModal';

interface AdminDashboardProps {
  trucks: TruckRecord[];
  cutOffMode: CutOffMode;
  onCutOffModeChange: (mode: CutOffMode) => void;
  isLocked: boolean;
  wibClock: string;
  selectedVendorFilter: string;
  onSelectVendorFilter: (vendor: string) => void;
  onOpenAddModal: () => void;
  onOpenEmailModal: () => void;
  onOpenApiSettings: () => void;
  onSyncAppSheet: () => void;
  onExportCsv: () => void;
  onDownloadDateReport?: (dateStr: string) => void;
  onForceSaveTodaySnapshot?: () => Promise<void>;
  onOpenMasterWhatsApp: () => void;
  onOpenFleetModal: (vendorCode?: string, depoName?: string) => void;
  onOpenChangePassword?: () => void;
  isSyncing?: boolean;
  hasCustomGasUrl?: boolean;
  lastConfirmedTimes?: Record<string, string>;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  statusFilter?: 'ALL' | 'Aktif' | 'Nonaktif';
  onStatusFilterChange?: (s: 'ALL' | 'Aktif' | 'Nonaktif') => void;
  readinessFilter?: 'ALL' | 'Ready' | 'Tidak Ready';
  onReadinessFilterChange?: (r: 'ALL' | 'Ready' | 'Tidak Ready') => void;
  depoFilter?: 'ALL' | 'Karawang' | 'Baros' | 'Cirebon';
  onDepoFilterChange?: (d: 'ALL' | 'Karawang' | 'Baros' | 'Cirebon') => void;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
  isHistoricalView?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  trucks,
  cutOffMode,
  onCutOffModeChange,
  isLocked,
  wibClock,
  selectedVendorFilter,
  onSelectVendorFilter,
  onOpenAddModal,
  onOpenEmailModal,
  onOpenApiSettings,
  onSyncAppSheet,
  onExportCsv,
  onDownloadDateReport,
  onForceSaveTodaySnapshot,
  onOpenMasterWhatsApp,
  onOpenFleetModal,
  onOpenChangePassword,
  isSyncing = false,
  hasCustomGasUrl = false,
  lastConfirmedTimes = {},
  selectedDate,
  onSelectDate,
  isHistoricalView = false,
}) => {
  // Mobile Bottom Navigation Tab state
  const [mobileTab, setMobileTab] = useState<'ringkasan' | 'armada' | 'vendor' | 'grafik' | 'kontrol'>('ringkasan');
  const [activeDesktopView, setActiveDesktopView] = useState<'monitoring' | 'grafik'>('monitoring');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobileVendorFilter, setMobileVendorFilter] = useState('ALL');
  const [mobileReadinessFilter, setMobileReadinessFilter] = useState<'ALL' | 'Ready' | 'Tidak Ready'>('ALL');

  // Hitungan statistik konsolidasi
  const totalTrucks = trucks.length;
  const activeTrucks = trucks.filter((t) => t.status === 'Aktif');
  const activeCount = activeTrucks.length;
  const nonaktifCount = totalTrucks - activeCount;

  // % Kesiapan HANYA DIHITUNG PADA TRUK YANG AKTIF
  const readyCount = activeTrucks.filter((t) => t.kesiapan === 'Ready').length;
  const tidakReadyCount = activeCount - readyCount;
  const overallPercent = activeCount > 0 ? Math.round((readyCount / activeCount) * 100) : 0;

  // Hitung total kapasitas unit armada aktif
  const totalKapasitasAktif = activeTrucks.reduce((sum, t) => sum + (parseInt(t.kapasitas, 10) || 0), 0);

  // Breakdown 4 Transporter
  const vendorList = ['TM', 'RJTM', 'WSS', 'SBR'];
  const vendorBreakdowns = vendorList.map((code) => {
    const vTrucks = trucks.filter((t) => t.transporter === code);
    const vTotal = vTrucks.length;
    const vAktif = vTrucks.filter((t) => t.status === 'Aktif');
    const vReady = vAktif.filter((t) => t.kesiapan === 'Ready').length;
    const vTidak = vAktif.length - vReady;
    const vPct = vAktif.length > 0 ? Math.round((vReady / vAktif.length) * 100) : 0;
    const vName = TRANSPORTER_NAMES[code] || code;
    const lastTime = lastConfirmedTimes[code];
    const isUpdated = isConfirmedToday(lastTime);

    return {
      code,
      name: vName,
      total: vTotal,
      aktif: vAktif.length,
      ready: vReady,
      tidak: vTidak,
      percent: vPct,
      lastTime: lastTime || 'Belum update',
      isUpdated,
    };
  });

  // Breakdown per Depo
  const depoList: ('Karawang' | 'Baros' | 'Cirebon')[] = ['Karawang', 'Baros', 'Cirebon'];
  const depoBreakdowns = depoList.map((depoName) => {
    const dTrucks = trucks.filter((t) => (t.depo || 'Karawang').toLowerCase() === depoName.toLowerCase());
    const dAktif = dTrucks.filter((t) => t.status === 'Aktif');
    const dReady = dAktif.filter((t) => t.kesiapan === 'Ready').length;
    const dPct = dAktif.length > 0 ? Math.round((dReady / dAktif.length) * 100) : 0;
    return {
      name: depoName,
      total: dTrucks.length,
      aktif: dAktif.length,
      ready: dReady,
      percent: dPct,
    };
  });

  // Filtered trucks for Mobile Armada Tab
  const mobileFilteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      if (mobileVendorFilter !== 'ALL' && t.transporter !== mobileVendorFilter) {
        return false;
      }
      if (mobileReadinessFilter !== 'ALL' && (t.kesiapan || 'Ready') !== mobileReadinessFilter) {
        return false;
      }
      if (mobileSearch.trim()) {
        const q = mobileSearch.toLowerCase();
        const matchesPlat = t.nomorPolisi.toLowerCase().includes(q);
        const matchesSopir = (t.namaSopir || '').toLowerCase().includes(q);
        const matchesDepo = (t.depo || '').toLowerCase().includes(q);
        if (!matchesPlat && !matchesSopir && !matchesDepo) return false;
      }
      return true;
    });
  }, [trucks, mobileVendorFilter, mobileReadinessFilter, mobileSearch]);

  return (
    <div className="w-full text-left font-['Plus_Jakarta_Sans',sans-serif]">

      {/* ========================================================================= */}
      {/* 1. TAMPILAN MOBILE EXCLUSIVE (< 768px / md:hidden)                        */}
      {/* MENYATU PENUH DENGAN LAYAR (EDGE-TO-EDGE, ZERO MARGIN, NATIVE APP STYLE)   */}
      {/* ========================================================================= */}
      <div className="block md:hidden w-full min-h-[100dvh] flex flex-col bg-slate-100 text-slate-900 pb-20 select-none">
        
        {/* Top Mobile Edge-to-Edge Bar */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[11px] font-black tracking-wider uppercase text-red-500">
                  SIAPIN
                </span>
                <span className="text-[10px] font-bold text-slate-300">ADMIN</span>
              </div>
              <span className="text-[9.5px] font-mono text-emerald-400 mt-0.5 block leading-tight">
                ● AppSheet: MD to Dealer 2
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-slate-200 block leading-tight">
                {wibClock} WIB
              </span>
              <span
                className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full inline-block ${
                  isLocked ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isLocked ? 'Terkunci' : 'Aktif'}
              </span>
            </div>

            <button
              type="button"
              onClick={onSyncAppSheet}
              disabled={isSyncing}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 active:bg-slate-700 text-slate-200"
              title="Sinkronkan AppSheet"
            >
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Date Filter Strip */}
        <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between text-xs border-b border-slate-700 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">📅</span>
            <input
              type="date"
              value={selectedDate || getWIBDateString()}
              max={getWIBDateString()}
              onChange={(e) => onSelectDate?.(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono cursor-pointer max-w-[125px]"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onSelectDate?.(getWIBDateString())}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                !isHistoricalView ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => onSelectDate?.(getYesterdayWIBDateString())}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedDate === getYesterdayWIBDateString() ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => onDownloadDateReport?.(selectedDate || getWIBDateString())}
              className="px-1.5 py-0.5 rounded bg-emerald-600 active:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-0.5"
              title="Unduh Rekap CSV"
            >
              <span>📥</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-1.5 py-0.5 rounded bg-slate-700 active:bg-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-0.5"
              title="Buka Arsip Database"
            >
              <span>📋</span>
            </button>
          </div>
        </div>

        {/* Historical Archive Banner if viewing past date */}
        {isHistoricalView && (
          <div className="mx-3 mt-2.5 bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <span className="font-semibold text-[11px] leading-tight">
                Arsip: <strong>{formatWIBDateIndo(selectedDate)}</strong> (Hanya Baca)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectDate?.(getWIBDateString())}
              className="px-2 py-1 bg-amber-600 active:bg-amber-700 text-white text-[10px] font-bold rounded cursor-pointer shrink-0"
            >
              Ke Hari Ini
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* MOBILE CONTENT ACCORDING TO ACTIVE BOTTOM TAB                       */}
        {/* =================================================================== */}
        <div className="flex-1 w-full p-3.5 space-y-3.5">
          
          {/* TAB 1: RINGKASAN (KPI KESIAPAN & METRIK UTAMA) */}
          {mobileTab === 'ringkasan' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              
              {/* Hero Readiness Card */}
              <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-2xl p-4 shadow-md shadow-red-500/15 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
                      Tingkat Kesiapan Armada Hari Ini
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {readyCount}/{activeCount} Aktif
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono tracking-tight">
                      {overallPercent}%
                    </span>
                    <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
                      SIAP KIRIM
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden mt-3 p-0.5">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${overallPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/80 mt-2 font-medium">
                    <span>Ready: <strong className="text-white font-bold">{readyCount}</strong></span>
                    <span>Kendala: <strong className="text-white font-bold">{tidakReadyCount}</strong></span>
                    <span>Nonaktif: <strong className="text-white font-bold">{nonaktifCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Mobile Action Strip: Grafik & Bagikan */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('grafik')}
                  className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 shadow-2xs font-extrabold text-xs text-slate-800 flex items-center justify-center gap-1.5 active:bg-slate-50 transition cursor-pointer"
                >
                  <span className="text-base">📈</span>
                  <span>Report Grafik</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <span className="text-base">📤</span>
                  <span>Bagikan File</span>
                </button>
              </div>

              {/* 4 Metric Cards in 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Total Armada
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-slate-900">{totalTrucks}</span>
                    <span className="text-[11px] text-slate-500 font-bold">Unit</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {activeCount} Aktif • {nonaktifCount} Non
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Kapasitas Aktif
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-slate-900">{totalKapasitasAktif}</span>
                    <span className="text-[11px] text-slate-500 font-bold">Unit</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Kapasitas Terangkut
                  </span>
                </div>

                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200/80 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                    Unit Siap (Ready)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-emerald-700">{readyCount}</span>
                    <span className="text-[11px] text-emerald-700 font-bold">Unit</span>
                  </div>
                  <span className="text-[10px] text-emerald-600/90 block mt-0.5">
                    Siap Berangkat
                  </span>
                </div>

                <div className="bg-rose-50 rounded-xl p-3 border border-rose-200/80 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider block">
                    Unit Terkendala
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-rose-700">{tidakReadyCount}</span>
                    <span className="text-[11px] text-rose-700 font-bold">Unit</span>
                  </div>
                  <span className="text-[10px] text-rose-600/90 block mt-0.5">
                    Perlu Penanganan
                  </span>
                </div>
              </div>

              {/* Quick Action Ribbon Mobile */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenFleetModal('ALL')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 active:bg-slate-800 text-white font-extrabold text-xs tracking-wide shadow-md flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>Buka Tabel Armada Lengkap</span>
                  </div>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenMasterWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-xs flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>💬</span>
                    <span>Kirim Rekap WhatsApp Master</span>
                  </div>
                  <span>Kirim</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: ARMADA (KARTU ARMADA MOBILE SENTUH - TOUCH CARDS) */}
          {mobileTab === 'armada' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              
              {/* Search Bar Mobile */}
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Cari nopol, sopir, atau depo..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-red-500 shadow-xs"
                />
                {mobileSearch && (
                  <button
                    type="button"
                    onClick={() => setMobileSearch('')}
                    className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Pills Mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs">
                {['ALL', 'TM', 'RJTM', 'WSS', 'SBR'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMobileVendorFilter(v)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs shrink-0 transition ${
                      mobileVendorFilter === v
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {v === 'ALL' ? 'Semua' : v}
                  </button>
                ))}

                <span className="text-slate-300">|</span>

                <button
                  type="button"
                  onClick={() =>
                    setMobileReadinessFilter(
                      mobileReadinessFilter === 'Ready' ? 'ALL' : 'Ready'
                    )
                  }
                  className={`px-3 py-1 rounded-lg font-bold text-xs shrink-0 transition ${
                    mobileReadinessFilter === 'Ready'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Ready
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMobileReadinessFilter(
                      mobileReadinessFilter === 'Tidak Ready' ? 'ALL' : 'Tidak Ready'
                    )
                  }
                  className={`px-3 py-1 rounded-lg font-bold text-xs shrink-0 transition ${
                    mobileReadinessFilter === 'Tidak Ready'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  Kendala
                </button>
              </div>

              {/* Status Count Text */}
              <div className="text-[11px] font-bold text-slate-500 px-1 flex items-center justify-between">
                <span>Menampilkan <strong>{mobileFilteredTrucks.length}</strong> unit armada</span>
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="text-red-600 font-extrabold hover:underline"
                >
                  + Tambah Truk
                </button>
              </div>

              {/* List of Mobile Fleet Cards */}
              <div className="space-y-2.5">
                {mobileFilteredTrucks.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                    <div className="text-2xl mb-1">🚚</div>
                    <div className="text-xs font-bold">Tidak ada armada yang sesuai</div>
                    <div className="text-[11px] mt-0.5">Ubah pencarian atau filter Anda</div>
                  </div>
                ) : (
                  mobileFilteredTrucks.map((truck) => {
                    const isReady = truck.kesiapan === 'Ready';
                    const isNonaktif = truck.status === 'Nonaktif';

                    return (
                      <div
                        key={truck.id || truck.nomorPolisi}
                        onClick={() => onOpenFleetModal(truck.transporter)}
                        role="button"
                        tabIndex={0}
                        className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-slate-400 transition cursor-pointer space-y-2 active:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-sm font-black text-slate-900 tracking-tight">
                                {truck.nomorPolisi}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white">
                                {truck.transporter}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                Depo {truck.depo || 'Karawang'}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                              <span>Sopir: <strong className="text-slate-800">{truck.namaSopir || '-'}</strong></span>
                              <span>•</span>
                              <span>Kapasitas: <strong className="text-slate-800">{truck.kapasitas} Unit</strong></span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 text-right">
                            {isNonaktif ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                Nonaktif
                              </span>
                            ) : isReady ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Ready
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                                ⚠️ Tidak Ready
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Keterangan Kendala if any */}
                        {!isReady && truck.keterangan && (
                          <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200/80 text-[11px] text-rose-900 leading-tight">
                            <strong>Kendala:</strong> {truck.keterangan}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 3: VENDOR & DEPO (BREAKDOWN 4 TRANSPORTER & 3 DEPO) */}
          {mobileTab === 'vendor' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
                  Status 4 Vendor Transporter
                </h4>
                <div className="space-y-2">
                  {vendorBreakdowns.map((v) => (
                    <div
                      key={v.code}
                      onClick={() => onOpenFleetModal(v.code)}
                      className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs cursor-pointer active:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                            {v.code}
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {v.name}
                          </span>
                        </div>
                        <span className="font-mono font-black text-xs text-blue-700">
                          {v.percent}% Siap
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-blue-600" style={{ width: `${v.percent}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{v.ready} Ready dari {v.aktif} Aktif (Total {v.total})</span>
                        {v.isUpdated ? (
                          <span className="text-emerald-700 font-bold">✓ Terupdate</span>
                        ) : (
                          <span className="text-rose-600 font-bold">🚨 Belum Update</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
                  Distribusi 3 Depo Operasional
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {depoBreakdowns.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => onOpenFleetModal('ALL', d.name)}
                      className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs text-center active:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="text-[11px] font-extrabold text-slate-800">
                        {d.name}
                      </div>
                      <div className="text-base font-black font-mono text-blue-700 mt-0.5">
                        {d.percent}%
                      </div>
                      <div className="text-[9.5px] text-slate-500 mt-0.5">
                        {d.ready}/{d.aktif} Siap
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: GRAFIK & REPORT MODERN (MOBILE) */}
          {mobileTab === 'grafik' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <AdminAnalyticsReport
                trucks={trucks}
                onOpenShareModal={() => setIsShareModalOpen(true)}
                onSelectVendorFilter={onSelectVendorFilter}
              />
            </div>
          )}

          {/* TAB 4: KONTROL (CUT-OFF, APPSHEET, LAPORAN, GANTI PASSWORD) */}
          {mobileTab === 'kontrol' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              
              {/* Cut-off Control Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Kontrol Cut-Off 17:00 WIB
                  </span>
                  <span
                    className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase ${
                      isLocked ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isLocked ? '🔒 Terkunci' : '🔓 Terbuka'}
                  </span>
                </div>

                <div className="text-xl font-mono font-bold">
                  {wibClock} WIB
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('auto')}
                    className={`py-1.5 text-xs font-bold rounded-lg text-center ${
                      cutOffMode === 'auto'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('unlocked')}
                    className={`py-1.5 text-xs font-bold rounded-lg text-center ${
                      cutOffMode === 'unlocked'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('locked')}
                    className={`py-1.5 text-xs font-bold rounded-lg text-center ${
                      cutOffMode === 'locked'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Kunci
                  </button>
                </div>
              </div>

              {/* Tombol-Tombol Aksi Penting */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-xs">
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 active:bg-slate-800 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>+ Tambah Truk Baru</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 active:bg-slate-800 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>📋</span>
                    <span>Arsip Rekap Harian Database</span>
                  </span>
                  <span>Buka →</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadDateReport?.(selectedDate || getWIBDateString())}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>📥</span>
                    <span>Unduh Rekap Tanggal ({selectedDate || getWIBDateString()})</span>
                  </span>
                  <span>Unduh CSV</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenEmailModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>✉️ Rekap Email Mingguan</span>
                  <span>Buka</span>
                </button>

                <button
                  type="button"
                  onClick={onExportCsv}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>📥 Unduh Laporan CSV</span>
                  <span>Unduh</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenApiSettings}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>⚙️ Konfigurasi API & Spreadsheet</span>
                  <span>Atur</span>
                </button>

                {onOpenChangePassword && (
                  <button
                    type="button"
                    onClick={onOpenChangePassword}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>🔒 Ubah Password Admin</span>
                    <span>Ubah</span>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* =================================================================== */}
        {/* BOTTOM NAVIGATION BAR (FIXED, THUMB-FRIENDLY, NATIVE APP FEEL)      */}
        {/* =================================================================== */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
          
          <button
            type="button"
            onClick={() => setMobileTab('ringkasan')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
              mobileTab === 'ringkasan'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">📊</span>
            <span className="text-[10px] mt-0.5">Ringkasan</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('armada')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition relative ${
              mobileTab === 'armada'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">🚚</span>
            <span className="text-[10px] mt-0.5">Armada</span>
            <span className="absolute top-0 right-2 w-4 h-4 bg-slate-900 text-white rounded-full text-[8.5px] font-mono flex items-center justify-center font-bold">
              {totalTrucks}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('vendor')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              mobileTab === 'vendor'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">🏢</span>
            <span className="text-[10px] mt-0.5">Vendor</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('grafik')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              mobileTab === 'grafik'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">📈</span>
            <span className="text-[10px] mt-0.5">Grafik</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('kontrol')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              mobileTab === 'kontrol'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">⚙️</span>
            <span className="text-[10px] mt-0.5">Kontrol</span>
          </button>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. TAMPILAN DESKTOP EXCLUSIVE (≥ 768px / hidden md:block)                 */}
      {/* COMMAND CENTER LEBAR PENUH, KONSOLIDASI HORIZONTAL LENGKAP               */}
      {/* ========================================================================= */}
      <div className="hidden md:block w-full space-y-3.5 pb-8">
        
        {/* Desktop Date Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>📅</span>
              <span>Tanggal Monitoring Kesiapan:</span>
            </span>
            <input
              type="date"
              value={selectedDate || getWIBDateString()}
              max={getWIBDateString()}
              onChange={(e) => onSelectDate?.(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 font-mono focus:border-red-500 focus:outline-hidden cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 ml-1">
              ({formatWIBDateIndo(selectedDate)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectDate?.(getWIBDateString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                !isHistoricalView
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Hari Ini (Live)
            </button>
            <button
              type="button"
              onClick={() => onSelectDate?.(getYesterdayWIBDateString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedDate === getYesterdayWIBDateString()
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Kemarin
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={() => onDownloadDateReport?.(selectedDate || getWIBDateString())}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Unduh rekap resmi tanggal ini ke file CSV"
            >
              <span>📥</span>
              <span>Unduh Rekap</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Buka daftar rekapan harian yang tersimpan di database"
            >
              <span>📋</span>
              <span>Arsip Database</span>
            </button>
          </div>
        </div>

        {/* Historical Archive Banner if viewing past date */}
        {isHistoricalView && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗓️</span>
              <div>
                <h4 className="text-sm font-extrabold text-amber-900">
                  Mode Arsip Riwayat Kesiapan: {formatWIBDateIndo(selectedDate)}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Anda sedang melihat arsip riwayat performa kesiapan armada pada tanggal ini (Mode Arsip - Hanya Baca).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectDate?.(getWIBDateString())}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition"
            >
              ← Kembali ke Hari Ini (Live)
            </button>
          </div>
        )}

        {/* Status Header AppSheet Desktop */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="flex items-start sm:items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 mt-1 sm:mt-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    INTEGRASI REST API AKTIF
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:inline">•</span>
                  <span className="text-slate-300 text-xs font-mono">AppSheet: MD to Dealer 2</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                  Pusat Monitoring & Kendali Distribusi MD to Dealer
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Konsolidasi real-time 4 vendor transporter logistik dengan kontrol cut-off 17:00 WIB
                </p>
              </div>
            </div>

            {/* Quick Action Ribbon */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Desktop View Switcher */}
              <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveDesktopView('monitoring')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDesktopView === 'monitoring'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📋</span>
                  <span>Monitoring Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDesktopView('grafik')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDesktopView === 'grafik'
                      ? 'bg-[#E50914] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📊</span>
                  <span>Report & Grafik</span>
                </button>
              </div>

              {/* Direct Share Button */}
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white font-extrabold text-xs tracking-wide shadow-md transition flex items-center gap-1.5 cursor-pointer border border-emerald-400"
              >
                <span>📤</span>
                <span>BAGIKAN LAPORAN</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenFleetModal('ALL')}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-extrabold text-xs tracking-wide shadow-md transition flex items-center gap-2 cursor-pointer border border-red-400"
              >
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>TABEL ARMADA</span>
              </button>

              <button
                type="button"
                onClick={onSyncAppSheet}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isSyncing ? 'Sinkron...' : 'Sinkronkan'}</span>
              </button>
            </div>

          </div>

          {/* Action Button Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-white/15"
              >
                <span className="text-sm font-black">+</span>
                <span>Tambah Truk</span>
              </button>

              <button
                type="button"
                onClick={onOpenEmailModal}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-white/15"
              >
                <span>✉️ Rekap Email</span>
              </button>

              <button
                type="button"
                onClick={onOpenMasterWhatsApp}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-emerald-500/30"
              >
                <span>💬 WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onOpenApiSettings}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-white/15 relative"
              >
                <span>⚙️ Panel API</span>
                {hasCustomGasUrl && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" />
                )}
              </button>

              <button
                type="button"
                onClick={onExportCsv}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-white/15"
              >
                <span>📥 Unduh CSV</span>
              </button>

              {onOpenChangePassword && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-white/15"
                  title="Ubah Password Administrator"
                >
                  <span>🔒 Ubah Password</span>
                </button>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
              <span>Tabel: <strong className="text-emerald-400">MD to Dealer 2</strong></span>
              <span>Key: <strong className="text-white">Nomor Polisi</strong></span>
            </div>
          </div>
        </div>

        {/* 2. KONTEN DESKTOP: REPORT GRAFIK ATAU MONITORING OPERASIONAL */}
        {activeDesktopView === 'grafik' ? (
          <AdminAnalyticsReport
            trucks={trucks}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onSelectVendorFilter={onSelectVendorFilter}
          />
        ) : (
          <>
            {/* 2. Tombol Nama Transporter Interaktif */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>🚚 Armada Transporter (Klik untuk Buka Tabel Mengambang)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Tekan salah satu kartu vendor di bawah ini untuk memunculkan tabel armada yang sudah terfilter otomatis
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenFleetModal('ALL')}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Lihat Semua Armada →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {vendorBreakdowns.map((v) => (
              <div
                key={v.code}
                onClick={() => onOpenFleetModal(v.code)}
                role="button"
                tabIndex={0}
                className="bg-white hover:bg-slate-50/80 active:bg-slate-100 rounded-2xl border-2 border-slate-200 hover:border-red-500 p-4 shadow-sm hover:shadow-md transition duration-150 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white">
                      {v.code}
                    </span>

                    {v.isUpdated ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Sudah Update
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        🚨 Belum Update
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-red-600 transition leading-snug">
                    {v.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {v.isUpdated ? `Update: ${v.lastTime}` : 'Menunggu update harian vendor'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs text-slate-600 font-semibold">
                      Ready: <strong className="text-blue-700 font-mono text-sm">{v.ready}</strong> / {v.aktif} Aktif
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {v.percent}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${v.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition">
                    <span>Buka Tabel Armada {v.code}</span>
                    <span>↗</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Metrik Utama Konsolidasi Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Total Armada Terdaftar
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {totalTrucks}
              </span>
              <span className="text-xs text-slate-500 font-bold">Unit</span>
            </div>
            <span className="block text-xs text-slate-500 mt-1 font-medium">
              {activeCount} Aktif • {nonaktifCount} Nonaktif
            </span>
          </div>

          <div className="bg-blue-50/50 rounded-2xl border border-blue-200 p-4 shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-blue-700 tracking-wider">
              Armada Siap Kirim (Ready)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">
                {readyCount}
              </span>
              <span className="text-xs text-blue-700 font-bold font-mono">
                ({overallPercent}% Siap)
              </span>
            </div>
            <span className="block text-xs text-blue-600/80 mt-1 font-medium">
              % Dihitung murni dari armada aktif
            </span>
          </div>

          <div className="bg-red-50/50 rounded-2xl border border-red-200 p-4 shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-red-700 tracking-wider">
              Tidak Ready (Kendala)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-red-700 font-mono">
                {tidakReadyCount}
              </span>
              <span className="text-xs text-red-600 font-bold">Unit</span>
            </div>
            <span className="block text-xs text-red-600/80 mt-1 font-medium">
              Bengkel / Perbaikan / KIR
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Total Kapasitas Aktif
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {totalKapasitasAktif}
              </span>
              <span className="text-xs text-slate-500 font-bold">Unit</span>
            </div>
            <span className="block text-xs text-slate-400 mt-1 font-medium">
              Kapasitas MD to Dealer
            </span>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Cut-Off 17:00 WIB
                </span>
                <span
                  className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase ${
                    isLocked ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isLocked ? '🔒 Terkunci' : '🔓 Terbuka'}
                </span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-white">
                {wibClock} WIB
              </div>
            </div>

            <div className="flex gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => onCutOffModeChange('auto')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                  cutOffMode === 'auto'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => onCutOffModeChange('unlocked')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                  cutOffMode === 'unlocked'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Buka
              </button>
              <button
                type="button"
                onClick={() => onCutOffModeChange('locked')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                  cutOffMode === 'locked'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Kunci
              </button>
            </div>
          </div>
        </div>

        {/* 4. Breakdown Kesiapan per Depo Desktop */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                📍 Distribusi Armada per Depo (Lokasi Audit)
              </h3>
              <p className="text-[11px] text-slate-500">
                Klik depo untuk membuka tabel armada pada depo tersebut
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">3 Depo Operasional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {depoBreakdowns.map((d) => (
              <button
                key={d.name}
                type="button"
                onClick={() => onOpenFleetModal('ALL', d.name)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-left transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-xs text-slate-800">
                    Depo {d.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-700">
                    {d.percent}% Siap
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-600 mt-1">
                  <span>Total: <strong>{d.total}</strong> Unit ({d.aktif} Aktif)</span>
                  <span className="text-emerald-700 font-bold">{d.ready} Ready</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

          </>
        )}

      </div>

      {/* DIRECT MULTI-FORMAT SHARE MODAL */}
      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trucks={trucks}
      />

      {/* REKAP HARIAN DATABASE MODAL (ARSIP & DOWNLOAD) */}
      <DailySnapshotRecapModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        currentSelectedDate={selectedDate || getWIBDateString()}
        onSelectDate={(d) => onSelectDate?.(d)}
        onForceSaveTodaySnapshot={onForceSaveTodaySnapshot}
      />

    </div>
  );
};
