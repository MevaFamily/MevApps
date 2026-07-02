"use client";
import { useState, useContext, useEffect, useRef } from "react";
import { AppContext } from "./AppProvider";
import { supabase } from "@/lib/supabase";

export default function TransactionForm({ onClose, initialData = null }) {
  const { accounts, categories, subcategories, setTransactions, setAccounts, setCategories, setSubcategories } = useContext(AppContext);
  const isEdit = !!initialData;

  const [activeTab, setActiveTab] = useState(initialData?.type || "pengeluaran");
  
  const [amountStr, setAmountStr] = useState(initialData ? initialData.amount.toLocaleString('id-ID') : "");
  const [categoryName, setCategoryName] = useState(initialData?.category || "");
  const [subcategoryName, setSubcategoryName] = useState(initialData?.subcategory || "");
  const [accountId, setAccountId] = useState(initialData?.account_id || (accounts[0]?.id || ""));
  const [destAccountId, setDestAccountId] = useState(initialData?.destination_account_id || "");
  const [note, setNote] = useState(initialData?.note || "");
  const [dateStr, setDateStr] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSubcatDropdown, setShowSubcatDropdown] = useState(false);
  const catRef = useRef(null);
  const subcatRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setShowCatDropdown(false);
      if (subcatRef.current && !subcatRef.current.contains(e.target)) setShowSubcatDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (rawValue) setAmountStr(Number(rawValue).toLocaleString('id-ID'));
    else setAmountStr("");
  };

  const getAmountNum = () => Number(amountStr.replace(/\./g, ''));

  const getTabColor = (tab) => {
    if (activeTab !== tab) return 'text-neutral-500';
    if (tab === 'pengeluaran') return 'bg-rose-500 text-white shadow-sm';
    if (tab === 'pemasukan') return 'bg-emerald-500 text-white shadow-sm';
    if (tab === 'transfer') return 'bg-blue-500 text-white shadow-sm';
  };

  const filteredCategories = categories.filter(c => c.type === activeTab && c.name.toLowerCase().includes(categoryName.toLowerCase()));
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

    let finalCategoryId = exactCategory?.id;
    let finalSubcategoryId = null;
    let finalSubcategoryName = subcategoryName.trim();
    
    if (activeTab !== 'transfer' && !exactCategory && categoryName.trim()) {
      finalCategoryId = crypto.randomUUID();
    }
    
    if (finalCategoryId && finalSubcategoryName) {
      const exactSubcat = subcategories.find(sc => sc.category_id === finalCategoryId && sc.name.toLowerCase() === finalSubcategoryName.toLowerCase());
      if (!exactSubcat) finalSubcategoryId = crypto.randomUUID();
    }

    if (activeTab !== 'transfer' && !exactCategory && categoryName.trim()) {
      setCategories(prev => [...prev, { id: finalCategoryId, name: categoryName.trim(), type: activeTab }]);
    }
    if (finalCategoryId && finalSubcategoryName && finalSubcategoryId) {
      setSubcategories(prev => [...prev, { id: finalSubcategoryId, category_id: finalCategoryId, name: finalSubcategoryName }]);
    }

    const newTx = {
      id: isEdit ? initialData.id : crypto.randomUUID(),
      type: activeTab,
      amount: amountNum,
      date: dateStr,
      category: activeTab !== 'transfer' ? categoryName.trim() : null,
      subcategory: activeTab !== 'transfer' ? finalSubcategoryName : null,
      note,
      account_id: accountId,
      destination_account_id: activeTab === 'transfer' ? destAccountId : null,
      created_at: isEdit ? initialData.created_at : new Date().toISOString()
    };

    // Calculate new balances for affected accounts
    let affectedAccounts = {};
    const addBal = (id, amt) => { if(id) affectedAccounts[id] = (affectedAccounts[id] !== undefined ? affectedAccounts[id] : Number(accounts.find(a=>a.id===id)?.balance || 0)) + amt; }
    const subBal = (id, amt) => { if(id) affectedAccounts[id] = (affectedAccounts[id] !== undefined ? affectedAccounts[id] : Number(accounts.find(a=>a.id===id)?.balance || 0)) - amt; }

    if (isEdit) {
       const old = initialData;
       if (old.type === 'pengeluaran') addBal(old.account_id, old.amount);
       if (old.type === 'pemasukan') subBal(old.account_id, old.amount);
       if (old.type === 'transfer') { addBal(old.account_id, old.amount); subBal(old.destination_account_id, old.amount); }
    }

    if (activeTab === 'pengeluaran') subBal(accountId, amountNum);
    if (activeTab === 'pemasukan') addBal(accountId, amountNum);
    if (activeTab === 'transfer') { subBal(accountId, amountNum); addBal(destAccountId, amountNum); }

    // OPTIMISTIC UPDATES UI
    setTransactions(prev => isEdit 
      ? prev.map(t => t.id === newTx.id ? newTx : t)
      : [newTx, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date))
    );
    
    setAccounts(prev => prev.map(acc => affectedAccounts[acc.id] !== undefined ? { ...acc, balance: affectedAccounts[acc.id] } : acc));

    onClose();

    // BACKGROUND SYNC
    (async () => {
      try {
        if (activeTab !== 'transfer' && !exactCategory && categoryName.trim()) {
          const { error: catErr } = await supabase.from('categories').insert([{ id: finalCategoryId, name: categoryName.trim(), type: activeTab }]);
          if (catErr) throw catErr;
        }

        if (finalCategoryId && finalSubcategoryName && finalSubcategoryId) {
          const { error: subcatErr } = await supabase.from('subcategories').insert([{ id: finalSubcategoryId, category_id: finalCategoryId, name: finalSubcategoryName }]);
          if (subcatErr) throw subcatErr;
        }

        const txPayload = {
          type: newTx.type, amount: newTx.amount, date: newTx.date,
          category: newTx.category, subcategory: newTx.subcategory, note: newTx.note,
          account_id: newTx.account_id, destination_account_id: newTx.destination_account_id
        };

        if (isEdit) {
          const { error: txErr } = await supabase.from('transactions').update(txPayload).eq('id', newTx.id);
          if (txErr) throw txErr;
        } else {
          const { error: txErr } = await supabase.from('transactions').insert([{ ...txPayload, id: newTx.id }]);
          if (txErr) throw txErr;
        }

        // Sync affected accounts balance
        for (const [accId, newBal] of Object.entries(affectedAccounts)) {
          const { error: accErr } = await supabase.from('accounts').update({ balance: newBal }).eq('id', accId);
          if (accErr) console.error("Gagal update saldo akun:", accErr);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data ke Supabase", err);
      }
    })();
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm("Hapus transaksi ini?")) return;

    let affectedAccounts = {};
    const addBal = (id, amt) => { if(id) affectedAccounts[id] = (affectedAccounts[id] !== undefined ? affectedAccounts[id] : Number(accounts.find(a=>a.id===id)?.balance || 0)) + amt; }
    const subBal = (id, amt) => { if(id) affectedAccounts[id] = (affectedAccounts[id] !== undefined ? affectedAccounts[id] : Number(accounts.find(a=>a.id===id)?.balance || 0)) - amt; }

    const old = initialData;
    if (old.type === 'pengeluaran') addBal(old.account_id, old.amount);
    if (old.type === 'pemasukan') subBal(old.account_id, old.amount);
    if (old.type === 'transfer') { addBal(old.account_id, old.amount); subBal(old.destination_account_id, old.amount); }

    // Optimistic revert balance
    setAccounts(prev => prev.map(acc => affectedAccounts[acc.id] !== undefined ? { ...acc, balance: affectedAccounts[acc.id] } : acc));
    setTransactions(prev => prev.filter(t => t.id !== initialData.id));
    onClose();

    try {
      await supabase.from('transactions').delete().eq('id', initialData.id);
      
      // Sync reverted balance
      for (const [accId, newBal] of Object.entries(affectedAccounts)) {
        await supabase.from('accounts').update({ balance: newBal }).eq('id', accId);
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl animate-in slide-in-from-bottom-full duration-300 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">{isEdit ? 'Detail Transaksi' : 'Catat Transaksi'}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-2">✕</button>
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-xl mb-6">
          {['pengeluaran', 'pemasukan', 'transfer'].map(tab => (
            <button
              key={tab} type="button"
              onClick={() => {
                setActiveTab(tab);
                setCategoryName("");
                setSubcategoryName("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${getTabColor(tab)}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-10">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Tanggal</label>
            <input 
              type="date" required
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              value={dateStr} onChange={e => setDateStr(e.target.value)}
            />
          </div>

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
                      <div key={c.id} className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm" onClick={() => { setCategoryName(c.name); setShowCatDropdown(false); }}>{c.name}</div>
                    ))}
                    {categoryName.trim() && !exactCategory && (
                      <div className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-medium" onClick={() => setShowCatDropdown(false)}>+ Tambah "{categoryName}"</div>
                    )}
                  </div>
                )}
              </div>

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
                        <div key={sc.id} className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm" onClick={() => { setSubcategoryName(sc.name); setShowSubcatDropdown(false); }}>{sc.name}</div>
                      ))}
                      {subcategoryName.trim() && !filteredSubcategories.find(sc => sc.name.toLowerCase() === subcategoryName.toLowerCase()) && (
                        <div className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-medium" onClick={() => setShowSubcatDropdown(false)}>+ Tambah "{subcategoryName}"</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">{activeTab === 'transfer' ? 'Akun Asal' : 'Pilih Akun'}</label>
            <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
              {accounts.map(acc => (
                <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${accountId === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}>
                  {acc.name}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'transfer' && (
             <div>
               <label className="block text-xs font-medium text-neutral-400 mb-2">Akun Tujuan</label>
               <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                 {accounts.filter(a => a.id !== accountId).map(acc => (
                   <button key={acc.id} type="button" onClick={() => setDestAccountId(acc.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${destAccountId === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}>
                     {acc.name}
                   </button>
                 ))}
               </div>
             </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Catatan (Opsional)</label>
            <input type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis keterangan..." />
          </div>

          <div className="flex gap-3 pt-2">
            {isEdit && (
              <button type="button" onClick={handleDelete} className="flex-1 bg-rose-50 text-rose-600 font-medium rounded-xl px-4 py-3.5 hover:bg-rose-100 transition-colors">
                Hapus
              </button>
            )}
            <button type="submit" disabled={accounts.length === 0} className={`${isEdit ? 'flex-[2]' : 'w-full'} bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50`}>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
