import { Category, Brand, Product, Transaction, User, UserRole, StockLog } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    name: 'Adi Ningrat (Admin)',
    role: UserRole.ADMIN,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: 'usr-2',
    username: 'kasir',
    name: 'Siti Rahma (Kasir)',
    role: UserRole.KASIR,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop',
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Makanan Instan', type: 'makanan' },
  { id: 'cat-2', name: 'Camilan & Biskuit', type: 'makanan' },
  { id: 'cat-3', name: 'Air Mineral & Isotonik', type: 'minuman' },
  { id: 'cat-4', name: 'Teh & Kopi Kemasan', type: 'minuman' },
  { id: 'cat-5', name: 'Soda & Minuman Manis', type: 'minuman' },
];

export const INITIAL_BRANDS: Brand[] = [
  { id: 'br-1', name: 'Indofood', type: 'makanan' },
  { id: 'br-2', name: 'Wings Food', type: 'makanan' },
  { id: 'br-3', name: 'Mayora', type: 'makanan' },
  { id: 'br-4', name: 'Aqua', type: 'minuman' },
  { id: 'br-5', name: 'Teh Botol Sosro', type: 'minuman' },
  { id: 'br-6', name: 'Coca Cola', type: 'minuman' },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Makanan Instan - Indofood
  {
    id: 'p-1',
    code: '10001',
    name: 'Indomie Goreng Spesial',
    categoryId: 'cat-1',
    brandId: 'br-1',
    costPrice: 2600,
    sellingPrice: 3200,
    margin: 600,
    stock: 120,
    minStock: 20,
    barcode: '8998866110015',
    status: 'Tersedia',
    imageUrl: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=150&auto=format&fit=crop',
  },
  {
    id: 'p-2',
    code: '10002',
    name: 'Indomie Kuah Ayam Bawang',
    categoryId: 'cat-1',
    brandId: 'br-1',
    costPrice: 2500,
    sellingPrice: 3100,
    margin: 600,
    stock: 15, // Hampir habis untuk ditunjukkan di dashboard
    minStock: 20,
    barcode: '8998866110022',
    status: 'Tersedia',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=150&auto=format&fit=crop',
  },
  // Camilan - Mayora
  {
    id: 'p-3',
    code: '10003',
    name: 'Roma Kelapa 300g',
    categoryId: 'cat-2',
    brandId: 'br-3',
    costPrice: 8500,
    sellingPrice: 10500,
    margin: 2000,
    stock: 45,
    minStock: 10,
    barcode: '8992741120221',
    status: 'Tersedia',
    imageUrl: 'https://images.unsplash.com/photo-1558961309-dbdf000a1291?q=80&w=150&auto=format&fit=crop',
  },
  {
    id: 'p-4',
    code: '10004',
    name: 'Beng-Beng Cokelat 20g',
    categoryId: 'cat-2',
    brandId: 'br-3',
    costPrice: 2000,
    sellingPrice: 2500,
    margin: 500,
    stock: 200,
    minStock: 15,
    barcode: '8992741120450',
    status: 'Tersedia',
    imageUrl: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?q=80&w=150&auto=format&fit=crop',
  },
  // Camilan - Wings
  {
    id: 'p-5',
    code: '10005',
    name: 'Mie Sedaap Goreng',
    categoryId: 'cat-1',
    brandId: 'br-2',
    costPrice: 2550,
    sellingPrice: 3150,
    margin: 600,
    stock: 85,
    minStock: 25,
    barcode: '8998866200150',
    status: 'Tersedia',
  },
  // Minuman - Aqua
  {
    id: 'p-6',
    code: '10006',
    name: 'Aqua Gelas 220ml',
    categoryId: 'cat-3',
    brandId: 'br-4',
    costPrice: 800,
    sellingPrice: 1200,
    margin: 400,
    stock: 250,
    minStock: 30,
    barcode: '8992696610013',
    status: 'Tersedia',
    imageUrl: 'https://images.unsplash.com/photo-1616118132534-381148898bb4?q=80&w=150&auto=format&fit=crop',
  },
  {
    id: 'p-7',
    code: '10007',
    name: 'Aqua Botol 600ml',
    categoryId: 'cat-3',
    brandId: 'br-4',
    costPrice: 2500,
    sellingPrice: 3500,
    margin: 1000,
    stock: 5, // Stok kritis
    minStock: 15,
    barcode: '8992696610020',
    status: 'Tersedia',
  },
  // Minuman - Teh Botol Sosro
  {
    id: 'p-8',
    code: '10008',
    name: 'Teh Botol Sosro Kotak 250ml',
    categoryId: 'cat-4',
    brandId: 'br-5',
    costPrice: 2800,
    sellingPrice: 3500,
    margin: 700,
    stock: 75,
    minStock: 15,
    barcode: '8992696200214',
    status: 'Tersedia',
  },
  // Soda - Coca Cola
  {
    id: 'p-9',
    code: '10009',
    name: 'Coca Cola Kaleng 330ml',
    categoryId: 'cat-5',
    brandId: 'br-6',
    costPrice: 4800,
    sellingPrice: 6500,
    margin: 1700,
    stock: 40,
    minStock: 12,
    barcode: '5000112631011',
    status: 'Tersedia',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=150&auto=format&fit=crop',
  },
  {
    id: 'p-10',
    code: '10010',
    name: 'Sprite Kaleng 330ml',
    categoryId: 'cat-5',
    brandId: 'br-6',
    costPrice: 4800,
    sellingPrice: 6500,
    margin: 1700,
    stock: 0, // Habis total
    minStock: 12,
    barcode: '5000112631028',
    status: 'Habis',
  }
];

export const INITIAL_STOCK_LOGS: StockLog[] = [
  {
    id: 'log-1',
    productId: 'p-1',
    productName: 'Indomie Goreng Spesial',
    date: '2026-05-24T08:00:00Z',
    type: 'IN',
    quantity: 100,
    notes: 'Stok awal supplier'
  },
  {
    id: 'log-2',
    productId: 'p-6',
    productName: 'Aqua Gelas 220ml',
    date: '2026-05-24T08:30:00Z',
    type: 'IN',
    quantity: 200,
    notes: 'Restock mingguan'
  },
  {
    id: 'log-3',
    productId: 'p-7',
    productName: 'Aqua Botol 600ml',
    date: '2026-05-25T11:00:00Z',
    type: 'OUT',
    quantity: 10,
    notes: 'Penjualan off-system'
  }
];

// Generate structured past transactions for the last 3 days
// Today is May 26, 2026
export const INITIAL_TRANSACTIONS: Transaction[] = [
  // 2 days ago (May 24, 2026)
  {
    id: 'tx-1',
    invoiceNo: 'TRX/20260524/0001',
    date: '2026-05-24T10:15:30Z',
    cashierName: 'Siti Rahma (Kasir)',
    items: [
      { productId: 'p-1', name: 'Indomie Goreng Spesial', quantity: 5, sellingPrice: 3200, costPrice: 2600, subtotal: 16000 },
      { productId: 'p-3', name: 'Roma Kelapa 300g', quantity: 2, sellingPrice: 10500, costPrice: 8500, subtotal: 21000 },
      { productId: 'p-6', name: 'Aqua Gelas 220ml', quantity: 12, sellingPrice: 1200, costPrice: 800, subtotal: 14400 },
    ],
    subtotal: 51400,
    tax: 5140, // 10%
    discountTotal: 0,
    grandTotal: 56540,
    paymentMethod: 'CASH',
    amountPaid: 60000,
    change: 3460,
  },
  {
    id: 'tx-2',
    invoiceNo: 'TRX/20260524/0002',
    date: '2026-05-24T14:45:00Z',
    cashierName: 'Siti Rahma (Kasir)',
    items: [
      { productId: 'p-4', name: 'Beng-Beng Cokelat 20g', quantity: 10, sellingPrice: 2500, costPrice: 2000, subtotal: 25000 },
      { productId: 'p-9', name: 'Coca Cola Kaleng 330ml', quantity: 4, sellingPrice: 6500, costPrice: 4800, subtotal: 26000 },
    ],
    subtotal: 51000,
    tax: 5100,
    discountTotal: 1000, // custom discount
    grandTotal: 55100,
    paymentMethod: 'QRIS',
    amountPaid: 55100,
    change: 0,
  },
  // Yesterday (May 25, 2026)
  {
    id: 'tx-3',
    invoiceNo: 'TRX/20260525/0001',
    date: '2026-05-25T09:30:15Z',
    cashierName: 'Siti Rahma (Kasir)',
    items: [
      { productId: 'p-8', name: 'Teh Botol Sosro Kotak 250ml', quantity: 4, sellingPrice: 3500, costPrice: 2800, subtotal: 14000 },
      { productId: 'p-1', name: 'Indomie Goreng Spesial', quantity: 10, sellingPrice: 3200, costPrice: 2600, subtotal: 32000 },
    ],
    subtotal: 46000,
    tax: 4600,
    discountTotal: 0,
    grandTotal: 50600,
    paymentMethod: 'TRANSFER',
    amountPaid: 50600,
    change: 0,
  },
  {
    id: 'tx-4',
    invoiceNo: 'TRX/20260525/0002',
    date: '2026-05-25T19:20:40Z',
    cashierName: 'Adi Ningrat (Admin)',
    items: [
      { productId: 'p-3', name: 'Roma Kelapa 300g', quantity: 4, sellingPrice: 10500, costPrice: 8500, subtotal: 42000 },
      { productId: 'p-6', name: 'Aqua Gelas 220ml', quantity: 24, sellingPrice: 1200, costPrice: 800, subtotal: 28800 },
      { productId: 'p-9', name: 'Coca Cola Kaleng 330ml', quantity: 6, sellingPrice: 6500, costPrice: 4800, subtotal: 39000 },
    ],
    subtotal: 109800,
    tax: 10980,
    discountTotal: 5000,
    grandTotal: 115780,
    paymentMethod: 'CASH',
    amountPaid: 120000,
    change: 4220,
  },
  // Today's Sales (May 26, 2026) - earlier hours
  {
    id: 'tx-5',
    invoiceNo: 'TRX/20260526/0001',
    date: '2026-05-26T08:10:00Z',
    cashierName: 'Siti Rahma (Kasir)',
    items: [
      { productId: 'p-1', name: 'Indomie Goreng Spesial', quantity: 12, sellingPrice: 3200, costPrice: 2600, subtotal: 38400 },
      { productId: 'p-4', name: 'Beng-Beng Cokelat 20g', quantity: 8, sellingPrice: 2500, costPrice: 2000, subtotal: 20000 },
    ],
    subtotal: 58400,
    tax: 5840,
    discountTotal: 2000,
    grandTotal: 62240,
    paymentMethod: 'QRIS',
    amountPaid: 62240,
    change: 0,
  },
  {
    id: 'tx-6',
    invoiceNo: 'TRX/20260526/0002',
    date: '2026-05-26T10:15:00Z',
    cashierName: 'Siti Rahma (Kasir)',
    items: [
      { productId: 'p-3', name: 'Roma Kelapa 300g', quantity: 3, sellingPrice: 10500, costPrice: 8500, subtotal: 31500 },
      { productId: 'p-8', name: 'Teh Botol Sosro Kotak 250ml', quantity: 6, sellingPrice: 3500, costPrice: 2800, subtotal: 21000 },
    ],
    subtotal: 52500,
    tax: 5250,
    discountTotal: 0,
    grandTotal: 57750,
    paymentMethod: 'CASH',
    amountPaid: 100000,
    change: 42250,
  }
];

export const getFromLS = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return defaultValue;
  }
};

export const saveToLS = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage', error);
  }
};
