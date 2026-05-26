import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Eye, 
  Printer, 
  Calendar, 
  Coins, 
  QrCode, 
  CreditCard,
  Layers,
  FileCheck
} from 'lucide-react';
import { Transaction } from '../types';

interface HistoryViewProps {
  transactions: Transaction[];
  onOpenReceipt: (tx: Transaction) => void;
}

export default function HistoryView({ transactions, onOpenReceipt }: HistoryViewProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Format currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Filter & Search past sales
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tx.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPayment = paymentFilter === 'ALL' || tx.paymentMethod === paymentFilter;
      return matchesSearch && matchesPayment;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest first
  }, [transactions, searchQuery, paymentFilter]);

  // Pagination boundaries
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Filtering Header options */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari Nomor Invoice / Nama Kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 rounded-xl outline-none"
          />
        </div>

        {/* Filter on payments */}
        <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-end">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-4 py-2 rounded-xl focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="ALL">Metode Pembayaran (Semua)</option>
            <option value="CASH">CASH</option>
            <option value="QRIS">QRIS</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
        </div>
      </div>

      {/* Main minimal history logs table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100/80">
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">NOMOR INVOICE</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">TANGGAL & WAKTU</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">NAMA KASIR</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">ITEM TERJUAL</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">METODE BAYAR</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">TOTAL TRANSAKSI</th>
                <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Riwayat penjualan kosong atau tidak cocok.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  let Icon = Coins;

                  if (tx.paymentMethod === 'QRIS') {
                    badgeColor = 'bg-purple-50 text-purple-700 border-purple-100';
                    Icon = QrCode;
                  } else if (tx.paymentMethod === 'TRANSFER') {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                    Icon = CreditCard;
                  }

                  const totalItemsSold = tx.items.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                      
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {tx.invoiceNo}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-650">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(tx.date).toLocaleString('id-ID')}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-850">
                        {tx.cashierName}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-sans font-medium text-slate-700">
                          {totalItemsSold} pcs
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={tx.items.map(i => i.name).join(', ')}>
                          {tx.items[0]?.name} {tx.items.length > 1 ? `+ ${tx.items.length - 1} lainnya` : ''}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border text-[9px] ${badgeColor}`}>
                          <Icon className="w-3 h-3" />
                          <span>{tx.paymentMethod}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-slate-800 text-sm">
                        {formatIDR(tx.grandTotal)}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => onOpenReceipt(tx)}
                          title="Lihat Detail Struk"
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-350 px-3 py-1.5 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all flex items-center gap-1.5 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail Struk</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* History Pagination Control */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Halaman {currentPage} dari {totalPages} — Total {filteredTransactions.length} nota transaksi
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-xl cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-xl cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
