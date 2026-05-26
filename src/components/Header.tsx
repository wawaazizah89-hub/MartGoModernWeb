import React, { useState, useEffect } from 'react';
import { Bell, ClipboardList, Clock, Layers, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface HeaderProps {
  activeView: string;
  lowStockProducts: Product[];
  onQuickAction: (view: string) => void;
  shopName: string;
}

export default function Header({ 
  activeView, 
  lowStockProducts, 
  onQuickAction,
  shopName
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  // Maintain real-time clock
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      setCurrentTime(date.toLocaleDateString('id-ID', options));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (view: string) => {
    switch (view) {
      case 'dashboard':
        return 'Ringkasan Dashboard';
      case 'kasir':
        return 'Sistem Kasir Cepat';
      case 'produk':
        return 'Manajemen Inventori & Produk';
      case 'riwayat':
        return 'Riwayat Transaksi';
      case 'laporan':
        return 'Laporan & Keuangan';
      case 'users':
        return 'Manajemen Karyawan';
      case 'pengaturan':
        return 'Pengaturan Sistem Toko';
      default:
        return 'Selamat Datang';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 bg-opacity-90 backdrop-blur-md sticky top-0 z-40">
      {/* Title block */}
      <div>
        <h2 className="font-sans font-bold text-slate-800 text-base leading-none tracking-tight">
          {getPageTitle(activeView)}
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
          <Layers className="w-3 h-3 text-blue-500" />
          <span>Utama • POS {shopName}</span>
        </p>
      </div>

      {/* Clock and Interactive Quick Actions */}
      <div className="flex items-center gap-6">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-600">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>{currentTime}</span>
        </div>

        {/* Short-cut Quick cash-out */}
        {activeView !== 'kasir' && (
          <button
            onClick={() => onQuickAction('kasir')}
            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-tight transition-all duration-200 cursor-pointer border border-blue-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kasir Baru</span>
          </button>
        )}

        {/* Alert Bell for Critical Stocks */}
        <div className="relative">
          <button
            onClick={() => setShowBellDropdown(!showBellDropdown)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer relative"
            aria-label="Stock Alerts"
          >
            <Bell className="w-5 h-5" />
            {lowStockProducts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white pulse-badge"></span>
            )}
          </button>

          {showBellDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowBellDropdown(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                  <span className="font-semibold text-slate-700">Pemberitahuan Stok</span>
                  <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[9px] ${
                    lowStockProducts.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {lowStockProducts.length} Kritis
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto mt-2 space-y-2">
                  {lowStockProducts.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">
                      <ClipboardList className="w-8 h-8 mx-auto text-slate-200 mb-1" />
                      Semua stok dalam kondisi aman.
                    </div>
                  ) : (
                    lowStockProducts.map((p) => (
                      <div 
                        key={p.id} 
                        className="p-2 hover:bg-rose-50/40 rounded-lg flex items-center justify-between border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                        onClick={() => {
                          onQuickAction('produk');
                          setShowBellDropdown(false);
                        }}
                      >
                        <div>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {p.code}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            p.stock === 0 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            Stok: {p.stock}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
