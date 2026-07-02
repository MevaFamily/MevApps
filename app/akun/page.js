"use client";
import { useContext, useState } from "react";
import { AppContext } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function AkunPage() {
  const { accounts, setAccounts } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("Tunai"); // Tunai | Bank | E-Wallet
  const [balance, setBalance] = useState("");
  
  const netWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, ''); 
    if (rawValue) setBalance(Number(rawValue).toLocaleString('id-ID'));
    else setBalance("");
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Nama akun tidak boleh kosong.");
    
    const balanceNum = Number(balance.replace(/\./g, '')) || 0;
    
    const tempId = 'temp-' + Date.now();
    const newAccount = {
      id: tempId,
      name: name.trim(),
      type,
      balance: balanceNum,
      created_at: new Date().toISOString()
    };

    // Optimistic Update
    setAccounts(prev => [...prev, newAccount]);
    setShowModal(false);
    setName("");
    setType("Tunai");
    setBalance("");

    // Sync to DB
    try {
      const { error } = await supabase.from('accounts').insert([{
        name: newAccount.name,
        type: newAccount.type,
        balance: newAccount.balance
      }]);
      if (error) throw error;
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Akun</h1>
          <p className="text-sm text-neutral-400">Total Kekayaan Bersih</p>
          <h2 className="text-3xl font-bold mt-2 text-neutral-900">
            Rp {netWorth.toLocaleString('id-ID')}
          </h2>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-neutral-900 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-neutral-800 transition-colors shadow-sm"
        >
          +
        </button>
      </div>

      <div className="space-y-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 flex justify-between items-center">
            <div>
              <h3 className="font-medium text-neutral-800">{acc.name}</h3>
              <p className="text-xs text-neutral-400">{acc.type}</p>
            </div>
            <div className="text-right">
              <span className="font-semibold text-neutral-900">
                Rp {Number(acc.balance).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-center p-8 bg-white border border-neutral-100 rounded-2xl shadow-sm mt-4">
            <p className="text-neutral-400 text-sm">Belum ada akun, silakan tambah akun baru.</p>
          </div>
        )}
      </div>

      {/* Modal Tambah Akun */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">Tambah Akun Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-900 p-2">✕</button>
            </div>
            
            <form onSubmit={handleAddAccount} className="space-y-4 pb-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Nama Akun</label>
                <input 
                  type="text" required
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Dompet Utama, BCA, GoPay"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Jenis Akun</label>
                <div className="flex gap-2">
                  {['Tunai', 'Bank', 'E-Wallet'].map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        type === t ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Saldo Awal (Rp)</label>
                <input 
                  type="text" inputMode="numeric"
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-2xl font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={balance} onChange={handleAmountChange}
                  placeholder="0"
                />
              </div>

              <button type="submit" className="w-full mt-4 bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors">
                Simpan Akun
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
