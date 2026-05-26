import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  Store,
  ShieldAlert,
  Lock,
  Database
} from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  shopName: string;
}

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  currentUser, 
  onLogout,
  shopName
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.KASIR] },
    { id: 'kasir', name: 'Kasir Cepat', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.KASIR] },
    { id: 'produk', name: 'Stok & Produk', icon: Package, roles: [UserRole.ADMIN, UserRole.KASIR] },
    { id: 'riwayat', name: 'Riwayat Transaksi', icon: History, roles: [UserRole.ADMIN, UserRole.KASIR] },
    { id: 'laporan', name: 'Laporan Penjualan', icon: BarChart3, roles: [UserRole.ADMIN], restricted: true },
    { id: 'users', name: 'Manajemen User', icon: Users, roles: [UserRole.ADMIN], restricted: true },
    { id: 'database_cloud', name: 'Database Cloud', icon: Database, roles: [UserRole.ADMIN], restricted: true },
    { id: 'pengaturan', name: 'Pengaturan Toko', icon: Settings, roles: [UserRole.ADMIN], restricted: true },
  ];

  return (
    <aside id="main-sidebar" className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Branding */}
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
          <Store className="w-5.5 h-5.5" />
        </div>
        <div>
          <h1 className="font-sans font-semibold text-slate-800 tracking-tight text-md leading-none">
            {shopName || "POS Minimarket"}
          </h1>
          <span className="text-[10px] uppercase font-mono tracking-wider text-blue-500 font-semibold mt-1 block">
            Kasir Pintar v2.0
          </span>
        </div>
      </div>

      {/* User Session Profile */}
      {currentUser && (
        <div className="p-4 mx-4 my-4 bg-slate-50/60 rounded-2xl border border-slate-100/50 flex items-center gap-3">
          <img
            src={currentUser.avatar || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=120&auto=format&fit=crop"}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/80 shadow-sm"
          />
          <div className="overflow-hidden">
            <h4 className="font-sans font-medium text-xs text-slate-800 truncate leading-tight">
              {currentUser.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md font-mono ${
                currentUser.role === UserRole.ADMIN 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isAccessible = item.roles.includes(currentUser?.role || UserRole.KASIR);
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isAccessible) {
                  setActiveView(item.id);
                }
              }}
              disabled={!isAccessible}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold border-l-3 border-blue-600'
                  : isAccessible
                    ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    : 'text-slate-300 cursor-not-allowed filter grayscale opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4.5 h-4.5 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                }`} />
                <span>{item.name}</span>
              </div>
              
              {!isAccessible && (
                <Lock className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Log Out Section */}
      <div className="p-4 border-t border-slate-50">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5 text-rose-400 group-hover:text-rose-600" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>
  );
}
