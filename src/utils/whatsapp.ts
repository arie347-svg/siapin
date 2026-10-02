import { TruckRecord } from '../types';
import { getWIBDate } from './timeUtils';

export function generateWhatsAppMessage(
  transporterName: string,
  transporterCode: string,
  trucks: TruckRecord[],
  depo?: string
): string {
  const readyList = trucks.filter((t) => (t.kesiapan || 'Ready') === 'Ready');
  const tidakReadyList = trucks.filter((t) => t.kesiapan === 'Tidak Ready');

  const now = getWIBDate();
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const d = String(now.getDate()).padStart(2, '0');
  const m = months[now.getMonth()];
  const y = now.getFullYear();
  const dateStr = `${d} ${m} ${y}`;

  const transporterInfo = depo && depo !== 'ALL'
    ? `${transporterCode} (${depo})`
    : transporterCode;

  let text = `Tanggal : ${dateStr}\n`;
  text += `Transporter : ${transporterInfo}\n\n`;

  text += `RINGKASAN KESIAPAN TRUK :\n`;
  text += `• Total Armada: ${trucks.length} Unit\n`;
  text += `• Ready: ${readyList.length} Unit\n`;
  text += `• Tidak Ready: ${tidakReadyList.length} Unit\n\n`;

  text += `DAFTAR TRUK TIDAK READY :\n`;
  if (tidakReadyList.length === 0) {
    text += `-(Semua unit berstatus Ready)-`;
  } else {
    tidakReadyList.forEach((t, i) => {
      const nopol = t.nomorPolisi || '-';
      const sopir = t.namaSopir ? t.namaSopir : '-';
      const ket = t.keterangan ? t.keterangan : 'Tidak ada keterangan';
      text += `${i + 1}. ${nopol} | ${sopir} | ${ket}\n`;
    });
  }

  return text;
}

export function generateMasterAdminWhatsAppMessage(
  trucks: TruckRecord[],
  transporterNames: Record<string, string>
): string {
  const codes = ['TM', 'RJTM', 'WSS', 'SBR'];
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr =
    now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

  const totalAll = trucks.length;
  const readyAll = trucks.filter((t) => t.kesiapan === 'Ready').length;
  const tidakReadyAll = totalAll - readyAll;
  const pct = totalAll > 0 ? Math.round((readyAll / totalAll) * 100) : 0;

  let text = `*SIAPIN - REKAP KESIAPAN KESELURUHAN ARMADA (MD TO DEALER)*\n`;
  text += `*Waktu Penarikan:* ${dateStr}, ${timeStr}\n`;
  text += `*Total Armada:* ${totalAll} Unit | *Ready:* ${readyAll} (${pct}%) | *Tidak Ready:* ${tidakReadyAll}\n\n`;

  codes.forEach((code) => {
    const vTrucks = trucks.filter((t) => t.transporter === code);
    const vReady = vTrucks.filter((t) => t.kesiapan === 'Ready');
    const vTidak = vTrucks.filter((t) => t.kesiapan === 'Tidak Ready');
    const vName = transporterNames[code] || code;

    text += `*${vName} (${code})*\n`;
    text += `Total: ${vTrucks.length} | Ready: ${vReady.length} | Tidak Ready: ${vTidak.length}\n`;
    if (vTidak.length > 0) {
      text += `Unit Tidak Ready:\n`;
      vTidak.forEach((t, idx) => {
        const sopir = t.namaSopir || '-';
        const ket = t.keterangan ? ` (${t.keterangan})` : '';
        text += `  ${idx + 1}. ${t.nomorPolisi} - ${sopir}${ket}\n`;
      });
    }
    text += `\n`;
  });

  text += `_Sistem Distribusi Logistik MD to Dealer_`;
  return text;
}

export function openWhatsAppWithText(message: string): void {
  const encoded = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  const opened = window.open(url, '_blank');
  if (!opened || opened.closed || typeof opened.closed === 'undefined') {
    window.location.href = url;
  }
}
