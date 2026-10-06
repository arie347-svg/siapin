import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// AppSheet Credentials (configured server-side)
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '8b71fdfd-7dcb-4c5f-944f-8491406b0c5a';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-X58uw-q1bpM-xtN9s-cz1XH-FYbdl-1B2g3-lNZ0H-AGHoc';

// Ignore DocId= values from environment, as DocId is a spreadsheet ID, not a table name
let currentTableName = (process.env.APPSHEET_TABLE && !process.env.APPSHEET_TABLE.startsWith('DocId=') && process.env.APPSHEET_TABLE !== 'MD to Dealer')
  ? process.env.APPSHEET_TABLE
  : 'MD to Dealer 2';

function normalizeTransporterCode(val: string): string {
  const upper = String(val || '').trim().toUpperCase();
  if (upper.includes('TUNAS MUDA') || upper === 'TM') return 'TM';
  if (upper.includes('RODA JAGAT') || upper.includes('TUNAS MAS') || upper.includes('RIAU JAYA') || upper === 'RJTM') return 'RJTM';
  if (upper.includes('WAHANA') || upper.includes('SUMBER SAKTI') || upper === 'WSS') return 'WSS';
  if (upper.includes('SARI BUMI') || upper === 'SBR') return 'SBR';
  return val.trim() || 'TM';
}

function getAppSheetTransporterName(code: string): string {
  const upper = String(code || '').trim().toUpperCase();
  if (upper === 'TM' || upper.includes('TUNAS MUDA')) return 'PT. Tunas Muda';
  if (upper === 'RJTM' || upper.includes('RODA JAGAT') || upper.includes('TUNAS MAS')) return 'PT. Roda Jagat Tunas Mas';
  if (upper === 'WSS' || upper.includes('WAHANA')) return 'PT. Wahana Sumber Sakti';
  if (upper === 'SBR' || upper.includes('SARI BUMI')) return 'PT. Sari Bumi Raya';
  return code;
}

function getDepoAbbreviation(depo: string): string {
  const d = String(depo || '').trim().toLowerCase();
  if (d.includes('baros') || d === 'brs') return 'BRS';
  if (d.includes('cirebon') || d === 'crb') return 'CRB';
  return 'KRW';
}

function extractDriverCoreName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(pt\.?|tunas|muda|roda|jagat|mas|wahana|sumber|sakti|sari|bumi|raya)\b/gi, ' ')
    .replace(/\b(tm|rjtm|wss|sbr)\b/gi, ' ')
    .replace(/\b(karawang|baros|cirebon|krw|brs|crb|md-?d|md)\b/gi, ' ')
    .replace(/\b[a-z]\b/gi, ' ')
    .replace(/[^a-z0-9]/gi, ' ')
    .trim()
    .split(/\s+/)[0] || '';
}

function formatDriverNameStandard(rawName: string, transporter: string, depo?: string): string {
  if (!rawName || !rawName.trim()) return '';
  const transCode = normalizeTransporterCode(transporter);
  const depoAbbr = getDepoAbbreviation(depo || '');
  const core = extractDriverCoreName(rawName);
  if (!core) return '';

  return `${core.toUpperCase()} ${transCode} ${depoAbbr}`;
}

// In-memory cache for Data Truk 2 to avoid redundant round-trips
let dataTrukCache: { rows: any[]; timestamp: number } | null = null;
const DATA_TRUK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

async function getCachedDataTrukRows(): Promise<any[]> {
  const now = Date.now();
  if (dataTrukCache && now - dataTrukCache.timestamp < DATA_TRUK_CACHE_TTL_MS) {
    return dataTrukCache.rows;
  }
  const raw = await callAppSheetApi('Find', [], 'Data Truk 2');
  if (Array.isArray(raw)) {
    dataTrukCache = { rows: raw, timestamp: now };
    return raw;
  }
  return dataTrukCache ? dataTrukCache.rows : [];
}

// Update driver in master table "Data Truk 2" (DocId=1zE6zs-UQcKMJN0AlNBMNWPKKjzEIRLKb)
async function syncDriverToDataTruk2(
  driverNameFormatted: string,
  originalName?: string,
  transporter?: string,
  status: string = 'Aktif'
) {
  if (!driverNameFormatted || !driverNameFormatted.trim()) return;
  try {
    const rawRows = await getCachedDataTrukRows();
    if (!Array.isArray(rawRows)) return;

    const core = extractDriverCoreName(driverNameFormatted);
    if (!core) return;
    const transCode = transporter ? normalizeTransporterCode(transporter).toLowerCase() : '';

    // Find row in Data Truk 2 matching core name AND STRICTLY Rute === 'MD-D' (NEVER overwrite non-MD-D such as AHM-MD!)
    const matched = rawRows.find((r: any) => {
      const route = String(r['Rute'] || '').trim().toUpperCase();
      if (route !== 'MD-D') return false; // PROTEKSI: Abaikan rute selain MD-D

      const existingName = String(r['Nama Driver'] || '');
      if (!existingName) return false;
      const existingCore = extractDriverCoreName(existingName);
      if (existingCore === core) {
        const lower = existingName.toLowerCase();
        if (transCode && (lower.includes(transCode) || lower.includes('wss') || lower.includes('tm') || lower.includes('rjtm') || lower.includes('sbr'))) {
          return lower.includes(transCode);
        }
        return true;
      }
      return false;
    });

    const targetStatus = status || 'Aktif';
    if (matched && matched.ID) {
      const needsNameUpdate = matched['Nama Driver'] !== driverNameFormatted;
      const needsStatusUpdate = matched['Status'] !== targetStatus;
      const needsRouteUpdate = matched['Rute'] !== 'MD-D';

      if (needsNameUpdate || needsStatusUpdate || needsRouteUpdate) {
        // Edit existing driver record strictly within MD-D route
        await callAppSheetApi('Edit', [{
          'ID': matched.ID,
          'Nama Driver': driverNameFormatted,
          'Status': targetStatus,
          'Rute': 'MD-D',
        }], 'Data Truk 2');
        matched['Nama Driver'] = driverNameFormatted;
        matched['Status'] = targetStatus;
        matched['Rute'] = 'MD-D';
      }
    } else {
      // Jika tidak ditemukan di rute MD-D, BUAT BARU khusus dengan rute MD-D
      const newDriverId = Math.random().toString(36).substring(2, 10);
      const newRow = {
        'ID': newDriverId,
        'Nama Driver': driverNameFormatted,
        'Status': targetStatus,
        'Rute': 'MD-D',
      };
      await callAppSheetApi('Add', [newRow], 'Data Truk 2');
      rawRows.push(newRow);
    }
  } catch (err: any) {
    console.warn('Sync to Data Truk 2 note:', err.message);
  }
}

// Ultra-fast batch synchronization to Data Truk 2 (1 single batch call instead of N calls)
async function batchSyncDriversToDataTruk2(
  trucks: Array<{ namaSopir: string; transporter: string; depo?: string; status?: string }>
) {
  try {
    const rawRows = await getCachedDataTrukRows();
    if (!Array.isArray(rawRows)) return;

    const edits: any[] = [];
    const adds: any[] = [];
    const seenCores = new Set<string>();

    for (const t of trucks) {
      if (!t || !t.namaSopir || !t.transporter) continue;
      const formattedSopir = formatDriverNameStandard(t.namaSopir, t.transporter, t.depo);
      if (!formattedSopir) continue;
      const core = extractDriverCoreName(formattedSopir);
      if (!core || seenCores.has(core)) continue;
      seenCores.add(core);

      const transCode = t.transporter ? normalizeTransporterCode(t.transporter).toLowerCase() : '';
      const targetStatus = t.status || 'Aktif';

      // Find strictly with Rute === 'MD-D'
      const matched = rawRows.find((r: any) => {
        const route = String(r['Rute'] || '').trim().toUpperCase();
        if (route !== 'MD-D') return false;

        const existingName = String(r['Nama Driver'] || '');
        if (!existingName) return false;
        const existingCore = extractDriverCoreName(existingName);
        if (existingCore === core) {
          const lower = existingName.toLowerCase();
          if (transCode && (lower.includes(transCode) || lower.includes('wss') || lower.includes('tm') || lower.includes('rjtm') || lower.includes('sbr'))) {
            return lower.includes(transCode);
          }
          return true;
        }
        return false;
      });

      if (matched && matched.ID) {
        const needsName = matched['Nama Driver'] !== formattedSopir;
        const needsStatus = matched['Status'] !== targetStatus;
        const needsRoute = matched['Rute'] !== 'MD-D';
        if (needsName || needsStatus || needsRoute) {
          edits.push({
            'ID': matched.ID,
            'Nama Driver': formattedSopir,
            'Status': targetStatus,
            'Rute': 'MD-D',
          });
          matched['Nama Driver'] = formattedSopir;
          matched['Status'] = targetStatus;
          matched['Rute'] = 'MD-D';
        }
      } else {
        const newId = Math.random().toString(36).substring(2, 10);
        const newRow = {
          'ID': newId,
          'Nama Driver': formattedSopir,
          'Status': targetStatus,
          'Rute': 'MD-D',
        };
        adds.push(newRow);
        rawRows.push(newRow);
      }
    }

    if (edits.length > 0) {
      await callAppSheetApi('Edit', edits, 'Data Truk 2');
    }
    if (adds.length > 0) {
      await callAppSheetApi('Add', adds, 'Data Truk 2');
    }
  } catch (err: any) {
    console.warn('Batch sync to Data Truk 2 note:', err.message);
  }
}

function getAppSheetUrl(tableName?: string) {
  const target = (tableName || currentTableName).trim();
  return `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(target)}/Action`;
}

async function callAppSheetApi(action: string, rows: Record<string, any>[] = [], customTable?: string) {
  const targetTable = (customTable || currentTableName).trim();
  const url = getAppSheetUrl(targetTable);

  const payload = {
    Action: action,
    Properties: {
      Locale: 'id-ID',
      Timezone: 'Asia/Jakarta',
    },
    Rows: rows,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { rawText: text };
  }

  if (!response.ok) {
    const errorDetail = data?.detail || data?.message || text || `HTTP ${response.status}`;
    const err: any = new Error(errorDetail);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Admin Authentication Endpoint (Server-Side Protected)
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  const VALID_ADMIN_EMAIL = 'ari.imam@daya-motora.com';
  const VALID_ADMIN_PASS = 'mustika123';

  if (
    (cleanEmail === VALID_ADMIN_EMAIL || cleanEmail === 'admin.md@logistik.id' || cleanEmail === 'admin@daya-motora.com') &&
    cleanPassword === VALID_ADMIN_PASS
  ) {
    return res.json({
      success: true,
      user: {
        email: cleanEmail,
        namaTransporter: 'Ari Imam (Admin Distribusi)',
        role: 'admin',
        kodeTransporter: 'ALL',
        depo: 'Karawang',
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Kombinasi email dan kata sandi admin salah.',
  });
});

// 1. Status Check
app.get('/api/appsheet/status', (_req: Request, res: Response) => {
  res.json({
    configured: Boolean(APPSHEET_APP_ID && APPSHEET_ACCESS_KEY),
    appId: APPSHEET_APP_ID ? `${APPSHEET_APP_ID.substring(0, 8)}...` : '',
    tableName: currentTableName,
  });
});

// Update table name
app.post('/api/appsheet/set-table', (req: Request, res: Response) => {
  const { tableName } = req.body;
  if (tableName && typeof tableName === 'string' && tableName.trim()) {
    currentTableName = tableName.trim();
  }
  res.json({ success: true, tableName: currentTableName });
});

// 2. Fetch all trucks from AppSheet
app.get('/api/appsheet/trucks', async (req: Request, res: Response) => {
  try {
    const tableParam = req.query.table as string | undefined;
    if (tableParam && tableParam.trim()) {
      const cleanParam = tableParam.trim();
      if (cleanParam.startsWith('DocId=') || cleanParam === '17Kjn7YSBjt6p3FaNTofmqtfjAl2DjekO') {
        return res.json({
          success: false,
          isTableNotFound: true,
          message: "ID Dokumen / Spreadsheet ('" + cleanParam + "') bukan Nama Tabel AppSheet. Di AppSheet API, Nama Tabel adalah nama tabel yang tertera di menu Data > Tables (atau lihat link 'View API documentation').",
          tableName: currentTableName,
        });
      }
      currentTableName = cleanParam;
    }

    const rawRows = await callAppSheetApi('Find', [], currentTableName);
    const rowsArray = Array.isArray(rawRows) ? rawRows : [];

    const trucks = rowsArray.map((row: any) => {
      const nomorPolisi = String(row['Nomor Polisi'] || '').trim().toUpperCase();
      const rawId = String(row['ID'] || '').trim();
      const id = nomorPolisi || rawId || String(row['_RowNumber'] || '').trim();
      const transporter = normalizeTransporterCode(String(row['Transporter'] || ''));
      const rawDepo = String(row['Lokasi Audit'] || row['Depo'] || '').trim();
      const depo = rawDepo || 'Karawang';
      const fullSopir = String(row['Nama Sopir'] || '').trim();
      // Standardize driver name e.g. ARI WSS KRW
      const namaSopir = formatDriverNameStandard(fullSopir, transporter, depo) || fullSopir;
      const cleanKap = String(row['Kapasitas'] || '28').replace(/\D/g, '') || '28';
      const rawStatus = String(row['Status Truk'] || row['Status'] || 'Aktif').trim();
      const status = (rawStatus.toLowerCase() === 'nonaktif' || rawStatus.toLowerCase() === 'non-aktif')
        ? 'Nonaktif'
        : 'Aktif';
      const rawKesiapan = String(row['Kesiapan'] || row['Status Kesiapan'] || '').trim().toLowerCase();
      const kesiapan = (rawKesiapan.includes('tidak') || rawKesiapan.includes('not') || rawKesiapan.includes('belum') || status === 'Nonaktif')
        ? 'Tidak Ready'
        : 'Ready';
      const keterangan = String(row['Keterangan'] || row['Catatan'] || row['Alasan'] || '').trim();
      const terakhirUpdate = String(row['Log'] || row['Tgl Pemeriksaan'] || '').trim();

      return {
        id,
        transporter,
        depo,
        nomorPolisi,
        namaSopir,
        kapasitas: cleanKap,
        status,
        kesiapan,
        keterangan,
        terakhirUpdate,
      };
    });

    res.json({ success: true, trucks, total: trucks.length, tableName: currentTableName });
  } catch (err: any) {
    const isApiDisabled = Boolean(err.message?.includes('The API is not enabled'));
    const isTableNotFound = Boolean(err.message?.includes('was not found'));

    // Return structured status cleanly without stderr error output
    res.json({
      success: false,
      message: err.message,
      status: err.status || 400,
      isApiDisabled,
      isTableNotFound,
      tableName: currentTableName,
    });
  }
});

// 3. Update single truck (Edit Action by Nomor Polisi Key)
app.post('/api/appsheet/update-truck', async (req: Request, res: Response) => {
  try {
    const { truck } = req.body;
    if (!truck || (!truck.id && !truck.nomorPolisi)) {
      return res.status(400).json({ success: false, message: 'Invalid truck payload' });
    }

    const formattedSopir = formatDriverNameStandard(truck.namaSopir, truck.transporter, truck.depo);

    // Restore 'Status Truk' as configured in AppSheet
    const editRow: Record<string, any> = {
      'Nomor Polisi': truck.nomorPolisi,
      'Transporter': getAppSheetTransporterName(truck.transporter),
      'Lokasi Audit': truck.depo || 'Karawang',
      'Nama Sopir': formattedSopir || truck.namaSopir || '',
      'Kapasitas': truck.kapasitas,
      'Status Truk': truck.status || 'Aktif',
      'Kesiapan': truck.kesiapan || 'Ready',
      'Keterangan': truck.keterangan || '',
      'Log': truck.terakhirUpdate,
    };

    // If ID already exists from AppSheet audit, include it; otherwise leave empty for future audit
    if (truck.id && !truck.id.startsWith('TRK-') && truck.id !== truck.nomorPolisi) {
      editRow['ID'] = truck.id;
    }

    const result = await callAppSheetApi('Edit', [editRow], 'MD to Dealer 2');

    // Dual-sync: Also update driver name and status in master table "Data Truk 2" (DocId=1zE6zs-UQcKMJN0AlNBMNWPKKjzEIRLKb)
    if (formattedSopir) {
      syncDriverToDataTruk2(formattedSopir, truck.namaSopir, truck.transporter, truck.status || 'Aktif').catch(() => {});
    }

    res.json({ success: true, result, tableName: 'MD to Dealer 2' });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message,
      isApiDisabled: err.message?.includes('The API is not enabled'),
      isTableNotFound: err.message?.includes('was not found'),
      tableName: 'MD to Dealer 2',
    });
  }
});

// 4. Add new truck (Add Action by Nomor Polisi Key)
app.post('/api/appsheet/add-truck', async (req: Request, res: Response) => {
  try {
    const { truck } = req.body;
    if (!truck || !truck.nomorPolisi) {
      return res.status(400).json({ success: false, message: 'Invalid truck payload' });
    }

    const formattedSopir = formatDriverNameStandard(truck.namaSopir, truck.transporter, truck.depo);

    // Restore 'Status Truk' as configured in AppSheet
    const newRow: Record<string, any> = {
      'Nomor Polisi': truck.nomorPolisi,
      'Transporter': getAppSheetTransporterName(truck.transporter),
      'Lokasi Audit': truck.depo || 'Karawang',
      'Nama Sopir': formattedSopir || truck.namaSopir || '',
      'Kapasitas': truck.kapasitas,
      'Status Truk': truck.status || 'Aktif',
      'Kesiapan': truck.kesiapan || 'Ready',
      'Keterangan': truck.keterangan || '',
      'Log': truck.terakhirUpdate,
    };

    if (truck.id && !truck.id.startsWith('TRK-') && truck.id !== truck.nomorPolisi) {
      newRow['ID'] = truck.id;
    }

    const result = await callAppSheetApi('Add', [newRow], 'MD to Dealer 2');

    // Dual-sync: Also update driver name and status in master table "Data Truk 2"
    if (formattedSopir) {
      syncDriverToDataTruk2(formattedSopir, truck.namaSopir, truck.transporter, truck.status || 'Aktif').catch(() => {});
    }

    res.json({ success: true, result, tableName: 'MD to Dealer 2' });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message,
      isApiDisabled: err.message?.includes('The API is not enabled'),
      isTableNotFound: err.message?.includes('was not found'),
      tableName: 'MD to Dealer 2',
    });
  }
});

// 5. Delete truck (Delete Action by Nomor Polisi Key)
app.post('/api/appsheet/delete-truck', async (req: Request, res: Response) => {
  try {
    const { truckId, nomorPolisi } = req.body;
    const targetKey = nomorPolisi || truckId;
    if (!targetKey) {
      return res.status(400).json({ success: false, message: 'Invalid truck identifier' });
    }

    const deleteRow: Record<string, any> = {
      'Nomor Polisi': targetKey,
    };
    if (truckId && !truckId.startsWith('TRK-') && truckId !== targetKey) {
      deleteRow['ID'] = truckId;
    }

    const result = await callAppSheetApi('Delete', [deleteRow], 'MD to Dealer 2');
    res.json({ success: true, result, tableName: 'MD to Dealer 2' });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message,
      isApiDisabled: err.message?.includes('The API is not enabled'),
      isTableNotFound: err.message?.includes('was not found'),
      tableName: 'MD to Dealer 2',
    });
  }
});

// 6. Confirm All / Bulk Update (Edit Action by Nomor Polisi Key)
app.post('/api/appsheet/confirm-all', async (req: Request, res: Response) => {
  try {
    const { trucks } = req.body;
    if (!Array.isArray(trucks) || trucks.length === 0) {
      return res.json({ success: true, message: 'No trucks to update' });
    }

    const rowsToEdit = trucks.map((t: any) => {
      const formattedSopir = formatDriverNameStandard(t.namaSopir, t.transporter, t.depo);
      // Restore 'Status Truk' as configured in AppSheet
      const row: Record<string, any> = {
        'Nomor Polisi': t.nomorPolisi,
        'Transporter': getAppSheetTransporterName(t.transporter),
        'Lokasi Audit': t.depo || 'Karawang',
        'Nama Sopir': formattedSopir || t.namaSopir || '',
        'Kapasitas': t.kapasitas,
        'Status Truk': t.status || 'Aktif',
        'Kesiapan': t.kesiapan || 'Ready',
        'Keterangan': t.keterangan || '',
        'Log': t.terakhirUpdate,
      };
      if (t.id && !t.id.startsWith('TRK-') && t.id !== t.nomorPolisi) {
        row['ID'] = t.id;
      }
      return row;
    });

    const result = await callAppSheetApi('Edit', rowsToEdit, 'MD to Dealer 2');

    // Respond immediately to client so UI loading completes in ~500ms
    res.json({ success: true, result, count: rowsToEdit.length, tableName: 'MD to Dealer 2' });

    // Non-blocking background batch sync for Data Truk 2 (1 single batch call instead of N calls!)
    batchSyncDriversToDataTruk2(trucks).catch((err) => {
      console.warn('Background batch sync Data Truk 2 notice:', err.message);
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message,
      isApiDisabled: err.message?.includes('The API is not enabled'),
      isTableNotFound: err.message?.includes('was not found'),
      tableName: 'MD to Dealer 2',
    });
  }
});

// 7. Full Reconciliation / Batch Sync Drivers to "Data Truk 2"
app.post('/api/appsheet/sync-master-drivers', async (_req: Request, res: Response) => {
  try {
    const rawMD = await callAppSheetApi('Find', [], 'MD to Dealer 2');
    const rawTruk = await callAppSheetApi('Find', [], 'Data Truk 2');

    if (!Array.isArray(rawMD) || !Array.isArray(rawTruk)) {
      return res.json({ success: false, message: 'Gagal mengambil data dari AppSheet' });
    }

    const updates: Array<{ ID: string; 'Nama Driver': string; Status?: string; Rute?: string }> = [];
    const report: Array<{ id: string; oldName: string; newName: string; status?: string }> = [];
    const seenIds = new Set<string>();

    for (const mdRow of rawMD) {
      const rawSopir = String(mdRow['Nama Sopir'] || '').trim();
      if (!rawSopir) continue;
      const trans = String(mdRow['Transporter'] || '');
      const depo = String(mdRow['Lokasi Audit'] || mdRow['Depo'] || '');
      const targetName = formatDriverNameStandard(rawSopir, trans, depo);
      const core = extractDriverCoreName(rawSopir);
      if (!core || !targetName) continue;

      const transCode = normalizeTransporterCode(trans).toLowerCase();

      // Find in rawTruk strictly with Rute === 'MD-D' (NEVER overwrite non-MD-D such as AHM-MD!)
      const matched = rawTruk.find((t: any) => {
        const route = String(t['Rute'] || '').trim().toUpperCase();
        if (route !== 'MD-D') return false; // PROTEKSI: Abaikan rute selain MD-D

        const existingName = String(t['Nama Driver'] || '');
        const tCore = extractDriverCoreName(existingName);
        if (tCore === core) {
          const lower = existingName.toLowerCase();
          if (transCode && (lower.includes(transCode) || lower.includes('wss') || lower.includes('tm') || lower.includes('rjtm') || lower.includes('sbr'))) {
            return lower.includes(transCode);
          }
          return true;
        }
        return false;
      });

      if (matched && matched.ID && !seenIds.has(matched.ID)) {
        seenIds.add(matched.ID);
        const currentName = String(matched['Nama Driver'] || '').trim();
        const currentStatus = String(matched['Status'] || '').trim();
        const targetStatus = String(mdRow['Status Truk'] || 'Aktif').trim();

        const needsNameUpdate = currentName !== targetName;
        const needsStatusUpdate = currentStatus !== targetStatus;
        const needsRouteUpdate = String(matched['Rute'] || '') !== 'MD-D';

        if (needsNameUpdate || needsStatusUpdate || needsRouteUpdate) {
          updates.push({
            ID: matched.ID,
            'Nama Driver': targetName,
            'Status': targetStatus,
            'Rute': 'MD-D',
          });
          report.push({
            id: matched.ID,
            oldName: currentName,
            newName: targetName,
            status: targetStatus,
          });
        }
      }
    }

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Semua nama sopir di Data Truk 2 sudah selaras dan terstandarisasi.',
        count: 0,
        updated: [],
      });
    }

    // Execute in batches of 25 to respect AppSheet API payload limits
    const BATCH_SIZE = 25;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk = updates.slice(i, i + BATCH_SIZE);
      await callAppSheetApi('Edit', chunk, 'Data Truk 2');
    }

    res.json({
      success: true,
      message: `Berhasil menstandarisasi ${updates.length} data sopir di tabel Data Truk 2.`,
      count: updates.length,
      updated: report,
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message,
    });
  }
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const portNumber = Number(PORT) || 3000;
  app.listen(portNumber, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${portNumber}`);
  });
}

startServer();
