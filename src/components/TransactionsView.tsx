import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Barcode, 
  CheckCircle, 
  Printer, 
  RefreshCw, 
  QrCode, 
  CreditCard, 
  Wallet,
  Coins,
  Receipt,
  Tag,
  AlertCircle,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Product, Category, Brand, CartItem, Transaction, User } from '../types';

interface TransactionsViewProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  currentUser: User | null;
  onCheckoutComplete: (transaction: Transaction) => void;
  taxPercent: number;
}

export default function TransactionsView({
  products,
  categories,
  brands,
  currentUser,
  onCheckoutComplete,
  taxPercent
}: TransactionsViewProps) {
  
  // Catalogs logic
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Collapsible control states (True POS Golden Standards)
  const [showCategorySidebar, setShowCategorySidebar] = useState<boolean>(true);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState<boolean>(true);

  // Dynamic products per category lookup
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0); // as amount

  // Barcode scanner simulator state
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [barcodeAlert, setBarcodeAlert] = useState<string | null>(null);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(0);
  
  // Bank selection for virtual account
  const [selectedBank, setSelectedBank] = useState('BCA');

  // Receipt modal states
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [isReceiptPrinting, setIsReceiptPrinting] = useState(false);

  // QRIS Payment scanning simulation state
  const [qrisPaid, setQrisPaid] = useState(false);

  // Base formatting currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Dynamic products filtering, sorting, pagination
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.code.includes(searchQuery) || 
                            p.barcode.includes(searchQuery);
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || p.brandId === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'stock-asc') return a.stock - b.stock;
      return 0;
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedBrand, sortBy]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Set page back if filtered limits exceed totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredProducts, currentPage, totalPages]);

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      setBarcodeAlert(`Stok untuk "${product.name}" habis.`);
      setTimeout(() => setBarcodeAlert(null), 3000);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Double check stock limit
        if (existing.quantity >= product.stock) {
          setBarcodeAlert(`Hanya tersedia maksimal ${product.stock} unit.`);
          setTimeout(() => setBarcodeAlert(null), 3000);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  // Modify cart quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const match = prev.find(item => item.product.id === productId);
      if (!match) return prev;

      const newQty = match.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(item => item.product.id !== productId);
      }

      // Check stock limit
      if (newQty > match.product.stock) {
        setBarcodeAlert(`Hanya tersedia maksimal ${match.product.stock} unit.`);
        setTimeout(() => setBarcodeAlert(null), 3000);
        return prev;
      }

      return prev.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: newQty } 
          : item
      );
    });
  };

  // Remove individual cart row
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Manual & automatic barcode simulated scan
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    const matchedProd = products.find(p => p.barcode === scannedBarcode.trim() || p.code === scannedBarcode.trim());
    if (matchedProd) {
      addToCart(matchedProd);
      setScannedBarcode('');
      setBarcodeAlert(null);
    } else {
      setBarcodeAlert(`Produk dengan Barcode/ID "${scannedBarcode}" tidak ditemukan.`);
      setTimeout(() => setBarcodeAlert(null), 3000);
    }
  };

  // Fast-clickable demo barcodes to simulate scanner
  const demoBarcodes = [
    { name: 'Indomie', code: '8998866110015' },
    { name: 'Roma Kelapa', code: '8992741120221' },
    { name: 'Beng-Beng', code: '8992741120450' },
    { name: 'Aqua Gelas', code: '8992696610013' },
    { name: 'Coca Cola', code: '5000112631011' },
  ];

  // Cart financial calculations
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
    const tax = Math.round(subtotal * (taxPercent / 100));
    const grandTotal = Math.max(0, subtotal + tax - globalDiscount);
    return {
      subtotal,
      tax,
      grandTotal
    };
  }, [cart, globalDiscount, taxPercent]);

  // Open checkout dialog
  const handleCheckoutOpen = () => {
    if (cart.length === 0) return;
    setCashReceived(cartTotals.grandTotal);
    setQrisPaid(false);
    setIsCheckoutOpen(true);
  };

  // Quick cash assistants
  const cashSuggestions = useMemo(() => {
    const total = cartTotals.grandTotal;
    const baseSuggestions = [5000, 10000, 20000, 50000, 100000];
    const suggestionSet = new Set<number>();
    
    // Add exact amount
    suggestionSet.add(total);

    // Calculate next dynamic values, e.g. next round-ups
    if (total < 10000) suggestionSet.add(10000);
    else if (total < 20000) suggestionSet.add(20000);
    else if (total < 50000) {
      suggestionSet.add(50000);
      suggestionSet.add(Math.ceil(total / 10000) * 10000);
    } else if (total < 100000) {
      suggestionSet.add(100000);
      suggestionSet.add(Math.ceil(total / 50000) * 50000);
      suggestionSet.add(Math.ceil(total / 10000) * 10000);
    } else {
      // higher values
      suggestionSet.add(Math.ceil(total / 50000) * 50000);
      suggestionSet.add(Math.ceil(total / 100000) * 100000);
    }

    return Array.from(suggestionSet)
      .filter(val => val >= total)
      .sort((a,b) => a-b)
      .slice(0, 5);
  }, [cartTotals.grandTotal]);

  // Submit and confirm payment
  const processPayment = () => {
    const invoiceNumber = `TRX/20260526/${Math.floor(1000 + Math.random() * 9000)}`;
    const changeAmount = paymentMethod === 'CASH' ? Math.max(0, cashReceived - cartTotals.grandTotal) : 0;

    const newTransaction: Transaction = {
      id: `tx-new-${Date.now()}`,
      invoiceNo: invoiceNumber,
      date: new Date().toISOString(),
      cashierName: currentUser?.name || 'Siti Rahma (Kasir)',
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        sellingPrice: item.product.sellingPrice,
        costPrice: item.product.costPrice,
        subtotal: item.product.sellingPrice * item.quantity
      })),
      subtotal: cartTotals.subtotal,
      tax: cartTotals.tax,
      discountTotal: globalDiscount,
      grandTotal: cartTotals.grandTotal,
      paymentMethod,
      amountPaid: paymentMethod === 'CASH' ? cashReceived : cartTotals.grandTotal,
      change: changeAmount
    };

    onCheckoutComplete(newTransaction);
    setActiveReceipt(newTransaction);
    setIsCheckoutOpen(false);
    setIsReceiptOpen(true);
    setCart([]);
    setGlobalDiscount(0);
  };

  // Simulate structural paper print
  const handleThermalPrint = () => {
    setIsReceiptPrinting(true);
    setTimeout(() => {
      setIsReceiptPrinting(false);
      // Trigger true print fallback contextually
      window.print();
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto overflow-hidden bg-slate-50/50">
      
      {/* Catalog & Search Section (Left Column) */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden gap-5 h-full">
        
        {/* Real-time search and filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari makanan, minuman, barcode atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 rounded-xl outline-none"
              />
            </div>

            {/* Layout control selectors & Sorting */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* Toggle Category Sidebar Button */}
              <button
                type="button"
                onClick={() => setShowCategorySidebar(!showCategorySidebar)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  showCategorySidebar
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={showCategorySidebar ? 'Sembunyikan Menu Kategori' : 'Tampilkan Menu Kategori'}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Kategori</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showCategorySidebar ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
              </button>

              {/* Toggle Barcode Scanner Button */}
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  showBarcodeScanner
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={showBarcodeScanner ? 'Sembunyikan Pindai Barcode' : 'Tampilkan Pindai Barcode'}
              >
                <Barcode className="w-4 h-4" />
                <span>Barcode</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showBarcodeScanner ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
              </button>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3 py-2 rounded-xl focus:border-blue-500 outline-none"
              >
                <option value="name-asc">Nama (A-Z)</option>
                <option value="name-desc">Nama (Z-A)</option>
                <option value="price-asc">Harga Terendah</option>
                <option value="price-desc">Harga Tertinggi</option>
                <option value="stock-asc">Stok Tersedikit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Pane Work Area: Vertical Category Sidebar + Product Grid */}
        <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
          
          {/* Category Sidebar Column (Slide-in collapsible vertical list) */}
          {showCategorySidebar && (
            <div className="w-52 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex flex-col gap-2 shrink-0 overflow-y-auto">
              <div className="px-2 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Kategori Produk</span>
                <button
                  type="button"
                  onClick={() => setShowCategorySidebar(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Sembunyikan Kategori"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                {/* All Categories Option */}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setCurrentPage(1);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition-all flex items-center justify-between group ${
                    selectedCategory === 'all' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                      selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}>
                      ALL
                    </span>
                    <span className="truncate">Semua Produk</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    selectedCategory === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {products.length}
                  </span>
                </button>

                {/* Categories Iteration with count indicator badges */}
                {categories.map(cat => {
                  const itemsCount = categoryCounts[cat.id] || 0;
                  const initials = cat.name.split(' ').map(word => word[0]).join('').slice(0, 3).toUpperCase();
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-550 group-hover:bg-slate-200'
                        }`}>
                          {initials}
                        </span>
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {itemsCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Work area (Grid & Barcode simulation form) */}
          <div className="flex-1 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
            
            {/* Real-time barcode simulated input */}
            {showBarcodeScanner && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shrink-0 transition-all duration-200">
                <form onSubmit={handleBarcodeScan} className="flex gap-3 items-center">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Pindai barcode scanner / input ID otomatis..."
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-mono font-medium rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Sembunyikan Barcode Panel"
                  >
                    ✕
                  </button>
                </form>

                {/* Prompt labels to click-scan immediately */}
                <div className="mt-2.5 flex items-center flex-wrap gap-2 text-[10px]">
                  <span className="text-slate-400">Klik demo barcode:</span>
                  {demoBarcodes.map(bar => (
                    <button
                      key={bar.code}
                      onClick={() => {
                        setScannedBarcode(bar.code);
                        const matched = products.find(p => p.barcode === bar.code);
                        if (matched) addToCart(matched);
                        setScannedBarcode('');
                      }}
                      className="bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-mono px-2 py-0.5 rounded border border-blue-100/60 transition-colors"
                    >
                      {bar.name} ({bar.code.slice(-4)})
                    </button>
                  ))}
                </div>

                {barcodeAlert && (
                  <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{barcodeAlert}</span>
                  </div>
                )}
              </div>
            )}

            {/* Product Catalog Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {paginatedProducts.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <p className="text-sm font-medium">Produk tidak ditemukan.</p>
                  <p className="text-xs mt-1">Coba sesuaikan kata kunci atau bersihkan filter di atas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedProducts.map(p => {
                    const isOutOfStock = p.stock === 0;
                    const isLowStock = p.stock <= p.minStock && p.stock > 0;
                    const cat = categories.find(c => c.id === p.categoryId);
                    
                    return (
                      <div
                        key={p.id}
                        onClick={() => !isOutOfStock && addToCart(p)}
                        className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm group select-none ${
                          isOutOfStock 
                            ? 'opacity-60 border-slate-150 grayscale cursor-not-allowed'
                            : 'border-slate-100 hover:border-blue-300 hover:shadow-md cursor-pointer hover:scale-[1.01]'
                        }`}
                      >
                        <div className="p-4 flex gap-3.5 items-start">
                          <img
                            src={p.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=150&auto=format&fit=crop"}
                            alt={p.name}
                            className="w-16 h-16 rounded-xl object-cover bg-slate-50 border border-slate-100 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] uppercase font-bold text-blue-500 font-mono tracking-wider bg-blue-50 border border-blue-100 px-1 py-0.5 rounded">
                              {cat?.name || 'Kebutuhan'}
                            </span>
                            <h4 className="font-sans font-semibold text-slate-800 text-xs mt-1.5 group-hover:text-blue-600 truncate">
                              {p.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Kode: {p.code}</p>
                          </div>
                        </div>

                        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-50 flex items-center justify-between">
                          <div className="font-mono font-bold text-slate-800 text-xs">
                            {formatIDR(p.sellingPrice)}
                          </div>
                          <div className="text-right">
                            {isOutOfStock ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded font-mono">HABIS</span>
                            ) : isLowStock ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded font-mono">SISA {p.stock}</span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Stok: <b>{p.stock}</b></span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Catalog Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shrink-0">
                <span className="text-[11px] text-slate-500">
                  Menampilkan halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Cart Container & checkout (Right Column) */}
      <div className="w-96 bg-white border-l border-slate-100 flex flex-col justify-between h-full shadow-lg">
        {/* Cart Title */}
        <div className="p-4 border-b border-slate-150/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h3 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider">Keranjang Belanja</h3>
          </div>
          <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full font-mono text-[10px]">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
          </span>
        </div>

        {/* Cart items listing */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400">
              <ShoppingCart className="w-12 h-12 text-slate-200 mb-2.5" />
              <p className="text-xs font-semibold">Keranjang Kosong</p>
              <p className="text-[11px] mt-0.5">Pilih produk di katalog atau pindai barcode untuk memulai.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80 flex items-start gap-3 transition-colors hover:border-slate-200 relative group"
              >
                <img
                  src={item.product.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=150&auto=format&fit=crop"}
                  alt={item.product.name}
                  className="w-10 h-10 rounded-lg object-cover bg-slate-50 border border-slate-100 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs text-slate-800 leading-tight pr-5">
                    {item.product.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    {formatIDR(item.product.sellingPrice)} / pcs
                  </p>
                  
                  {/* Adjustment logic */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-500 cursor-pointer flex items-center justify-center"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-sans font-bold text-xs text-slate-800 w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, +1)}
                      className="w-6 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-500 cursor-pointer flex items-center justify-center"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between items-end h-full">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 rounded focus:outline-none transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <p className="font-mono font-bold text-xs text-slate-800 mt-5">
                    {formatIDR(item.product.sellingPrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation summary & Payment action */}
        <div className="p-4 border-t border-slate-150/40 bg-slate-50/30 space-y-4">
          <div className="space-y-2">
            
            {/* Discount Adjustment */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                Voucher Diskon (Rp)
              </span>
              <input
                type="number"
                placeholder="0"
                value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                className="w-20 font-mono text-right border border-slate-200 bg-white p-1 text-[11px] rounded outline-none text-slate-800 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>Subtotal</span>
              <span className="font-mono">{formatIDR(cartTotals.subtotal)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>Pajak (PPN {taxPercent}%)</span>
              <span className="font-mono">{formatIDR(cartTotals.tax)}</span>
            </div>

            {globalDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                <span>Diskon</span>
                <span className="font-mono">-{formatIDR(globalDiscount)}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-2.5 flex justify-between items-baseline">
              <span className="font-sans font-extrabold text-slate-800 text-sm">GRAND TOTAL</span>
              <span className="font-mono font-extrabold text-blue-600 text-lg">
                {formatIDR(cartTotals.grandTotal)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setCart([]);
                setGlobalDiscount(0);
              }}
              disabled={cart.length === 0}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Kosongkan Keranjang"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleCheckoutOpen}
              disabled={cart.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 text-white font-bold py-3 text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <span>Bayar Transaksi</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* CHECKOUT POPUP MODAL (Cash, QRIS, Virtual Account option) */}
      {/* ========================================================= */}
      {isCheckoutOpen && (
        <div id="checkout-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-50">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm font-sans">Pilih Metode Pembayaran</h3>
                <p className="text-[10px] text-slate-400">Pilih salah satu metode pembayaran yang sesuai.</p>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Total tag info inside popup */}
            <div className="bg-slate-50 my-4 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">Tagihan Pembayaran</span>
              <h2 className="font-mono font-extrabold text-blue-600 text-2xl mt-1 select-all">{formatIDR(cartTotals.grandTotal)}</h2>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-2 font-semibold text-xs cursor-pointer transition-all ${
                  paymentMethod === 'CASH' 
                    ? 'border-blue-500 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Coins className="w-5 h-5 text-blue-500" />
                <span>Uang Tunai (Cash)</span>
              </button>

              <button
                onClick={() => setPaymentMethod('QRIS')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-2 font-semibold text-xs cursor-pointer transition-all ${
                  paymentMethod === 'QRIS' 
                    ? 'border-blue-500 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <QrCode className="w-5 h-5 text-blue-500" />
                <span>QRIS Dinamis</span>
              </button>

              <button
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-2 font-semibold text-xs cursor-pointer transition-all ${
                  paymentMethod === 'TRANSFER' 
                    ? 'border-blue-500 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-500" />
                <span>Transfer VA</span>
              </button>
            </div>

            {/* Dynamic Payment Detail forms inside modal */}
            <div className="my-5 flex-1 overflow-y-auto">
              {paymentMethod === 'CASH' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 font-mono">
                      Masukkan Tunai Tunai (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full text-center font-mono font-bold text-lg border border-slate-200 bg-slate-50/50 p-2.5 rounded-xl outline-none text-slate-800 focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cashSuggestions.map(val => (
                      <button
                        key={val}
                        onClick={() => setCashReceived(val)}
                        className="bg-white border hover:bg-slate-50 border-slate-200 px-3 py-1.5 text-xs font-mono font-bold rounded-xl cursor-pointer text-slate-600 transition-colors"
                      >
                        {formatIDR(val)}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Change layout */}
                  <div className="p-4 rounded-xl flex items-center justify-between border border-dashed text-sm font-semibold mt-3 bg-emerald-50 bg-opacity-30 border-emerald-150">
                    <span className="text-emerald-700">Uang Kembalian</span>
                    <span className="font-mono text-emerald-600 text-base font-bold">
                      {cashReceived >= cartTotals.grandTotal
                        ? formatIDR(cashReceived - cartTotals.grandTotal)
                        : formatIDR(0)}
                    </span>
                  </div>

                  {cashReceived < cartTotals.grandTotal && (
                    <div className="text-[11px] text-rose-500 font-semibold text-center">
                      ⚠ Nominal uang tunai masih kurang!
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'QRIS' && (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border text-center space-y-3">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-mono">STANDAR QRIS MINIMARKET</p>
                  
                  {/* Generated QR Mock with total printed */}
                  <div className="w-40 h-40 bg-white border-2 border-slate-250 p-2 rounded-xl flex items-center justify-center relative shadow-sm">
                    {/* Simplified geometric QR block representing real-looking code */}
                    <div className="grid grid-cols-4 gap-2 w-full h-full opacity-80">
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-300 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-300 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-300 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-300 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-slate-300 rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                    </div>
                    {/* Small center logo card */}
                    <div className="absolute bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] font-extrabold text-blue-600 select-none">
                      QRIS
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400">Discan oleh pembeli lewat aplikasi pembayaran (Gopay/OVO/ShopeePay/M-Banking)</span>

                  {/* Simulate Scanned Successfully trigger */}
                  <button
                    onClick={() => setQrisPaid(true)}
                    className={`py-2 px-4 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      qrisPaid 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${qrisPaid ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{qrisPaid ? 'Status: LUNAS' : 'Klik Demo: Simulasikan Pembayaran Berhasil'}</span>
                  </button>
                </div>
              )}

              {paymentMethod === 'TRANSFER' && (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    {['BCA', 'Mandiri', 'BRI'].map(bank => (
                      <button
                        key={bank}
                        onClick={() => setSelectedBank(bank)}
                        className={`px-4 py-1.5 text-xs font-bold border rounded-xl cursor-pointer transition-colors ${
                          selectedBank === bank 
                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                            : 'border-slate-150 text-slate-600'
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-2xl space-y-2 font-mono text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">NOMOR VIRTUAL ACCOUNT {selectedBank}</span>
                    <h3 className="text-base font-bold text-slate-700 tracking-wider">
                      {selectedBank === 'BCA' ? '80777' : selectedBank === 'Mandiri' ? '90012' : '88012'}1234567890
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">Menunggu konfirmasi otomatis bank instan...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom buttons */}
            <div className="pt-4 border-t border-slate-50 flex gap-2 shrink-0">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 rounded-xl transition-all cursor-pointer text-center"
              >
                Kembali
              </button>
              <button
                onClick={processPayment}
                disabled={
                  (paymentMethod === 'CASH' && cashReceived < cartTotals.grandTotal) || 
                  (paymentMethod === 'QRIS' && !qrisPaid)
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-250 text-white text-xs font-extrabold py-3 rounded-xl transition-all cursor-pointer text-center uppercase tracking-wider shadow-md shadow-blue-500/10"
              >
                Konfirmasi Lunas
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* THERMAL STRUK RECEIPT POPUP (Beautiful realistic thermal roll) */}
      {/* ========================================================= */}
      {isReceiptOpen && activeReceipt && (
        <div id="receipt-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-100 overflow-y-auto max-h-[95vh] w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col justify-between real-print-hidden">
            
            {/* Styled Cashier Receipt Ticket container */}
            <div className="bg-white px-5 py-6 rounded-2xl border border-slate-200 text-slate-800 text-center font-mono text-[11px] leading-relaxed shadow-sm flex-1">
              
              {/* Header */}
              <div className="space-y-1">
                <h4 className="font-sans font-extrabold text-sm text-slate-800 tracking-tight uppercase">MINIMARKET MODERN</h4>
                <p className="text-[10px] text-slate-500">Kavling Sudirman Indah Blok B-4</p>
                <p className="text-[10px] text-slate-500">Tlp: (021) 8882-1200</p>
                <p className="text-[10px] text-slate-500">Jakarta Selatan, DKI Jakarta</p>
              </div>

              {/* Divider line symbol commonly used on paper strips */}
              <div className="my-3 text-slate-400 select-none">=================================</div>

              {/* Meta information columns */}
              <div className="text-left space-y-1 text-slate-600 text-[10px]">
                <div className="flex justify-between">
                  <span>Nota ID :</span>
                  <span className="font-bold text-slate-800">{activeReceipt.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal :</span>
                  <span>{new Date(activeReceipt.date).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir   :</span>
                  <span>{activeReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode  :</span>
                  <span className="font-bold">{activeReceipt.paymentMethod}</span>
                </div>
              </div>

              <div className="my-3 text-slate-400 select-none">=================================</div>

              {/* List of checkout products row by row */}
              <div className="text-left space-y-2 my-2 select-text">
                {activeReceipt.items.map((it, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-slate-800 text-xs font-semibold">
                      <span>{it.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>{it.quantity} x {formatIDR(it.sellingPrice)}</span>
                      <span>{formatIDR(it.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-3 text-slate-400 select-none">—————————————————————————————————</div>

              {/* Aggregation rows */}
              <div className="text-right space-y-1 text-slate-700">
                <div className="flex justify-between text-[10px]">
                  <span>Subtotal:</span>
                  <span>{formatIDR(activeReceipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>PPN Pajak ({taxPercent}%):</span>
                  <span>{formatIDR(activeReceipt.tax)}</span>
                </div>
                {activeReceipt.discountTotal > 0 && (
                  <div className="flex justify-between text-[10px] text-emerald-600 font-semibold">
                    <span>Diskon Potongan:</span>
                    <span>-{formatIDR(activeReceipt.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-slate-800 pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>{formatIDR(activeReceipt.grandTotal)}</span>
                </div>
                
                <div className="my-1.5 text-slate-200 select-none">---------------------------------</div>
                
                <div className="flex justify-between text-[10px]">
                  <span>Dibayarkan:</span>
                  <span>{formatIDR(activeReceipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-800">
                  <span>Kembalian:</span>
                  <span>{formatIDR(activeReceipt.change)}</span>
                </div>
              </div>

              <div className="my-3 text-slate-400 select-none">=================================</div>

              {/* Footer message / Barcode simulation */}
              <div className="space-y-2 mt-2">
                <p className="text-[10px] text-slate-550 leading-tight">Terima kasih atas kunjungan Anda.<br/>Barang yang sudah dibeli tidak dapat ditukar.</p>
                <div className="pt-2 font-serif text-lg tracking-widest text-slate-500 select-none">
                  ||||| | |||| || || | |||| || 
                </div>
                <span className="text-[8px] text-slate-400 font-mono">Powered by Kasir Pintar Modern</span>
              </div>

            </div>

            {/* Action drawer */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleThermalPrint}
                disabled={isReceiptPrinting}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-450 text-white font-bold py-3 text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isReceiptPrinting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mencetak Nota...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Cetak Thermal Struk</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsReceiptOpen(false)}
                className="w-full bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 font-bold py-3 text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Transaksi Baru
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
