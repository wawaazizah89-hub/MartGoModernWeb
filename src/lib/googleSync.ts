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
export const APPS_SCRIPT_TEMPLATE = `// CODE UNTUK DI-PASTE KE GOOGLE APPS SCRIPT (editor di: script.google.com)
// Setelah mem-paste kode ini, deploy sebagai Web App (Akses: Anyone)
// Dan copy URL web app Anda ke isian konfigurasi di Kasir Xcepat!

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Pilih sheet "Daftar Transaksi" atau buat baru
    var sheet = ss.getSheetByName("Daftar Transaksi") || ss.insertSheet("Daftar Transaksi");
    
    // Parse JSON dari payload transaksi
    var data = JSON.parse(e.postData.contents);
    
    // Jika masih kosong, set header
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Invoice ID", 
        "Waktu Transaksi", 
        "Nama Kasir", 
        "Metode Pembayaran", 
        "Subtotal", 
        "Diskon", 
        "Pajak PPN", 
        "Total Akhir", 
        "Daftar Produk / Qty"
      ]);
    }
    
    // Format produk ke string kompak
    var itemsFormatted = data.items.map(function(it) {
      return it.name + " (" + it.quantity + "x)";
    }).join(", ");
    
    // Buat format tanggal lokal
    var localDate = new Date(data.date).toLocaleString('id-ID');
    
    // Tambah baris transaksi baru
    sheet.appendRow([
      data.invoiceNo,
      localDate,
      data.cashierName,
      data.paymentMethod,
      data.subtotal,
      data.discountTotal,
      data.tax,
      data.grandTotal,
      itemsFormatted
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "success", 
      "message": "Transaksi berhasil disimpan ke Apps Script!",
      "invoiceNo": data.invoiceNo 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "error", 
      "message": err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("Konektor Apps Script Kasir Xcepat Aktif!");
}
`;
