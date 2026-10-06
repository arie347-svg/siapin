import React, { useState, useMemo, useEffect } from 'react';
import { TruckRecord } from '../types';
import { TRANSPORTER_NAMES } from '../services/mockData';
import { getWIBDateString, formatWIBDateIndo } from '../utils/timeUtils';

interface AdminAnalyticsReportProps {
  trucks: TruckRecord[];
  onOpenShareModal?: () => void;
  onSelectVendorFilter?: (vendor: string) => void;
}

export const AdminAnalyticsReport: React.FC<AdminAnalyticsReportProps> = ({ trucks }) => {
  // 1. Database Snapshots Integration
  const [dbDates, setDbDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('LIVE');
  const [snapshotTrucks, setSnapshotTrucks] = useState<TruckRecord[] | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(false);

  // 2. Filter States: Transporter & Gudang
  const [selectedTransporter, setSelectedTransporter] = useState<string>('ALL');
  const [selectedDepo, setSelectedDepo] = useState<string>('ALL');
  const [downloadReady, setDownloadReady] = useState<{ url: string; fileName: string; count: number } | null>(null);

  // Fetch available dates from Cloud/Server Database
  useEffect(() => {
    fetch('/api/snapshots')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.dates)) {
          setDbDates(data.dates);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch specific snapshot when historical date is selected
  useEffect(() => {
    if (selectedDate === 'LIVE') {
      setSnapshotTrucks(null);
      setDownloadReady(null);
      return;
    }

    setIsLoadingSnapshot(true);
    setDownloadReady(null);
    fetch(`/api/snapshots/${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.trucks)) {
          setSnapshotTrucks(data.trucks);
        } else {
          setSnapshotTrucks([]);
        }
      })
      .catch(() => setSnapshotTrucks([]))
      .finally(() => setIsLoadingSnapshot(false));
  }, [selectedDate]);

  // Determine active dataset (Live vs Historical Database Snapshot)
  const activeSourceTrucks = useMemo(() => {
    if (selectedDate === 'LIVE') return trucks;
    return snapshotTrucks || [];
  }, [selectedDate, trucks, snapshotTrucks]);

  // Filter trucks dynamically
  const filteredTrucks = useMemo(() => {
    return activeSourceTrucks.filter((t) => {
      // Filter Transporter
      if (selectedTransporter !== 'ALL' && t.transporter !== selectedTransporter) {
        return false;
      }
      // Filter Gudang (Depo)
      if (selectedDepo !== 'ALL') {
        const truckDepo = (t.depo || 'Karawang').toLowerCase();
        if (truckDepo !== selectedDepo.toLowerCase()) return false;
      }
      return true;
    });
  }, [activeSourceTrucks, selectedTransporter, selectedDepo]);

  // Metrics KPI
  const totalCount = filteredTrucks.length;
  const activeCount = filteredTrucks.filter((t) => t.status === 'Aktif').length;
  const readyCount = filteredTrucks.filter((t) => t.status === 'Aktif' && (t.kesiapan || 'Ready') === 'Ready').length;
  const kendalaCount = filteredTrucks.filter((t) => t.status === 'Aktif' && t.kesiapan === 'Tidak Ready').length;
  const readinessPercent = activeCount > 0 ? Math.round((readyCount / activeCount) * 100) : 0;

  // Generate Detail Colored Excel with Full License Plates List
  const handleExportColoredExcel = () => {
    const today = getWIBDateString();
    const dateLabel = selectedDate === 'LIVE' ? `Hari_Ini_${today}` : selectedDate;
    const vendorLabel = selectedTransporter === 'ALL' ? 'Semua_Vendor' : selectedTransporter;
    const depoLabel = selectedDepo === 'ALL' ? 'Semua_Gudang' : selectedDepo;
    const fileName = `Rekap_Detail_Armada_SIAPIN_${vendorLabel}_${depoLabel}_${dateLabel}.xls`;

    const reportDateStr = selectedDate === 'LIVE' ? `${formatWIBDateIndo(today)} (Live)` : formatWIBDateIndo(selectedDate);

    // Construct rich HTML Table with Microsoft Excel inline styling & 11 detail columns
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Rekap Detail Armada</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; text-align: left; }
          .subtitle { font-size: 10pt; color: #475569; margin-bottom: 12px; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #334155; padding: 10px; text-align: center; font-size: 10pt; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: middle; font-size: 10pt; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .ready { background-color: #dcfce7; color: #166534; font-weight: bold; text-align: center; }
          .kendala { background-color: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
          .nonaktif { background-color: #f1f5f9; color: #475569; text-align: center; }
          .summary-box { background-color: #f8fafc; border: 2px solid #0f172a; font-weight: bold; font-size: 11pt; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="11" class="title">REKAP DETAIL KESIAPAN & NOMOR POLISI ARMADA LOGISTIK MD TO DEALER</td></tr>
          <tr><td colspan="11" class="subtitle">Tanggal Arsip Database: ${reportDateStr} | Vendor: ${vendorLabel} | Gudang: ${depoLabel} | Diekspor: ${new Date().toLocaleTimeString('id-ID')} WIB</td></tr>
          <tr><td colspan="11"></td></tr>
          <tr class="summary-box">
            <td colspan="2" class="center">Total Armada: ${totalCount}</td>
            <td colspan="2" class="center">Armada Aktif: ${activeCount}</td>
            <td colspan="2" class="center" style="color: #166534;">✓ Ready: ${readyCount}</td>
            <td colspan="2" class="center" style="color: #991b1b;">⚠ Kendala: ${kendalaCount}</td>
            <td colspan="3" class="center">Tingkat Kesiapan: ${readinessPercent}%</td>
          </tr>
          <tr><td colspan="11"></td></tr>
          <thead>
            <tr>
              <th style="width: 45px;">No</th>
              <th style="width: 110px;">Tanggal Database</th>
              <th style="width: 180px;">Transporter</th>
              <th style="width: 120px;">Gudang / Depo</th>
              <th style="width: 120px;">Nomor Polisi</th>
              <th style="width: 180px;">Nama Sopir</th>
              <th style="width: 90px;">Kapasitas</th>
              <th style="width: 100px;">Status Truk</th>
              <th style="width: 120px;">Kesiapan</th>
              <th style="width: 260px;">Keterangan Kendala</th>
              <th style="width: 160px;">Terakhir Update</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTrucks
              .map((t, idx) => {
                const isReady = t.kesiapan === 'Ready';
                const isNonaktif = t.status === 'Nonaktif';
                const rowClass = isNonaktif ? 'nonaktif' : isReady ? 'ready' : 'kendala';
                const vendorFullName = TRANSPORTER_NAMES[t.transporter] || t.transporter;
                const dateVal = selectedDate === 'LIVE' ? today : selectedDate;
                return `
                <tr>
                  <td class="center">${idx + 1}</td>
                  <td class="center">${dateVal}</td>
                  <td>${vendorFullName}</td>
                  <td class="center">${t.depo || 'Karawang'}</td>
                  <td class="center bold" style="font-family: monospace; font-size: 11pt;">${t.nomorPolisi}</td>
                  <td>${t.namaSopir || '-'}</td>
                  <td class="center">${t.kapasitas} Unit</td>
                  <td class="center">${t.status}</td>
                  <td class="${rowClass}">${isNonaktif ? 'Nonaktif' : isReady ? '✓ Ready' : '⚠ Tidak Ready'}</td>
                  <td style="color: ${!isReady && !isNonaktif ? '#991b1b' : '#334155'}; font-weight: ${!isReady && !isNonaktif ? 'bold' : 'normal'};">
                    ${t.keterangan || '-'}
                  </td>
                  <td class="center">${t.terakhirUpdate || '-'}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setDownloadReady({ url, fileName, count: filteredTrucks.length });

    // Auto download trigger
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 animate-in fade-in duration-150">
      {/* Kartu Utama Rekap Data Hasil Updatean Harian */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5">
        
        {/* Header Ringkas */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>Rekap Data Hasil Update Harian</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pilih tanggal arsip database & filter, lalu ekspor detail list nomor polisi ke file Excel berwarna
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
            {filteredTrucks.length} Unit
          </span>
        </div>

        {/* 3 Filter Terpadu: Tanggal Database, Transporter, Gudang */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Filter Tanggal Arsip Database */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
              📅 Tanggal Arsip Database
            </label>
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 transition cursor-pointer"
            >
              <option value="LIVE">Hari Ini (Data Live)</option>
              {dbDates.map((d) => (
                <option key={d} value={d}>
                  {formatWIBDateIndo(d)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Transporter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
              🚚 Transporter
            </label>
            <select
              value={selectedTransporter}
              onChange={(e) => {
                setSelectedTransporter(e.target.value);
                setDownloadReady(null);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 transition cursor-pointer"
            >
              <option value="ALL">Semua Transporter</option>
              <option value="TM">TM - PT Tunas Muda Mandiri</option>
              <option value="RJTM">RJTM - PT Roda Jagat Tunas Mas</option>
              <option value="WSS">WSS - PT Wahana Sumber Sakti</option>
              <option value="SBR">SBR - PT Sari Bumi Raya</option>
            </select>
          </div>

          {/* 3. Filter Gudang */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
              📍 Gudang (Depo)
            </label>
            <select
              value={selectedDepo}
              onChange={(e) => {
                setSelectedDepo(e.target.value);
                setDownloadReady(null);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 transition cursor-pointer"
            >
              <option value="ALL">Semua Gudang</option>
              <option value="Karawang">Depo Karawang</option>
              <option value="Baros">Depo Baros</option>
              <option value="Cirebon">Depo Cirebon</option>
            </select>
          </div>
        </div>

        {/* Ringkasan Angka Cepat & Tombol Export */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-600">Total: <strong>{totalCount}</strong></span>
            <span className="text-emerald-700 font-bold">✓ Ready: {readyCount}</span>
            <span className="text-rose-700 font-bold">⚠ Kendala: {kendalaCount}</span>
            <span className="text-slate-700 font-bold">Kesiapan: {readinessPercent}%</span>
          </div>

          <button
            type="button"
            onClick={handleExportColoredExcel}
            disabled={isLoadingSnapshot || totalCount === 0}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <span className="text-sm">📤</span>
            <span>{isLoadingSnapshot ? 'Memuat Database...' : 'Export Excel Berwarna (Detail Nopol)'}</span>
          </button>
        </div>

        {/* Kartu Download File Excel Berwarna Tinggal Klik */}
        {downloadReady && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">📗</span>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-emerald-950 block truncate font-mono">
                  {downloadReady.fileName}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  File Excel detail list nomor polisi berhasil dibuat ({downloadReady.count} unit armada terformat)
                </span>
              </div>
            </div>

            <a
              href={downloadReady.url}
              download={downloadReady.fileName}
              className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs shrink-0 shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span>📥</span>
              <span>Download File Excel</span>
            </a>
          </div>
        )}

        {/* Preview Ringkas Detail List Nomor Polisi */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Preview Detail Armada yang Diekspor:
            </span>
            <span className="text-[10px] text-slate-400">
              {filteredTrucks.length} unit armada
            </span>
          </div>

          {filteredTrucks.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              {isLoadingSnapshot ? 'Sedang memuat data dari database...' : 'Tidak ada data armada yang cocok dengan filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">No</th>
                    <th className="py-2 px-3">Nomor Polisi</th>
                    <th className="py-2 px-3">Transporter</th>
                    <th className="py-2 px-3">Gudang</th>
                    <th className="py-2 px-3">Sopir</th>
                    <th className="py-2 px-3 text-center">Kesiapan</th>
                    <th className="py-2 px-3">Keterangan Kendala</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTrucks.slice(0, 5).map((t, idx) => {
                    const isReady = t.kesiapan === 'Ready';
                    const isNonaktif = t.status === 'Nonaktif';
                    return (
                      <tr key={t.id || t.nomorPolisi || idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-1.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{t.nomorPolisi}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-700">{t.transporter}</td>
                        <td className="py-1.5 px-3 text-slate-600">{t.depo || 'Karawang'}</td>
                        <td className="py-1.5 px-3 text-slate-600 truncate max-w-[120px]">{t.namaSopir || '-'}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isNonaktif
                                ? 'bg-slate-100 text-slate-600'
                                : isReady
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isNonaktif ? 'Nonaktif' : isReady ? 'Ready' : 'Kendala'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-500 truncate max-w-[160px]">
                          {t.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTrucks.length > 5 && (
                <div className="bg-slate-50 py-1.5 px-3 text-center text-[10px] text-slate-500 font-medium border-t border-slate-100">
                  + {filteredTrucks.length - 5} unit armada lainnya akan disertakan lengkap di file Excel
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
