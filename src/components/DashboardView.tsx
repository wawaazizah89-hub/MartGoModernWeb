import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  ArrowUpRight, 
  Layers, 
  Flame, 
  RefreshCw,
  Plus
} from 'lucide-react';
import { Product, Transaction, Category } from '../types';

interface DashboardViewProps {
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  onNavigate: (view: string) => void;
  onQuickRestock: (productId: string) => void;
}

export default function DashboardView({
  products,
  categories,
  transactions,
  onNavigate,
  onQuickRestock
}: DashboardViewProps) {
  
  // Format formatting currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Memoized KPI calculations
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalProfit = 0;
    const totalTx = transactions.length;

    transactions.forEach(tx => {
      totalSales += tx.grandTotal;
      tx.items.forEach(item => {
        // Profit = sellingPrice - costPrice
        const profitPerItem = item.sellingPrice - item.costPrice;
        totalProfit += profitPerItem * item.quantity;
      });
    });

    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    return {
      totalSales,
      totalProfit,
      totalTx,
      lowStockCount
    };
  }, [transactions, products]);

  // Today's Sales calculation (Date is 2026-05-26 in ISO, let's match '2026-05-26')
  const todaySales = useMemo(() => {
    const todayStr = '2026-05-26';
    const todayTxs = transactions.filter(tx => tx.date.startsWith(todayStr));
    const sales = todayTxs.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const count = todayTxs.length;
    return { sales, count };
  }, [transactions]);

  // Best Selling Products Calculation
  const bestSellers = useMemo(() => {
    const counts: { [productId: string]: { name: string, qty: number, categoryId: string, totalSale: number } } = {};
    
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        if (!counts[item.productId]) {
          const prod = products.find(p => p.id === item.productId);
          counts[item.productId] = {
            name: item.name,
            qty: 0,
            categoryId: prod?.categoryId || '',
            totalSale: 0
          };
        }
        counts[item.productId].qty += item.quantity;
        counts[item.productId].totalSale += item.sellingPrice * item.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [transactions, products]);

  // Category and Brand Breakdown for progress charts
  const categoryStats = useMemo(() => {
    const breakdown: { [catId: string]: { name: string, stockCount: number, salesAmount: number } } = {};
    
    // Seed with standard categories
    categories.forEach(cat => {
      breakdown[cat.id] = { name: cat.name, stockCount: 0, salesAmount: 0 };
    });

    products.forEach(p => {
      if (breakdown[p.categoryId]) {
        breakdown[p.categoryId].stockCount += p.stock;
      }
    });

    transactions.forEach(tx => {
      tx.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod && breakdown[prod.categoryId]) {
          breakdown[prod.categoryId].salesAmount += item.sellingPrice * item.quantity;
        }
      });
    });

    return Object.values(breakdown);
  }, [categories, products, transactions]);

  // Generate historical data for Custom SVG Graph
  // We'll map the last 3 dates: 24, 25, 26 May 2026
  const chartData = useMemo(() => {
    const dates = ['2026-05-24', '2026-05-25', '2026-05-26'];
    return dates.map(date => {
      const dailyTxs = transactions.filter(tx => tx.date.startsWith(date));
      const sales = dailyTxs.reduce((sum, tx) => sum + tx.grandTotal, 0);
      const label = date.split('-')[2] + ' Mei';
      return { label, sales };
    });
  }, [transactions]);

  // SVG dimensions for custom graph drawing
  const graphWidth = 500;
  const graphHeight = 180;
  const maxSales = Math.max(...chartData.map(d => d.sales), 100000) * 1.15;

  const pointsString = useMemo(() => {
    if (chartData.length < 2) return '';
    return chartData.map((d, index) => {
      const x = (index / (chartData.length - 1)) * (graphWidth - 60) + 30;
      const y = graphHeight - ((d.sales / maxSales) * (graphHeight - 40) + 20);
      return `${x},${y}`;
    }).join(' ');
  }, [chartData, maxSales]);

  // Critical Low Stock Products
  const criticalProducts = useMemo(() => {
    return products
      .filter(p => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 4);
  }, [products]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Greetings Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h3 className="font-sans font-extrabold text-slate-800 text-lg tracking-tight">
            Halo Admin & Rekan Kasir 👋
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Berikut ringkasan performa minimarket Hari Ini (<span className="font-mono">26 Mei 2026</span>). Performa grafik terupdate secara realtime.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('kasir')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Buka POS Kasir</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Omset Penjualan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">TOTAL OMSET</span>
            <h4 className="font-sans font-bold text-slate-800 text-lg leading-tight mt-1">
              {formatIDR(stats.totalSales)}
            </h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +14.5%
              </span>
              <span className="text-[10px] text-slate-400">vs Kemarin</span>
            </div>
          </div>
        </div>

        {/* Card 2: Keuntungan Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">ESTIMASI LABA</span>
            <h4 className="font-sans font-bold text-slate-800 text-lg leading-tight mt-1">
              {formatIDR(stats.totalProfit)}
            </h4>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-emerald-600 font-bold font-mono">
                {stats.totalSales > 0 ? ((stats.totalProfit / stats.totalSales) * 100).toFixed(1) : 0}% Margin
              </span>
              <span className="text-[10px] text-slate-400">Keuntungan</span>
            </div>
          </div>
        </div>

        {/* Card 3: Jumlah Transaksi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <ShoppingBag className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">TRANSAKSI</span>
            <h4 className="font-sans font-bold text-slate-800 text-lg leading-tight mt-1">
              {stats.totalTx} Nota
            </h4>
            <div className="text-[10px] text-slate-400 mt-2.5">
              Hari ini: <span className="font-bold text-slate-700 font-mono">{todaySales.count} transaksi</span>
            </div>
          </div>
        </div>

        {/* Card 4: Stok Menipis */}
        <div className={`p-5 rounded-2xl border shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow ${
          stats.lowStockCount > 0 
            ? 'bg-rose-50/20 border-rose-100 text-rose-800' 
            : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            stats.lowStockCount > 0 
              ? 'bg-rose-100 text-rose-600 border-rose-200' 
              : 'bg-slate-50 text-slate-500 border-slate-100'
          }`}>
            <AlertTriangle className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">RESTOCK</span>
            <h4 className="font-sans font-bold text-slate-800 text-lg leading-tight mt-1">
              {stats.lowStockCount} Produk
            </h4>
            <div className="text-[10px] mt-2.5">
              {stats.lowStockCount > 0 
                ? <span className="text-rose-600 font-bold">Butuh restock segera!</span>
                : <span className="text-slate-400">Semua stok aman</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Custom SVG Sales Chart (8 Columns) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h5 className="font-sans font-bold text-slate-800 text-sm">Grafik Transaksi Realtime (Harian)</h5>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1 select-none">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fluktuasi total omset minimarket 3 hari terakhir.</p>
          </div>

          <div className="my-6">
            <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full">
              {/* Grids and Axes */}
              <line x1="30" y1="20" x2="30" y2={graphHeight - 20} stroke="#f1f5f9" strokeWidth="1.5" />
              <line x1="30" y1={graphHeight - 20} x2={graphWidth - 30} y2={graphHeight - 20} stroke="#cbd5e1" strokeWidth="1" />
              
              {/* Horizontal Reference Lines */}
              <line x1="30" y1={graphHeight - 70} x2={graphWidth - 30} y2={graphHeight - 70} stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1={graphHeight - 120} x2={graphWidth - 30} y2={graphHeight - 120} stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1={graphHeight - 160} x2={graphWidth - 30} y2={graphHeight - 160} stroke="#f1f5f9" strokeDasharray="3 3" />

              {/* Draw Area Fill under curves */}
              {chartData.length >= 2 && (
                <polygon
                  points={`
                    30,${graphHeight - 20} 
                    ${chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * (graphWidth - 60) + 30;
                      const y = graphHeight - ((d.sales / maxSales) * (graphHeight - 40) + 20);
                      return `${x},${y}`;
                    }).join(' ')} 
                    ${graphWidth - 30},${graphHeight - 20}
                  `}
                  fill="url(#chartGradient)"
                  opacity="0.12"
                />
              )}

              {/* Draw connected line pathway */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="3.5"
                points={pointsString}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Gradient definitions for fill under lines */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Hover Circles & Interactive value tags */}
              {chartData.map((d, i) => {
                const x = (i / (chartData.length - 1)) * (graphWidth - 60) + 30;
                const y = graphHeight - ((d.sales / maxSales) * (graphHeight - 40) + 20);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" className="shadow" />
                    <text x={x} y={y - 10} fill="#1e293b" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      {d.sales >= 1000 ? `${(d.sales / 1000).toFixed(0)}k` : d.sales}
                    </text>
                    <text x={x} y={graphHeight - 5} fill="#64748b" fontSize="8" fontFamily="sans-serif" textAnchor="middle">
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Category breakdown (5 Columns) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="font-sans font-bold text-slate-800 text-sm">Pembagian Kategori</h5>
            <p className="text-[11px] text-slate-400 mt-1">Nilai penjualan kumulatif berdasarkan kategori.</p>
          </div>

          <div className="space-y-4 my-4 flex-1 flex flex-col justify-center">
            {categoryStats.map((cat, idx) => {
              const maxVal = Math.max(...categoryStats.map(c => c.salesAmount), 1);
              const percentage = Math.round((cat.salesAmount / maxVal) * 100);
              
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{cat.name}</span>
                    <span className="font-mono text-slate-500 font-medium">
                      {formatIDR(cat.salesAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Total Stok: {cat.stockCount} unit</span>
                    <span>{percentage}% dari kontribusi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bento Grid: Best Sellers & Critical Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        
        {/* Best Sellers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-amber-500" />
            <h5 className="font-sans font-bold text-slate-800 text-sm">Produk Terlaris (Top 5)</h5>
          </div>

          <div className="divide-y divide-slate-50">
            {bestSellers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada transaksi terekam untuk hari ini.
              </div>
            ) : (
              bestSellers.map((item, idx) => {
                const colors = ['bg-amber-100 text-amber-800', 'bg-slate-100 text-slate-800', 'bg-orange-100 text-orange-800', 'bg-slate-50 text-slate-500', 'bg-slate-50 text-slate-500'];
                return (
                  <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50/40 rounded-xl px-2 transition-all">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg ${colors[idx] || 'bg-slate-100 text-slate-600'} flex items-center justify-center font-mono font-bold text-xs`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-800 text-xs">{item.name}</p>
                        <span className="text-[10px] text-slate-400">Terjual {item.qty} pcs</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-800 text-xs">{formatIDR(item.totalSale)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock Alerts + Quick Restock Trigger */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h5 className="font-sans font-bold text-slate-800 text-sm">Stok Hampir Habis & Kritis</h5>
          </div>

          <div className="space-y-3">
            {criticalProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Sempurna! Semua produk memiliki cadangan stok yang cukup.
              </div>
            ) : (
              criticalProducts.map((p) => {
                const isOutOfStock = p.stock === 0;
                return (
                  <div 
                    key={p.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isOutOfStock ? 'bg-rose-50/20 border-rose-100' : 'bg-slate-50/40 border-slate-100'
                    }`}
                  >
                    <div>
                      <h4 className="font-medium text-slate-800 text-xs">{p.name}</h4>
                      <p className="text-[10px] text-slate-400">Barcode: <span className="font-mono">{p.barcode}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        isOutOfStock ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        Stok: {p.stock} (Min: {p.minStock})
                      </span>
                      <button 
                        onClick={() => onQuickRestock(p.id)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                      >
                        + Stok
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
