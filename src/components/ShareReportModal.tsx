import React, { useState, useMemo } from 'react';
import { TruckRecord } from '../types';
import { TRANSPORTER_NAMES } from '../services/mockData';
import { formatWIBDateIndo, getWIBDateString } from '../utils/timeUtils';
import { openWhatsAppWithText } from '../utils/whatsapp';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trucks: TruckRecord[];
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export type ExportFormat = 'excel' | 'pdf' | 'whatsapp';

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  trucks,
  onToast,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterDepo, setFilterDepo] = useState<string>('ALL');
  const [filterTransporter, setFilterTransporter] = useState<string>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter trucks dynamically based on selected criteria
  const filteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      // 1. Transporter filter
      if (filterTransporter !== 'ALL' && t.transporter !== filterTransporter) {
        return false;
      }
      // 2. Depo filter
      if (filterDepo !== 'ALL') {
        const truckDepo = (t.depo || 'Karawang').toLowerCase();
        if (truckDepo !== filterDepo.toLowerCase()) return false;
      }
      // 3. Month filter
      if (filterMonth !== 'ALL') {
        // format is YYYY-MM
        const updateDate = t.terakhirUpdate || getWIBDateString();
        if (!updateDate.startsWith(filterMonth)) {
          // If truck doesn't match the specific month
          return false;
        }
      }
      return true;
    });
  }, [trucks, filterTransporter, filterDepo, filterMonth]);

  const readyCount = filteredTrucks.filter((t) => (t.kesiapan || 'Ready') === 'Ready').length;
  const tidakReadyCount = filteredTrucks.length - readyCount;
  const totalKapasitas = filteredTrucks.reduce((acc, t) => acc + (parseInt(t.kapasitas, 10) || 0), 0);

  if (!isOpen) return null;

  // Generate CSV / Excel Content
  const generateCsvData = () => {
    const headers = [
      'No',
      'Tanggal Laporan',
      'Kode Transporter',
      'Nama Transporter',
      'Depo',
      'Nomor Polisi',
      'Nama Sopir',
      'Kapasitas (Unit)',
      'Status Operasional',
      'Kesiapan Armada',
      'Keterangan / Alasan',
    ];

    const todayStr = getWIBDateString();
    const rows = filteredTrucks.map((t, idx) => [
      idx + 1,
      t.terakhirUpdate ? t.terakhirUpdate.slice(0, 10) : todayStr,
      t.transporter,
      `"${TRANSPORTER_NAMES[t.transporter] || t.transporter}"`,
      t.depo || 'Karawang',
      t.nomorPolisi,
      `"${t.namaSopir || '-'}"`,
      t.kapasitas,
      t.status,
      t.kesiapan || 'Ready',
      `"${(t.keterangan || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  // Generate WhatsApp text content
  const generateWhatsAppContent = () => {
    const dateFormatted = formatWIBDateIndo();
    const transporterLabel = filterTransporter === 'ALL' ? 'Semua Transporter' : (TRANSPORTER_NAMES[filterTransporter] || filterTransporter);
    const depoLabel = filterDepo === 'ALL' ? 'Semua Depo' : `Depo ${filterDepo}`;

    let text = `*SIAPIN - LAPORAN KESIAPAN ARMADA MD TO DEALER*\n`;
    text += `*Tanggal:* ${dateFormatted}\n`;
    text += `*Transporter:* ${transporterLabel}\n`;
    text += `*Lokasi:* ${depoLabel}\n\n`;

    text += `*RINGKASAN EKSEKUTIF:*\n`;
    text += `• Total Armada: ${filteredTrucks.length} Unit\n`;
    text += `• Ready: ${readyCount} Unit (${filteredTrucks.length > 0 ? Math.round((readyCount / filteredTrucks.length) * 100) : 0}%)\n`;
    text += `• Tidak Ready: ${tidakReadyCount} Unit\n`;
    text += `• Total Kapasitas Angkut: ${totalKapasitas} Unit Motor\n\n`;

    const tidakReadyList = filteredTrucks.filter((t) => t.kesiapan === 'Tidak Ready');
    text += `*DAFTAR ARMADA TIDAK READY (${tidakReadyList.length} UNIT):*\n`;
    if (tidakReadyList.length === 0) {
      text += `-(Semua armada berstatus Ready)-\n`;
    } else {
      tidakReadyList.forEach((t, i) => {
        const nopol = t.nomorPolisi || '-';
        const sopir = t.namaSopir || '-';
        const ket = t.keterangan ? t.keterangan : 'Tidak ada keterangan';
        text += `${i + 1}. [${t.transporter}] ${nopol} | ${sopir} | ${ket}\n`;
      });
    }

    text += `\n_Laporan resmi disebarkan melalui Sistem SIAPIN MD to Dealer._`;
    return text;
  };

  // Print to PDF document
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onToast?.('Gagal membuka jendela cetak. Periksa izin pop-up browser.', 'error');
      return;
    }

    const dateFormatted = formatWIBDateIndo();
    const transporterLabel = filterTransporter === 'ALL' ? 'Semua Transporter' : (TRANSPORTER_NAMES[filterTransporter] || filterTransporter);
    const depoLabel = filterDepo === 'ALL' ? 'Semua Depo' : `Depo ${filterDepo}`;
    const pct = filteredTrucks.length > 0 ? Math.round((readyCount / filteredTrucks.length) * 100) : 0;

    const rowsHtml = filteredTrucks.map((t, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: bold;">${t.nomorPolisi}</td>
        <td style="padding: 6px 8px;">${t.namaSopir || '-'}</td>
        <td style="padding: 6px 8px; text-align: center;">${t.transporter}</td>
        <td style="padding: 6px 8px; text-align: center;">${t.depo || 'Karawang'}</td>
        <td style="padding: 6px 8px; text-align: center;">${t.kapasitas}</td>
        <td style="padding: 6px 8px; text-align: center;">${t.status}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${t.kesiapan === 'Ready' ? '#059669' : '#dc2626'};">
          ${t.kesiapan || 'Ready'}
        </td>
        <td style="padding: 6px 8px; color: #475569;">${t.keterangan || '-'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Kesiapan Armada - SIAPIN</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 24px; padding: 0; }
            .header { border-bottom: 2px solid #E50914; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: 900; color: #E50914; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; font-weight: 700; text-transform: uppercase; }
            .meta { font-size: 11px; color: #334155; margin-bottom: 16px; }
            .kpi-container { display: flex; gap: 12px; margin-bottom: 20px; }
            .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
            .kpi-num { font-size: 18px; font-weight: 800; color: #0f172a; }
            .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; padding: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #334155; border-bottom: 2px solid #cbd5e1; }
            @media print {
              body { margin: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">SIAPIN - LAPORAN KESIAPAN ARMADA</h1>
              <div class="subtitle">Sistem Pemantauan Armada Distribusi MD to Dealer</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              Dicetak: ${dateFormatted}
            </div>
          </div>

          <div class="meta">
            <strong>Parameter Filter:</strong> Transporter: <u>${transporterLabel}</u> | Lokasi: <u>${depoLabel}</u> | Bulan: <u>${filterMonth}</u>
          </div>

          <div class="kpi-container">
            <div class="kpi-box">
              <div class="kpi-num">${filteredTrucks.length} <span style="font-size: 11px;">Unit</span></div>
              <div class="kpi-label">Total Armada</div>
            </div>
            <div class="kpi-box" style="border-left: 3px solid #059669;">
              <div class="kpi-num" style="color: #059669;">${readyCount} <span style="font-size: 11px;">(${pct}%)</span></div>
              <div class="kpi-label">Armada Ready</div>
            </div>
            <div class="kpi-box" style="border-left: 3px solid #dc2626;">
              <div class="kpi-num" style="color: #dc2626;">${tidakReadyCount} <span style="font-size: 11px;">Unit</span></div>
              <div class="kpi-label">Tidak Ready</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-num">${totalKapasitas} <span style="font-size: 11px;">Unit Motor</span></div>
              <div class="kpi-label">Total Kapasitas</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style="text-align: left;">No. Polisi</th>
                <th style="text-align: left;">Sopir</th>
                <th>Transp</th>
                <th>Depo</th>
                <th>Kap</th>
                <th>Status</th>
                <th>Kesiapan</th>
                <th style="text-align: left;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
            Dokumen ini di-generate secara otomatis oleh Sistem SIAPIN Logistics Fleet • PT Daya Adicipta Motora
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Execution Handler
  const handleExecuteShare = async () => {
    setIsProcessing(true);
    const fileName = `Laporan_Armada_${filterTransporter}_${filterDepo}_${getWIBDateString()}`;

    try {
      if (selectedFormat === 'whatsapp') {
        const waText = generateWhatsAppContent();
        openWhatsAppWithText(waText);
        onToast?.('Mengarahkan ke WhatsApp...', 'success');
        onClose();
        return;
      }

      if (selectedFormat === 'pdf') {
        handlePrintPdf();
        onToast?.('Jendela pratinjau cetak PDF berhasil dibuka!', 'success');
        onClose();
        return;
      }

      if (selectedFormat === 'excel') {
        const csvContent = generateCsvData();
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `${fileName}.csv`, { type: 'text/csv' });

        // If Web Share API supports file sharing (Mobile phones / supported browsers)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Laporan Kesiapan Armada SIAPIN',
              text: `Laporan Armada SIAPIN - ${filterTransporter} (${filterDepo})`,
            });
            onToast?.('Laporan berhasil dibagikan!', 'success');
            onClose();
            return;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') {
              setIsProcessing(false);
              return;
            }
          }
        }

        // Fallback: Direct Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onToast?.('File spreadsheet (.csv) berhasil diunduh!', 'success');
        onClose();
      }
    } catch (err: any) {
      onToast?.(`Gagal membagikan: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/90 text-white flex items-center justify-center text-sm shadow-md">
              📤
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Bagikan Laporan Armada
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                Pilih filter dan format dokumen yang diinginkan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs select-none">
          
          {/* STEP 1: PILIH KONDISI FILTER */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span>🔍</span> 1. Filter Kondisi Data
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Masing-masing filter mendukung ALL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Filter Bulan */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                  Bulan
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:border-red-600 text-xs"
                >
                  <option value="ALL">Semua Bulan (ALL)</option>
                  <option value="2026-10">Oktober 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-08">Agustus 2026</option>
                  <option value="2026-07">Juli 2026</option>
                </select>
              </div>

              {/* Filter Depo */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                  Depo Lokasi
                </label>
                <select
                  value={filterDepo}
                  onChange={(e) => setFilterDepo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:border-red-600 text-xs"
                >
                  <option value="ALL">Semua Depo (ALL)</option>
                  <option value="Karawang">Karawang</option>
                  <option value="Baros">Baros</option>
                  <option value="Cirebon">Cirebon</option>
                </select>
              </div>

              {/* Filter Transporter */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                  Transporter
                </label>
                <select
                  value={filterTransporter}
                  onChange={(e) => setFilterTransporter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:border-red-600 text-xs"
                >
                  <option value="ALL">Semua Transporter (ALL)</option>
                  <option value="TM">TM</option>
                  <option value="WSS">WSS</option>
                  <option value="RJTM">RJTM</option>
                  <option value="SBR">SBR</option>
                </select>
              </div>
            </div>

            {/* LIVE PREVIEW RINGKASAN DATA */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-slate-800 text-[11px]">
                  Terpilih: {filteredTrucks.length} Unit Armada
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready: {readyCount}
                </span>
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Kendala: {tidakReadyCount}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 2: PILIH BENTUK FILE */}
          <div className="space-y-2">
            <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span>📄</span> 2. Pilih Bentuk File
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Excel / Spreadsheet */}
              <button
                type="button"
                onClick={() => setSelectedFormat('excel')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  selectedFormat === 'excel'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-lg">📊</span>
                  {selectedFormat === 'excel' && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-xs">Excel / CSV</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tabel data mentah lengkap</div>
                </div>
              </button>

              {/* Option 2: PDF Document */}
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  selectedFormat === 'pdf'
                    ? 'border-red-600 bg-red-50/70 shadow-sm ring-1 ring-red-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-lg">📑</span>
                  {selectedFormat === 'pdf' && (
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-xs">Dokumen PDF</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Format cetak resmi SIAPIN</div>
                </div>
              </button>

              {/* Option 3: WhatsApp Ringkasan */}
              <button
                type="button"
                onClick={() => setSelectedFormat('whatsapp')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  selectedFormat === 'whatsapp'
                    ? 'border-green-600 bg-green-50/70 shadow-sm ring-1 ring-green-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-lg">💬</span>
                  {selectedFormat === 'whatsapp' && (
                    <span className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-xs">Teks WhatsApp</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ringkasan cepat koordinasi</div>
                </div>
              </button>
            </div>
          </div>

          {/* Info Format terpilih */}
          <div className="bg-slate-100/90 rounded-xl p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
            <span className="text-blue-600 mt-0.5 text-xs">ℹ️</span>
            <div>
              {selectedFormat === 'excel' && (
                <span>File spreadsheet (.csv) akan langsung dibagikan melalui Web Share API atau diunduh ke perangkat Anda.</span>
              )}
              {selectedFormat === 'pdf' && (
                <span>Membuka jendela cetak / simpan sebagai PDF beresolusi tinggi dengan kop resmi dan tabel data.</span>
              )}
              {selectedFormat === 'whatsapp' && (
                <span>Otomatis menyusun teks ringkasan rapi dan membuka aplikasi WhatsApp / WhatsApp Web.</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isProcessing || filteredTrucks.length === 0}
            onClick={handleExecuteShare}
            className="flex-1 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-red-600 to-[#E50914] hover:from-red-700 hover:to-red-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Eksekusi Bagikan ({filteredTrucks.length} Unit)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
