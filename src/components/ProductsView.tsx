import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag, 
  Barcode, 
  FolderPlus, 
  Percent, 
  CheckCircle2, 
  X,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { Product, Category, Brand, UserRole, User } from '../types';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  currentUser: User | null;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onEditProduct: (id: string, updated: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
}

export default function ProductsView({
  products,
  categories,
  brands,
  currentUser,
  onAddProduct,
  onEditProduct,
  onDeleteProduct
}: ProductsViewProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Quick quantity amendment box
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);
  const [stockAmt, setStockAmt] = useState<number>(10);

  // Base formatting currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Check if role is admin to enable deletion and configurations
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Real-time automatic numeric code calculation
  const nextNumericCode = useMemo(() => {
    const validCodes = products
      .map(p => parseInt(p.code))
      .filter(code => !isNaN(code));
    if (validCodes.length === 0) return '10001';
    const maxVal = Math.max(...validCodes);
    return String(maxVal + 1);
  }, [products]);

  // Product categories filtering based on classification
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.includes(searchQuery) || 
                          p.barcode.includes(searchQuery);
      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const matchBrand = brandFilter === 'all' || p.brandId === brandFilter;
      return matchSearch && matchCat && matchBrand;
    });

    // Sorting options mapping
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'stock-asc') return a.stock - b.stock;
      if (sortBy === 'stock-desc') return b.stock - a.stock;
      return 0;
    });

    return result;
  }, [products, searchQuery, categoryFilter, brandFilter, sortBy]);

  // Pagination constraints
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setBrandId(brands[0]?.id || '');
    setCostPrice(0);
    setSellingPrice(0);
    setStock(20);
    setMinStock(10);
    setBarcode('');
    setImageUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    if (!isAdmin) {
      alert('Sesi Kasir tidak diizinkan untuk mengubah detail produk. Silakan masuk sebagai ADMIN.');
      return;
    }
    setEditingId(p.id);
    setName(p.name);
    setCategoryId(p.categoryId);
    setBrandId(p.brandId);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setStock(p.stock);
    setMinStock(p.minStock);
    setBarcode(p.barcode);
    setImageUrl(p.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) return;

    // Automatic Profit computation
    const calculatedMargin = sellingPrice - costPrice;

    if (editingId) {
      onEditProduct(editingId, {
        name,
        categoryId,
        brandId,
        costPrice,
        sellingPrice,
        margin: calculatedMargin,
        stock,
        minStock,
        barcode,
        status: stock > 0 ? 'Tersedia' : 'Habis',
        imageUrl: imageUrl || undefined
      });
    } else {
      onAddProduct({
        code: nextNumericCode,
        name,
        categoryId,
        brandId,
        costPrice,
        sellingPrice,
        margin: calculatedMargin,
        stock,
        minStock,
        barcode,
        status: stock > 0 ? 'Tersedia' : 'Habis',
        imageUrl: imageUrl || undefined
      });
    }

    setIsModalOpen(false);
  };

  const handleQuickAddStock = (p: Product) => {
    setSelectedStockProduct(p);
    setStockAmt(10);
    setShowStockModal(true);
  };

  const handleConfirmStockAdd = () => {
    if (!selectedStockProduct) return;
    const currentStock = selectedStockProduct.stock;
    const updatedStock = currentStock + stockAmt;
    onEditProduct(selectedStockProduct.id, {
      stock: updatedStock,
      status: updatedStock > 0 ? 'Tersedia' : 'Habis'
    });
    setShowStockModal(false);
    setSelectedStockProduct(null);
  };

  // Real-time calculated margins inside popup forms
  const dynamicMargin = sellingPrice - costPrice;
  const dynamicMarginPct = costPrice > 0 ? ((dynamicMargin / costPrice) * 100).toFixed(1) : '0';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Search Filter Head Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        
        {/* Real-time search */}
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari kode, nama atau barcode produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 rounded-xl outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3.5 py-2 rounded-xl focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3.5 py-2 rounded-xl focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="name-asc">Nama (A-Z)</option>
              <option value="name-desc">Nama (Z-A)</option>
              <option value="price-asc">Harga Terendah</option>
              <option value="price-desc">Harga Tertinggi</option>
              <option value="stock-asc">Stok Terendah</option>
              <option value="stock-desc">Stok Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Trigger insert actions */}
        <button
          onClick={handleOpenAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Main minimal modern Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100/80">
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">ID & BARCODE</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">NAMA PRODUK</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">KLASIFIKASI</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">HARGA BEli</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">HARGA JUAL</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">EST. MARGIN</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">STOK</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">STATUS</th>
                <th className="py-4 px-6 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">KONTROL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Data produk kosong atau tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  const br = brands.find(b => b.id === p.brandId);
                  const isLow = p.stock <= p.minStock && p.stock > 0;
                  const isOut = p.stock === 0;

                  // Dynamic margin percent for table presentation
                  const marginPercent = p.costPrice > 0 ? ((p.margin / p.costPrice) * 100).toFixed(0) : '0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                      
                      {/* ID / Code of barcodes */}
                      <td className="py-4 px-6 font-mono">
                        <span className="font-semibold text-slate-800">{p.code}</span>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3 h-3 block" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>

                      {/* Product Name & thumbnail photo */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=150&auto=format&fit=crop"}
                            alt={p.name}
                            className="w-9 h-9 object-cover rounded-xl bg-slate-50 border border-slate-100/80 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-semibold text-slate-800 tracking-tight leading-tight block truncate max-w-[150px]">
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* Categories labels */}
                      <td className="py-4 px-6">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600 border border-slate-200 block w-max">
                          {cat?.name || 'Makanan'}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          Brand: <b>{br?.name || 'Lokal'}</b>
                        </span>
                      </td>

                      {/* Beli price */}
                      <td className="py-4 px-6 font-mono font-medium text-slate-500">
                        {formatIDR(p.costPrice)}
                      </td>

                      {/* Jual price */}
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {formatIDR(p.sellingPrice)}
                      </td>

                      {/* Keuntungan Margin */}
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-emerald-600">{formatIDR(p.margin)}</span>
                        <div className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-0.5 font-sans">
                          <Percent className="w-2.5 h-2.5" />
                          <span>{marginPercent}%</span>
                        </div>
                      </td>

                      {/* Stock levels and controls */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                            isOut 
                              ? 'bg-rose-100 text-rose-700' 
                              : isLow 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-blue-50 text-blue-700'
                          }`}>
                            {p.stock} pcs
                          </span>
                          
                          {/* Quick stocking increment trigger */}
                          <button 
                            onClick={() => handleQuickAddStock(p)}
                            title="Tambah stok instan"
                            className="text-slate-400 hover:text-blue-500 transition-colors p-0.5 focus:outline-none cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        {isLow && <span className="text-[9px] text-amber-600 font-semibold block mt-1">Stok Hampir Habis!</span>}
                      </td>

                      {/* Status Badges */}
                      <td className="py-4 px-6">
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                          p.stock > 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {p.stock > 0 ? 'Tersedia' : 'Habis'}
                        </span>
                      </td>

                      {/* Control buttons */}
                      <td className="py-4 px-6">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            disabled={!isAdmin}
                            title="Edit detail produk"
                            className={`p-1.5 rounded-lg border transition-all ${
                              isAdmin 
                                ? 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200' 
                                : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => isAdmin ? onDeleteProduct(p.id) : null}
                            disabled={!isAdmin}
                            title="Hapus produk"
                            className={`p-1.5 rounded-lg border transition-all ${
                              isAdmin 
                                ? 'bg-white hover:bg-rose-50 hover:text-rose-600 border-slate-200 hover:border-rose-200' 
                                : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination footer controller */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Halaman {currentPage} dari {totalPages} — Total {filteredProducts.length} produk
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-xl cursor-not-allowed transition-all"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-xl cursor-not-allowed transition-all"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* POPUP: ADD / EDIT PRODUCT MODAL (Slidover Center Box) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div id="product-crud-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header title */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-50">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm font-sans">
                  {editingId ? 'Edit Sifat Produk' : 'Tambah Produk Baru'}
                </h3>
                <p className="text-[10px] text-slate-400">Kode produk digenerate otomatis: <b className="font-mono text-blue-500">{editingId ? products.find(p => p.id === editingId)?.code : nextNumericCode}</b></p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner scrollable Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 my-4 flex-1 overflow-y-auto pr-1">
              
              {/* Product Name Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                  Nama Lengkap Produk
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Indomie Goreng Rendang / Aqua 600ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              {/* Categorization brand row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Kategori Produk
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none cursor-pointer focus:border-blue-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Brand Produsen
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none cursor-pointer focus:border-blue-500"
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost vs selling row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Harga Modal (Harga Beli)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs font-mono rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Harga Jual Minimarket
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs font-mono rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Profit margin automated indicator */}
              <div className="bg-emerald-50 bg-opacity-30 border border-emerald-150 p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <Percent className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Keuntungan Laba Beroperasi</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-emerald-600 font-sans block">{formatIDR(dynamicMargin)}</span>
                  <span className="text-[10px] text-emerald-500 font-bold">({dynamicMarginPct}% dari Modal)</span>
                </div>
              </div>

              {/* Inventories stock properties */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Jumlah Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stock || ''}
                    onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs font-mono rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Stok Minimal (Kritis)
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={minStock || ''}
                    onChange={(e) => setMinStock(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs font-mono rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Barcodes & Image URLs */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Kode Barcode (EAN13 Digit)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. 8998866110015"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs font-mono rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    URL Foto Produk (Opsional Unsplash)
                  </label>
                  <input
                    type="url"
                    placeholder="Masukkan URL Link Gambar atau kosongi untuk default"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:border-blue-500 text-slate-700"
                  />
                </div>
              </div>

            </form>

            {/* Form actions */}
            <div className="pt-4 border-t border-slate-50 flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 rounded-xl transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                onClick={handleFormSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer text-center uppercase tracking-wide shadow-md shadow-blue-500/10"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan Produk'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUICK ADD STOCK POPUP MODAL */}
      {/* ========================================================= */}
      {showStockModal && selectedStockProduct && (
        <div id="stock-popup-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Restock Cepat</h4>
            <div className="bg-slate-50 p-3 rounded-xl border mb-4 text-xs">
              <p className="font-medium text-slate-800">{selectedStockProduct.name}</p>
              <p className="text-slate-400 font-mono mt-0.5">Stok Sekarang: {selectedStockProduct.stock} pcs</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Jumlah Tambahan Unit
              </label>
              <input
                type="number"
                value={stockAmt}
                onChange={(e) => setStockAmt(Math.max(1, Number(e.target.value)))}
                className="w-full text-center bg-slate-50 p-2.5 font-bold font-mono text-base rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 bg-slate-150 hover:bg-slate-200 text-slate-650 font-bold py-2.5 rounded-xl text-xs text-center cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStockAdd}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs text-center cursor-pointer transition-all shadow-md shadow-blue-500/10"
              >
                Tambah Stok
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
