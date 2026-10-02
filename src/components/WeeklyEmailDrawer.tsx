import React, { useState } from 'react';
import { TruckRecord, UserRecord } from '../types';
import { TRANSPORTER_NAMES } from '../services/mockData';
import { generateMasterAdminWhatsAppMessage, openWhatsAppWithText } from '../utils/whatsapp';

interface WeeklyEmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trucks: TruckRecord[];
  users: UserRecord[];
  lastConfirmedTimes: Record<string, string>;
}

export const WeeklyEmailDrawer: React.FC<WeeklyEmailDrawerProps> = ({
  isOpen,
  onClose,
  trucks,
  users,
  lastConfirmedTimes,
}) => {
  const [copiedType, setCopiedType] = useState<'text' | null>(null);

  if (!isOpen) return null;

  const transporterCodes = ['TM', 'RJTM', 'WSS', 'SBR'];
  const summaryData = transporterCodes.map((code) => {
    const vendorTrucks = trucks.filter((t) => t.transporter === code);
    const total = vendorTrucks.length;
    const ready = vendorTrucks.filter((t) => t.kesiapan === 'Ready').length;
    const tidakReady = total - ready;
    const readiness = total > 0 ? Math.round((ready / total) * 100) : 0;
    const lastConfirm = lastConfirmedTimes[code] || 'Belum dikonfirmasi';
    const fullName = TRANSPORTER_NAMES[code] || code;

    return {
      code,
      fullName,
      total,
      ready,
      tidakReady,
      readiness,
      lastConfirm,
    };
  });

  const grandTotal = summaryData.reduce((acc, s) => acc + s.total, 0);
  const grandReady = summaryData.reduce((acc, s) => acc + s.ready, 0);
  const grandTidakReady = summaryData.reduce((acc, s) => acc + s.tidakReady, 0);
  const grandReadiness = grandTotal > 0 ? Math.round((grandReady / grandTotal) * 100) : 0;

  const generatePlainText = () => {
    let text = `REKAP KESIAPAN ARMADA MD TO DEALER\n`;
    text += `Waktu: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    text += `Total Armada: ${grandTotal} | Ready: ${grandReady} (${grandReadiness}%) | Tidak Ready: ${grandTidakReady}\n\n`;

    summaryData.forEach((s) => {
      text += `[${s.code}] ${s.fullName}\n`;
      text += `Total: ${s.total} | Ready: ${s.ready} | Tidak Ready: ${s.tidakReady} | Kesiapan: ${s.readiness}%\n`;
      text += `Terakhir Update: ${s.lastConfirm}\n\n`;
    });

    return text;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatePlainText());
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      alert('Gagal menyalin teks');
    }
  };

  const handleSendWhatsApp = () => {
    const msg = generateMasterAdminWhatsAppMessage(trucks, TRANSPORTER_NAMES);
    openWhatsAppWithText(msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 mb-1">
              REKAP OPERASIONAL
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Rekapitulasi Kesiapan Seluruh Armada
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Executive KPI ribbon */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Total Armada</span>
              <span className="text-lg font-bold text-slate-900">{grandTotal}</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <span className="block text-[10px] uppercase font-bold text-blue-700">Unit Ready</span>
              <span className="text-lg font-bold text-blue-800">{grandReady}</span>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <span className="block text-[10px] uppercase font-bold text-red-700">Tidak Ready</span>
              <span className="text-lg font-bold text-red-800">{grandTidakReady}</span>
            </div>
            <div className="p-3 bg-slate-900 text-white rounded-md">
              <span className="block text-[10px] uppercase font-bold text-slate-300">% Kesiapan</span>
              <span className="text-lg font-bold text-white">{grandReadiness}%</span>
            </div>
          </div>

          {/* Transporter Table */}
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Transporter</th>
                  <th className="py-2.5 px-2 text-center">Total</th>
                  <th className="py-2.5 px-2 text-center text-blue-700">Ready</th>
                  <th className="py-2.5 px-2 text-center text-red-600">Tidak</th>
                  <th className="py-2.5 px-2 text-center">Rasio</th>
                  <th className="py-2.5 px-3 text-right">Konfirmasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryData.map((s) => (
                  <tr key={s.code} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {s.fullName} ({s.code})
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold">{s.total}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-blue-700">{s.ready}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-red-600">{s.tidakReady}</td>
                    <td className="py-2.5 px-2 text-center font-bold">{s.readiness}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                      {s.lastConfirm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plaintext preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Pratinjau Format Pesan
            </label>
            <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-md max-h-48 overflow-y-auto leading-relaxed">
              {generatePlainText()}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {copiedType === 'text' ? '✓ Teks Tersalin' : 'Salin Teks'}
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Kirim ke WhatsApp
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
