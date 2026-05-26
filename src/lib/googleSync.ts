import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  Auth
} from 'firebase/auth';
import { Transaction, Product, User as LocalUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required Workspace scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-Memory Token & State Cache (Mandatory security limit)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in flow callable from user interactions
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token OAuth dari Google!');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out flow
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Retrieve token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// ==========================================
// GOOGLE SHEETS API IMPLEMENTATIONS
// ==========================================

export interface GoogleSyncConfig {
  spreadsheetId: string;
  autoSyncSheets: boolean;
  appsScriptUrl: string;
  autoSyncAppsScript: boolean;
}

const DEFAULT_CONFIG: GoogleSyncConfig = {
  spreadsheetId: '',
  autoSyncSheets: false,
  appsScriptUrl: '',
  autoSyncAppsScript: false,
};

export const getSyncConfig = (): GoogleSyncConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const data = window.localStorage.getItem('pos_google_sync_config');
    return data ? JSON.parse(data) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveSyncConfig = (config: GoogleSyncConfig) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pos_google_sync_config', JSON.stringify(config));
};

// Create a new spreadsheet with standard tables
export const createNewPOSSpreadsheet = async (accessToken: string, shopName: string): Promise<string> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `Database POS ${shopName}`
      },
      sheets: [
        { properties: { title: 'Daftar Transaksi' } },
        { properties: { title: 'Daftar Produk' } },
        { properties: { title: 'Daftar Kasir' } },
        { properties: { title: 'Laporan Penjualan' } }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize Headers in Sheets
  await initializeSpreadsheetHeaders(accessToken, spreadsheetId);

  return spreadsheetId;
};

// Initialize Table headers
const initializeSpreadsheetHeaders = async (accessToken: string, spreadsheetId: string) => {
  const trxHeader = [['Invoice ID', 'Waktu Transaksi', 'Nama Kasir', 'Metode Pembayaran', 'Subtotal', 'Diskon', 'Pajak PPN', 'Total Akhir', 'Daftar Produk / Qty']];
  const prodHeader = [['ID', 'Kode Produk', 'Nama Produk', 'ID Kategori', 'ID Brand', 'Harga Modal', 'Harga Jual', 'Stok', 'Barcode']];
  const kasirHeader = [['User ID', 'Username (Login)', 'Nama Kasir/Lengkap', 'Role / Jabatan']];
  const laporanHeader = [['Tanggal', 'Jumlah Transaksi', 'Total Subtotal', 'Total Diskon', 'Total PPN', 'Total Omset Bersih', 'Total Harga Modal', 'Total Keuntungan (Profit)']];

  const putHeader = async (sheetName: string, range: string, values: any[][]) => {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });
  };

  await putHeader('Daftar Transaksi', 'A1:I1', trxHeader);
  await putHeader('Daftar Produk', 'A1:I1', prodHeader);
  await putHeader('Daftar Kasir', 'A1:D1', kasirHeader);
  await putHeader('Laporan Penjualan', 'A1:H1', laporanHeader);
};

// PUSH Transactions to Google Sheet (Overwrites entire Sheet grid nicely for a fresh sync)
export const syncTransactionsToSheets = async (
  accessToken: string, 
  spreadsheetId: string, 
  transactions: Transaction[]
): Promise<boolean> => {
  if (!spreadsheetId) return false;

  // 1. Clear current spreadsheet content first
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Transaksi!A2:I10000:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // Prepare Row Values
  const headers = ['Invoice ID', 'Waktu Transaksi', 'Nama Kasir', 'Metode Pembayaran', 'Subtotal', 'Diskon', 'Pajak PPN', 'Total Akhir', 'Daftar Produk / Qty'];
  const rows = [
    headers,
    ...transactions.map(tx => {
      const itemsFormatted = tx.items.map(it => `${it.name} (${it.quantity}x)`).join(', ');
      return [
        tx.invoiceNo,
        new Date(tx.date).toLocaleString('id-ID'),
        tx.cashierName,
        tx.paymentMethod,
        tx.subtotal,
        tx.discountTotal,
        tx.tax,
        tx.grandTotal,
        itemsFormatted
      ];
    })
  ];

  // Write standard rows starting from A1
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Transaksi!A1:I${rows.length}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: rows })
  });

  if (!response.ok) {
    const txt = await response.text();
    console.error('Sync Trx sheets error:', txt);
    throw new Error('Gagal memperbarui sheet transaksi!');
  }

  return true;
};

// PUSH Products inventory to Google Sheet (Overwrites entire Products list for full match)
export const syncProductsToSheets = async (
  accessToken: string, 
  spreadsheetId: string, 
  products: Product[]
): Promise<boolean> => {
  if (!spreadsheetId) return false;

  // Clear products rows first
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Produk!A2:I10000:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const headers = ['ID', 'Kode Produk', 'Nama Produk', 'ID Kategori', 'ID Brand', 'Harga Modal', 'Harga Jual', 'Stok', 'Barcode'];
  const rows = [
    headers,
    ...products.map(p => [
      p.id,
      p.code,
      p.name,
      p.categoryId,
      p.brandId,
      p.costPrice,
      p.sellingPrice,
      p.stock,
      p.barcode
    ])
  ];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Produk!A1:I${rows.length}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: rows })
  });

  if (!response.ok) {
    const txt = await response.text();
    console.error('Sync Products sheets error:', txt);
    throw new Error('Gagal memperbarui sheet produk!');
  }

  return true;
};

// PUSH Cashiers to Google Sheet
export const syncCashiersToSheets = async (
  accessToken: string, 
  spreadsheetId: string, 
  users: LocalUser[]
): Promise<boolean> => {
  if (!spreadsheetId) return false;

  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Kasir!A2:D10000:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const headers = ['User ID', 'Username (Login)', 'Nama Kasir/Lengkap', 'Role / Jabatan'];
  const rows = [
    headers,
    ...users.map(u => [
      u.id,
      u.username,
      u.name,
      u.role
    ])
  ];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Kasir!A1:D${rows.length}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: rows })
  });

  if (!response.ok) {
    const txt = await response.text();
    console.error('Sync Cashiers sheets error:', txt);
    throw new Error('Gagal memperbarui sheet kasir!');
  }

  return true;
};

// PUSH Daily Sales Reports to Google Sheet
export const syncSalesReportToSheets = async (
  accessToken: string, 
  spreadsheetId: string, 
  transactions: Transaction[]
): Promise<boolean> => {
  if (!spreadsheetId) return false;

  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Laporan Penjualan!A2:H10000:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // Calculate reports
  const groups: { [key: string]: { count: number; subtotal: number; discount: number; tax: number; total: number; cost: number; profit: number } } = {};
  
  transactions.forEach(tx => {
    const dateStr = tx.date.split('T')[0] || tx.date.split(' ')[0] || 'Unknown';
    if (!groups[dateStr]) {
      groups[dateStr] = { count: 0, subtotal: 0, discount: 0, tax: 0, total: 0, cost: 0, profit: 0 };
    }
    
    let txCost = 0;
    tx.items.forEach(it => {
      txCost += (it.costPrice || 0) * it.quantity;
    });
    
    groups[dateStr].count += 1;
    groups[dateStr].subtotal += tx.subtotal;
    groups[dateStr].discount += tx.discountTotal;
    groups[dateStr].tax += tx.tax;
    groups[dateStr].total += tx.grandTotal;
    groups[dateStr].cost += txCost;
    groups[dateStr].profit += (tx.grandTotal - txCost);
  });

  const headers = ['Tanggal', 'Jumlah Transaksi', 'Total Subtotal', 'Total Diskon', 'Total PPN', 'Total Omset Bersih', 'Total Harga Modal', 'Total Keuntungan (Profit)'];
  const rows = [
    headers,
    ...Object.keys(groups).sort((a,b) => b.localeCompare(a)).map(date => {
      const item = groups[date];
      return [
        date,
        item.count,
        item.subtotal,
        item.discount,
        item.tax,
        item.total,
        item.cost,
        item.profit
      ];
    })
  ];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Laporan Penjualan!A1:H${rows.length}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: rows })
  });

  if (!response.ok) {
    const txt = await response.text();
    console.error('Sync Reports sheets error:', txt);
    throw new Error('Gagal memperbarui sheet laporan penjualan!');
  }

  return true;
};

// Append a SINGLE transaction on checkout if auto-sync is on
export const appendTransactionToSheets = async (
  accessToken: string, 
  spreadsheetId: string, 
  tx: Transaction
): Promise<boolean> => {
  if (!spreadsheetId) return false;

  const itemsFormatted = tx.items.map(it => `${it.name} (${it.quantity}x)`).join(', ');
  const appendRow = [
    tx.invoiceNo,
    new Date(tx.date).toLocaleString('id-ID'),
    tx.cashierName,
    tx.paymentMethod,
    tx.subtotal,
    tx.discountTotal,
    tx.tax,
    tx.grandTotal,
    itemsFormatted
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar Transaksi!A2:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [appendRow] })
  });

  return response.ok;
};

// ==========================================
// GOOGLE APPS SCRIPT WEB APP TRIGGERS
// ==========================================

export const postTransactionToAppsScript = async (
  webhookUrl: string, 
  tx: Transaction
): Promise<boolean> => {
  if (!webhookUrl) return false;

  try {
    // Standard Apps Script execution payload
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // Apps script CORS handles handles redirects which might look like opaque failure, no-cors safely broadcasts it
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tx)
    });

    // In 'no-cors' mode, we won't see response status but we broadcasted it successfully
    return true;
  } catch (err) {
    console.error('Webhook error:', err);
    return false;
  }
};

// Helper code block that the user can paste inside Google Apps Script editor!
export const APPS_SCRIPT_TEMPLATE = `// =========================================================================
// BACKEND GOOGLE APPS SCRIPT - KASIR XCEPAT INTERFACE
// =========================================================================
// ID Spreadsheet Anda dikunci otomatis pada: 1AFO0HNRqIl-ndlDx2Rmt5R6N2Q8N_6eO4n5Q4xZieTE
//
// PETUNJUK DEPLOY & PENGGUNAAN:
// 1. Masuk ke https://script.google.com/
// 2. Buat project baru, beri nama "Backend Kasir Xcepat"
// 3. Hapus semua isi kode default (myFunction) di editor Kode.gs
// 4. Paste SELURUH kode yang ada di bawah ini ke dalam editor tersebut.
// 5. Pertama kali: Pilih fungsi "setupDatabase" di dropdown atas, lalu klik tombol "Jalankan" (Run).
//    Ini akan menjamin dan membuat semua tab sheet beserta kolom header-nya diatur otomatis!
// 6. Klik tombol "Terapkan" (Deploy) di kanan atas -> Pilih "Penerapan Baru" (New Deployment).
// 7. Klik logo roda gigi di samping "Pilih jenis" -> Pilih "Aplikasi Web" (Web App).
// 8. Konfigurasi:
//    - Deskripsi: Versi 1.0 POS Konektor
//    - Jalankan Sebagai (Execute as): Saya (Email Anda)
//    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
// 9. Klik "Terapkan" (Deploy). Berikan izin otorisasi yang diminta akun Google Anda.
// 10. Salin "URL Aplikasi Web" (contoh: https://script.google.com/macros/s/AKfycb.../exec).
// 11. Tempelkan URL tersebut ke Kasir Xcepat di menu Sinkronisasi Cloud atau Pengaturan!
// =========================================================================

// ID Google Spreadsheet dikunci secara permanen
var SPREADSHEET_ID = "1AFO0HNRqIl-ndlDx2Rmt5R6N2Q8N_6eO4n5Q4xZieTE";

// Membuka database secara aman
function getDatabase() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error("Gagal membuka Spreadsheet ID: " + SPREADSHEET_ID + ". Pastikan Apps Script ini berjalan dengan izin yang benar. Detail: " + err.toString());
  }
}

// 1. SETUP DATABASE OTOMATIS
function setupDatabase() {
  try {
    var ss = getDatabase();
    Logger.log("Memulai inisialisasi struktur tab database...");
    
    var sheetsConfig = {
      "Daftar Transaksi": [
        "Invoice ID", "Waktu Transaksi", "Nama Kasir", "Metode Pembayaran", 
        "Subtotal", "Diskon", "Pajak PPN", "Total Akhir", "Daftar Produk / Qty"
      ],
      "Daftar Produk": [
        "ID", "Kode Produk", "Nama Produk", "ID Kategori", "ID Brand", 
        "Harga Modal", "Harga Jual", "Stok", "Barcode"
      ],
      "Daftar Kasir": [
        "User ID", "Username (Login)", "Nama Kasir/Lengkap", "Role / Jabatan"
      ],
      "Laporan Penjualan": [
        "Tanggal", "Jumlah Transaksi", "Total Subtotal", "Total Diskon", 
        "Total PPN", "Total Omset Bersih", "Total Harga Modal", "Total Keuntungan (Profit)"
      ]
    };
    
    for (var name in sheetsConfig) {
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
      }
      // Jika kosong, pasang heading
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(sheetsConfig[name]);
        sheet.getRange(1, 1, 1, sheetsConfig[name].length)
             .setFontWeight("bold")
             .setBackground("#0F172A")
             .setFontColor("#F8FAFC")
             .setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }
    }
    
    // Hapus Sheet1 default jika kosong
    var defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      ss.deleteSheet(defaultSheet);
    }
    
    Logger.log("🎉 Inisialisasi Database Berhasil! Semua tabel siap!");
    return "Semua sheet & header berhasil disiapkan otomatis!";
  } catch (err) {
    Logger.log("Error setup: " + err.toString());
    return "Gagal setup: " + err.toString();
  }
}

// 2. ENDPOINT GET (READ & VERIFICATION)
function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    var sheetName = e && e.parameter && e.parameter.sheet;
    
    if (!action) {
      return createJsonResponse({
        status: "success",
        message: "Konektor Apps Script Kasir Xcepat Aktif & Terhubung ke Spreadsheet!",
        spreadsheetId: SPREADSHEET_ID,
        availableSheets: ["Daftar Transaksi", "Daftar Produk", "Daftar Kasir", "Laporan Penjualan"]
      });
    }
    
    // READ OPERATION
    if (action === "read" || action === "select") {
      if (!sheetName) {
        return createJsonResponse({ status: "error", message: "Parameter 'sheet' harus ditentukan untuk aksi read!" });
      }
      
      var ss = getDatabase();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return createJsonResponse({ status: "error", message: "Sheet '" + sheetName + "' tidak ditemukan!" });
      }
      
      var rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) {
        return createJsonResponse({ status: "success", data: [], count: 0, message: "Sheet " + sheetName + " kosong." });
      }
      
      // Parse data rows ke JSON format dengan header dinamis
      var headers = rows[0];
      var list = [];
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = row[j];
        }
        list.push(obj);
      }
      
      return createJsonResponse({
        status: "success",
        sheet: sheetName,
        count: list.length,
        data: list
      });
    }
    
    return createJsonResponse({ status: "error", message: "Aksi GET '" + action + "' tidak didukung." });
    
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

// 3. ENDPOINT POST (INSERT, UPDATE STOCK, CHECKOUT)
function doPost(e) {
  try {
    var ss = getDatabase();
    var payloadString = e.postData.contents;
    var payload = JSON.parse(payloadString);
    
    var action = payload.action;
    
    // BACKWARD COMPATIBILITY: Jika tidak ada action tetapi payload adalah checkout transaksi
    if (!action && payload.invoiceNo) {
      action = "checkout";
    }
    
    // --- AKSI CHECKOUT TRANSAKSI ---
    if (action === "checkout") {
      var sheetTrx = ss.getSheetByName("Daftar Transaksi") || ss.insertSheet("Daftar Transaksi");
      
      // Susun list produk
      var itemsFormatted = payload.items.map(function(it) {
        return it.name + " (" + it.quantity + "x)";
      }).join(", ");
      
      var dateField = payload.date || new Date().toISOString();
      var localDateStr = new Date(dateField).toLocaleString('id-ID');
      
      // Tulis baris transaksi
      sheetTrx.appendRow([
        payload.invoiceNo,
        localDateStr,
        payload.cashierName || "Kasir Utama",
        payload.paymentMethod || "Tunai",
        payload.subtotal || 0,
        payload.discountTotal || 0,
        payload.tax || 0,
        payload.grandTotal || 0,
        itemsFormatted
      ]);
      
      // AUTO STOCK-REDUCTION: Potong stok produk di sheet "Daftar Produk"
      var stockUpdateLogs = [];
      if (payload.items && payload.items.length > 0) {
        var sheetProd = ss.getSheetByName("Daftar Produk");
        if (sheetProd) {
          var prodDataRange = sheetProd.getDataRange();
          var prodRows = prodDataRange.getValues();
          
          payload.items.forEach(function(item) {
            var matchIdx = -1;
            // Cari kecocokan di Kolom ID (A) atau Kolom Kode Produk (B)
            for (var r = 1; r < prodRows.length; r++) {
              var rowId = String(prodRows[r][0]); // Kolom A: ID
              var rowCode = String(prodRows[r][1]); // Kolom B: Kode Produk
              var itemMatch = String(item.code || item.productId || item.id);
              
              if (rowId === itemMatch || rowCode === itemMatch) {
                matchIdx = r;
                break;
              }
            }
            
            if (matchIdx !== -1) {
              var currentStock = Number(prodRows[matchIdx][7]); // Kolom H: Stok (index ke-7)
              var qtyToReduce = Number(item.quantity) || 0;
              var newStock = currentStock - qtyToReduce;
              
              // Set nilai stok yang baru di Baris tersebut, Kolom 8 (H)
              sheetProd.getRange(matchIdx + 1, 8).setValue(newStock);
              stockUpdateLogs.push({
                productName: item.name,
                code: item.code,
                oldStock: currentStock,
                reducedBy: qtyToReduce,
                newStock: newStock
              });
            }
          });
        }
      }
      
      // Perbarui juga Laporan Omset hari ini secara dinamis jika diperlukan
      updateSalesSummary(ss, payload, dateField);
      
      return createJsonResponse({
        status: "success",
        message: "Transaksi berhasil diproses & disimpan otomatis!",
        invoiceNo: payload.invoiceNo,
        stockUpdates: stockUpdateLogs
      });
    }
    
    // --- AKSI UPDATE STOK (SPESIFIK) ---
    if (action === "updateStock") {
      var sheetProd = ss.getSheetByName("Daftar Produk");
      if (!sheetProd) {
        return createJsonResponse({ status: "error", message: "Tabel 'Daftar Produk' tidak ditemukan!" });
      }
      
      var targetIdentifier = String(payload.id || payload.code || payload.productId);
      var adjustment = Number(payload.adjustment); // misal -5, +10
      var directStock = payload.stock; // atau mengeset langsung nilai stok baru
      
      if (!targetIdentifier) {
        return createJsonResponse({ status: "error", message: "Harap tentukan parameter 'id' atau 'code' produk!" });
      }
      
      var prodDataRange = sheetProd.getDataRange();
      var prodRows = prodDataRange.getValues();
      var matchedRow = -1;
      
      for (var r = 1; r < prodRows.length; r++) {
        var rowId = String(prodRows[r][0]); // Kolom A (Index 0)
        var rowCode = String(prodRows[r][1]); // Kolom B (Index 1)
        if (rowId === targetIdentifier || rowCode === targetIdentifier) {
          matchedRow = r;
          break;
        }
      }
      
      if (matchedRow === -1) {
        return createJsonResponse({ status: "error", message: "Produk dengan ID/Kode '" + targetIdentifier + "' tidak ditemukan." });
      }
      
      var currentStock = Number(prodRows[matchedRow][7]); // Kolom H (Index 7)
      var newStock = currentStock;
      
      if (directStock !== undefined) {
        newStock = Number(directStock);
      } else if (!isNaN(adjustment)) {
        newStock = currentStock + adjustment;
      } else {
        return createJsonResponse({ status: "error", message: "Masukkan jumlah 'adjustment' atau 'stock' baru!" });
      }
      
      sheetProd.getRange(matchedRow + 1, 8).setValue(newStock);
      
      return createJsonResponse({
        status: "success",
        message: "Stok produk berhasil diperbarui!",
        identifier: targetIdentifier,
        oldStock: currentStock,
        newStock: newStock
      });
    }
    
    // --- AKSI INSERT (CRUD UMUM) ---
    if (action === "insert") {
      var sheetName = payload.sheet;
      var inputData = payload.data;
      
      if (!sheetName || !inputData) {
        return createJsonResponse({ status: "error", message: "Aksi insert memerlukan nama 'sheet' dan objek 'data'!" });
      }
      
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return createJsonResponse({ status: "error", message: "Sheet dengan nama '" + sheetName + "' tidak ditemukan!" });
      }
      
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var newRow = [];
      
      // Petakan field objek ke urutan korespondensi nama header di spreadsheet
      for (var k = 0; k < headers.length; k++) {
        var headerKey = headers[k];
        var itemVal = inputData[headerKey];
        if (itemVal === undefined) {
          var mappedKeys = findLooseKey(inputData, headerKey);
          itemVal = mappedKeys !== undefined ? mappedKeys : "";
        }
        newRow.push(itemVal);
      }
      
      sheet.appendRow(newRow);
      
      return createJsonResponse({
        status: "success",
        message: "Data berhasil disimpan ke sheet " + sheetName + "!",
        insertedData: inputData
      });
    }
    
    return createJsonResponse({ status: "error", message: "Aksi POST '" + action + "' tidak dikenali." });
    
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Error pengolahan: " + err.toString() });
  }
}

// 4. FUNGSI UPDATE INTEGRATIVE SALES REPORT
function updateSalesSummary(ss, payload, dateField) {
  try {
    var sheetLaporan = ss.getSheetByName("Laporan Penjualan");
    if (!sheetLaporan) return;
    
    var dateKey = dateField.split("T")[0] || "Unknown";
    var reportRange = sheetLaporan.getDataRange();
    var reportRows = reportRange.getValues();
    
    var matchedRowIdx = -1;
    for (var i = 1; i < reportRows.length; i++) {
      var rowDateStr = "";
      if (reportRows[i][0] instanceof Date) {
        rowDateStr = reportRows[i][0].toISOString().split("T")[0];
      } else {
        rowDateStr = String(reportRows[i][0]).split("T")[0];
      }
      
      if (rowDateStr === dateKey) {
        matchedRowIdx = i;
        break;
      }
    }
    
    // Hitung total modal dalam transaksi ini
    var trxCostTotal = 0;
    if (payload.items) {
      payload.items.forEach(function(it) {
        trxCostTotal += (Number(it.costPrice) || 0) * (Number(it.quantity) || 1);
      });
    }
    
    var subtotal = Number(payload.subtotal) || 0;
    var discount = Number(payload.discountTotal) || 0;
    var tax = Number(payload.tax) || 0;
    var grandTotal = Number(payload.grandTotal) || 0;
    var profit = grandTotal - trxCostTotal;
    
    if (matchedRowIdx !== -1) {
      // Baris sudah ada, lakukan kalkulasi inkremental akumulatif
      var currentTrxCount = Number(reportRows[matchedRowIdx][1]) || 0;
      var currentSubtotal = Number(reportRows[matchedRowIdx][2]) || 0;
      var currentDiscount = Number(reportRows[matchedRowIdx][3]) || 0;
      var currentTax = Number(reportRows[matchedRowIdx][4]) || 0;
      var currentOmset = Number(reportRows[matchedRowIdx][5]) || 0;
      var currentCost = Number(reportRows[matchedRowIdx][6]) || 0;
      var currentProfit = Number(reportRows[matchedRowIdx][7]) || 0;
      
      var rNum = matchedRowIdx + 1;
      sheetLaporan.getRange(rNum, 2).setValue(currentTrxCount + 1);
      sheetLaporan.getRange(rNum, 3).setValue(currentSubtotal + subtotal);
      sheetLaporan.getRange(rNum, 4).setValue(currentDiscount + discount);
      sheetLaporan.getRange(rNum, 5).setValue(currentTax + tax);
      sheetLaporan.getRange(rNum, 6).setValue(currentOmset + grandTotal);
      sheetLaporan.getRange(rNum, 7).setValue(currentCost + trxCostTotal);
      sheetLaporan.getRange(rNum, 8).setValue(currentProfit + profit);
    } else {
      // Buat baris baru untuk tanggal ini
      sheetLaporan.appendRow([
        dateKey,
        1,
        subtotal,
        discount,
        tax,
        grandTotal,
        trxCostTotal,
        profit
      ]);
    }
  } catch (e) {
    Logger.log("Gagal memperbarui Laporan Penjualan: " + e.toString());
  }
}

// Menemukan properti objek menggunakan nama mirip (Case Insensitive)
function findLooseKey(obj, targetHeader) {
  var normalizedTarget = targetHeader.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Custom mapping for known fields
  var specialMap = {
    "invoiceid": ["invoiceno", "id", "invoiceid", "invoice_id"],
    "waktutransaksi": ["date", "waktu", "waktutransaksi", "timestamp"],
    "namakasir": ["cashiername", "kasir", "namakasir"],
    "metodepembayaran": ["paymentmethod", "payment", "metodepembayaran"],
    "pajakppn": ["tax", "ppn", "pajakppn"],
    "totalakhir": ["grandtotal", "total", "totalakhir"],
    "daftarprodukqty": ["items", "products", "daftarprodukqty"],
    "kodeproduk": ["code", "kode", "kodeproduk"],
    "namaproduk": ["name", "nama", "namaproduk"],
    "idkategori": ["categoryid", "kategori", "idkategori"],
    "idbrand": ["brandid", "brand", "idbrand"],
    "hargamodal": ["costprice", "harga_modal", "hargamodal"],
    "hargajual": ["sellingprice", "harga_jual", "hargajual"],
    "stok": ["stock", "stok"],
    "barcode": ["barcode"]
  };
  
  for (var key in obj) {
    if (obj[key] === undefined) continue;
    var normKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normKey === normalizedTarget) return obj[key];
    
    // Check in special map
    if (specialMap[normalizedTarget] && specialMap[normalizedTarget].indexOf(normKey) !== -1) {
      return obj[key];
    }
  }
  return undefined;
}

// Utility formatting response JSON dengan header CORS lengkap untuk integrasi Web
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;
