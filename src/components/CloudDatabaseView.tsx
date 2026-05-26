import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  Terminal, 
  Copy, 
  CheckCircle, 
  RefreshCw, 
  LogOut, 
  ChevronRight,
  Cloud,
  Check,
  ExternalLink,
  BookOpen,
  Send,
  Sliders,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import { Product, Transaction, User as LocalUser } from '../types';
import { 
  googleSignIn, 
  googleSignOut, 
  initGoogleAuth, 
  getAccessToken, 
  getSyncConfig, 
  saveSyncConfig, 
  createNewPOSSpreadsheet, 
  syncTransactionsToSheets, 
  syncProductsToSheets,
  syncCashiersToSheets,
  syncSalesReportToSheets,
  APPS_SCRIPT_TEMPLATE 
} from '../lib/googleSync';

interface CloudDatabaseViewProps {
  products: Product[];
  transactions: Transaction[];
  users: LocalUser[];
  onSaveNotification: (msg: string, type: 'success' | 'error') => void;
  shopName: string;
}

export default function CloudDatabaseView({
  products,
  transactions,
  users = [],
  onSaveNotification,
  shopName
}: CloudDatabaseViewProps) {
  
  // Google Auth & Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [syncConfig, setSyncConfig] = useState(() => getSyncConfig());
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingTrx, setIsSyncingTrx] = useState(false);
  const [isSyncingProd, setIsSyncingProd] = useState(false);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [isSyncingReport, setIsSyncingReport] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'trx' | 'prod' | 'kasir' | 'laporan'>('trx');

  // Subscribe to Google Authentication state safely on mount (Single state listener)
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        onSaveNotification(`Koneksi Google dengan akun ${res.user.email} sukses!`, 'success');
      }
    } catch (err: any) {
      onSaveNotification(`Gagal login Google: ${err.message || err}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      onSaveNotification('Koneksi Google berhasil diputus.', 'success');
    } catch (err: any) {
      onSaveNotification(`Gagal logout: ${err.message}`, 'error');
    }
  };

  const handleSaveSyncConfig = (updates: Partial<typeof syncConfig>) => {
    const updated = { ...syncConfig, ...updates };
    setSyncConfig(updated);
    saveSyncConfig(updated);
  };

  const handleCreateAutoSheet = async () => {
    if (!googleToken) {
      onSaveNotification('Silakan hubungkan akun Google terlebih dahulu!', 'error');
      return;
    }
    setIsCreatingSheet(true);
    try {
      const newSheetId = await createNewPOSSpreadsheet(googleToken, shopName);
      handleSaveSyncConfig({ spreadsheetId: newSheetId });
      onSaveNotification(`Spreadsheet baru berhasil dibuat di Google Drive!`, 'success');
      
      // Perform initial push sync of all 4 datasets
      setIsSyncingAll(true);
      await syncTransactionsToSheets(googleToken, newSheetId, transactions);
      await syncProductsToSheets(googleToken, newSheetId, products);
      await syncCashiersToSheets(googleToken, newSheetId, users);
      await syncSalesReportToSheets(googleToken, newSheetId, transactions);
      onSaveNotification('Inisialisasi 4 tabel otomatis di lembar spreadsheet Anda sukses!', 'success');
    } catch (err: any) {
      console.error(err);
      onSaveNotification(`Gagal membuat spreadsheet atau sinkron awal: ${err.message || err}`, 'error');
    } finally {
      setIsCreatingSheet(false);
      setIsSyncingAll(false);
    }
  };

  const fetchPushTransactions = async (sheetId = syncConfig.spreadsheetId) => {
    if (!googleToken) {
      onSaveNotification('Hubungkan Google terlebih dahulu!', 'error');
      return;
    }
    if (!sheetId) {
      onSaveNotification('ID Spreadsheet Kosong!', 'error');
      return;
    }
    setIsSyncingTrx(true);
    try {
      await syncTransactionsToSheets(googleToken, sheetId, transactions);
      onSaveNotification('Database Transaksi sukses disinkronkan ke Google Sheets!', 'success');
    } catch (err: any) {
      onSaveNotification(`Sinkronisasi Transaksi gagal: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingTrx(false);
    }
  };

  const fetchPushProducts = async (sheetId = syncConfig.spreadsheetId) => {
    if (!googleToken) {
      onSaveNotification('Hubungkan Google terlebih dahulu!', 'error');
      return;
    }
    if (!sheetId) {
      onSaveNotification('ID Spreadsheet Kosong!', 'error');
      return;
    }
    setIsSyncingProd(true);
    try {
      await syncProductsToSheets(googleToken, sheetId, products);
      onSaveNotification('Katalog Produk sukses disinkronkan ke Google Sheets!', 'success');
    } catch (err: any) {
      onSaveNotification(`Sinkronisasi Produk gagal: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingProd(false);
    }
  };

  const fetchPushUsers = async (sheetId = syncConfig.spreadsheetId) => {
    if (!googleToken) {
      onSaveNotification('Hubungkan Google terlebih dahulu!', 'error');
      return;
    }
    if (!sheetId) {
      onSaveNotification('ID Spreadsheet Kosong!', 'error');
      return;
    }
    setIsSyncingUsers(true);
    try {
      await syncCashiersToSheets(googleToken, sheetId, users);
      onSaveNotification('Daftar Kasir Cepat sukses disinkronkan ke Google Sheets!', 'success');
    } catch (err: any) {
      onSaveNotification(`Sinkronisasi Kasir gagal: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const fetchPushReport = async (sheetId = syncConfig.spreadsheetId) => {
    if (!googleToken) {
      onSaveNotification('Hubungkan Google terlebih dahulu!', 'error');
      return;
    }
    if (!sheetId) {
      onSaveNotification('ID Spreadsheet Kosong!', 'error');
      return;
    }
    setIsSyncingReport(true);
    try {
      await syncSalesReportToSheets(googleToken, sheetId, transactions);
      onSaveNotification('Laporan Penjualan sukses disinkronkan ke Google Sheets!', 'success');
    } catch (err: any) {
      onSaveNotification(`Sinkronisasi Laporan gagal: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingReport(false);
    }
  };

  const handleSyncAll = async () => {
    if (!googleToken) {
      onSaveNotification('Hubungkan Google terlebih dahulu!', 'error');
      return;
    }
    const sheetId = syncConfig.spreadsheetId;
    if (!sheetId) {
      onSaveNotification('ID Spreadsheet Kosong!', 'error');
      return;
    }
    setIsSyncingAll(true);
    try {
      await syncTransactionsToSheets(googleToken, sheetId, transactions);
      await syncProductsToSheets(googleToken, sheetId, products);
      await syncCashiersToSheets(googleToken, sheetId, users);
      await syncSalesReportToSheets(googleToken, sheetId, transactions);
      onSaveNotification('SELESAI! Semua Tabel (Transaksi, Produk, Kasir, Laporan Penjualan) sukses disinkronkan!', 'success');
    } catch (err: any) {
      onSaveNotification(`Sinkronisasi ganda gagal: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Title Header Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-6 rounded-3xl border border-emerald-100/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-sans font-extrabold text-slate-800 text-lg">Hubungan Database Cloud</h2>
            <p className="text-xs text-slate-500 mt-0.5">Automasi rekap penjualan ke Google Sheets & panggil webhook Apps Script real-time.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Sheets Api v4
          </span>
          <span className="text-[10px] bg-purple-100 border border-purple-200 text-purple-800 font-bold px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Apps Script Web App
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Controllers & Input Forms */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Google OAuth Connection */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">1. Otorisasi Google Drive & Sheets</h3>
            <p className="text-xs text-slate-500">Koneksikan POS Kasir Pintar ini dengan akun Google Anda untuk mengizinkan pembuatan lembar spreadsheet baru dan modifikasi baris data transaksi.</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {googleUser ? (
                  <>
                    <img
                      src={googleUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop"}
                      alt={googleUser.displayName} 
                      className="w-11 h-11 rounded-full border-2 border-emerald-500/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-800 truncate">{googleUser.displayName}</h5>
                      <p className="text-[10px] text-slate-400 truncate">{googleUser.email}</p>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block font-mono">Status: Connected</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-11 h-11 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">
                      G
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Sesi Google Terputus</h5>
                      <p className="text-[10px] text-slate-400">Silakan otorisasi akun Google Anda untuk memulai integrasi langsung.</p>
                    </div>
                  </>
                )}
              </div>

              <div>
                {googleUser ? (
                  <button
                    type="button"
                    onClick={handleGoogleLogout}
                    className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 font-bold px-4 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={handleGoogleLogin}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-slate-900/10 disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menghubungkan...</span>
                      </>
                    ) : (
                      <>
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 mr-0.5">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Sambung Google</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Google Sheets Sync Controls */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">2. Setup Sinkron Google Sheets</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Google Spreadsheet ID
                  </label>
                  {googleUser && (
                    <button
                      type="button"
                      disabled={isCreatingSheet}
                      onClick={handleCreateAutoSheet}
                      className="text-emerald-600 hover:text-emerald-800 text-[10px] font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      {isCreatingSheet ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>+ Buat Baru Otomatis di Drive</span>
                      )}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={syncConfig.spreadsheetId}
                  onChange={(e) => handleSaveSyncConfig({ spreadsheetId: e.target.value })}
                  placeholder="Masukkan ID Spreadsheet Google Anda (misal: 1zUxZaP77g...)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl outline-none focus:bg-white focus:border-emerald-500 text-slate-700 transition-all shadow-inner"
                />
                {syncConfig.spreadsheetId && (syncConfig.spreadsheetId.trim().startsWith('AKfyc') || syncConfig.spreadsheetId.includes('script.google.com')) && (
                  <div className="mt-2 bg-rose-50 p-3 rounded-2xl border border-rose-150 max-w-md space-y-2">
                    <p className="text-[11px] text-rose-600 font-bold leading-normal">
                      ⚠️ Salah Kolom: Anda memasukkan ID/URL Google Apps Script ({syncConfig.spreadsheetId.trim().substring(0, 15)}...) di kolom Google Spreadsheet ID.
                    </p>
                    <p className="text-[10px] text-slate-600 leading-normal">
                      Kolom ini memerlukan <strong>ID Google Spreadsheet asli</strong> (didapat dari URL Google Sheet, bukan dari Apps Script). 
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const inputVal = syncConfig.spreadsheetId.trim();
                        let appsScriptId = inputVal;
                        if (inputVal.includes('macros/s/')) {
                          appsScriptId = inputVal.split('macros/s/')[1].split('/')[0];
                        }
                        const fullUrl = `https://script.google.com/macros/s/${appsScriptId}/exec`;
                        handleSaveSyncConfig({
                          spreadsheetId: '',
                          appsScriptUrl: fullUrl,
                          autoSyncAppsScript: true
                        });
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>💡 Pindahkan & Format Otomatis ke Web App URL di Bawah</span>
                    </button>
                  </div>
                )}
                {syncConfig.spreadsheetId && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${syncConfig.spreadsheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <span>Buka Google Sheet Anda</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Toggle auto checkout sync */}
              <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Tulis Transaksi Otomatis Ke Sheet</span>
                  <span className="text-[10px] text-slate-450 block max-w-md mt-0.5">Seketika saat pembayaran di kasir berhasil diselesaikan, baris data baru ditransfer langsung ke Sheet "Daftar Transaksi".</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSyncSheets}
                    onChange={(e) => handleSaveSyncConfig({ autoSyncSheets: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Force manual uploads grid */}
              {googleUser && syncConfig.spreadsheetId && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono block">Sinkronisasi Katalog & Semua Riwayat</span>
                    <p className="text-[11px] text-emerald-700">Masing-masing tombol di bawah menyinkronkan tabel spesifik dari database lokal ke Google Sheets.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isSyncingTrx}
                      onClick={() => fetchPushTransactions()}
                      className="bg-white hover:bg-emerald-50 text-emerald-850 font-bold border border-emerald-250 hover:border-emerald-350 py-2.5 px-3 text-[11px] rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncingTrx ? 'animate-spin' : ''}`} />
                      <span>{isSyncingTrx ? 'Syncing...' : 'Sync Transaksi'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSyncingProd}
                      onClick={() => fetchPushProducts()}
                      className="bg-white hover:bg-emerald-50 text-emerald-850 font-bold border border-emerald-250 hover:border-emerald-350 py-2.5 px-3 text-[11px] rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingProd ? 'animate-spin' : ''}`} />
                      <span>{isSyncingProd ? 'Syncing...' : 'Sync Katalog Produk'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSyncingUsers}
                      onClick={() => fetchPushUsers()}
                      className="bg-white hover:bg-emerald-50 text-emerald-850 font-bold border border-emerald-250 hover:border-emerald-350 py-2.5 px-3 text-[11px] rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-violet-600 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                      <span>{isSyncingUsers ? 'Syncing...' : 'Sync Daftar Kasir'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSyncingReport}
                      onClick={() => fetchPushReport()}
                      className="bg-white hover:bg-emerald-50 text-emerald-850 font-bold border border-emerald-250 hover:border-emerald-350 py-2.5 px-3 text-[11px] rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-rose-600 ${isSyncingReport ? 'animate-spin' : ''}`} />
                      <span>{isSyncingReport ? 'Syncing...' : 'Sync Laporan Penjualan'}</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-emerald-100/30">
                    <button
                      type="button"
                      disabled={isSyncingAll}
                      onClick={handleSyncAll}
                      className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-extrabold py-3 px-4 text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 text-white ${isSyncingAll ? 'animate-spin' : ''}`} />
                      <span>{isSyncingAll ? 'Sedang Sinkronisasi 4 Tabel...' : 'SINKRONKAN SEMUA TABEL (4 TABEL SEKALIGUS)'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Google Apps Script Layout Webhook */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">3. Google Apps Script Connector</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeModal(true)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1 transition-colors border border-purple-150"
              >
                <span>Setup & Lihat Script</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-500">Apps Script Web App bertindak sebagai micro-service endpoint yang dapat dipanggil tanpa proses dialog otentikasi login Google klien. Cukup masukkan endpoint URL webhook hasil deployment di bawah ini.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                  Web App Deployment URL
                </label>
                <input
                  type="url"
                  value={syncConfig.appsScriptUrl}
                  onChange={(e) => handleSaveSyncConfig({ appsScriptUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/AKfyby.../exec"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl outline-none focus:bg-white focus:border-purple-505 text-slate-700 transition-all shadow-inner"
                />
                {syncConfig.appsScriptUrl && !syncConfig.appsScriptUrl.startsWith('http') && syncConfig.appsScriptUrl.startsWith('AKfycb') && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 bg-rose-50 p-2 rounded-lg border border-rose-150">
                    ⚠️ Peringatan: Anda memasukkan ID Deployment saja. Kolom ini membutuhkan tautan Web App utuh, silakan ubah masukan Anda menjadi: <span className="font-mono text-[9px] block bg-white border border-rose-200 rounded p-1 mt-1 text-slate-600 select-all">https://script.google.com/macros/s/{syncConfig.appsScriptUrl}/exec</span>
                  </p>
                )}
                <p className="text-[9px] text-slate-400 mt-1">Dapatkan link ini setelah mendeploy script yang disediakan sebagai Web App dengan hak akses "Anyone" (Siapa Saja).</p>
              </div>

              {/* Toggle auto checkout Apps Script sync */}
              <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Kirim Data Payload Ke Apps Script</span>
                  <span className="text-[10px] text-slate-450 block max-w-md mt-0.5">Seketika saat pembayaran sukses, data JSON lengkap transaksi dialirkan via HTTP POST endpoint Apps Script untuk rekap, cetak otomatis, dll.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSyncAppsScript}
                    onChange={(e) => handleSaveSyncConfig({ autoSyncAppsScript: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 font-mono"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Pratinjau Data Real-time */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-slate-850">4. Pratinjau Data Sinkronisasi Lokal</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Lihat data tabel database lokal yang otomatis diteruskan saat pengiriman awan aktif.</p>
                </div>
              </div>

              {/* Tab Toggles */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 select-none overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('trx')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activePreviewTab === 'trx' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Transaksi ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('prod')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activePreviewTab === 'prod' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Katalog ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('kasir')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activePreviewTab === 'kasir' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Kasir Cepat ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('laporan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${activePreviewTab === 'laporan' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Laporan Harian
                </button>
              </div>
            </div>

            {activePreviewTab === 'trx' && (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="px-4 py-3">No. Invoice</th>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Kasir</th>
                      <th className="px-4 py-3 text-right">Grand Total</th>
                      <th className="px-4 py-3 text-center">Status Awan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">Belum ada data transaksi yang dicatat.</td>
                      </tr>
                    ) : (
                      transactions.slice(0, 5).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-850">{t.invoiceNo}</td>
                          <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(t.date).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-slate-700">{t.cashierName}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{formatRupiah(t.grandTotal)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[9px] font-bold py-0.5 px-2 rounded-full uppercase bg-blue-50 text-blue-600 font-mono tracking-wider">Ready / Auto</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activePreviewTab === 'prod' && (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="px-4 py-3">Barcode / Kode</th>
                      <th className="px-4 py-3">Nama Produk</th>
                      <th className="px-4 py-3 text-center">Stok Fisik</th>
                      <th className="px-4 py-3 text-right">Harga Jual</th>
                      <th className="px-4 py-3 text-center font-mono">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">Katalog produk masih kosong. Solusi: Tambahkan data di menu Produk.</td>
                      </tr>
                    ) : (
                      products.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{p.barcode || p.code}</td>
                          <td className="px-4 py-3 font-bold text-slate-850">{p.name}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-600">{p.stock} pcs</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-semibold">{formatRupiah(p.sellingPrice)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[9px] font-extrabold py-0.5 px-2 rounded-full uppercase font-mono ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {p.stock > 0 ? 'Tersedia' : 'Habis'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activePreviewTab === 'kasir' && (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="px-4 py-3">Kasir ID</th>
                      <th className="px-4 py-3">Username Login</th>
                      <th className="px-4 py-3">Nama Lengkap</th>
                      <th className="px-4 py-3">Status / Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400 text-xs">Belum ada kasir terdaftar.</td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-violet-600">{u.id}</td>
                          <td className="px-4 py-3 text-slate-755 font-medium">{u.username}</td>
                          <td className="px-4 py-3 text-slate-700 font-bold">{u.name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-extrabold py-0.5 px-2 rounded-full uppercase font-mono ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                              {u.role}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activePreviewTab === 'laporan' && (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3 text-center">Transaksi</th>
                      <th className="px-4 py-3 text-right">Omset Kotor</th>
                      <th className="px-4 py-3 text-right">Potongan/PPN</th>
                      <th className="px-4 py-3 text-right font-bold text-emerald-600">Profit Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {(() => {
                      const days: { [key: string]: { count: number; subtotal: number; discount: number; tax: number; total: number; cost: number; profit: number } } = {};
                      transactions.forEach(tx => {
                        const dateStr = tx.date.split('T')[0] || tx.date.split(' ')[0] || 'Unknown';
                        if (!days[dateStr]) {
                          days[dateStr] = { count: 0, subtotal: 0, discount: 0, tax: 0, total: 0, cost: 0, profit: 0 };
                        }
                        let txCost = 0;
                        tx.items.forEach(it => {
                          txCost += (it.costPrice || 0) * it.quantity;
                        });
                        days[dateStr].count += 1;
                        days[dateStr].subtotal += tx.subtotal;
                        days[dateStr].discount += tx.discountTotal;
                        days[dateStr].tax += tx.tax;
                        days[dateStr].total += tx.grandTotal;
                        days[dateStr].cost += txCost;
                        days[dateStr].profit += (tx.grandTotal - txCost);
                      });

                      const keys = Object.keys(days).sort((a,b) => b.localeCompare(a));
                      if (keys.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">Belum ada data laporan penjualan harian.</td>
                          </tr>
                        );
                      }

                      return keys.slice(0, 5).map(date => {
                        const day = days[date];
                        return (
                          <tr key={date} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{date}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-600">{day.count} Trx</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700">{formatRupiah(day.subtotal)}</td>
                            <td className="px-4 py-3 text-right text-rose-500 font-medium text-[10px]">
                              -{formatRupiah(day.discount)} (+{formatRupiah(day.tax)})
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(day.profit)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="flex items-center gap-1.5 text-[10px] text-slate-450 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              <span>* Menampilkan 5 Data Terkini dari Database Offline. Gunakan tombol "Sync Semua" di atas untuk menimpa sheet secara manual.</span>
            </div>
          </div>

        </div>

        {/* Right Side: Educational Help Card */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Database Schema Educational block */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cloud className="w-52 h-52 text-white" />
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
              <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">Arsitektur Tabel Database</h4>
            </div>

            <p className="text-[11px] text-slate-350 leading-relaxed">Saat lembar spreadsheet POS dibuat secara otomatis atau manual, pastikan lembar kerja Anda memiliki 4 (empat) sheet dan kolom teratur di bawah ini:</p>

            <div className="space-y-3 pt-2 text-[10px]">
              {/* Sheet 1 */}
              <div className="space-y-2 border-l-2 border-emerald-500 pl-3">
                <span className="font-bold text-emerald-400 block font-mono font-sans">1. Sheet: "Daftar Transaksi"</span>
                <p className="text-slate-400 text-[9px] leading-tight">Mencatat jurnal rekap kasir secara kronologis.</p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-mono text-[9px] text-slate-400 break-words leading-normal">
                  Invoice ID, Waktu Transaksi, Nama Kasir, Metode Pembayaran, Subtotal, Diskon, Pajak PPN, Total Akhir, Daftar Produk / Qty
                </div>
              </div>

              {/* Sheet 2 */}
              <div className="space-y-2 border-l-2 border-blue-500 pl-3">
                <span className="font-bold text-blue-400 block font-mono font-sans">2. Sheet: "Daftar Produk"</span>
                <p className="text-slate-400 text-[9px] leading-tight">Menyinkronkan total persediaan stok dan katalog harga jual.</p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-mono text-[9px] text-slate-400 break-words leading-normal">
                  ID, Kode Produk, Nama Produk, ID Kategori, ID Brand, Harga Modal, Harga Jual, Stok, Barcode
                </div>
              </div>

              {/* Sheet 3 */}
              <div className="space-y-2 border-l-2 border-violet-500 pl-3">
                <span className="font-bold text-violet-400 block font-mono font-sans">3. Sheet: "Daftar Kasir"</span>
                <p className="text-slate-400 text-[9px] leading-tight">Sinkronisasi ID Kasir, Username, Nama Lengkap, & Hak Akses.</p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-mono text-[9px] text-slate-400 break-words leading-normal">
                  ID Kasir, Username, Nama Lengkap, Peran / Hak Akses (Admin / Kasir)
                </div>
              </div>

              {/* Sheet 4 */}
              <div className="space-y-2 border-l-2 border-rose-500 pl-3">
                <span className="font-bold text-rose-400 block font-mono font-sans">4. Sheet: "Laporan Penjualan"</span>
                <p className="text-slate-400 text-[9px] leading-tight">Membentuk ringkasan laporan keuangan omset, komisi, & keuntungan harian.</p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 font-mono text-[9px] text-slate-400 break-words leading-normal">
                  Tanggal, Jumlah Transaksi, Total Subtotal (Kotor), Potongan Diskon, Total Pajak, Omset Total (Bersih), Margin Profit
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-slate-400">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px]">Pembaruan otomatis menjaga integritas inventaris fisik.</span>
            </div>
          </div>

          {/* Quick Stats Connections Indicator */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-widest font-mono">Status Cloud Telemetry</h4>
            
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-450">Sesi Akun Google</span>
                <span className={`font-mono font-bold text-[10px] uppercase ${googleUser ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-50 px-2 py-0.5 rounded'}`}>
                  {googleUser ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-450">Tulis Otomatis Sheets</span>
                <span className={`font-mono font-bold text-[10px] uppercase ${syncConfig.autoSyncSheets ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-50 px-2 py-0.5 rounded'}`}>
                  {syncConfig.autoSyncSheets ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-450">Panggilan Apps Script Web App</span>
                <span className={`font-mono font-bold text-[10px] uppercase ${syncConfig.autoSyncAppsScript ? 'text-purple-600 bg-purple-50 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-50 px-2 py-0.5 rounded'}`}>
                  {syncConfig.autoSyncAppsScript ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-450">Sisa Transaksi Lokal Belum di-Sync</span>
                <span className="font-mono bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded text-[10px]">
                  {transactions.length} baris
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Code script popup modal overlay with beautiful Indonesian instructions */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl flex flex-col gap-4 overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center gap-2 text-purple-600">
                <Terminal className="w-5 h-5 animate-pulse" />
                <h4 className="font-sans font-bold text-slate-800 text-sm">Setup Google Apps Script Webhook</h4>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-450 hover:text-slate-650 font-bold bg-slate-100 hover:bg-slate-200 h-7 w-7 rounded-full flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-600 flex-1 leading-relaxed">
              <p className="font-semibold text-slate-700">Langkah-langkah Membuat Database Webhook dengan Google Apps Script:</p>
              <ol className="list-decimal pl-4 space-y-2 text-[11px]">
                <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5">Google Apps Script <ExternalLink className="w-2.5 h-2.5 inline" /></a>.</li>
                <li>Klik <b>New Project</b> (Proyek Baru) dan beri judul bebas (misal: "Konektor POS").</li>
                <li>Hapus semua script bawaan di dalam editor script.</li>
                <li>Salin & tempel (paste) seluruh kode script di bawah ini ke dalam editor Anda.</li>
                <li>Klik ikon <b>Save Project</b> (Simpan) disket di atas atau tekan Ctrl+S / Cmd+S.</li>
                <li>Klik tombol <b>Deploy</b> &gt; <b>New Deployment</b> di kanan atas.</li>
                <li>Klik gir ikon di kiri <b>Select type</b> lalu pilih <b>Web App</b>.</li>
                <li>Atur konfigurasi deployment:
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-[10px] text-slate-500">
                    <li><b>Execute As:</b> Me (Akun Google Anda saat ini)</li>
                    <li><b>Who has access:</b> Anyone (Siapa saja - agar server POS dapat mengirim HTTP POST tanpa login token user browser)</li>
                  </ul>
                </li>
                <li>Klik <b>Deploy</b>. Anda mungkin dipandu untuk otorisasi akses Drive/Sheet pertama kali.</li>
                <li>Salin (copy) <b>Web App URL</b> yang dihasilkan dan tempel di formulir pengaturan Kasir Pintar!</li>
              </ol>

              {/* Code highlight block */}
              <div className="relative mt-4">
                <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold p-1.5 rounded-lg text-[10px] flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                  >
                    {copiedScript ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Tersalin!' : 'Copy Kode'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-200 text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-60 select-all leading-relaxed whitespace-pre font-mono">
                  {APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end shrink-0">
              <button
                onClick={() => setShowCodeModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 text-xs rounded-xl cursor-pointer transition-colors"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
