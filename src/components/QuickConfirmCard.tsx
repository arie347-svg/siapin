import React from 'react';
import { TruckRecord } from '../types';

interface QuickConfirmCardProps {
  transporterCode: string;
  transporterName: string;
  depoName?: string;
  lastConfirmedTime: string;
  trucks: TruckRecord[];
  isLocked: boolean;
  onConfirmAll: () => void;
  isConfirming?: boolean;
}

export const QuickConfirmCard: React.FC<QuickConfirmCardProps> = ({
  transporterCode,
  transporterName,
  depoName,
  lastConfirmedTime,
  trucks,
  isLocked,
  onConfirmAll,
  isConfirming = false,
}) => {
  const totalTrucks = trucks.length;
  const readyTrucks = trucks.filter((t) => t.kesiapan === 'Ready').length;
  const tidakReadyTrucks = totalTrucks - readyTrucks;
  const activeTrucks = trucks.filter((t) => t.status === 'Aktif').length;
  const readinessPercent = totalTrucks > 0 ? Math.round((readyTrucks / totalTrucks) * 100) : 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-3 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Info & Stats */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
              {transporterCode === 'ALL' ? 'Semua Armada' : transporterName || transporterCode}
            </span>
            {depoName && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Depo: {depoName}
              </span>
            )}
            <span className="text-xs text-slate-500">
              Terakhir Konfirmasi: <strong className="text-slate-700 font-mono">{lastConfirmedTime}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <span>
              Total: <strong className="text-slate-900">{totalTrucks}</strong> Unit
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-700">
              Ready: <strong>{readyTrucks}</strong> Unit
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-red-600">
              Tidak Ready: <strong>{tidakReadyTrucks}</strong> Unit
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">
              Status Unit: <strong>{activeTrucks} Aktif</strong> / {totalTrucks - activeTrucks} Nonaktif
            </span>
            <span className="text-slate-300">|</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
              {readinessPercent}% Siap
            </span>
          </div>
        </div>

        {/* Right: WhatsApp + Save Primary Action Button */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onConfirmAll}
            disabled={isLocked || isConfirming || totalTrucks === 0}
            className={`w-full md:w-auto px-4 py-2.5 rounded-md text-xs font-bold transition shadow-xs cursor-pointer ${
              isLocked || totalTrucks === 0
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
            }`}
          >
            {isConfirming ? 'Menyimpan...' : 'Simpan Data & Kirim WA'}
          </button>
        </div>
      </div>
    </div>
  );
};
