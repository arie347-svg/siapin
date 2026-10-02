export type Role = 'admin' | 'transporter';

export type TransporterCode = 'TM' | 'RJTM' | 'WSS' | 'SBR' | 'ALL';

export interface UserRecord {
  email: string;
  namaTransporter: string;
  role: Role;
  kodeTransporter: TransporterCode;
  depo?: string; // Karawang, Baros, Cirebon
}

export type TruckStatus = 'Aktif' | 'Nonaktif';
export type ReadinessStatus = 'Ready' | 'Tidak Ready';

export interface TruckRecord {
  id: string;
  transporter: string; // e.g. 'TM', 'RJTM', 'WSS', 'SBR'
  depo: string; // Lokasi Audit: 'Karawang', 'Baros', 'Cirebon'
  nomorPolisi: string; // e.g. 'B 9421 UXT'
  namaSopir: string;
  kapasitas: string; // e.g. '28'
  status: TruckStatus; // Status armada: Aktif / Nonaktif (MANUAL ONLY)
  kesiapan: ReadinessStatus; // Status kesiapan: Ready / Tidak Ready (DIRESET HARIAN)
  keterangan: string; // Catatan/alasan (misal "Bengkel", "Standby", "Siap Jalan")
  terakhirUpdate: string; // e.g. '02 Okt 2026, 14:30 WIB'
  tanggalUpdate?: string; // e.g. '2026-10-02'
}

export interface TruckDailyHistoryEntry {
  kesiapan: ReadinessStatus;
  keterangan: string;
  terakhirUpdate: string;
  status: TruckStatus;
}

export type DailyHistoryMap = Record<string, Record<string, TruckDailyHistoryEntry>>; // dateStr -> truckId/nopol -> entry

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type CutOffMode = 'auto' | 'unlocked' | 'locked';

export interface AppState {
  users: UserRecord[];
  trucks: TruckRecord[];
  activeUser: UserRecord;
  gasUrl: string;
  cutOffMode: CutOffMode;
  lastConfirmedTimes: Record<string, string>; // transporter code -> timestamp
}
