import React, { useState, useMemo } from 'react';
import { TruckRecord, CutOffMode } from '../types';
import { TRANSPORTER_NAMES } from '../services/mockData';
import { isConfirmedToday, getWIBDateString } from '../utils/timeUtils';
import { AdminAnalyticsReport } from './AdminAnalyticsReport';
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
  onOpenMasterWhatsApp?: () => void;
  onOpenFleetModal: (vendorCode?: string, depoName?: string) => void;
  onOpenChangePassword?: () => void;
  onResetReadiness?: () => void;
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
  onOpenAddModal,
  onOpenEmailModal,
  onOpenApiSettings,
  onSyncAppSheet,
  onExportCsv,
  onForceSaveTodaySnapshot,
  onOpenFleetModal,
  onOpenChangePassword,
  onResetReadiness,
  isSyncing = false,
  hasCustomGasUrl = false,
  lastConfirmedTimes = {},
  selectedDate,
  onSelectDate,
}) => {
  // Mobile Bottom Navigation Tab state
  const [mobileTab, setMobileTab] = useState<'ringkasan' | 'armada' | 'vendor' | 'rekap' | 'kontrol'>('ringkasan');
  const [activeDesktopView, setActiveDesktopView] = useState<'monitoring' | 'rekap'>('monitoring');
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobileVendorFilter, setMobileVendorFilter] = useState('ALL');
  const [mobileDepoFilter, setMobileDepoFilter] = useState('ALL');
  const [mobileReadinessFilter, setMobileReadinessFilter] = useState<'ALL' | 'Ready' | 'Tidak Ready'>('ALL');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // State Filter Khusus Halaman Ringkasan (Depo & Transporter)
  const [summaryVendorFilter, setSummaryVendorFilter] = useState('ALL');
  const [summaryDepoFilter, setSummaryDepoFilter] = useState('ALL');
  const [isSummaryFilterOpen, setIsSummaryFilterOpen] = useState(false);

  // Hitungan statistik konsolidasi global
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

  // Filter & Statistik Khusus Halaman Ringkasan (Depo & Transporter)
  const summaryTrucks = useMemo(() => {
    return trucks.filter((t) => {
      if (summaryVendorFilter !== 'ALL' && t.transporter !== summaryVendorFilter) {
        return false;
      }
      if (summaryDepoFilter !== 'ALL' && (t.depo || 'Karawang').toLowerCase() !== summaryDepoFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [trucks, summaryVendorFilter, summaryDepoFilter]);

  const summaryTotalTrucks = summaryTrucks.length;
  const summaryActiveTrucks = summaryTrucks.filter((t) => t.status === 'Aktif');
  const summaryActiveCount = summaryActiveTrucks.length;
  const summaryNonaktifCount = summaryTotalTrucks - summaryActiveCount;

  const summaryReadyCount = summaryActiveTrucks.filter((t) => t.kesiapan === 'Ready').length;
  const summaryTidakReadyCount = summaryActiveCount - summaryReadyCount;
  const summaryOverallPercent = summaryActiveCount > 0 ? Math.round((summaryReadyCount / summaryActiveCount) * 100) : 0;
  const summaryKapasitasAktif = summaryActiveTrucks.reduce((sum, t) => sum + (parseInt(t.kapasitas, 10) || 0), 0);

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
      if (mobileDepoFilter !== 'ALL' && (t.depo || 'Karawang').toLowerCase() !== mobileDepoFilter.toLowerCase()) {
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
  }, [trucks, mobileVendorFilter, mobileDepoFilter, mobileReadinessFilter, mobileSearch]);

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
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[11px] font-black tracking-wider uppercase text-red-500">
                  SIAPIN
                </span>
                <span className="text-[10px] font-bold text-slate-300">ADMIN</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 mt-1">
                Aktif
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[11px] font-mono font-bold text-slate-200 block leading-tight">
                {wibClock} WIB
              </span>
            </div>

            <button
              type="button"
              onClick={onSyncAppSheet}
              disabled={isSyncing}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 active:bg-slate-700 text-slate-200 cursor-pointer"
              title="Sinkronkan AppSheet"
            >
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MOBILE CONTENT ACCORDING TO ACTIVE BOTTOM TAB                       */}
        {/* =================================================================== */}
        <div className="flex-1 w-full p-3 space-y-3">
          
          {/* TAB 1: RINGKASAN */}
          {mobileTab === 'ringkasan' && (
            <div className="min-h-[calc(100dvh-140px)] flex flex-col justify-start space-y-2.5 animate-in fade-in duration-150 pb-4">
              
              {/* Header Tab Ringkasan: Judul, Status Filter Aktif, dan Icon Filter */}
              <div className="flex items-center justify-between px-0.5 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-800 tracking-tight">
                    Ringkasan Armada
                  </span>
                  {(summaryDepoFilter !== 'ALL' || summaryVendorFilter !== 'ALL') && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <span>{summaryDepoFilter !== 'ALL' ? summaryDepoFilter : 'Semua Depo'}</span>
                      <span>•</span>
                      <span>{summaryVendorFilter !== 'ALL' ? summaryVendorFilter : 'Semua Transporter'}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsSummaryFilterOpen(!isSummaryFilterOpen)}
                    className={`p-2 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center ${
                      isSummaryFilterOpen || summaryDepoFilter !== 'ALL' || summaryVendorFilter !== 'ALL'
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Filter Depo & Transporter"
                  >
                    <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Collapsible Dropdown Filter Panel Ringkasan (Clean & Ringkas) */}
              {isSummaryFilterOpen && (
                <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-lg shadow-slate-200/60 space-y-2 animate-in fade-in duration-200 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Dropdown Depo */}
                    <div>
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-0.5">
                        Depo:
                      </label>
                      <select
                        value={summaryDepoFilter}
                        onChange={(e) => setSummaryDepoFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                      >
                        <option value="ALL">Semua Depo</option>
                        <option value="Karawang">Depo Karawang</option>
                        <option value="Baros">Depo Baros</option>
                        <option value="Cirebon">Depo Cirebon</option>
                      </select>
                    </div>

                    {/* Dropdown Transporter */}
                    <div>
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-0.5">
                        Transporter:
                      </label>
                      <select
                        value={summaryVendorFilter}
                        onChange={(e) => setSummaryVendorFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                      >
                        <option value="ALL">Semua Transporter</option>
                        <option value="TM">TM - Tunas Muda</option>
                        <option value="RJTM">RJTM - Roda Jagat</option>
                        <option value="WSS">WSS - Wahana</option>
                        <option value="SBR">SBR - Sari Bumi</option>
                      </select>
                    </div>
                  </div>

                  {(summaryDepoFilter !== 'ALL' || summaryVendorFilter !== 'ALL') && (
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSummaryDepoFilter('ALL');
                          setSummaryVendorFilter('ALL');
                        }}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer flex items-center gap-1"
                      >
                        <span>✕</span>
                        <span>Reset Filter</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Hero Readiness Card */}
              <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-2xl p-4 shadow-md shadow-red-500/15 relative overflow-hidden shrink-0">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
                      Tingkat Kesiapan Armada
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {summaryReadyCount}/{summaryActiveCount} Aktif
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono tracking-tight">
                      {summaryOverallPercent}%
                    </span>
                    <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
                      SIAP KIRIM
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mt-3 p-0.5">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${summaryOverallPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/85 mt-2.5 font-medium">
                    <span>Ready: <strong className="text-white font-bold">{summaryReadyCount}</strong></span>
                    <span>Kendala: <strong className="text-white font-bold">{summaryTidakReadyCount}</strong></span>
                    <span>Nonaktif: <strong className="text-white font-bold">{summaryNonaktifCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* 4 Metric Cards in 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2.5 shrink-0">
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Total Armada
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-slate-900">{summaryTotalTrucks}</span>
                    <span className="text-[11px] text-slate-500 font-bold">Truk</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {summaryActiveCount} Aktif • {summaryNonaktifCount} Non
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Kapasitas Aktif
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-slate-900">{summaryKapasitasAktif}</span>
                    <span className="text-[11px] text-slate-500 font-bold">Unit</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Kapasitas Terangkut
                  </span>
                </div>

                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                    Unit Siap (Ready)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-emerald-700">{summaryReadyCount}</span>
                    <span className="text-[11px] text-emerald-700 font-bold">Truk</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">
                    Siap Berangkat
                  </span>
                </div>

                <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider block">
                    Unit Terkendala
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono text-rose-700">{summaryTidakReadyCount}</span>
                    <span className="text-[11px] text-rose-700 font-bold">Truk</span>
                  </div>
                  <span className="text-[10px] text-rose-600 block mt-0.5">
                    Perlu Penanganan
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ARMADA (FILTER ICON EXPANDABLE & SCROLL KHUSUS LIST TRUK) */}
          {mobileTab === 'armada' && (
            <div className="h-[calc(100dvh-140px)] flex flex-col space-y-2 animate-in fade-in duration-150">
              
              {/* Header Tab Armada: Total & Filter Toggle Icon Saja */}
              <div className="flex items-center justify-between px-0.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-800">
                    Armada ({mobileFilteredTrucks.length})
                  </span>
                  {(mobileVendorFilter !== 'ALL' || mobileDepoFilter !== 'ALL' || mobileReadinessFilter !== 'ALL' || mobileSearch) && (
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Filter Icon Saja */}
                  <button
                    type="button"
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className={`p-2 rounded-xl transition cursor-pointer shadow-xs ${
                      isFilterExpanded || mobileVendorFilter !== 'ALL' || mobileDepoFilter !== 'ALL' || mobileReadinessFilter !== 'ALL' || mobileSearch
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Filter Armada"
                  >
                    <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAddModal}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    + Truk
                  </button>
                </div>
              </div>

              {/* Collapsible Dropdown Filter Panel with Smooth Shadow */}
              {isFilterExpanded && (
                <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-lg shadow-slate-200/60 space-y-2 animate-in fade-in duration-200 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Dropdown Kesiapan: Ready & Tidak Ready */}
                    <div>
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-0.5">
                        Kesiapan:
                      </label>
                      <select
                        value={mobileReadinessFilter}
                        onChange={(e) => setMobileReadinessFilter(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                      >
                        <option value="ALL">Semua Kesiapan</option>
                        <option value="Ready">✓ Ready</option>
                        <option value="Tidak Ready">⚠️ Tidak Ready</option>
                      </select>
                    </div>

                    {/* Dropdown Vendor */}
                    <div>
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-0.5">
                        Transporter:
                      </label>
                      <select
                        value={mobileVendorFilter}
                        onChange={(e) => setMobileVendorFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                      >
                        <option value="ALL">Semua Vendor</option>
                        <option value="TM">TM - Tunas Muda</option>
                        <option value="RJTM">RJTM - Roda Jagat</option>
                        <option value="WSS">WSS - Wahana</option>
                        <option value="SBR">SBR - Sari Bumi</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Dropdown Depo */}
                    <div>
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-0.5">
                        Gudang / Depo:
                      </label>
                      <select
                        value={mobileDepoFilter}
                        onChange={(e) => setMobileDepoFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                      >
                        <option value="ALL">Semua Depo</option>
                        <option value="Karawang">Depo Karawang</option>
                        <option value="Baros">Depo Baros</option>
                        <option value="Cirebon">Depo Cirebon</option>
                      </select>
                    </div>

                    {/* Search Input */}
                    <div>
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-0.5">
                        Pencarian:
                      </label>
                      <input
                        type="text"
                        value={mobileSearch}
                        onChange={(e) => setMobileSearch(e.target.value)}
                        placeholder="Nopol / sopir..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-red-500"
                      />
                    </div>
                  </div>

                  {(mobileVendorFilter !== 'ALL' || mobileDepoFilter !== 'ALL' || mobileReadinessFilter !== 'ALL' || mobileSearch) && (
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileVendorFilter('ALL');
                          setMobileDepoFilter('ALL');
                          setMobileReadinessFilter('ALL');
                          setMobileSearch('');
                        }}
                        className="text-[10.5px] font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        ✕ Reset Filter
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ONLY LIST TRUK IS SCROLLABLE (KARTU RINGKAS & CLEAN) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 [scrollbar-width:thin]">
                {mobileFilteredTrucks.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                    <div className="text-2xl mb-1">🚚</div>
                    <span className="text-xs">Tidak ada data armada yang cocok.</span>
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
                        className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer active:bg-slate-50 space-y-1.5"
                      >
                        {/* Row 1: Nopol, Vendor, Depo & Readiness Status */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs font-black text-slate-900 tracking-tight shrink-0">
                              {truck.nomorPolisi}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-slate-900 text-white shrink-0">
                              {truck.transporter}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-slate-100 text-slate-600 truncate">
                              {truck.depo || 'Karawang'}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isNonaktif ? (
                              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Nonaktif
                              </span>
                            ) : isReady ? (
                              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                ✓ Ready
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                ⚠️ Kendala
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Sopir & Kapasitas */}
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span className="truncate">Sopir: <strong className="text-slate-800">{truck.namaSopir || '-'}</strong></span>
                          <span className="shrink-0 font-medium">{truck.kapasitas} Unit</span>
                        </div>

                        {/* Row 3 (if kendala): Red note */}
                        {!isReady && truck.keterangan && (
                          <div className="p-1 rounded-lg bg-rose-50 border border-rose-200/80 text-[10px] text-rose-900 font-medium truncate">
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

          {/* TAB 3: VENDOR (RINGKAS, CLEAN, MODERN & TANPA SCROLL) */}
          {mobileTab === 'vendor' && (
            <div className="h-[calc(100dvh-140px)] flex flex-col justify-start space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between shrink-0">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  4 Vendor Transporter
                </h4>
                <span className="text-[10px] text-slate-400 font-bold">Ringkasan Kesiapan</span>
              </div>

              {/* 2x2 Clean Grid for 4 Transporters */}
              <div className="grid grid-cols-2 gap-2.5 shrink-0">
                {vendorBreakdowns.map((v) => (
                  <div
                    key={v.code}
                    className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-black px-1.5 py-0.2 rounded bg-slate-900 text-white">
                          {v.code}
                        </span>
                        <span className="font-mono font-black text-xs text-blue-700">
                          {v.percent}%
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        {v.name}
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${v.percent}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[9.5px]">
                        <span className="text-slate-500 font-medium">{v.ready}/{v.aktif} Ready</span>
                        {v.isUpdated ? (
                          <span className="text-emerald-700 font-bold">✓ Update</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Belum</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3 Depos Horizontal Strip */}
              <div className="pt-1 shrink-0">
                <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-2">
                  Distribusi 3 Depo
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {depoBreakdowns.map((d) => (
                    <div
                      key={d.name}
                      className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs text-center"
                    >
                      <div className="text-[11px] font-extrabold text-slate-800">{d.name}</div>
                      <div className="text-sm font-black font-mono text-blue-700">{d.percent}%</div>
                      <div className="text-[9.5px] text-slate-500 font-bold">{d.ready}/{d.aktif} Siap</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REKAP DATA (HASIL UPDATE HARIAN - GANTI GRAFIK) */}
          {mobileTab === 'rekap' && (
            <div className="h-[calc(100dvh-140px)] overflow-y-auto animate-in fade-in duration-150">
              <AdminAnalyticsReport trucks={trucks} />
            </div>
          )}

          {/* TAB 5: KONTROL (RINGKAS, CLEAN & 1 LAYAR TANPA SCROLL) */}
          {mobileTab === 'kontrol' && (
            <div className="h-[calc(100dvh-140px)] flex flex-col justify-start space-y-3 animate-in fade-in duration-150">
              
              {/* Cut-off Control Card Ringkas */}
              <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-xs space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cut-Off 17:00 WIB
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold">{wibClock} WIB</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                        isLocked ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isLocked ? 'Terkunci' : 'Terbuka'}
                    </span>
                  </div>
                </div>

                {/* Segmented Switch Auto | Buka | Kunci */}
                <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('auto')}
                    className={`py-1 text-xs font-bold rounded-lg text-center transition cursor-pointer ${
                      cutOffMode === 'auto'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('unlocked')}
                    className={`py-1 text-xs font-bold rounded-lg text-center transition cursor-pointer ${
                      cutOffMode === 'unlocked'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('locked')}
                    className={`py-1 text-xs font-bold rounded-lg text-center transition cursor-pointer ${
                      cutOffMode === 'locked'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Kunci
                  </button>
                </div>
              </div>

              {/* Grid 2-Kolom Tombol Aksi Kontrol Ringkas & Bersih */}
              <div className="grid grid-cols-2 gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="p-3 rounded-xl bg-slate-900 active:bg-slate-800 text-white font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                >
                  <span className="text-base">🚚</span>
                  <span>+ Tambah Truk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(true)}
                  className="p-3 rounded-xl bg-white border border-slate-200 active:bg-slate-50 text-slate-800 font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                >
                  <span className="text-base">📋</span>
                  <span>Arsip Database</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenEmailModal}
                  className="p-3 rounded-xl bg-white border border-slate-200 active:bg-slate-50 text-slate-800 font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                >
                  <span className="text-base">✉️</span>
                  <span>Rekap Email</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenApiSettings}
                  className="p-3 rounded-xl bg-white border border-slate-200 active:bg-slate-50 text-slate-800 font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                >
                  <span className="text-base">⚙️</span>
                  <span>Panel API</span>
                </button>

                {onOpenChangePassword && (
                  <button
                    type="button"
                    onClick={onOpenChangePassword}
                    className="p-3 rounded-xl bg-white border border-slate-200 active:bg-slate-50 text-slate-800 font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="text-base">🔒</span>
                    <span>Ubah Password</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onExportCsv}
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100 text-emerald-800 font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                >
                  <span className="text-base">📥</span>
                  <span>Unduh CSV</span>
                </button>

                {onResetReadiness && (
                  <button
                    type="button"
                    onClick={onResetReadiness}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100 text-rose-800 font-bold text-xs flex flex-col justify-between gap-2 shadow-xs cursor-pointer"
                    title="Bersihkan semua riwayat update kesiapan armada hari ini"
                  >
                    <span className="text-base">🔄</span>
                    <span>Reset Kesiapan</span>
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
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
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
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition relative cursor-pointer ${
              mobileTab === 'armada'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">🚚</span>
            <span className="text-[10px] mt-0.5">Armada</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('vendor')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
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
            onClick={() => setMobileTab('rekap')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              mobileTab === 'rekap'
                ? 'text-[#E50914] font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <span className="text-base leading-none">📑</span>
            <span className="text-[10px] mt-0.5">Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('kontrol')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
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
      {/* 1 LAYAR TANPA SCROLL, RINGKAS, BERSIH, MODERN & PROPORSIONAL               */}
      {/* ========================================================================= */}
      <div className="hidden md:block w-full space-y-3 pb-4">
        
        {/* Status Header Desktop: AppSheet ganti Aktif (tetap ada pembungkus) */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    INTEGRASI REST API AKTIF
                  </span>
                  <span className="text-slate-500 text-xs">•</span>
                  {/* Tulisan appsheet MD to Dealer 2 diganti dengan Aktif (tetap ada pembungkus) */}
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                    Aktif
                  </span>
                </div>
                <h2 className="text-base font-black text-white tracking-tight mt-0.5">
                  Pusat Monitoring & Kendali Distribusi MD to Dealer
                </h2>
              </div>
            </div>

            {/* Quick Action Ribbon: Switcher & Sinkronkan */}
            <div className="flex items-center gap-2">
              {/* Desktop View Switcher: Monitoring Live & Rekap Data */}
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
                  onClick={() => setActiveDesktopView('rekap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDesktopView === 'rekap'
                      ? 'bg-[#E50914] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📊</span>
                  <span>Rekap Data</span>
                </button>
              </div>

              {/* Sinkronkan Button */}
              <button
                type="button"
                onClick={onSyncAppSheet}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isSyncing ? 'Sinkron...' : 'Sinkronkan'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* ===================================================================== */}
        {/* DESKTOP CONTENT: REKAP DATA ATAU MONITORING (1 LAYAR TANPA SCROLL)    */}
        {/* ===================================================================== */}
        {activeDesktopView === 'rekap' ? (
          <AdminAnalyticsReport trucks={trucks} />
        ) : (
          <div className="space-y-3">
            
            {/* Header Filter Ringkasan Desktop */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-3.5 py-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Ringkasan Kesiapan Armada
                </span>
                {(summaryDepoFilter !== 'ALL' || summaryVendorFilter !== 'ALL') ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-mono">
                    <span>{summaryDepoFilter !== 'ALL' ? `Depo: ${summaryDepoFilter}` : 'Semua Depo'}</span>
                    <span>•</span>
                    <span>{summaryVendorFilter !== 'ALL' ? `Transporter: ${summaryVendorFilter}` : 'Semua Transporter'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryDepoFilter('ALL');
                        setSummaryVendorFilter('ALL');
                      }}
                      className="ml-1 text-red-600 hover:text-red-800 font-black cursor-pointer"
                      title="Reset filter"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Semua Depo & Transporter)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSummaryFilterOpen(!isSummaryFilterOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  isSummaryFilterOpen || summaryDepoFilter !== 'ALL' || summaryVendorFilter !== 'ALL'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Filter Depo & Transporter"
              >
                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filter</span>
              </button>
            </div>

            {/* Dropdown Filter Panel Desktop (Clean & Ringkas) */}
            {isSummaryFilterOpen && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Gudang / Depo:
                    </label>
                    <select
                      value={summaryDepoFilter}
                      onChange={(e) => setSummaryDepoFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Depo (All)</option>
                      <option value="Karawang">Depo Karawang</option>
                      <option value="Baros">Depo Baros</option>
                      <option value="Cirebon">Depo Cirebon</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Transporter:
                    </label>
                    <select
                      value={summaryVendorFilter}
                      onChange={(e) => setSummaryVendorFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Transporter (All)</option>
                      <option value="TM">TM - Tunas Muda</option>
                      <option value="RJTM">RJTM - Roda Jagat</option>
                      <option value="WSS">WSS - Wahana</option>
                      <option value="SBR">SBR - Sari Bumi</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Baris 5 Metrik Konsolidasi Utama */}
            <div className="grid grid-cols-5 gap-2.5">
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Armada
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {summaryTotalTrucks}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">Truk</span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  {summaryActiveCount} Aktif • {summaryNonaktifCount} Non
                </span>
              </div>

              <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-3 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                  Siap Kirim (Ready)
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    {summaryReadyCount}
                  </span>
                  <span className="text-xs text-emerald-700 font-bold font-mono">
                    ({summaryOverallPercent}%)
                  </span>
                </div>
                <span className="block text-[11px] text-emerald-600 mt-0.5">
                  Siap Berangkat
                </span>
              </div>

              <div className="bg-rose-50/70 rounded-xl border border-rose-200 p-3 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-rose-800 tracking-wider">
                  Unit Terkendala
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-rose-700 font-mono">
                    {summaryTidakReadyCount}
                  </span>
                  <span className="text-xs text-rose-700 font-bold">Truk</span>
                </div>
                <span className="block text-[11px] text-rose-600 mt-0.5">
                  Perlu Penanganan
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Kapasitas Aktif
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {summaryKapasitasAktif}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">Unit</span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Kapasitas Angkut
                </span>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Cut-Off 17:00
                  </span>
                  <span
                    className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                      isLocked ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isLocked ? 'Terkunci' : 'Buka'}
                  </span>
                </div>

                <div className="flex gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('auto')}
                    className={`flex-1 py-0.5 text-[11px] font-bold rounded transition cursor-pointer text-center ${
                      cutOffMode === 'auto'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('unlocked')}
                    className={`flex-1 py-0.5 text-[11px] font-bold rounded transition cursor-pointer text-center ${
                      cutOffMode === 'unlocked'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => onCutOffModeChange('locked')}
                    className={`flex-1 py-0.5 text-[11px] font-bold rounded transition cursor-pointer text-center ${
                      cutOffMode === 'locked'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Kunci
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Baris 4 Vendor Transporter (Ringkas, Clean, Tanpa Tombol Buka Tabel) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Kesiapan 4 Transporter
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Konsolidasi Real-time</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {vendorBreakdowns.map((v) => (
                  <div
                    key={v.code}
                    className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                          {v.code}
                        </span>
                        {v.isUpdated ? (
                          <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                            ✓ Update
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-full">
                            Belum
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {v.name}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-baseline justify-between mb-1 text-xs">
                        <span className="text-slate-600 font-medium">
                          Ready: <strong className="text-blue-700 font-mono">{v.ready}</strong>/{v.aktif}
                        </span>
                        <span className="font-mono font-black text-slate-900">
                          {v.percent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${v.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Baris 3 Depo (Ringkas, Clean) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Distribusi 3 Depo Operasional
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Lokasi Gudang</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {depoBreakdowns.map((d) => (
                  <div
                    key={d.name}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-800">
                        Depo {d.name}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-700">
                        {d.percent}% Siap
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-slate-600 mt-1">
                      <span>Total: <strong>{d.total}</strong> ({d.aktif} Aktif)</span>
                      <span className="text-emerald-700 font-bold">{d.ready} Ready</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${d.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* REKAP HARIAN DATABASE MODAL (ARSIP & DOWNLOAD DARI KONTROL) */}
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
