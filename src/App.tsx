import React, { useState, useEffect, useMemo } from 'react';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CATEGORIES, 
  INITIAL_BRANDS, 
  INITIAL_USERS, 
  INITIAL_TRANSACTIONS, 
  getFromLS, 
  saveToLS 
} from './data';
import { Product, Category, Brand, Transaction, User, UserRole } from './types';
import { 
  getSyncConfig, 
  getAccessToken, 
  appendTransactionToSheets, 
  postTransactionToAppsScript 
} from './lib/googleSync';
import { Printer } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import ProductsView from './components/ProductsView';
import HistoryView from './components/HistoryView';
import ReportsView from './components/ReportsView';
import UsersView from './components/UsersView';
import SettingsView from './components/SettingsView';
import CloudDatabaseView from './components/CloudDatabaseView';
import Notification, { Toast } from './components/Notification';

export default function App() {
  // Main System State
  const [currentUser, setCurrentUser] = useState<User | null>(() => 
    getFromLS<User | null>('pos_logged_user', null)
  );
  const [activeView, setActiveView] = useState<string>('dashboard');

  const [products, setProducts] = useState<Product[]>(() => 
    getFromLS<Product[]>('pos_products', INITIAL_PRODUCTS)
  );
  const [categories, setCategories] = useState<Category[]>(() => 
    getFromLS<Category[]>('pos_categories', INITIAL_CATEGORIES)
  );
  const [brands, setBrands] = useState<Brand[]>(() => 
    getFromLS<Brand[]>('pos_brands', INITIAL_BRANDS)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    getFromLS<Transaction[]>('pos_transactions', INITIAL_TRANSACTIONS)
  );
  const [users, setUsers] = useState<User[]>(() => 
    getFromLS<User[]>('pos_users', INITIAL_USERS)
  );
  const [shopName, setShopName] = useState<string>(() => 
    getFromLS<string>('pos_shop_name', 'MartGo Modern')
  );
  const [taxPercent, setTaxPercent] = useState<number>(() => 
    getFromLS<number>('pos_tax_percent', 11) // standard PPN Indonesia
  );

  // Floating Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add toast notification helper
  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync to local storage
  useEffect(() => {
    saveToLS('pos_logged_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToLS('pos_products', products);
  }, [products]);

  useEffect(() => {
    saveToLS('pos_transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    saveToLS('pos_users', users);
  }, [users]);

  useEffect(() => {
    saveToLS('pos_shop_name', shopName);
  }, [shopName]);

  useEffect(() => {
    saveToLS('pos_tax_percent', taxPercent);
  }, [taxPercent]);

  // Derive products that are low in stock
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Auth Operations
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    addToast(`Selamat datang kembali, ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('dashboard');
    addToast('Sesi kasir berhasil diakhiri.', 'info');
  };

  const triggerCloudSync = async (tx: Transaction) => {
    const config = getSyncConfig();
    
    // 1. Send/Sync via Google Apps Script POST webhook if enabled
    if (config.autoSyncAppsScript && config.appsScriptUrl) {
      const ok = await postTransactionToAppsScript(config.appsScriptUrl, tx);
      if (ok) {
        addToast(`Transaksi berhasil dikirim ke Apps Script Webhook!`, 'success');
      } else {
        addToast(`Gagal mengirim data ke Apps Script webhook`, 'warning');
      }
    }

    // 2. Append row to Google Sheets if authorized and enabled
    if (config.autoSyncSheets && config.spreadsheetId) {
      const token = getAccessToken();
      if (!token) {
        addToast(`Gagal sinkron Google Sheets: Sesi Google kadaluarsa. Silakan login kembali di Pengaturan.`, 'warning');
        return;
      }
      const ok = await appendTransactionToSheets(token, config.spreadsheetId, tx);
      if (ok) {
        addToast(`Transaksi berhasil ditulis ke baris Google Sheets!`, 'success');
      } else {
        addToast(`Gagal menulis transaksi ke Google Sheets`, 'warning');
      }
    }
  };

  // Checkout completes -> Save transaction AND subtract quantities from inventory!
  const handleCheckoutComplete = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);

    // Subtract stock levels
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const soldItem = newTx.items.find(itm => itm.productId === p.id);
        if (soldItem) {
          const finalStock = Math.max(0, p.stock - soldItem.quantity);
          return {
            ...p,
            stock: finalStock,
            status: finalStock > 0 ? 'Tersedia' : 'Habis'
          };
        }
        return p;
      });
    });

    addToast(`Transaksi ${newTx.invoiceNo} berhasil diproses!`, 'success');
    
    // Trigger Google/AppsScript integration syncs
    triggerCloudSync(newTx);
  };

  // Products CRUD Operations
  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    const freshProduct: Product = {
      ...newProd,
      id: `p-${Date.now()}`
    };
    setProducts(prev => [freshProduct, ...prev]);
    addToast(`Produk "${newProd.name}" berhasil ditambahkan!`, 'success');
  };

  const handleEditProduct = (id: string, updated: Partial<Product>) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, ...updated } : p
    ));
    addToast(`Detail produk berhasil diperbarui!`, 'success');
  };

  const handleDeleteProduct = (id: string) => {
    const targetProd = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    addToast(`Produk "${targetProd?.name}" berhasil dihapus.`, 'warning');
  };

  // Quick Restock from Dashboard trigger
  const handleQuickRestockStockVal = (productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const added = p.stock + 25; // standard quick batch restock
        return {
          ...p,
          stock: added,
          status: added > 0 ? 'Tersedia' : 'Habis'
        };
      }
      return p;
    }));
    const pName = products.find(p => p.id === productId)?.name;
    addToast(`Restock Cepat: ${pName} (+25 Unit)!`, 'success');
  };

  // Staff Management Operations
  const handleAddUser = (newUsrDetails: Omit<User, 'id'>) => {
    const freshUser: User = {
      ...newUsrDetails,
      id: `usr-${Date.now()}`
    };
    setUsers(prev => [...prev, freshUser]);
    addToast(`Hak akses staff "${newUsrDetails.name}" berhasil dibuat!`, 'success');
  };

  const handleDeleteUser = (id: string) => {
    const match = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    addToast(`Staf "${match?.name}" telah dinonaktifkan.`, 'warning');
  };

  // Reset/restore cache
  const handleRestoreMockSeeds = () => {
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setBrands(INITIAL_BRANDS);
    setTransactions(INITIAL_TRANSACTIONS);
    setUsers(INITIAL_USERS);
    setShopName('MartGo Modern');
    setTaxPercent(11);
    addToast('Seluruh database POS berhasil di-reset ke setelan demo default!', 'success');
  };

  const handleExternalSettingToast = (msg: string, type: 'success' | 'error') => {
    addToast(msg, type);
  };

  // Render Subviews Router
  const renderSubView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView 
            products={products}
            categories={categories}
            transactions={transactions}
            onNavigate={setActiveView}
            onQuickRestock={handleQuickRestockStockVal}
          />
        );
      case 'kasir':
        return (
          <TransactionsView 
            products={products}
            categories={categories}
            brands={brands}
            currentUser={currentUser}
            onCheckoutComplete={handleCheckoutComplete}
            taxPercent={taxPercent}
          />
        );
      case 'produk':
        return (
          <ProductsView 
            products={products}
            categories={categories}
            brands={brands}
            currentUser={currentUser}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'riwayat':
        return (
          <HistoryView 
            transactions={transactions}
            // Trigger thermal printer preview from history eye button
            onOpenReceipt={(tx) => {
              // Open custom printable receipt directly inside TransactionsView state
              // To achieve this cleanly, we can temp switch view to 'kasir' or display print overlays.
              // Let's implement dynamic callback trigger. HistoryView triggers the callback to render receipt modal in app level
              // and we can handle it beautifully with state!
              setActiveReceiptFromHistory(tx);
            }}
          />
        );
      case 'laporan':
        return (
          <ReportsView 
            transactions={transactions}
            products={products}
            categories={categories}
            shopName={shopName}
          />
        );
      case 'users':
        return (
          <UsersView 
            users={users}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
          />
        );
      case 'database_cloud':
        return (
          <CloudDatabaseView 
            products={products}
            transactions={transactions}
            users={users}
            onSaveNotification={handleExternalSettingToast}
            shopName={shopName}
          />
        );
      case 'pengaturan':
        return (
          <SettingsView 
            currentUser={currentUser}
            shopName={shopName}
            setShopName={setShopName}
            taxPercent={taxPercent}
            setTaxPercent={setTaxPercent}
            onRestoreMockSeeds={handleRestoreMockSeeds}
            onSaveNotification={handleExternalSettingToast}
            products={products}
            transactions={transactions}
          />
        );
      default:
        return <div className="p-8">Halaman Tidak Ditemukan</div>;
    }
  };

  // Local printer states triggered from past history eyes
  const [activeReceiptFromHistory, setActiveReceiptFromHistory] = useState<Transaction | null>(null);

  // Quick header action callback helper
  const handleQuickAction = (view: string) => {
    setActiveView(view);
  };

  // Return login portal if unauthenticated
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} shopName={shopName} />
        <Notification toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="flex bg-slate-50 text-slate-700 font-sans min-h-screen relative overflow-hidden">
      
      {/* Primary Navigation Sidebar */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        currentUser={currentUser}
        onLogout={handleLogout}
        shopName={shopName}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Navbar */}
        <Header 
          activeView={activeView}
          lowStockProducts={lowStockProducts}
          onQuickAction={handleQuickAction}
          shopName={shopName}
        />

        {/* Inner Subview content */}
        <main className="flex-1 overflow-hidden bg-slate-550/20">
          {renderSubView()}
        </main>
      </div>

      {/* Persistent global notification overlay toasts */}
      <Notification toasts={toasts} onRemove={removeToast} />

      {/* ========================================================================= */}
      {/* HISTORIC RECEIPT REPRINT MODAL (Allows reprinting past bills from History) */}
      {/* ========================================================================= */}
      {activeReceiptFromHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white overflow-y-auto max-h-[90vh] w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
            
            {/* Struk paper representation */}
            <div className="bg-white px-5 py-6 rounded-2xl border border-slate-100 text-slate-800 text-center font-mono text-[11px] leading-relaxed shadow-inner">
              
              <div className="space-y-1">
                <h4 className="font-sans font-extrabold text-sm text-slate-800 tracking-tight uppercase">{shopName.toUpperCase()}</h4>
                <p className="text-[10px] text-slate-400">KOPIAN STRUK SAAT INI</p>
                <p className="text-[10px] text-slate-500">Jl. Sudirman No 12, Jakarta</p>
                <p className="text-[10px] text-slate-500">Tlp: (021) 8882-1200</p>
              </div>

              <div className="my-3 text-slate-350 select-none">=================================</div>

              <div className="text-left space-y-1 text-slate-650 text-[10px]">
                <div className="flex justify-between">
                  <span>Nota ID :</span>
                  <span className="font-bold text-slate-800">{activeReceiptFromHistory.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal :</span>
                  <span>{new Date(activeReceiptFromHistory.date).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir   :</span>
                  <span>{activeReceiptFromHistory.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode  :</span>
                  <span className="font-bold">{activeReceiptFromHistory.paymentMethod}</span>
                </div>
              </div>

              <div className="my-3 text-slate-350 select-none">=================================</div>

              <div className="text-left space-y-2 my-2 select-text">
                {activeReceiptFromHistory.items.map((it, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-slate-850 text-xs font-semibold">
                      <span>{it.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>{it.quantity} x {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.sellingPrice)}</span>
                      <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-3 text-slate-350 select-none">—————————————————————————————————</div>

              <div className="text-right space-y-1 text-slate-700">
                <div className="flex justify-between text-[10px]">
                  <span>Subtotal:</span>
                  <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeReceiptFromHistory.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Pajak (PPN {taxPercent}%):</span>
                  <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeReceiptFromHistory.tax)}</span>
                </div>
                {activeReceiptFromHistory.discountTotal > 0 && (
                  <div className="flex justify-between text-[10px] text-emerald-600 font-semibold">
                    <span>Diskon Potongan:</span>
                    <span>-{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeReceiptFromHistory.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-slate-800 pt-1 border-t border-slate-100 mt-1">
                  <span>GRAND TOTAL:</span>
                  <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeReceiptFromHistory.grandTotal)}</span>
                </div>
                
                <div className="my-1 text-slate-205 select-none">---------------------------------</div>
                
                <div className="flex justify-between text-[10px]">
                  <span>Dibayarkan:</span>
                  <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeReceiptFromHistory.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-800">
                  <span>Kembalian:</span>
                  <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeReceiptFromHistory.change)}</span>
                </div>
              </div>

              <div className="my-3 text-slate-350 select-none">=================================</div>

              <div className="space-y-1 mt-1 text-[10px] text-slate-500">
                <p>Kopilasi Struk Sah • Transaksi Selesai</p>
                <div className="pt-1 font-serif text-base tracking-widest text-slate-400">
                  ||||| | |||| || || | |||| ||
                </div>
              </div>

            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Ulang Struk</span>
              </button>

              <button
                onClick={() => setActiveReceiptFromHistory(null)}
                className="w-full bg-white hover:bg-slate-50 border text-slate-650 font-bold py-3 text-xs rounded-xl text-center cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
