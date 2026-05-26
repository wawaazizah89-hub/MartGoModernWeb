import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  Percent, 
  Phone, 
  RotateCcw, 
  Save, 
  ShieldAlert, 
  CheckCircle, 
  Smartphone,
  Database,
  FileSpreadsheet,
  Terminal,
  CloudLightning,
  Copy,
  Check,
  Link,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronRight
} from 'lucide-react';
import { User, UserRole, Product, Transaction } from '../types';
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
  APPS_SCRIPT_TEMPLATE 
} from '../lib/googleSync';

interface SettingsViewProps {
  currentUser: User | null;
  shopName: string;
  setShopName: (name: string) => void;
  taxPercent: number;
  setTaxPercent: (tax: number) => void;
  onRestoreMockSeeds: () => void;
  onSaveNotification: (msg: string, type: 'success' | 'error') => void;
  products: Product[];
  transactions: Transaction[];
}

export default function SettingsView({
  currentUser,
  shopName,
  setShopName,
  taxPercent,
  setTaxPercent,
  onRestoreMockSeeds,
  onSaveNotification,
  products,
  transactions
}: SettingsViewProps) {
  
  const [localShopName, setLocalShopName] = useState(shopName);
  const [localTaxPercent, setLocalTaxPercent] = useState(taxPercent);
  const [address, setAddress] = useState('Kavling Sudirman Indah Blok B-4, Jakarta Selatan, DKI Jakarta');
  const [phone, setPhone] = useState('(021) 8882-1200');

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Google Auth & Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [syncConfig, setSyncConfig] = useState(() => getSyncConfig());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingTrx, setIsSyncingTrx] = useState(false);
  const [isSyncingProd, setIsSyncingProd] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  // Subscribe to Google Authentication state securely on mount (Mandatory single state pattern)
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
      onSaveNotification(`Spreadsheet baru berhasil dibuat di Google Drive! ID: ${newSheetId.slice(0, 10)}...`, 'success');
      
      // Perform initial push sync
      await fetchPushTransactions(newSheetId);
      await fetchPushProducts(newSheetId);
    } catch (err: any) {
      console.error(err);
      onSaveNotification(`Gagal membuat spreadsheet: ${err.message || err}`, 'error');
    } finally {
      setIsCreatingSheet(false);
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
      onSaveNotification('Katalog Produk sukses dinkronkan ke Google Sheets!', 'success');
    } catch (err: any) {
      onSaveNotification(`Sinkronisasi Produk gagal: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingProd(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onSaveNotification('Hanya administrator yang diizinkan mengubah koordinat sistem minimarket!', 'error');
      return;
    }

    setShopName(localShopName);
    setTaxPercent(localTaxPercent);
    onSaveNotification('Konfigurasi minimarket berhasil diperbarui!', 'success');
  };

  const handleRestore = () => {
    if (!isAdmin) {
      alert('Sesi anda tidak diizinkan mengatur ulang sistem!');
      return;
    }
    const yes = window.confirm('Apakah Anda yakin ingin menyetel ulang database pos ke data demo default? Semua riwayat transaksi kustom akan terhapus.');
    if (yes) {
      onRestoreMockSeeds();
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Header alert */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-700 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h5 className="font-bold">Akses Read-Only</h5>
            <p>Halaman pengaturan hanya dapat diubah oleh pemilik dengan role <b>ADMIN</b>. Silakan login admin untuk mengubah nama toko, pajak, dan database.</p>
          </div>
        </div>
      )}

      {/* Main Configurations Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Settings className="w-5.5 h-5.5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-slate-800 text-sm">Profil & Pajak Minimarket</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Atur nama toko, tarif pajak PPN, dan detil fisik yang tertera di struk cetak.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
              Nama Minimarket
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Store className="w-4 h-4" />
              </span>
              <input
                type="text"
                disabled={!isAdmin}
                value={localShopName}
                onChange={(e) => setLocalShopName(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Pajak Penjualan (PPN %)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs font-mono">
                  %
                </span>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={localTaxPercent}
                  onChange={(e) => setLocalTaxPercent(Math.max(0, Number(e.target.value)))}
                  required
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl outline-none focus:bg-white focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Telepon Minimarket
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-600 rounded-xl outline-none focus:bg-white focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
              Alamat Outlet Minimarket
            </label>
            <textarea
              disabled={!isAdmin}
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-slate-600 disabled:opacity-50"
            ></textarea>
          </div>

          {isAdmin && (
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-500/10"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          )}
        </form>
      </div>

      {/* Google Sheets & Apps Script Integration Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <Database className="w-5.5 h-5.5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-slate-800 text-sm">Integrasi Google Sheets & Apps Script</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Hubungkan kasir ke cloud data Google atau panggil web layanan Apps Script secara real-time.</p>
          </div>
        </div>

        {/* 1. Google OAuth Status Connection */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {googleUser ? (
              <>
                <img
                  src={googleUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop"}
                  alt={googleUser.displayName} 
                  className="w-10 h-10 rounded-full border border-blue-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 truncate">{googleUser.displayName}</h5>
                  <p className="text-[10px] text-slate-400 truncate">{googleUser.email}</p>
                  <span className="text-[9px] bg-green-100 text-green-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 inline-block font-mono">Terkoneksi Google</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0">
                  G
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Google Sheets Cloud Off</h5>
                  <p className="text-[10px] text-slate-400">Silakan login untuk mengaktifkan sinkronisasi sheets langsung.</p>
                </div>
              </>
            )}
          </div>

          <div>
            {googleUser ? (
              <button
                type="button"
                onClick={handleGoogleLogout}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 font-bold px-3 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
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
                    <span>Hubungkan Akun Google</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 2. Google Sheets Detailed Configuration */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">1. Konfigurasi Google Sheets</span>
          </div>

          <div className="space-y-3.5">
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
                    className="text-blue-600 hover:text-blue-800 text-[10px] font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
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
                placeholder="Masukkan ID Spreadsheet Google (misal: 1zUxZ...)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl outline-none focus:bg-white focus:border-blue-500 text-slate-700"
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
              <p className="text-[9px] text-slate-400 mt-1">ID spreadsheet dapat diambil dari URL spreadsheet di Google Drive Anda.</p>
            </div>

            {/* Toggle auto checkout sync */}
            <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Auto-Sync via Google Sheets</span>
                <span className="text-[10px] text-slate-400">Menulis baris transaksi baru di Sheet "Daftar Transaksi" seketika saat kasir menekan Bayar.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncConfig.autoSyncSheets}
                  onChange={(e) => handleSaveSyncConfig({ autoSyncSheets: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Manual synchronization triggers */}
            {googleUser && syncConfig.spreadsheetId && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSyncingTrx}
                  onClick={() => fetchPushTransactions()}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncingTrx ? 'animate-spin' : ''}`} />
                  <span>{isSyncingTrx ? 'Sedang Sync...' : 'Sync Transaksi'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSyncingProd}
                  onClick={() => fetchPushProducts()}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncingProd ? 'animate-spin' : ''}`} />
                  <span>{isSyncingProd ? 'Sedang Sync...' : 'Sync Katalog'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Google Apps Script Web App Endpoint */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">2. Konektor Google Apps Script API</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCodeModal(true)}
              className="text-purple-650 hover:text-purple-850 text-[10px] font-bold cursor-pointer flex items-center gap-1"
            >
              <span>Lihat Kode Script</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                URL Web App Google Apps Script
              </label>
              <input
                type="url"
                value={syncConfig.appsScriptUrl}
                onChange={(e) => handleSaveSyncConfig({ appsScriptUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl outline-none focus:bg-white focus:border-blue-500 text-slate-755"
              />
              {syncConfig.appsScriptUrl && !syncConfig.appsScriptUrl.startsWith('http') && syncConfig.appsScriptUrl.startsWith('AKfycb') && (
                <p className="text-[10px] text-rose-500 font-bold mt-1 bg-rose-50 p-2 rounded-lg border border-rose-150">
                  ⚠️ Peringatan: Anda memasukkan ID Deployment saja. Kolom ini membutuhkan tautan Web App utuh, silakan ubah masukan Anda menjadi: <span className="font-mono text-[9px] block bg-white border border-rose-200 rounded p-1 mt-1 text-slate-600 select-all">https://script.google.com/macros/s/{syncConfig.appsScriptUrl}/exec</span>
                </p>
              )}
              <p className="text-[9px] text-slate-400 mt-1">Gunakan ini sebagai database-webhook cloud tanpa persetujuan login Google client.</p>
            </div>

            {/* Toggle auto checkout Apps Script sync */}
            <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Auto-Sync via Apps Script</span>
                <span className="text-[10px] text-slate-400">Mengirim data payload transaksi (JSON POST) ke Web App Apps Script secara otomatis pasca-checkout.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncConfig.autoSyncAppsScript}
                  onChange={(e) => handleSaveSyncConfig({ autoSyncAppsScript: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Database control panel (Mocks Reset trigger) */}
      <div className="bg-white p-6 rounded-3xl border border-rose-50/10 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <RotateCcw className="w-5.5 h-5.5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-slate-800 text-sm">Pusat Reset Sistem</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Kembalikan seluruh produk, brand, dan transaksi ke data pre-seed pertama kali.</p>
          </div>
        </div>

        <div className="text-xs text-slate-500/90 leading-relaxed bg-slate-50/60 border border-slate-100 p-4 rounded-2xl space-y-2">
          <p>Jika Anda melakukan banyak tes transaksi atau menghapus data-data demo bawaan dan ingin mengulang demo dengan data yang fresh, klik tombol di bawah untuk membersihkan localStorage.</p>
          
          {isAdmin && (
            <button
              onClick={handleRestore}
              className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold border-2 border-slate-200 hover:border-rose-250 font-mono text-[10px] px-3.5 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>SETEL ULANG DATABASE DEMO (RESET)</span>
            </button>
          )}
        </div>
      </div>

      {/* Code script popup modal overlay */}
    {showCodeModal && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl flex flex-col gap-4 overflow-hidden max-h-[90vh]">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2 text-purple-600">
              <Terminal className="w-5 h-5 animate-pulse" />
              <h4 className="font-sans font-bold text-slate-800 text-sm">Setup Google Apps Script Webhook</h4>
            </div>
            <button
              onClick={() => setShowCodeModal(false)}
              className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 h-7 w-7 rounded-full flex items-center justify-center text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-600 flex-1 leading-relaxed">
            <p className="font-semibold text-slate-700">Langkah-langkah Membuat Database Webhook dengan Google Apps Script:</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">Google Apps Script</a>.</li>
              <li>Klik <b>New Project</b> (Proyek Baru) dan beri judul (misal: "Konektor Kasir").</li>
              <li>Hapus semua kode bawaan di dalam editor.</li>
              <li>Salin & tempel (paste) seluruh kode script di bawah ini ke dalam editor.</li>
              <li>Klik ikon <b>Save</b> (Simpan) atau tekan Ctrl+S / Cmd+S.</li>
              <li>Klik tombol <b>Deploy</b> &gt; <b>New Deployment</b> di bagian kanan atas editor.</li>
              <li>Klik gir ikon di kiri <b>Select type</b> lalu pilih <b>Web App</b>.</li>
              <li>Atur konfigurasi deployment:
                <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px]">
                  <li><b>Execute As:</b> Me (Akun Google Anda saat ini)</li>
                  <li><b>Who has access:</b> Anyone (Siapa saja - agar web app menerima HTTP POST dari Kasir POS)</li>
                </ul>
              </li>
              <li>Klik <b>Deploy</b>, lalu salin (copy) <b>Web App URL</b> yang dihasilkan dan tempel di form pengaturan Kasir!</li>
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
              <pre className="bg-slate-900 text-slate-200 text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-60 select-all leading-relaxed whitespace-pre">
                {APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-end">
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
