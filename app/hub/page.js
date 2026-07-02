"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export default function HubPage() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const tools = [
    { name: 'Daftar Aset', icon: '🏠', desc: 'Manajemen aset rumah tangga' },
    { name: 'Servis Kendaraan', icon: '🚗', desc: 'Jadwal dan riwayat servis' },
    { name: 'Catatan Anak', icon: '👶', desc: 'Perkembangan dan vaksinasi' },
    { name: 'To-Do List', icon: '📝', desc: 'Daftar belanja & tugas' },
  ];

  return (
    <div className="p-4 max-w-md mx-auto pt-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Hub</h1>
          <p className="text-sm text-neutral-400">Pusat Manajemen Rumah Tangga</p>
        </div>
        <button 
          onClick={() => setShowLogoutModal(true)}
          className="bg-neutral-100 text-neutral-500 rounded-full w-10 h-10 flex items-center justify-center hover:bg-neutral-200 transition-colors shadow-sm"
          title="Keluar"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tools.map((tool, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-3">{tool.icon}</span>
            <h3 className="font-medium text-neutral-800 text-sm">{tool.name}</h3>
            <p className="text-[10px] text-neutral-400 mt-1 leading-tight">{tool.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center bg-neutral-100 rounded-2xl p-6 border border-neutral-200 border-dashed">
         <p className="text-sm text-neutral-500 font-medium">+ Tambah Modul Baru</p>
      </div>

      {/* Pop-up Konfirmasi Logout */}
      {showLogoutModal && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Keluar Aplikasi?</h3>
            <p className="text-sm text-neutral-500 mb-6">
              Sesi Anda akan dihentikan dan Anda harus login kembali untuk mengakses data keuangan.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleLogout}
                className="flex-1 py-3 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
