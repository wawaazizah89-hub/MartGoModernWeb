import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  TrendingUp, 
  Coins, 
  ShoppingBag,
  Percent,
  TrendingDown,
  Layers,
  ArrowUpRight,
  Calculator,
  Calendar
} from 'lucide-react';
import { Transaction, Product, Category } from '../types';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  shopName: string;
}

export default function ReportsView({ transactions, products, categories, shopName }: ReportsViewProps) {
  
  const [dateRange, setDateRange] = useState('ALL'); // ALL, TODAY, YESTERDAY, PAST_3_DAYS

  // Format currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Filter transactions based on selected date filter
  const filteredTxs = useMemo(() => {
    const todayStr = '2026-05-26';
    const yesterdayStr = '2026-05-25';
    
    return transactions.filter(tx => {
      if (dateRange === 'TODAY') return tx.date.startsWith(todayStr);
      if (dateRange === 'YESTERDAY') return tx.date.startsWith(yesterdayStr);
      if (dateRange === 'PAST_3_DAYS') {
        return tx.date.startsWith('2026-05-24') || tx.date.startsWith('2026-05-25') || tx.date.startsWith('2026-05-26');
      }
      return true; // ALL
    });
  }, [transactions, dateRange]);

  // Aggregate stats from filtered logs
  const reportStats = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalCostOfGoods = 0;
    let totalItems = 0;

    filteredTxs.forEach(tx => {
      totalRevenue += tx.grandTotal;
      totalTax += tx.tax;
      totalDiscount += tx.discountTotal;

      tx.items.forEach(itm => {
        totalCostOfGoods += itm.costPrice * itm.quantity;
        totalItems += itm.quantity;
      });
    });

    // Laba Bersih = omset - harga_modal - ppn (since tax is collected from customer, or profit = selling_price - cost)
    // Actually standard: Profit Margin = (sales - COGS)
    const grossProfit = totalRevenue - totalCostOfGoods - totalTax;

    const avgBasketSize = filteredTxs.length > 0 ? totalRevenue / filteredTxs.length : 0;

    return {
      totalRevenue,
      totalTax,
      totalDiscount,
      totalCostOfGoods,
      totalItems,
      grossProfit,
      avgBasketSize
    };
  }, [filteredTxs]);

  // Category and Brand breakdowns
  const categoryContribution = useMemo(() => {
    const contribution: { [id: string]: { name: string, amount: number, qtySold: number } } = {};
    categories.forEach(c => {
      contribution[c.id] = { name: c.name, amount: 0, qtySold: 0 };
    });

    filteredTxs.forEach(tx => {
      tx.items.forEach(itm => {
        const prod = products.find(p => p.id === itm.productId);
        if (prod && contribution[prod.categoryId]) {
          contribution[prod.categoryId].amount += itm.sellingPrice * itm.quantity;
          contribution[prod.categoryId].qtySold += itm.quantity;
        }
      });
    });

    return Object.values(contribution).sort((a,b) => b.amount - a.amount);
  }, [categories, filteredTxs, products]);

  // Method usage
  const methodStats = useMemo(() => {
    const counts = { CASH: 0, QRIS: 0, TRANSFER: 0 };
    const amounts = { CASH: 0, QRIS: 0, TRANSFER: 0 };

    filteredTxs.forEach(tx => {
      if (tx.paymentMethod === 'CASH') {
        counts.CASH += 1;
        amounts.CASH += tx.grandTotal;
      } else if (tx.paymentMethod === 'QRIS') {
        counts.QRIS += 1;
        amounts.QRIS += tx.grandTotal;
      } else if (tx.paymentMethod === 'TRANSFER') {
        counts.TRANSFER += 1;
        amounts.TRANSFER += tx.grandTotal;
      }
    });

    return [
      { name: 'Tunai Kasir (Cash)', count: counts.CASH, amount: amounts.CASH, color: 'bg-emerald-500' },
      { name: 'QRIS Dinamis', count: counts.QRIS, amount: amounts.QRIS, color: 'bg-purple-500' },
      { name: 'Virtual Account', count: counts.TRANSFER, amount: amounts.TRANSFER, color: 'bg-amber-500' },
    ];
  }, [filteredTxs]);

  // Download Excel simulation (generates beautifully shaped CSV)
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Title
    csvContent += `LAPORAN PENJUALAN - ${shopName.toUpperCase()}\n`;
    csvContent += `Periode filter: ${dateRange}\n`;
    csvContent += "Created Date: 2026-05-26\n\n";

    // Summary headers
    csvContent += `Ringkasan Finansial\n`;
    csvContent += `Total Revenue,${reportStats.totalRevenue}\n`;
    csvContent += `Estimasi Keuntungan Bersih,${reportStats.grossProfit}\n`;
    csvContent += `Total Item Terjual,${reportStats.totalItems}\n`;
    csvContent += `Pajak Terkumpul,${reportStats.totalTax}\n\n`;

    // Columns
    csvContent += "Invoice No,Tanggal Transaksi,Kasir,Metode Pembayaran,Subtotal,Pajak,Potongan Diskon,Grand Total\n";

    filteredTxs.forEach(tx => {
      csvContent += `"${tx.invoiceNo}","${new Date(tx.date).toLocaleString()}","${tx.cashierName}","${tx.paymentMethod}",${tx.subtotal},${tx.tax},${tx.discountTotal},${tx.grandTotal}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-penjualan-pos-${dateRange.toLowerCase()}-20260526.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Upper Date filters & Exporter buttons */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Chips selector */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl gap-1">
          {[
            { id: 'ALL', label: 'Semua Periode' },
            { id: 'TODAY', label: 'Hari Ini' },
            { id: 'YESTERDAY', label: 'Kemarin' },
            { id: 'PAST_3_DAYS', label: '3 Hari Terakhir' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setDateRange(opt.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                dateRange === opt.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Exports actions */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-550 border border-slate-200 hover:border-slate-350 text-slate-700 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Unduh Excel (CSV)</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-500/10"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Stats Aggregations Cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">TOTAL OMSET</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-mono font-extrabold text-slate-800 text-lg leading-none">
            {formatIDR(reportStats.totalRevenue)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">Akumulasi penjualan kotor terdaftar.</p>
        </div>

        {/* Profit */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">LABA KOTOR BERSIH</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-mono font-extrabold text-slate-800 text-lg leading-none">
            {formatIDR(reportStats.grossProfit)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">Laba bersih (pendapatan minus modal & PPN).</p>
        </div>

        {/* Sold items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">UNIT BARANG TERJUAL</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-mono font-extrabold text-slate-800 text-lg leading-none">
            {reportStats.totalItems} unit
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">Jumlah item produk kasir keluar.</p>
        </div>

        {/* Avg Tags value */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">KONSUMSI RATA-RATA</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-mono font-extrabold text-slate-800 text-lg leading-none">
            {formatIDR(reportStats.avgBasketSize)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">Rata-rata pengeluaran per struk/pembeli.</p>
        </div>
      </div>

      {/* Main Breakdown Section (Categories Contrib & Payment Usage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Contribution breakdown (7 Cards) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="font-sans font-bold text-slate-800 text-sm">Kontribusi Nominal Kategori</h5>
            <p className="text-[11px] text-slate-400 mt-1">Performa total kontribusi omset dari masing-masing kategori produk.</p>
          </div>

          <div className="my-6 space-y-4">
            {categoryContribution.map((contrib, idx) => {
              const maxAmt = Math.max(...categoryContribution.map(c => c.amount), 1);
              const percentage = Math.round((contrib.amount / maxAmt) * 100);

              return (
                <div key={idx} className="space-y-1.5 text-xs text-slate-755">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">{contrib.name}</span>
                    <span className="font-mono text-slate-500">{formatIDR(contrib.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Terjual: {contrib.qtySold} pcs</span>
                    <span>{percentage}% kontribusi relatif tertinggi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods utilization distributions (5 Cards) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h5 className="font-sans font-bold text-slate-800 text-sm">Distribusi Metode Bayar</h5>
            <p className="text-[11px] text-slate-400 mt-1">Metode transaksi kasir yang paling digemari pembeli.</p>
          </div>

          <div className="mt-6 space-y-4">
            {methodStats.map((item, id) => {
              const totAmount = reportStats.totalRevenue || 1;
              const ratio = Math.round((item.amount / totAmount) * 100);

              return (
                <div key={id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${item.color} shrink-0`}></div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-xs">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">{item.count} Kali Digunakan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-700 text-xs">{formatIDR(item.amount)}</p>
                    <span className="font-mono text-[10px] text-slate-400">({ratio}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
