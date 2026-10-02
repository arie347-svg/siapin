import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA, hide install button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[11px] shadow-xs cursor-pointer transition ${className}`}
        title="Install SIAPIN ke Layar Utama HP / Desktop"
      >
        <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] shadow-xs cursor-pointer transition ${className}`}
          title="Install SIAPIN ke iPhone / iPad"
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#FF0000] text-white flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Install SIAPIN di iOS</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs px-1 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">Cara memasang ke Layar Utama:</p>
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 font-medium">
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Ketuk tombol <strong>Share / Bagikan</strong> di Safari.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Buka aplikasi langsung dari ikon layar depan tanpa bilah browser.</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
