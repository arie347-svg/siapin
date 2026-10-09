import React, { useState, useEffect } from 'react';
import { formatWIBDateIndo, getWIBDateString } from '../utils/timeUtils';
import { fetchAllDatabaseSnapshots, downloadDateSnapshotCsv } from '../services/apiService';

interface DailySnapshotRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onForceSaveTodaySnapshot?: () => Promise<void>;
}

export const DailySnapshotRecapModal: React.FC<DailySnapshotRecapModalProps> = ({
  isOpen,
  onClose,
  currentSelectedDate,
  onSelectDate,
  onForceSaveTodaySnapshot,
}) => {
  const [dates, setDates] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const todayStr = getWIBDateString();

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAllDatabaseSnapshots();
      setDates(result.dates);
      setSnapshots(result.snapshots);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    downloadDateSnapshotCsv(dateStr);
  };

  const handleSelect = (dateStr: string) => {
    onSelectDate(dateStr);
    onClose();
  };

  const handleForceSave = async () => {
    if (!onForceSaveTodaySnapshot) return;
    setIsSaving(true);
    try {
      await onForceSaveTodaySnapshot();
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDates = dates.filter((d) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const formatted = formatWIBDateIndo(d).toLowerCase();
    return d.includes(term) || formatted.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
              Arsip Rekap Harian Database
            </h3>
            <p className="text-[11px] text-slate-300">
              Tersimpan permanen di database Cloud & Server · Siap diunduh CSV
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar Ringkas */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cari tanggal..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-red-500 font-mono"
            />
          </div>

          {onForceSaveTodaySnapshot && (
            <button
              type="button"
              onClick={handleForceSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-300 text-white text-xs font-medium flex items-center justify-center shadow-xs transition cursor-pointer shrink-0"
              title="Perbarui arsip tanggal hari ini langsung ke database"
            >
              <span>{isSaving ? 'Menyimpan...' : 'Arsipkan Hari Ini'}</span>
            </button>
          )}
        </div>

        {/* List Tanggal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Memuat arsip database...
            </div>
          ) : filteredDates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-1">
              <p className="font-medium text-slate-700">
                {searchFilter ? 'Tidak ada arsip yang cocok dengan pencarian.' : 'Belum ada rekapan harian yang tersimpan di database.'}
              </p>
              <p className="text-[11px] text-slate-400">
                Data akan otomatis tersimpan saat transporter mengonfirmasi armada harian.
              </p>
            </div>
          ) : (
            filteredDates.map((dateStr) => {
              const snap = snapshots[dateStr] || {};
              const summary = snap.summary || {};
              const count = snap.count || summary.total || 0;
              const ready = summary.ready !== undefined ? summary.ready : '-';
              const tidakReady = summary.tidakReady !== undefined ? summary.tidakReady : '-';
              const isSelected = dateStr === currentSelectedDate;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleSelect(dateStr)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-red-50/70 border-red-300 ring-1 ring-red-400/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900">
                        {dateStr}
                      </span>
                      <span className="text-xs text-slate-600 font-semibold">
                        ({formatWIBDateIndo(dateStr)})
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-700">
                          HARI INI
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-white">
                          AKTIF DIPILIH
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        Total: {count} Unit
                      </span>
                      {ready !== '-' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Ready: {ready}
                        </span>
                      )}
                      {tidakReady !== '-' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                          Tidak Ready: {tidakReady}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(dateStr);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      title="Lihat data rekap di dashboard"
                    >
                      Buka
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, dateStr)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition flex items-center justify-center cursor-pointer shadow-xs"
                      title="Unduh file CSV"
                    >
                      Unduh CSV
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Total {dates.length} tanggal tersimpan di database
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
