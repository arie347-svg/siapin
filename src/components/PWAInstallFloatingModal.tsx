import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { TruckSystemLogo } from './LoginScreen';

export const PWAInstallFloatingModal: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // If already running in installed standalone mode, do not show
    if (isInstalled) {
      setIsOpen(false);
      return;
    }

    // Check if dismissed in this session
    const hasDismissed = sessionStorage.getItem('SIAPIN_PWA_PROMPT_DISMISSED');
    if (!hasDismissed) {
      // Show floating popup after brief delay for smooth entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('SIAPIN_PWA_PROMPT_DISMISSED', 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }

    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setIsOpen(false);
      }
    } else {
      // Fallback for browsers that don't emit beforeinstallprompt (e.g. desktop Chrome already promptable or Firefox)
      setShowIOSSteps(true);
    }
  };

  if (!isOpen || isInstalled) return null;

  return (
    <div className="fixed bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-auto sm:right-5 z-50 max-w-md sm:w-96 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80">
        
        {/* Header with App Logo */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-md">
            <TruckSystemLogo className="w-6 h-6 text-[#FF0000]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Instal SIAPIN di Perangkat
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white text-xs p-1"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Akses cepat langsung dari layar utama tanpa membuka browser.
            </p>
          </div>
        </div>

        {/* iOS Step Guide if requested */}
        {showIOSSteps && (
          <div className="mt-3 p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 text-[11px] text-slate-200 space-y-1">
            <p className="font-semibold text-emerald-400">Petunjuk Pemasangan:</p>
            <p>1. Ketuk tombol <strong>Share / Bagikan</strong> (ikon kotak panah ke atas).</p>
            <p>2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-2">
          {/* Button: Tetap di Browser */}
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 text-xs font-semibold transition cursor-pointer text-center border border-slate-700"
          >
            Tetap di Browser
          </button>

          {/* Button: Instal Aplikasi */}
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 rounded-xl bg-[#FF0000] hover:bg-[#D90000] active:bg-[#B30000] text-white text-xs font-bold transition shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Instal Aplikasi</span>
          </button>
        </div>

      </div>
    </div>
  );
};
