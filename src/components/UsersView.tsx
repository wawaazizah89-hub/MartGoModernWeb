import React, { useState } from 'react';
import { Users, Plus, ShieldCheck, Trash2, Key, UserCheck, CheckCircle2 } from 'lucide-react';
import { User, UserRole } from '../types';

interface UsersViewProps {
  users: User[];
  currentUser: User | null;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (id: string) => void;
}

export default function UsersView({ users, currentUser, onAddUser, onDeleteUser }: UsersViewProps) {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.KASIR);
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    onAddUser({
      username: username.toLowerCase().trim(),
      name: name.trim(),
      role,
      avatar: `https://images.unsplash.com/photo-${role === UserRole.ADMIN ? '1535713875002-d1d0cf377fde' : '1570295999919-56ceb5ecca61'}?q=80&w=120&auto=format&fit=crop`
    });

    setUsername('');
    setName('');
    setRole(UserRole.KASIR);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Search Header area */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="font-sans font-bold text-slate-800 text-sm">Organisasi Karyawan & Kasir</h3>
          <p className="text-[11px] text-slate-400 mt-1">Kelola hak akses operator kasir dan administrator minimarket.</p>
        </div>

        <button
          onClick={() => {
            if (!isAdmin) {
              alert('Hanya ADMIN yang dapat menambahkan user baru!');
              return;
            }
            setIsModalOpen(true);
          }}
          className={`font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            isAdmin 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Staff Baru</span>
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => {
          const isMe = u.id === currentUser?.id;
          
          return (
            <div 
              key={u.id} 
              className={`bg-white rounded-3xl border p-5 shadow-sm transition-all duration-200 flex flex-col justify-between relative overflow-hidden text-slate-800 ${
                isMe ? 'border-blue-500 ring-1 ring-blue-50' : 'border-slate-100 hover:shadow-md'
              }`}
            >
              {isMe && (
                <span className="absolute top-3 right-3 bg-blue-50 text-blue-700 border border-blue-100 text-[9px] px-2 py-0.5 rounded-full font-bold">
                  Sesi Aktif Anda
                </span>
              )}

              <div className="flex items-center gap-4">
                <img
                  src={u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop"}
                  alt={u.name}
                  className="w-14 h-14 rounded-full border border-slate-100 object-cover bg-slate-50"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-slate-805 tracking-tight">{u.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Kode Sesi: {u.username}</p>
                  
                  <div className="mt-2.5">
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider ${
                      u.role === UserRole.ADMIN 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-250'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password credentials cues */}
              <div className="bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100 mt-5 space-y-2 text-[10px] sm:text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Key className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-sans">Password Default Demo:</span>
                </div>
                <div className="font-mono bg-white border px-2 py-1.5 rounded-lg text-slate-700 font-bold block w-max mt-1">
                  {u.role === UserRole.ADMIN ? 'admin123' : 'kasir123'}
                </div>
              </div>

              {/* Detach action */}
              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                <button
                  disabled={!isAdmin || isMe}
                  onClick={() => onDeleteUser(u.id)}
                  className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isAdmin && !isMe 
                      ? 'border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200' 
                      : 'border-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Akses</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* POPUP: ADD STAFF USER DETAILS */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div id="add-user-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-rose-550/10 mb-4 ">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tambah Karyawan Baru</h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                  Nama Lengkap Operator
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Doni Herawan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 focus:bg-white border text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                  Username Log Sesi (Huruf Kecil)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: doni123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-50 focus:bg-white border text-xs px-3 py-2 rounded-xl outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                  Hak Akses Sistem (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border text-xs px-3 py-2 rounded-xl cursor-pointer"
                >
                  <option value={UserRole.KASIR}>KASIR (Staf Pelayan Kasir)</option>
                  <option value={UserRole.ADMIN}>ADMIN (Pemilik / Supervisor)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold py-2.5 rounded-xl text-xs text-center cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs text-center cursor-pointer transition-all shadow-md shadow-blue-500/10"
                >
                  Daftarkan Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
