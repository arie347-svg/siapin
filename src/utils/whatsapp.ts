import { TruckRecord } from '../types';

export function generateWhatsAppMessage(
  transporterName: string,
  transporterCode: string,
  trucks: TruckRecord[]
): string {
  // Sort A-Z by namaSopir as requested
  const sorted = [...trucks].sort((a, b) => {
    const nameA = (a.namaSopir || '').trim().toLowerCase();
    const nameB = (b.namaSopir || '').trim().toLowerCase();
    if (!nameA && !nameB) return a.nomorPolisi.localeCompare(b.nomorPolisi);
    if (!nameA) return 1;
    if (!nameB) return -1;
    return nameA.localeCompare(nameB);
  });

  const readyList = sorted.filter((t) => t.kesiapan === 'Ready');
  const tidakReadyList = sorted.filter((t) => t.kesiapan === 'Tidak Ready');

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

  let text = `*SIAPIN - KONFIRMASI KESIAPAN ARMADA MD TO DEALER*\n`;
  text += `*Transporter:* ${transporterName} (${transporterCode})\n`;
  text += `*Waktu Konfirmasi:* ${dateStr}, ${timeStr}\n\n`;

  text += `*RINGKASAN KESIAPAN:*\n`;
  text += `• Total Armada: ${sorted.length} Unit\n`;
  text += `• Ready: ${readyList.length} Unit\n`;
  text += `• Tidak Ready: ${tidakReadyList.length} Unit\n\n`;

  text += `*DAFTAR UNIT READY (${readyList.length} UNIT):*\n`;
  if (readyList.length === 0) {
    text += `-(Tidak ada unit yang berstatus Ready)-\n`;
  } else {
    readyList.forEach((t, i) => {
      const sopir = t.namaSopir ? t.namaSopir : '-';
      const depo = t.depo ? `[${t.depo}] ` : '';
      const ket = t.keterangan ? ` [Ket: ${t.keterangan}]` : '';
      text += `${i + 1}. ${depo}${t.nomorPolisi} | ${sopir} | Kap ${t.kapasitas}${ket}\n`;
    });
  }

  text += `\n*DAFTAR UNIT TIDAK READY (${tidakReadyList.length} UNIT):*\n`;
  if (tidakReadyList.length === 0) {
    text += `-(Semua unit berstatus Ready)-\n`;
  } else {
    tidakReadyList.forEach((t, i) => {
      const sopir = t.namaSopir ? t.namaSopir : '-';
      const depo = t.depo ? `[${t.depo}] ` : '';
      const ket = t.keterangan ? ` [Alasan: ${t.keterangan}]` : ' [Alasan: Tidak Ready]';
      text += `${i + 1}. ${depo}${t.nomorPolisi} | ${sopir} | Kap ${t.kapasitas}${ket}\n`;
    });
  }

  text += `\n_Laporan dikonfirmasi melalui Sistem Kesiapan Armada MD to Dealer._`;
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
