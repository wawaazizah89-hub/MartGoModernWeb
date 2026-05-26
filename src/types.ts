export enum UserRole {
  ADMIN = 'ADMIN',
  KASIR = 'KASIR',
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'makanan' | 'minuman';
}

export interface Brand {
  id: string;
  name: string;
  type: 'makanan' | 'minuman';
}

export interface Product {
  id: string;
  code: string; // numeric auto
  name: string;
  categoryId: string;
  brandId: string;
  costPrice: number; // harga modal
  sellingPrice: number; // harga jual
  margin: number; // margin keuntungan otomatis (calculated or editable)
  stock: number;
  minStock: number; // threshold for hampir habis
  barcode: string;
  status: 'Tersedia' | 'Habis';
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // in percent or value
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  date: string; // ISO string or YYYY-MM-DD HH:mm:ss
  cashierName: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    sellingPrice: number;
    costPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER';
  amountPaid: number;
  change: number;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: 'IN' | 'OUT';
  quantity: number;
  notes: string;
}
