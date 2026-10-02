import React from 'react';
import { TruckStatus, ReadinessStatus } from '../types';

interface FloatingBatchFooterProps {
  selectedCount: number;
  isLocked: boolean;
  isAdmin?: boolean;
  isUpdating: boolean;
  onSetStatus: (status: TruckStatus) => void;
  onSetReadiness?: (readiness: ReadinessStatus) => void;
  onMassDelete: () => void;
  onClearSelection: () => void;
}

export const FloatingBatchFooter: React.FC<FloatingBatchFooterProps> = ({
  selectedCount,
  isLocked,
  isAdmin = false,
  isUpdating,
  onSetStatus,
  onSetReadiness,
  onMassDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-xl">
      <div className="bg-slate-900 text-white border border-slate-700 shadow-2xl rounded-lg p-2.5 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Count Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-red-600 text-white font-mono font-bold text-xs px-2 py-0.5 rounded">
            {selectedCount}
          </span>
          <span className="font-semibold text-slate-200">
            Unit Terpilih
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onSetReadiness && (
            <>
              <button
                type="button"
                disabled={isLocked || isUpdating}
                onClick={() => onSetReadiness('Ready')}
                className="px-2.5 py-1 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50"
              >
                Set Ready
              </button>
              <button
                type="button"
                disabled={isLocked || isUpdating}
                onClick={() => onSetReadiness('Tidak Ready')}
                className="px-2.5 py-1 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition cursor-pointer disabled:opacity-50"
              >
                Set Tidak Ready
              </button>
            </>
          )}

          <button
            type="button"
            disabled={isLocked || isUpdating}
            onClick={() => onSetStatus('Aktif')}
            className="px-2.5 py-1 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Set Aktif
          </button>

          <button
            type="button"
            disabled={isLocked || isUpdating}
            onClick={() => onSetStatus('Nonaktif')}
            className="px-2.5 py-1 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Set Nonaktif
          </button>

          {isAdmin && (
            <button
              type="button"
              disabled={isLocked || isUpdating}
              onClick={onMassDelete}
              className="px-2.5 py-1 rounded text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition cursor-pointer disabled:opacity-50"
            >
              Hapus
            </button>
          )}

          <button
            type="button"
            onClick={onClearSelection}
            className="px-2 py-1 text-slate-400 hover:text-white rounded text-xs transition cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
