import { TruckRecord, UserRecord } from '../types';
import { INITIAL_TRUCKS, INITIAL_USERS } from './mockData';

const STORAGE_KEYS = {
  USERS: 'fleet_users_v1',
  TRUCKS: 'fleet_trucks_v1',
  GAS_URL: 'fleet_gas_url_v1',
  CONFIRMED_TIMES: 'fleet_confirmed_times_v1',
  SYNC_MODE: 'fleet_sync_mode_v1', // 'appsheet' | 'gas' | 'local'
};

export type SyncMode = 'appsheet' | 'gas' | 'local';

export function getStoredSyncMode(): SyncMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEYS.SYNC_MODE);
    if (mode === 'appsheet' || mode === 'gas' || mode === 'local') return mode;
  } catch {}
  return 'appsheet'; // Default to verified AppSheet REST API
}

export function saveStoredSyncMode(mode: SyncMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_MODE, mode);
  } catch (e) {
    console.error('Failed to save sync mode', e);
  }
}

// AppSheet REST API Client
export async function syncWithAppSheet(customTableName?: string): Promise<{
  success: boolean;
  trucks?: TruckRecord[];
  message?: string;
  isApiDisabled?: boolean;
  isTableNotFound?: boolean;
  tableName?: string;
}> {
  try {
    const url = customTableName
      ? `/api/appsheet/trucks?table=${encodeURIComponent(customTableName.trim())}`
      : '/api/appsheet/trucks';
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.success && data.trucks) {
      return {
        success: true,
        trucks: data.trucks,
        tableName: data.tableName,
        message: `Berhasil memuat ${data.trucks.length} unit armada dari AppSheet (${data.tableName})`,
      };
    }

    return {
      success: false,
      message: data.message || 'Gagal memuat data dari AppSheet',
      isApiDisabled: Boolean(data.isApiDisabled),
      isTableNotFound: Boolean(data.isTableNotFound),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Koneksi ke server proxy AppSheet gagal',
    };
  }
}

export async function sendAppSheetAction(
  action: 'updateTruck' | 'addTruck' | 'deleteTruck' | 'confirmAll',
  payload: Record<string, any>
): Promise<{ success: boolean; message?: string; isApiDisabled?: boolean }> {
  try {
    let endpoint = '/api/appsheet/update-truck';
    let body = payload;

    if (action === 'addTruck') {
      endpoint = '/api/appsheet/add-truck';
    } else if (action === 'deleteTruck') {
      endpoint = '/api/appsheet/delete-truck';
    } else if (action === 'confirmAll') {
      endpoint = '/api/appsheet/confirm-all';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ success: true }));
    if (res.ok && data.success) {
      return { success: true };
    }

    return {
      success: false,
      message: data.message || 'Gagal memperbarui data di AppSheet',
      isApiDisabled: Boolean(data.isApiDisabled),
    };
  } catch (err: any) {
    console.warn('AppSheet background sync error:', err.message);
    return { success: false, message: err.message };
  }
}

// Initial state getters
export function getLocalUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load users from localStorage', e);
  }
  return INITIAL_USERS;
}

export function saveLocalUsers(users: UserRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getLocalTrucks(): TruckRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRUCKS);
    if (raw) {
      const parsed: TruckRecord[] = JSON.parse(raw);
      // Ensure capacities are numbers only and driver name uses first name only
      const sanitized = parsed.map((t) => {
        let kap = String(t.kapasitas || '28').trim();
        const digits = kap.replace(/\D/g, '');
        if (digits) {
          kap = digits;
        } else if (!kap || isNaN(Number(kap))) {
          kap = '28';
        }
        const firstName = t.namaSopir ? t.namaSopir.trim().split(/\s+/)[0] : '';
        return {
          ...t,
          depo: t.depo || 'Karawang',
          kapasitas: kap,
          namaSopir: firstName || t.namaSopir,
          kesiapan: t.kesiapan || (t.status === 'Nonaktif' ? 'Tidak Ready' : 'Ready'),
          keterangan: t.keterangan || '',
        };
      });
      return sanitized;
    }
  } catch (e) {
    console.error('Failed to load trucks from localStorage', e);
  }
  return INITIAL_TRUCKS;
}

export function saveLocalTrucks(trucks: TruckRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRUCKS, JSON.stringify(trucks));
  } catch (e) {
    console.error('Failed to save trucks', e);
  }
}

export function getStoredGasUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.GAS_URL) || '';
  } catch {
    return '';
  }
}

export function saveStoredGasUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, url.trim());
  } catch (e) {
    console.error('Failed to save GAS url', e);
  }
}

export function getStoredConfirmedTimes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIRMED_TIMES);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    TM: '25 Sep 2026, 14:15 WIB',
    RJTM: '25 Sep 2026, 13:40 WIB',
    WSS: '25 Sep 2026, 12:10 WIB',
    SBR: '25 Sep 2026, 14:00 WIB',
  };
}

export function saveStoredConfirmedTimes(times: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIRMED_TIMES, JSON.stringify(times));
  } catch (e) {
    console.error('Failed to save confirmed times', e);
  }
}

// Google Apps Script API synchronization
export async function syncWithGoogleSheets(gasUrl: string): Promise<{
  success: boolean;
  users?: UserRecord[];
  trucks?: TruckRecord[];
  message?: string;
}> {
  if (!gasUrl) {
    return { success: false, message: 'Google Apps Script URL belum diisi' };
  }

  try {
    const fetchUrl = new URL(gasUrl);
    fetchUrl.searchParams.append('action', 'getData');

    const res = await fetch(fetchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status === 'success' || data.users || data.trucks) {
      return {
        success: true,
        users: data.users || undefined,
        trucks: data.trucks || undefined,
      };
    }

    return {
      success: false,
      message: data.message || 'Format respon Google Apps Script tidak sesuai',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menghubungi Google Apps Script Web App',
    };
  }
}

export async function sendGasAction(
  gasUrl: string,
  payload: Record<string, any>
): Promise<{ success: boolean; message?: string }> {
  if (!gasUrl) return { success: true }; // Offline mode operates smoothly

  try {
    // Note: Google Apps Script Web App redirects POST, so text/plain or URLSearchParams is recommended
    const res = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    });

    const data = await res.json().catch(() => ({ status: 'success' }));
    return { success: true, message: data.message };
  } catch (err: any) {
    console.warn('Google Sheets background sync notice:', err.message);
    // Don't block the UI if GAS is unresponsive, local state is already saved
    return { success: false, message: err.message };
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT BACKEND - FLEET READINESS INTEGRATION
 * Spreadsheet ID : 17Kjn7YSBjt6p3FaNTofmqtfjAl2DjekO
 * Sheet Target   : MD to Dealer
 * 
 * Kolom yang dikelola aplikasi (Safe Partial Update):
 * 1. ID
 * 2. Transporter
 * 3. Nomor Polisi
 * 4. Nama Sopir (disimpan nama depan saja)
 * 5. Kapasitas
 * 6. Status Truk (Aktif / Nonaktif)
 * 7. Log (Riwayat konfirmasi / update terakhir)
 * 
 * Semua 60+ kolom audit, spesifikasi, dan foto lainnya AMAN dan TIDAK AKAN TERTAMPA.
 */

var SPREADSHEET_ID = "17Kjn7YSBjt6p3FaNTofmqtfjAl2DjekO";
var SHEET_NAME = "MD to Dealer";

function getTargetSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getHeaderMap(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var headerName = String(headers[i]).trim();
    if (headerName) {
      map[headerName] = i + 1; // 1-based index untuk getRange
    }
  }

  // Jika kolom 'Status Truk' tidak ada tapi ada 'Status', gunakan 'Status'
  if (!map['Status Truk'] && map['Status']) {
    map['Status Truk'] = map['Status'];
  }

  // Otomatis buat kolom 'Log' jika belum ada di sheet
  if (!map['Log']) {
    var newCol = lastCol + 1;
    sheet.getRange(1, newCol).setValue('Log');
    map['Log'] = newCol;
  }

  return map;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getData';
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Sheet "' + SHEET_NAME + '" tidak ditemukan di Spreadsheet!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var headerMap = getHeaderMap(sheet);
  var lastRow = sheet.getLastRow();
  var trucks = [];

  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var idColIdx = headerMap['ID'] ? headerMap['ID'] - 1 : 0;
      var idVal = String(row[idColIdx] || '').trim();

      if (idVal) {
        var rawSopir = headerMap['Nama Sopir'] ? String(row[headerMap['Nama Sopir'] - 1] || '').trim() : '';
        var namaDepan = rawSopir ? rawSopir.split(/\\s+/)[0] : '';

        var rawKap = headerMap['Kapasitas'] ? String(row[headerMap['Kapasitas'] - 1] || '').replace(/\\D/g, '') : '28';
        if (!rawKap || rawKap === '0') rawKap = '28';

        var rawStatus = headerMap['Status Truk'] ? String(row[headerMap['Status Truk'] - 1] || '').trim() : 'Aktif';
        var status = (rawStatus.toLowerCase() === 'nonaktif' || rawStatus.toLowerCase() === 'non-aktif') ? 'Nonaktif' : 'Aktif';

        var logVal = headerMap['Log'] ? String(row[headerMap['Log'] - 1] || '').trim() : '';

        trucks.push({
          id: idVal,
          transporter: headerMap['Transporter'] ? String(row[headerMap['Transporter'] - 1] || '').trim() : '',
          nomorPolisi: headerMap['Nomor Polisi'] ? String(row[headerMap['Nomor Polisi'] - 1] || '').trim().toUpperCase() : '',
          namaSopir: namaDepan || rawSopir,
          kapasitas: rawKap,
          status: status,
          terakhirUpdate: logVal
        });
      }
    }
  }

  // Jika ada sheet Users terpisah di spreadsheet yang sama, baca data user
  var users = [];
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() > 1) {
    var uData = usersSheet.getDataRange().getValues();
    for (var u = 1; u < uData.length; u++) {
      if (uData[u][0]) {
        users.push({
          email: String(uData[u][0]).trim(),
          namaTransporter: String(uData[u][1] || '').trim(),
          role: String(uData[u][2] || 'transporter').trim(),
          kodeTransporter: String(uData[u][3] || 'TM').trim()
        });
      }
    }
  }

  var response = {
    status: 'success',
    sheetName: SHEET_NAME,
    total: trucks.length,
    trucks: trucks
  };

  if (users.length > 0) {
    response.users = users;
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Sheet "' + SHEET_NAME + '" tidak ditemukan!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var headerMap = getHeaderMap(sheet);
    var lastRow = sheet.getLastRow();

    // 1. UPDATE DATA TRUK (Inline Edit / Autosave)
    if (action === 'updateTruck') {
      var t = body.truck;
      var foundRow = -1;

      if (lastRow > 1 && headerMap['ID']) {
        var idColumnValues = sheet.getRange(2, headerMap['ID'], lastRow - 1, 1).getValues();
        for (var r = 0; r < idColumnValues.length; r++) {
          if (String(idColumnValues[r][0]).trim() === String(t.id).trim()) {
            foundRow = r + 2;
            break;
          }
        }
      }

      if (foundRow > 0) {
        // Safe Partial Update: HANYA ubah cell yang relevan
        if (headerMap['Nomor Polisi'] && t.nomorPolisi !== undefined) {
          sheet.getRange(foundRow, headerMap['Nomor Polisi']).setValue(t.nomorPolisi);
        }
        if (headerMap['Nama Sopir'] && t.namaSopir !== undefined) {
          var namaDepan = String(t.namaSopir).trim().split(/\\s+/)[0];
          sheet.getRange(foundRow, headerMap['Nama Sopir']).setValue(namaDepan);
        }
        if (headerMap['Kapasitas'] && t.kapasitas !== undefined) {
          sheet.getRange(foundRow, headerMap['Kapasitas']).setValue(t.kapasitas);
        }
        if (headerMap['Status Truk'] && t.status !== undefined) {
          sheet.getRange(foundRow, headerMap['Status Truk']).setValue(t.status);
        }
        if (headerMap['Log'] && t.terakhirUpdate !== undefined) {
          sheet.getRange(foundRow, headerMap['Log']).setValue(t.terakhirUpdate);
        }
      } else {
        // Jika belum ada, buat baris baru aman (dengan padding 60+ kolom)
        var newRowArray = new Array(sheet.getLastColumn()).fill('');
        if (headerMap['ID']) newRowArray[headerMap['ID'] - 1] = t.id;
        if (headerMap['Transporter']) newRowArray[headerMap['Transporter'] - 1] = t.transporter;
        if (headerMap['Nomor Polisi']) newRowArray[headerMap['Nomor Polisi'] - 1] = t.nomorPolisi;
        if (headerMap['Nama Sopir']) newRowArray[headerMap['Nama Sopir'] - 1] = String(t.namaSopir).trim().split(/\\s+/)[0];
        if (headerMap['Kapasitas']) newRowArray[headerMap['Kapasitas'] - 1] = t.kapasitas;
        if (headerMap['Status Truk']) newRowArray[headerMap['Status Truk'] - 1] = t.status;
        if (headerMap['Log']) newRowArray[headerMap['Log'] - 1] = t.terakhirUpdate;
        sheet.appendRow(newRowArray);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. TAMBAH ARMADA BARU
    if (action === 'addTruck') {
      var newTruck = body.truck;
      var rowArr = new Array(sheet.getLastColumn()).fill('');
      if (headerMap['ID']) rowArr[headerMap['ID'] - 1] = newTruck.id;
      if (headerMap['Transporter']) rowArr[headerMap['Transporter'] - 1] = newTruck.transporter;
      if (headerMap['Nomor Polisi']) rowArr[headerMap['Nomor Polisi'] - 1] = newTruck.nomorPolisi;
      if (headerMap['Nama Sopir']) rowArr[headerMap['Nama Sopir'] - 1] = String(newTruck.namaSopir).trim().split(/\\s+/)[0];
      if (headerMap['Kapasitas']) rowArr[headerMap['Kapasitas'] - 1] = newTruck.kapasitas;
      if (headerMap['Status Truk']) rowArr[headerMap['Status Truk'] - 1] = newTruck.status;
      if (headerMap['Log']) rowArr[headerMap['Log'] - 1] = newTruck.terakhirUpdate;
      sheet.appendRow(rowArr);

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. HAPUS ARMADA
    if (action === 'deleteTruck') {
      var deleteId = String(body.truckId).trim();
      if (lastRow > 1 && headerMap['ID']) {
        var idVals = sheet.getRange(2, headerMap['ID'], lastRow - 1, 1).getValues();
        for (var d = 0; d < idVals.length; d++) {
          if (String(idVals[d][0]).trim() === deleteId) {
            sheet.deleteRow(d + 2);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. SIMPAN DATA / KONFIRMASI KESELURUHAN (Update kolom 'Log')
    if (action === 'confirmAll') {
      var targetTransporter = body.transporter;
      var timestamp = body.timestamp;

      if (lastRow > 1 && headerMap['Log']) {
        if (targetTransporter === 'ALL' || !headerMap['Transporter']) {
          // Update semua baris
          var logRange = sheet.getRange(2, headerMap['Log'], lastRow - 1, 1);
          var fillVals = [];
          for (var f = 0; f < lastRow - 1; f++) fillVals.push([timestamp]);
          logRange.setValues(fillVals);
        } else {
          // Update baris transporter yang bersangkutan
          var transValues = sheet.getRange(2, headerMap['Transporter'], lastRow - 1, 1).getValues();
          for (var tr = 0; tr < transValues.length; tr++) {
            if (String(transValues[tr][0]).trim() === targetTransporter) {
              sheet.getRange(tr + 2, headerMap['Log']).setValue(timestamp);
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
