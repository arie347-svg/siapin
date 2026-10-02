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
    <div className="w-full mb-3">
      {/* Simulation / Info Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-t-lg">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Waktu Server: {wibClock} WIB
          </span>
          <span className="text-slate-400 text-xs">
            (Batas Cut-Off Harian: 17:00 WIB)
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isLocked
                ? 'bg-red-950 text-red-300 border border-red-700'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
            }`}
          >
            {isLocked ? 'STATUS: TERKUNCI' : 'STATUS: TERBUKA'}
          </span>
        </div>

        {/* Admin-only Cut-Off Controller */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">
              Kontrol Cut-Off:
            </span>
            <button
              type="button"
              onClick={() => onModeChange('auto')}
              className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer ${
                cutOffMode === 'auto'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Auto 17:00
            </button>
            <button
              type="button"
              onClick={() => onModeChange('unlocked')}
              className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer ${
                cutOffMode === 'unlocked'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Buka
            </button>
            <button
              type="button"
              onClick={() => onModeChange('locked')}
              className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer ${
                cutOffMode === 'locked'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Kunci
            </button>
          </div>
        )}
      </div>

      {/* Persistent Warning Banner when Locked */}
      {isLocked && (
        <div className="bg-red-50 border border-t-0 border-red-200 px-3.5 py-2.5 rounded-b-lg text-xs text-red-800 flex items-center justify-between gap-2">
          <div>
            <strong className="font-bold text-red-900">Perhatian:</strong> Akses pengeditan data telah dikunci karena telah melewati batas cut-off pukul 17:00 WIB. Data saat ini bersifat Read-Only.
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onModeChange('unlocked')}
              className="text-xs font-bold text-red-700 hover:text-red-900 underline shrink-0 cursor-pointer"
            >
              Buka Kunci Akses
            </button>
          )}
        </div>
      )}
    </div>
  );
};
