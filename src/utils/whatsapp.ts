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

  let text = `${dateStr}\n`;
  text += `${transporterInfo}\n\n`;

  text += `Total Armada : ${trucks.length} truk\n`;
  text += `Ready : ${readyList.length} truk\n`;
  text += `Tidak Ready : ${tidakReadyList.length} truk`;

  if (tidakReadyList.length > 0) {
    text += `\n\nDAFTAR TRUK TIDAK READY :\n`;
    tidakReadyList.forEach((t, i) => {
      const nopol = t.nomorPolisi || '-';
      const sopir = t.namaSopir ? t.namaSopir : '-';
      const ket = t.keterangan ? t.keterangan : 'Tidak ada keterangan';
      text += `${i + 1}. ${nopol} | ${sopir} | ${ket}\n`;
    });
  }

  return text.trimEnd();
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

export function getWhatsAppAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `whatsapp://send?text=${encoded}`;
}

export function getWhatsAppWebUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/?text=${encoded}`;
}

export function openWhatsAppWithText(message: string): boolean {
  const encoded = encodeURIComponent(message);
  const appUrl = `whatsapp://send?text=${encoded}`;
  const webUrl = `https://wa.me/?text=${encoded}`;

  // Auto-copy message text to clipboard for user convenience
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
  } catch {}

  // 1. Direct Native WhatsApp App Dispatch via link click
  // whatsapp:// is a native OS protocol scheme that opens the WhatsApp app directly
  try {
    const a = document.createElement('a');
    a.href = appUrl;
    // Do NOT set target="_blank" for custom protocol schemes to prevent blank tabs
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    // 2. Fallback to universal web link
    try {
      const a = document.createElement('a');
      a.href = webUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      return false;
    }
  }
}
