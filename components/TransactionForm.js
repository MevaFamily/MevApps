"use client";
import { useState, useContext, useEffect, useRef } from "react";
import { AppContext } from "./AppProvider";
import { supabase } from "@/lib/supabase";

export default function TransactionForm({ onClose }) {
  const { accounts, categories, subcategories, setTransactions, setAccounts, setCategories, setSubcategories } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("pengeluaran"); // pengeluaran | pemasukan | transfer
  
  const [amountStr, setAmountStr] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [destAccountId, setDestAccountId] = useState("");
  const [note, setNote] = useState("");

  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSubcatDropdown, setShowSubcatDropdown] = useState(false);
  const catRef = useRef(null);
  const subcatRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setShowCatDropdown(false);
      if (subcatRef.current && !subcatRef.current.contains(e.target)) setShowSubcatDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set default account if accounts are loaded and empty
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  // Handle amount formatting
  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, ''); // only keep numbers
    if (rawValue) {
      setAmountStr(Number(rawValue).toLocaleString('id-ID'));
    } else {
      setAmountStr("");
    }
  };

  const getAmountNum = () => Number(amountStr.replace(/\./g, ''));

  // Get active color for tabs
  const getTabColor = (tab) => {
    if (activeTab !== tab) return 'text-neutral-500';
    if (tab === 'pengeluaran') return 'bg-rose-500 text-white shadow-sm';
    if (tab === 'pemasukan') return 'bg-emerald-500 text-white shadow-sm';
    if (tab === 'transfer') return 'bg-blue-500 text-white shadow-sm';
  };

  const filteredCategories = categories.filter(c => c.type === activeTab && c.name.toLowerCase().includes(categoryName.toLowerCase()));
  
  // Find selected category object (if exact match exists)
  const exactCategory = categories.find(c => c.type === activeTab && c.name.toLowerCase() === categoryName.toLowerCase());
  
  const filteredSubcategories = exactCategory 
    ? subcategories.filter(sc => sc.category_id === exactCategory.id && sc.name.toLowerCase().includes(subcategoryName.toLowerCase()))
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId) return alert("Pilih akun terlebih dahulu!");
    if (activeTab === 'transfer' && !destAccountId) return alert("Pilih akun tujuan transfer!");
    
    const amountNum = getAmountNum();
    if (amountNum <= 0) return alert("Jumlah tidak boleh nol.");

    // Resolve Category ID and Subcategory ID
    let finalCategoryId = exactCategory?.id;
    let finalSubcategoryId = null;
    let finalSubcategoryName = subcategoryName.trim();
    
    if (activeTab !== 'transfer' && !exactCategory && categoryName.trim()) {
      finalCategoryId = crypto.randomUUID();
    }
    
    if (finalCategoryId && finalSubcategoryName) {
      const exactSubcat = subcategories.find(sc => sc.category_id === finalCategoryId && sc.name.toLowerCase() === finalSubcategoryName.toLowerCase());
      if (!exactSubcat) {
        finalSubcategoryId = crypto.randomUUID();
      }
    }

    // Optimistic updates for categories/subcategories lists
    if (activeTab !== 'transfer' && !exactCategory && categoryName.trim()) {
      const newCat = { id: finalCategoryId, name: categoryName.trim(), type: activeTab };
      setCategories(prev => [...prev, newCat]);
    }
    
    if (finalCategoryId && finalSubcategoryName && finalSubcategoryId) {
      const newSubcat = { id: finalSubcategoryId, category_id: finalCategoryId, name: finalSubcategoryName };
      setSubcategories(prev => [...prev, newSubcat]);
    }

    const tempId = 'temp-' + Date.now();
    const newTx = {
      id: tempId, 
      type: activeTab,
      amount: amountNum,
      date: new Date().toISOString().split('T')[0],
      category: activeTab !== 'transfer' ? categoryName.trim() : null,
      subcategory: activeTab !== 'transfer' ? finalSubcategoryName : null,
      note,
      account_id: accountId,
      destination_account_id: activeTab === 'transfer' ? destAccountId : null,
      created_at: new Date().toISOString()
    };

    // OPTIMISTIC UPDATES UI
    setTransactions((prev) => [newTx, ...prev]);
    
    setAccounts((prev) => prev.map(acc => {
      if (acc.id === accountId) {
        if (activeTab === 'pengeluaran') return { ...acc, balance: Number(acc.balance) - newTx.amount };
        if (activeTab === 'pemasukan') return { ...acc, balance: Number(acc.balance) + newTx.amount };
        if (activeTab === 'transfer') return { ...acc, balance: Number(acc.balance) - newTx.amount };
      }
      if (activeTab === 'transfer' && acc.id === destAccountId) {
        return { ...acc, balance: Number(acc.balance) + newTx.amount };
      }
      return acc;
    }));

    onClose();

    // BACKGROUND SYNC (Awaited sequentially to prevent foreign key errors)
    (async () => {
      try {
        // 1. Insert Category if new
        if (activeTab !== 'transfer' && !exactCategory && categoryName.trim()) {
          const newCat = { id: finalCategoryId, name: categoryName.trim(), type: activeTab };
          const { error: catErr } = await supabase.from('categories').insert([newCat]);
          if (catErr) throw catErr;
        }

        // 2. Insert Subcategory if new
        if (finalCategoryId && finalSubcategoryName && finalSubcategoryId) {
          const newSubcat = { id: finalSubcategoryId, category_id: finalCategoryId, name: finalSubcategoryName };
          const { error: subcatErr } = await supabase.from('subcategories').insert([newSubcat]);
          if (subcatErr) throw subcatErr;
        }

        // 3. Insert Transaction
        const { error: txErr } = await supabase.from('transactions').insert([{
          type: newTx.type,
          amount: newTx.amount,
          date: newTx.date,
          category: newTx.category,
          subcategory: newTx.subcategory,
          note: newTx.note,
          account_id: newTx.account_id,
          destination_account_id: newTx.destination_account_id
        }]);
        if (txErr) throw txErr;

      } catch (err) {
        console.error("Gagal sinkronisasi data ke Supabase", err);
      }
    })();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl animate-in slide-in-from-bottom-full duration-300 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">Catat Transaksi</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-2">✕</button>
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-xl mb-6">
          {['pengeluaran', 'pemasukan', 'transfer'].map(tab => (
            <button
              key={tab} type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${getTabColor(tab)}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-10">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Jumlah (Rp)</label>
            <input 
              type="text" required inputMode="numeric"
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-2xl font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              value={amountStr} onChange={handleAmountChange}
              placeholder="0"
            />
          </div>

          {activeTab !== 'transfer' && (
            <>
              {/* Kategori Combobox */}
              <div className="relative" ref={catRef}>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Kategori</label>
                <input 
                  type="text" required
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={categoryName} 
                  onChange={(e) => { setCategoryName(e.target.value); setShowCatDropdown(true); setSubcategoryName(''); }}
                  onFocus={() => setShowCatDropdown(true)}
                  placeholder="Pilih atau ketik baru..." 
                />
                {showCatDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredCategories.map(c => (
                      <div key={c.id} 
                        className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm"
                        onClick={() => { setCategoryName(c.name); setShowCatDropdown(false); }}
                      >
                        {c.name}
                      </div>
                    ))}
                    {categoryName.trim() && !exactCategory && (
                      <div className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-medium"
                        onClick={() => setShowCatDropdown(false)}>
                        + Tambah "{categoryName}"
                      </div>
                    )}
                    {filteredCategories.length === 0 && !categoryName.trim() && (
                      <div className="px-4 py-2 text-sm text-neutral-400">Belum ada kategori</div>
                    )}
                  </div>
                )}
              </div>

              {/* Sub Kategori Combobox (Hanya aktif jika kategori terpilih/diketik) */}
              {categoryName.trim() && (
                <div className="relative" ref={subcatRef}>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Sub Kategori (Opsional)</label>
                  <input 
                    type="text"
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    value={subcategoryName} 
                    onChange={(e) => { setSubcategoryName(e.target.value); setShowSubcatDropdown(true); }}
                    onFocus={() => setShowSubcatDropdown(true)}
                    placeholder="Pilih atau ketik baru..." 
                  />
                  {showSubcatDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredSubcategories.map(sc => (
                        <div key={sc.id} 
                          className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm"
                          onClick={() => { setSubcategoryName(sc.name); setShowSubcatDropdown(false); }}
                        >
                          {sc.name}
                        </div>
                      ))}
                      {subcategoryName.trim() && !filteredSubcategories.find(sc => sc.name.toLowerCase() === subcategoryName.toLowerCase()) && (
                        <div className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-medium"
                          onClick={() => setShowSubcatDropdown(false)}>
                          + Tambah "{subcategoryName}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">
              {activeTab === 'transfer' ? 'Akun Asal' : 'Pilih Akun'}
            </label>
            {accounts.length === 0 ? (
              <p className="text-sm text-rose-500 font-medium">Anda belum memiliki akun. Buat akun di tab Akun.</p>
            ) : (
              <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                {accounts.map(acc => (
                  <button key={acc.id} type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      accountId === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'transfer' && (
             <div>
               <label className="block text-xs font-medium text-neutral-400 mb-2">Akun Tujuan</label>
               <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                 {accounts.filter(a => a.id !== accountId).map(acc => (
                   <button key={acc.id} type="button"
                     onClick={() => setDestAccountId(acc.id)}
                     className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                       destAccountId === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                     }`}
                   >
                     {acc.name}
                   </button>
                 ))}
                 {accounts.length <= 1 && (
                   <p className="text-sm text-neutral-400">Dibutuhkan lebih dari 1 akun untuk transfer.</p>
                 )}
               </div>
             </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Catatan (Opsional)</label>
            <input type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis keterangan..." />
          </div>

          <button type="submit" disabled={accounts.length === 0} className="w-full mt-4 bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Simpan Transaksi
          </button>
        </form>
      </div>
    </div>
  );
}
