import React, { useState } from 'react';
import { syncMasterDriversToDataTruk2 } from '../services/apiService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncMode: 'appsheet' | 'gas' | 'local';
  onSetSyncMode: (mode: 'appsheet' | 'gas' | 'local') => void;
  currentGasUrl: string;
  onSaveGasUrl: (url: string) => Promise<{ success: boolean; message?: string }>;
  onSyncAppSheet: (customTable?: string) => Promise<{
    success: boolean;
    message?: string;
    isApiDisabled?: boolean;
    isTableNotFound?: boolean;
    tableName?: string;
  }>;
  onResetData: () => void;
  appSheetApiDisabled?: boolean;
}

const GOOGLE_APPS_SCRIPT_TEMPLATE = `// GOOGLE APPS SCRIPT - FLEET MONITORING (MD TO DEALER)
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("MD to Dealer 2") || ss.getActiveSheet();
    
    if (e.parameter && e.parameter.action === "read") {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = data[i][j];
        }
        rows.push(row);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Fleet API Online" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  syncMode,
  onSetSyncMode,
  currentGasUrl,
  onSaveGasUrl,
  onSyncAppSheet,
  onResetData,
  appSheetApiDisabled = false,
}) => {
  const [gasUrl, setGasUrl] = useState(currentGasUrl);
  const [appSheetTableName, setAppSheetTableName] = useState('MD to Dealer 2');
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [isTestingAppSheet, setIsTestingAppSheet] = useState(false);
  const [gasResult, setGasResult] = useState<{ success: boolean; message: string } | null>(null);
  const [appSheetResult, setAppSheetResult] = useState<{
    success: boolean;
    message: string;
    isApiDisabled?: boolean;
    isTableNotFound?: boolean;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'appsheet' | 'gas' | 'script'>('appsheet');
  const [isCopied, setIsCopied] = useState(false);

  const [isSyncingDrivers, setIsSyncingDrivers] = useState(false);
  const [driverSyncResult, setDriverSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleSyncMasterDrivers = async () => {
    setIsSyncingDrivers(true);
    setDriverSyncResult(null);
    try {
      const res = await syncMasterDriversToDataTruk2();
      setIsSyncingDrivers(false);
      setDriverSyncResult({
        success: res.success,
        message: res.message || (res.success ? `Berhasil menstandarisasi ${res.count || 0} sopir.` : 'Gagal'),
        count: res.count,
      });
    } catch (e: any) {
      setIsSyncingDrivers(false);
      setDriverSyncResult({
        success: false,
        message: e.message || 'Koneksi gagal',
      });
    }
  };

  const handleTestAndSaveGas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingGas(true);
    setGasResult(null);

    const result = await onSaveGasUrl(gasUrl.trim());
    setIsTestingGas(false);

    if (result.success) {
      setGasResult({
        success: true,
        message: result.message || 'Koneksi berhasil! Data Google Apps Script tersinkronisasi.',
      });
      onSetSyncMode('gas');
    } else {
      setGasResult({
        success: false,
        message: result.message || 'Koneksi gagal. Periksa kembali URL Web App.',
      });
    }
  };

  const handleTestAppSheetSync = async (overrideName?: string) => {
    setIsTestingAppSheet(true);
    setAppSheetResult(null);

    const targetTable = (overrideName || appSheetTableName).trim();
    const result = await onSyncAppSheet(targetTable);
    setIsTestingAppSheet(false);

    if (result.success) {
      setAppSheetResult({
        success: true,
        message: result.message || `Koneksi berhasil! Tabel '${targetTable}' tersinkronkan.`,
      });
      onSetSyncMode('appsheet');
    } else {
      setAppSheetResult({
        success: false,
        message: result.message || 'Koneksi ke AppSheet gagal.',
        isApiDisabled: result.isApiDisabled,
        isTableNotFound: result.isTableNotFound,
      });
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert('Gagal menyalin kode');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 mb-1">
              PENGATURAN INTEGRASI
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Konfigurasi API & Sinkronisasi
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('appsheet')}
            className={`pb-2.5 px-3 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              activeTab === 'appsheet'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            AppSheet REST API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gas')}
            className={`pb-2.5 px-3 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              activeTab === 'gas'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Google Apps Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 px-3 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              activeTab === 'script'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Template Kode
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* 1. AppSheet Tab */}
          {activeTab === 'appsheet' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl text-white leading-relaxed shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      Integrasi AppSheet REST API (MD to Dealer 2)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 Terhubung Live
                  </span>
                </div>
                <p className="text-slate-300 text-xs">
                  Aplikasi ini terhubung langsung ke database AppSheet <strong>MD to Dealer 2</strong> via backend proxy REST API v2 yang aman dan tersinkronisasi dua arah.
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-700/70 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300 font-mono">
                  <span>App ID: <strong className="text-white">8b71fdfd...</strong></span>
                  <span>Tabel Utama: <strong className="text-emerald-400">MD to Dealer 2</strong></span>
                  <span>Protokol: <strong className="text-white">REST API v2</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Tabel di AppSheet (Table Name / ID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={appSheetTableName}
                    onChange={(e) => setAppSheetTableName(e.target.value)}
                    placeholder="Contoh: MD to Dealer 2"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-md border border-slate-300 text-slate-900 bg-white focus:border-red-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={isTestingAppSheet || !appSheetTableName.trim()}
                    onClick={() => handleTestAppSheetSync()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isTestingAppSheet ? 'Menguji...' : 'Uji Tabel Ini'}
                  </button>
                </div>
              </div>

              {appSheetResult && (
                <div
                  className={`p-3 rounded-md text-xs border font-medium ${
                    appSheetResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}
                >
                  <div className="font-bold mb-0.5">
                    {appSheetResult.success ? '✓ Berhasil Terhubung' : 'Peringatan Koneksi'}
                  </div>
                  <p>{appSheetResult.message}</p>
                </div>
              )}

              {/* Master Driver Table Reconciliation */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚚</span>
                    <span className="font-bold text-slate-800 text-xs">
                      Standarisasi Master Sopir (Data Truk 2)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    DocId: 1zE6zs...
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Menyelaraskan nama lama di tabel master <strong>Data Truk 2</strong> (DocId: 1zE6zs-UQcKMJN0AlNBMNWPKKjzEIRLKb) dengan nama terstandarisasi (contoh: <code>GALIH TM BRS</code>) agar sinkron dengan relasi di <strong>MD to Dealer 2</strong>.
                </p>
                <div className="pt-1 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isSyncingDrivers}
                    onClick={handleSyncMasterDrivers}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isSyncingDrivers ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menyinkronkan Master...</span>
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        <span>Sinkronkan Master Sopir ke Data Truk 2</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400">
                    Otomatis mencocokkan ID & nama sopir
                  </span>
                </div>

                {driverSyncResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-xs border font-medium ${
                      driverSyncResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-red-50 text-red-800 border-red-300'
                    }`}
                  >
                    <div className="font-bold mb-0.5">
                      {driverSyncResult.success ? '✓ Sinkronisasi Master Selesai' : 'Gagal Sinkronisasi'}
                    </div>
                    <p>{driverSyncResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Google Apps Script Tab */}
          {activeTab === 'gas' && (
            <form onSubmit={handleTestAndSaveGas} className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 leading-relaxed">
                <div className="font-bold text-slate-900 mb-1">
                  Integrasi Google Apps Script (Opsional)
                </div>
                <p>
                  Jika Anda menggunakan Google Apps Script Web App untuk membaca Google Sheets secara langsung, masukkan URL deployment Web App di bawah ini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Web App URL
                </label>
                <input
                  type="url"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-slate-300 text-slate-900 bg-white focus:border-red-500 focus:outline-hidden"
                />
              </div>

              {gasResult && (
                <div
                  className={`p-3 rounded-md text-xs border font-medium ${
                    gasResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}
                >
                  <p>{gasResult.message}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isTestingGas || !gasUrl.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isTestingGas ? 'Menguji...' : 'Simpan & Uji Koneksi'}
                </button>
              </div>
            </form>
          )}

          {/* 3. Script Template Tab */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  Salin script di bawah ini ke editor Google Apps Script:
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-xs transition cursor-pointer"
                >
                  {isCopied ? '✓ Tersalin!' : 'Salin Kode'}
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-md overflow-x-auto max-h-60 leading-relaxed">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetData}
            className="text-xs text-red-600 hover:underline font-bold cursor-pointer"
          >
            Reset ke Data Awal
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
