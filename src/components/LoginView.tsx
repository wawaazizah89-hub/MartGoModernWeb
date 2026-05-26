import React, { useState } from 'react';
import { Store, User, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { User as UserType } from '../types';
import { INITIAL_USERS } from '../data';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
  shopName: string;
}

export default function LoginView({ onLoginSuccess, shopName }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const match = INITIAL_USERS.find(
        (u) => 
          u.username.toLowerCase() === username.trim().toLowerCase() && 
          ((u.role === 'ADMIN' && password === 'admin123') || (u.role === 'KASIR' && password === 'kasir123'))
      );

      if (match) {
        onLoginSuccess(match);
      } else {
        setError('Username atau password salah (Kunci Demo: "admin123" atau "kasir123")');
        setIsLoading(false);
      }
    }, 800);
  };

  const handleQuickLogin = (role: 'ADMIN' | 'KASIR') => {
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const targetUser = INITIAL_USERS.find(u => u.role === role);
      if (targetUser) {
        onLoginSuccess(targetUser);
      } else {
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-blue-100/30 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-emerald-50/30 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100/80 p-8 z-10 transition-all duration-300">
        {/* Logo and Brand Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50 mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-slate-800">
            {shopName || "POS Minimarket"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Sistem Point of Sale Modern & Minimalis</p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Masukkan username (admin / kasir)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 rounded-xl outline-none transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 rounded-xl outline-none transition-all font-sans"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-[11px] text-rose-600 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl py-3 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer shadow-md shadow-blue-500/10"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                Memproses...
              </span>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Divider and Demo Speed Login */}
        <div className="relative my-6 flex py-1 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
            Demo Masuk Cepat
          </span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleQuickLogin('ADMIN')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 py-2 px-3 border border-blue-100 hover:border-blue-200 hover:bg-blue-50/30 text-[11px] text-blue-600 font-semibold bg-white rounded-xl transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>Kredensial Admin</span>
          </button>

          <button
            onClick={() => handleQuickLogin('KASIR')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 py-2 px-3 border border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50/30 text-[11px] text-emerald-600 font-semibold bg-white rounded-xl transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Kredensial Kasir</span>
          </button>
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-400">
          <p>© 2026 {shopName || "POS Minimarket"}. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}
