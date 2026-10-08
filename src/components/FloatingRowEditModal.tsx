import React, { useState, useEffect, useRef } from 'react';
import { TruckRecord } from '../types';

interface FloatingRowEditModalProps {
  truck: TruckRecord;
  rowState?: {
    nomorPolisi: string;
    namaSopir: string;
    kapasitas: string;
  };
  rowNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (truckId: string, updates: { nomorPolisi: string; namaSopir: string; kapasitas: string }) => void;
}

export const FloatingRowEditModal: React.FC<FloatingRowEditModalProps> = ({
  truck,
  rowState,
  rowNumber,
  isOpen,
  onClose,
  onSave,
}) => {
  const [nomorPolisi, setNomorPolisi] = useState('');
  const [namaSopir, setNamaSopir] = useState('');
  const [kapasitas, setKapasitas] = useState('28');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNomorPolisi(rowState?.nomorPolisi ?? truck.nomorPolisi ?? '');
      setNamaSopir(rowState?.namaSopir ?? truck.namaSopir ?? '');
      setKapasitas(rowState?.kapasitas ?? String(truck.kapasitas || '28').replace(/\D/g, '') || '28');

      // Autofocus first editable input
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, truck, rowState]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKap = kapasitas.replace(/\D/g, '').trim() || '28';
    onSave(truck.id, {
      nomorPolisi: nomorPolisi.trim().toUpperCase(),
      namaSopir: namaSopir.trim().toUpperCase(),
      kapasitas: cleanKap,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="floating-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-xs">
              #{rowNumber}
            </span>
            <div>
              <h3 id="floating-edit-title" className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Edit Data Truk</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {truck.transporter || 'Transporter'}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Depo: <span className="text-slate-200 font-semibold">{truck.depo || 'Karawang'}</span> • Status: <span className="text-slate-200 font-semibold">{truck.status}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/80 transition cursor-pointer"
            title="Tutup (Esc)"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Floating Table Edit Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Preview Baris Mengambang:
            </span>

            {/* Floating Row Table Preview & Direct Input */}
            <div className="overflow-hidden border border-slate-200 rounded-md bg-white shadow-xs">
              <table className="w-full table-fixed text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-1.5 px-2 w-[42%]">No. Polisi</th>
                    <th className="py-1.5 px-2 w-[40%]">Sopir</th>
                    <th className="py-1.5 px-2 w-[18%] text-center">KAP (KL)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* No Polisi Input - Auto UPPER */}
                    <td className="p-1.5 align-top">
                      <input
                        ref={inputRef}
                        type="text"
                        required
                        value={nomorPolisi}
                        onChange={(e) => setNomorPolisi(e.target.value.toUpperCase())}
                        placeholder="B 1234 XX"
                        className="w-full font-mono font-extrabold text-xs sm:text-sm px-2 py-1.5 rounded border border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-900 bg-white uppercase transition"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Format huruf besar (UPPER)</span>
                    </td>

                    {/* Sopir Input - Auto UPPER */}
                    <td className="p-1.5 align-top">
                      <input
                        type="text"
                        value={namaSopir}
                        onChange={(e) => setNamaSopir(e.target.value.toUpperCase())}
                        placeholder="NAMA SOPIR"
                        className="w-full font-bold text-xs sm:text-sm px-2 py-1.5 rounded border border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-800 bg-white uppercase transition"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Format huruf besar (UPPER)</span>
                    </td>

                    {/* KAP Input - Hanya Angka */}
                    <td className="p-1.5 align-top">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={kapasitas}
                        onChange={(e) => setKapasitas(e.target.value.replace(/\D/g, ''))}
                        placeholder="28"
                        className="w-full text-center font-mono font-black text-xs sm:text-sm px-1 py-1.5 rounded border border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 text-slate-800 bg-white transition"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block text-center">Hanya angka</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80">
            <span className="text-blue-600 text-xs shrink-0">ℹ️</span>
            <span>
              Status armada (<strong className="text-slate-700">{truck.status}</strong>) dan kesiapan (<strong className="text-slate-700">{truck.kesiapan || 'Ready'}</strong>) tetap diatur langsung pada tombol tabel utama.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Simpan Perubahan</span>
              <span>✓</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
