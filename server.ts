import express, { Request, Response } from 'express';
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
      const namaSopir = fullSopir.split(/\s+/)[0] || fullSopir;
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

    const editRow: Record<string, any> = {
      'Nomor Polisi': truck.nomorPolisi,
      'Transporter': getAppSheetTransporterName(truck.transporter),
      'Lokasi Audit': truck.depo || 'Karawang',
      'Nama Sopir': (truck.namaSopir || '').trim().split(/\s+/)[0],
      'Kapasitas': truck.kapasitas,
      'Status Truk': truck.status,
      'Kesiapan': truck.kesiapan || 'Ready',
      'Keterangan': truck.keterangan || '',
      'Log': truck.terakhirUpdate,
    };

    // If ID already exists from AppSheet audit, include it; otherwise leave empty for future audit
    if (truck.id && !truck.id.startsWith('TRK-') && truck.id !== truck.nomorPolisi) {
      editRow['ID'] = truck.id;
    }

    const result = await callAppSheetApi('Edit', [editRow], 'MD to Dealer 2');
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

    const newRow: Record<string, any> = {
      'Nomor Polisi': truck.nomorPolisi,
      'Transporter': getAppSheetTransporterName(truck.transporter),
      'Lokasi Audit': truck.depo || 'Karawang',
      'Nama Sopir': (truck.namaSopir || '').trim().split(/\s+/)[0],
      'Kapasitas': truck.kapasitas,
      'Status Truk': truck.status,
      'Kesiapan': truck.kesiapan || 'Ready',
      'Keterangan': truck.keterangan || '',
      'Log': truck.terakhirUpdate,
    };

    if (truck.id && !truck.id.startsWith('TRK-') && truck.id !== truck.nomorPolisi) {
      newRow['ID'] = truck.id;
    }

    const result = await callAppSheetApi('Add', [newRow], 'MD to Dealer 2');
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
      const row: Record<string, any> = {
        'Nomor Polisi': t.nomorPolisi,
        'Transporter': getAppSheetTransporterName(t.transporter),
        'Lokasi Audit': t.depo || 'Karawang',
        'Nama Sopir': (t.namaSopir || '').trim().split(/\s+/)[0],
        'Kapasitas': t.kapasitas,
        'Status Truk': t.status,
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
    res.json({ success: true, result, count: rowsToEdit.length, tableName: 'MD to Dealer 2' });
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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
