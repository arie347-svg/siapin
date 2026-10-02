import React, { useState, useMemo } from 'react';
import { TruckRecord } from '../types';
import { TRANSPORTER_NAMES } from '../services/mockData';
import { formatWIBDateIndo, getWIBDateString } from '../utils/timeUtils';

interface AdminAnalyticsReportProps {
  trucks: TruckRecord[];
  onOpenShareModal: () => void;
  onSelectVendorFilter?: (vendor: string) => void;
}

export const AdminAnalyticsReport: React.FC<AdminAnalyticsReportProps> = ({
  trucks,
  onOpenShareModal,
  onSelectVendorFilter,
}) => {
  // Chart Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedDepo, setSelectedDepo] = useState<string>('ALL');
  const [selectedTransporter, setSelectedTransporter] = useState<string>('ALL');
  const [viewMetric, setViewMetric] = useState<'unit' | 'kapasitas'>('unit');

  // Filter trucks dynamically for the analytics
  const filteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      // 1. Transporter
      if (selectedTransporter !== 'ALL' && t.transporter !== selectedTransporter) {
        return false;
      }
      // 2. Depo
      if (selectedDepo !== 'ALL') {
        const truckDepo = (t.depo || 'Karawang').toLowerCase();
        if (truckDepo !== selectedDepo.toLowerCase()) return false;
      }
      // 3. Month
      if (selectedMonth !== 'ALL') {
        const updateDate = t.terakhirUpdate || getWIBDateString();
        if (!updateDate.startsWith(selectedMonth)) return false;
      }
      return true;
    });
  }, [trucks, selectedTransporter, selectedDepo, selectedMonth]);

  // Aggregate metrics
  const totalCount = filteredTrucks.length;
  const activeTrucks = filteredTrucks.filter((t) => t.status === 'Aktif');
  const activeCount = activeTrucks.length;
  const nonaktifCount = totalCount - activeCount;

  const readyTrucks = activeTrucks.filter((t) => (t.kesiapan || 'Ready') === 'Ready');
  const readyCount = readyTrucks.length;
  const tidakReadyTrucks = activeTrucks.filter((t) => t.kesiapan === 'Tidak Ready');
  const tidakReadyCount = tidakReadyTrucks.length;

  const readyPercent = activeCount > 0 ? Math.round((readyCount / activeCount) * 100) : 0;
  const tidakPercent = activeCount > 0 ? 100 - readyPercent : 0;

  // Capacity metrics
  const totalKapasitas = filteredTrucks.reduce((sum, t) => sum + (parseInt(t.kapasitas, 10) || 0), 0);
  const readyKapasitas = readyTrucks.reduce((sum, t) => sum + (parseInt(t.kapasitas, 10) || 0), 0);
  const tidakReadyKapasitas = tidakReadyTrucks.reduce((sum, t) => sum + (parseInt(t.kapasitas, 10) || 0), 0);

  // Vendor comparison data
  const vendorCodes = ['TM', 'RJTM', 'WSS', 'SBR'];
  const vendorStats = useMemo(() => {
    return vendorCodes.map((code) => {
      const vTrucks = filteredTrucks.filter((t) => t.transporter === code);
      const vAktif = vTrucks.filter((t) => t.status === 'Aktif');
      const vReady = vAktif.filter((t) => (t.kesiapan || 'Ready') === 'Ready').length;
      const vTidak = vAktif.length - vReady;
      const vPct = vAktif.length > 0 ? Math.round((vReady / vAktif.length) * 100) : 0;
      const vKap = vAktif.reduce((acc, t) => acc + (parseInt(t.kapasitas, 10) || 0), 0);

      return {
        code,
        name: TRANSPORTER_NAMES[code] || code,
        total: vTrucks.length,
        aktif: vAktif.length,
        ready: vReady,
        tidak: vTidak,
        pct: vPct,
        kapasitas: vKap,
      };
    });
  }, [filteredTrucks]);

  // Depo comparison data
  const depos = ['Karawang', 'Baros', 'Cirebon'];
  const depoStats = useMemo(() => {
    return depos.map((depoName) => {
      const dTrucks = filteredTrucks.filter((t) => (t.depo || 'Karawang').toLowerCase() === depoName.toLowerCase());
      const dAktif = dTrucks.filter((t) => t.status === 'Aktif');
      const dReady = dAktif.filter((t) => (t.kesiapan || 'Ready') === 'Ready').length;
      const dTidak = dAktif.length - dReady;
      const dPct = dAktif.length > 0 ? Math.round((dReady / dAktif.length) * 100) : 0;
      const dKap = dAktif.reduce((acc, t) => acc + (parseInt(t.kapasitas, 10) || 0), 0);

      return {
        name: depoName,
        total: dTrucks.length,
        aktif: dAktif.length,
        ready: dReady,
        tidak: dTidak,
        pct: dPct,
        kapasitas: dKap,
      };
    });
  }, [filteredTrucks]);

  // SVG Radial Donut calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readyPercent / 100) * circumference;

  return (
    <div className="w-full space-y-4 pb-8">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-lg shadow-md shadow-red-500/20">
              📊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Visual Analytics & Report Kesiapan</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Grafik interaktif armada distribusi MD to Dealer (Bisa difilter multi-kondisi)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Direct Share Button */}
            <button
              type="button"
              onClick={onOpenShareModal}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>📤</span>
              <span>Bagikan Laporan</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filters Form */}
        <div className="pt-3.5">
          <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2 flex items-center gap-1">
            <span>⚙️</span> Filter Kondisi Grafik & Laporan:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Filter Bulan */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Periode Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Bulan (ALL)</option>
                <option value="2026-10">Oktober 2026</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
              </select>
            </div>

            {/* Filter Depo */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Depo Lokasi
              </label>
              <select
                value={selectedDepo}
                onChange={(e) => setSelectedDepo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Depo (ALL)</option>
                <option value="Karawang">Karawang</option>
                <option value="Baros">Baros</option>
                <option value="Cirebon">Cirebon</option>
              </select>
            </div>

            {/* Filter Transporter */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Transporter
              </label>
              <select
                value={selectedTransporter}
                onChange={(e) => setSelectedTransporter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Transporter (ALL)</option>
                <option value="TM">TM</option>
                <option value="WSS">WSS</option>
                <option value="RJTM">RJTM</option>
                <option value="SBR">SBR</option>
              </select>
            </div>

            {/* Metric Mode Toggle */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Basis Metrik Grafik
              </label>
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMetric('unit')}
                  className={`flex-1 py-1 rounded-lg text-center transition cursor-pointer ${
                    viewMetric === 'unit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Unit Truk
                </button>
                <button
                  type="button"
                  onClick={() => setViewMetric('kapasitas')}
                  className={`flex-1 py-1 rounded-lg text-center transition cursor-pointer ${
                    viewMetric === 'kapasitas' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kapasitas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Total Armada Terfilter */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold text-[11px] uppercase tracking-wide">Total Armada</span>
            <span className="p-1 rounded-lg bg-slate-100 text-slate-700">🚛</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs font-bold text-slate-500">Unit ({activeCount} Aktif)</span>
          </div>
          <div className="mt-2 text-[10.5px] text-slate-500 font-medium">
            Nonaktif: <span className="font-bold text-slate-700">{nonaktifCount} unit</span>
          </div>
        </div>

        {/* Card 2: Unit Ready */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700 text-xs">
            <span className="font-bold text-[11px] uppercase tracking-wide">Armada Ready</span>
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">✓</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{readyCount}</span>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded-full">
              {readyPercent}%
            </span>
          </div>
          <div className="mt-2 text-[10.5px] text-emerald-800 font-medium">
            Kapasitas: <span className="font-bold">{readyKapasitas} unit motor</span>
          </div>
        </div>

        {/* Card 3: Unit Tidak Ready */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-200/80 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between text-rose-700 text-xs">
            <span className="font-bold text-[11px] uppercase tracking-wide">Kendala / Tidak Ready</span>
            <span className="p-1 rounded-lg bg-rose-100 text-rose-800">⚠️</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-700">{tidakReadyCount}</span>
            <span className="text-xs font-extrabold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded-full">
              {tidakPercent}%
            </span>
          </div>
          <div className="mt-2 text-[10.5px] text-rose-800 font-medium">
            Kehilangan Kapasitas: <span className="font-bold">{tidakReadyKapasitas} unit</span>
          </div>
        </div>

        {/* Card 4: Total Kapasitas Angkut */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold text-[11px] uppercase tracking-wide">Total Kapasitas</span>
            <span className="p-1 rounded-lg bg-blue-100 text-blue-800">📦</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalKapasitas}</span>
            <span className="text-xs font-bold text-slate-500">Unit Motor</span>
          </div>
          <div className="mt-2 text-[10.5px] text-blue-700 font-medium">
            Rasio Angkut: <span className="font-bold">{totalCount > 0 ? (totalKapasitas / totalCount).toFixed(1) : 0} unit / truk</span>
          </div>
        </div>
      </div>

      {/* 3. MODERN VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* DONUT RADIAL GAUGE CHART */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Rasio Kesiapan Keseluruhan
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Filter Aktif
            </span>
          </div>

          {/* SVG Donut */}
          <div className="relative w-44 h-44 my-2 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-100 stroke-current"
                strokeWidth="14"
                fill="transparent"
              />
              {/* Ready Portion Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-emerald-500 stroke-current transition-all duration-1000 ease-out"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Metric Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {readyPercent}%
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Ready Rate
              </span>
              <span className="text-[9.5px] font-bold text-emerald-600 mt-0.5">
                {readyCount} dari {activeCount} Unit
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <div className="text-[10px] text-emerald-800 font-bold">Ready</div>
                <div className="font-extrabold text-emerald-950 text-xs">{readyCount} Unit</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-rose-50/70 border border-rose-200/60">
              <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
              <div>
                <div className="text-[10px] text-rose-800 font-bold">Tidak Ready</div>
                <div className="font-extrabold text-rose-950 text-xs">{tidakReadyCount} Unit</div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPARATIVE BAR CHART: KESIAPAN PER TRANSPORTER */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Perbandingan Transporter
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Persentase & kapasitas armada ready</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              4 Vendor
            </span>
          </div>

          <div className="space-y-3.5 my-auto">
            {vendorStats.map((v) => (
              <div key={v.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900">{v.code}</span>
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                      {v.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-slate-900">{v.pct}%</span>
                    <span className="text-[10.5px] text-slate-500 font-semibold">
                      ({v.ready}/{v.aktif})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${v.pct}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-l-full transition-all duration-700"
                    title={`Ready: ${v.ready} unit`}
                  />
                  <div
                    style={{ width: `${v.aktif > 0 ? (v.tidak / v.aktif) * 100 : 0}%` }}
                    className="h-full bg-rose-500 transition-all duration-700"
                    title={`Tidak Ready: ${v.tidak} unit`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Kap: {v.kapasitas} unit</span>
                  <span>{v.tidak > 0 ? `${v.tidak} unit kendala` : 'Semua ready'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Hijau: Ready</span>
            <span>Merah: Kendala</span>
          </div>
        </div>

        {/* COMPARATIVE BAR CHART: KESIAPAN PER DEPO LOKASI */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Kesiapan per Depo Audit
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Distribusi armada di 3 lokasi depo</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              3 Depo
            </span>
          </div>

          <div className="space-y-4 my-auto">
            {depoStats.map((d) => (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-extrabold text-slate-900">Depo {d.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-slate-900">{d.pct}%</span>
                    <span className="text-[10.5px] text-slate-500 font-semibold">
                      ({d.ready}/{d.aktif})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${d.pct}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-l-full transition-all duration-700"
                    title={`Ready: ${d.ready} unit`}
                  />
                  <div
                    style={{ width: `${d.aktif > 0 ? (d.tidak / d.aktif) * 100 : 0}%` }}
                    className="h-full bg-rose-500 transition-all duration-700"
                    title={`Tidak Ready: ${d.tidak} unit`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Total Kapasitas: {d.kapasitas} unit</span>
                  <span>{d.total} armada terdaftar</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Biru: Armada Siap Kirim</span>
            <span>Merah: Perlu Penanganan</span>
          </div>
        </div>

      </div>

      {/* 4. DAFTAR KENDALA / UNIT TIDAK READY (JIKA ADA) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">⚠️</span>
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
              Daftar Armada Mengalami Kendala (Tidak Ready)
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {tidakReadyTrucks.length} Unit
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenShareModal}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
          >
            Bagikan Data Kendala →
          </button>
        </div>

        {tidakReadyTrucks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <span className="text-2xl block mb-1">🎉</span>
            <span className="font-bold text-slate-700">Luar biasa! Tidak ada armada yang mengalami kendala.</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Seluruh unit aktif pada filter saat ini berstatus Ready untuk pengiriman.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center">#</th>
                  <th className="py-2.5 px-3">No. Polisi</th>
                  <th className="py-2.5 px-3">Sopir</th>
                  <th className="py-2.5 px-3">Transporter</th>
                  <th className="py-2.5 px-3">Depo</th>
                  <th className="py-2.5 px-3 text-center">Kap</th>
                  <th className="py-2.5 px-3">Alasan / Keterangan Kendala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tidakReadyTrucks.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-rose-50/40 transition">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {t.nomorPolisi}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {t.namaSopir || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10.5px]">
                        {t.transporter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {t.depo || 'Karawang'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                      {t.kapasitas}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                        {t.keterangan || 'Kendala Teknis'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
