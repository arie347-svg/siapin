import React from 'react';
import { CutOffMode } from '../types';

interface CutOffBannerProps {
  isLocked: boolean;
  cutOffMode: CutOffMode;
  onModeChange: (mode: CutOffMode) => void;
  wibClock: string;
  isAdmin?: boolean;
}

export const CutOffBanner: React.FC<CutOffBannerProps> = ({
  isLocked,
  cutOffMode,
  onModeChange,
  wibClock,
  isAdmin = false,
}) => {
  return (
    <div className="w-full mb-2">
      {/* Simulation / Info Bar - Compact & Sleek */}
      <div className="bg-slate-900 text-slate-300 text-xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-xl border border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
            {wibClock} WIB
          </span>
          <span className="text-slate-400 text-[11px]">
            Cut-Off: 17:00 WIB
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
              isLocked
                ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
            }`}
          >
            {isLocked ? 'Terkunci' : 'Terbuka'}
          </span>
        </div>

        {/* Admin-only Cut-Off Controller */}
        {isAdmin && (
          <div className="flex items-center gap-1 self-end sm:self-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">
              Kontrol:
            </span>
            <button
              type="button"
              onClick={() => onModeChange('auto')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                cutOffMode === 'auto'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => onModeChange('unlocked')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                cutOffMode === 'unlocked'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Buka
            </button>
            <button
              type="button"
              onClick={() => onModeChange('locked')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                cutOffMode === 'locked'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Kunci
            </button>
          </div>
        )}
      </div>

      {/* Persistent Slim Warning Banner when Locked */}
      {isLocked && (
        <div className="bg-slate-900 border border-slate-800 mt-1 px-3 py-1.5 rounded-lg text-xs text-slate-300 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300">
              Pengisian data terkunci karena melewati batas Cut-Off 17:00 WIB (Mode Hanya Baca).
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onModeChange('unlocked')}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer"
            >
              Buka Akses
            </button>
          )}
        </div>
      )}
    </div>
  );
};
