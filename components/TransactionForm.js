"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import useAppStore from "@/store/useAppStore";
import { supabase } from "@/lib/supabase";
import ModalBottomSheet from "@/components/ModalBottomSheet";

export default function TransactionForm({ onClose, initialData = null }) {
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const subcategories = useAppStore(state => state.subcategories);
  const transactions = useAppStore(state => state.transactions);
  const session = useAppStore(state => state.session);
  const setTransactions = useAppStore(state => state.setTransactions);
  const setAccounts = useAppStore(state => state.setAccounts);
  const setCategories = useAppStore(state => state.setCategories);
  const setSubcategories = useAppStore(state => state.setSubcategories);
  const isEdit = !!initialData;

  const userEmail = session?.user?.email || "";
  const username = userEmail.split('@')[0].toLowerCase(); // e.g. "ivan" or "melin"

  const filteredAccounts = useMemo(() => {
    if (username === 'ivan') {
      return accounts.filter(a => !a.type || !(a.type.toLowerCase().includes('melin') || a.type.toLowerCase().includes('istri')));
    }
    if (username === 'melin') {
      return accounts.filter(a => !a.type || !(a.type.toLowerCase().includes('ivan') || a.type.toLowerCase().includes('pribadi')));
    }
    return accounts;
  }, [accounts, username]);

  const [activeTab, setActiveTab] = useState(initialData?.type || "pengeluaran");
  
  const [amountStr, setAmountStr] = useState(initialData ? initialData.amount.toLocaleString('id-ID') : "");
  const [categoryName, setCategoryName] = useState(initialData?.category || "");
  const [subcategoryName, setSubcategoryName] = useState(initialData?.subcategory || "");
  const [accountId, setAccountId] = useState(initialData?.account_id || "");
  const [destAccountId, setDestAccountId] = useState(initialData?.destination_account_id || "");
  const [note, setNote] = useState(initialData?.note || "");
  const [dateStr, setDateStr] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSubcatDropdown, setShowSubcatDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    if (filteredAccounts.length > 0 && !accountId && !initialData) {
      let defaultAcc = null;
      if (username === 'ivan') {
        defaultAcc = filteredAccounts.find(a => 
          (a.type && (a.type.toLowerCase().includes('ivan') || a.type.toLowerCase().includes('pribadi')))
        );
      } else if (username === 'melin') {
        defaultAcc = filteredAccounts.find(a => 
          (a.type && (a.type.toLowerCase().includes('melin') || a.type.toLowerCase().includes('istri')))
        );
      }
      
      if (defaultAcc) {
        setAccountId(defaultAcc.id);
      } else {
        setAccountId(filteredAccounts[0].id);
      }
    }
  }, [filteredAccounts, username, accountId, initialData]);

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

  const noteSuggestions = useMemo(() => {
    if (!categoryName) return [];
    const matchedTxs = transactions.filter(t => 
      t.category?.toLowerCase() === categoryName.toLowerCase() &&
      (!subcategoryName || t.subcategory?.toLowerCase() === subcategoryName.toLowerCase()) &&
      t.note && t.note.trim() !== ""
    );
    const freq = {};
    matchedTxs.forEach(t => {
      const n = t.note.trim();
      freq[n] = (freq[n] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 4);
  }, [categoryName, subcategoryName, transactions]);

  const handleCategoryKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (showCatDropdown && filteredCategories.length > 0) {
        setCategoryName(filteredCategories[0].name);
        setShowCatDropdown(false);
        setSubcategoryName('');
      }
    }
  };

  const handleSubcategoryKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (showSubcatDropdown && filteredSubcategories.length > 0) {
        setSubcategoryName(filteredSubcategories[0].name);
        setShowSubcatDropdown(false);
      }
    }
  };

  const handleNoteKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (!note.trim() && noteSuggestions.length > 0) {
        setNote(noteSuggestions[0]);
      }
    }
  };

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
    <ModalBottomSheet 
      isOpen={true} 
      onClose={onClose} 
      title={isEdit ? 'Transaction Detail' : 'Record Transaction'}
    >
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
              {tab === 'pengeluaran' ? 'Expense' : tab === 'pemasukan' ? 'Income' : 'Transfer'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-10">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Date</label>
            <input 
              type="date" required
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 text-sm"
              value={dateStr} onChange={e => setDateStr(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Amount (Rp)</label>
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
                <label className="block text-xs font-medium text-neutral-400 mb-1">Category</label>
                <input 
                  type="text" required
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 text-sm"
                  value={categoryName} 
                  onChange={(e) => { setCategoryName(e.target.value); setShowCatDropdown(true); setSubcategoryName(''); }}
                  onFocus={() => setShowCatDropdown(true)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="Select or type new..." 
                />
                {showCatDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredCategories.map(c => (
                      <div key={c.id} className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm" onClick={() => { setCategoryName(c.name); setShowCatDropdown(false); }}>{c.name}</div>
                    ))}
                    {categoryName.trim() && !exactCategory && (
                      <div className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-medium" onClick={() => setShowCatDropdown(false)}>+ Add "{categoryName}"</div>
                    )}
                  </div>
                )}
              </div>

              {categoryName.trim() && (
                <div className="relative" ref={subcatRef}>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Subcategory (Optional)</label>
                  <input 
                    type="text"
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 text-sm"
                    value={subcategoryName} 
                    onChange={(e) => { setSubcategoryName(e.target.value); setShowSubcatDropdown(true); }}
                    onFocus={() => setShowSubcatDropdown(true)}
                    onKeyDown={handleSubcategoryKeyDown}
                    placeholder="Select or type new..." 
                  />
                  {showSubcatDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredSubcategories.map(sc => (
                        <div key={sc.id} className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm" onClick={() => { setSubcategoryName(sc.name); setShowSubcatDropdown(false); }}>{sc.name}</div>
                      ))}
                      {subcategoryName.trim() && !filteredSubcategories.find(sc => sc.name.toLowerCase() === subcategoryName.toLowerCase()) && (
                        <div className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-medium" onClick={() => setShowSubcatDropdown(false)}>+ Add "{subcategoryName}"</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Notes</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200 text-sm" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              onKeyDown={handleNoteKeyDown}
              placeholder="Write description..." 
            />
            {noteSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {noteSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNote(sug)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">{activeTab === 'transfer' ? 'Source Account' : 'Select Account'}</label>
            <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
              {filteredAccounts.map(acc => (
                <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${accountId === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}>
                  {acc.name}
                </button>
              ))}
              {filteredAccounts.length === 0 && (
                <span className="text-xs text-neutral-400 italic py-2">No accounts available for you</span>
              )}
            </div>
          </div>

          {activeTab === 'transfer' && (
             <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">Destination Account</label>
                <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                  {filteredAccounts.filter(a => a.id !== accountId).map(acc => (
                    <button key={acc.id} type="button" onClick={() => setDestAccountId(acc.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${destAccountId === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}>
                      {acc.name}
                    </button>
                  ))}
                </div>
             </div>
          )}

          <div className="flex gap-3 pt-2">
            {isEdit && (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 bg-rose-50 text-rose-600 font-medium rounded-xl px-4 py-3.5 hover:bg-rose-100 transition-colors">
                Delete
              </button>
            )}
            <button type="submit" disabled={filteredAccounts.length === 0} className={`${isEdit ? 'flex-[2]' : 'w-full'} bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50`}>
              Save
            </button>
          </div>
        </form>

      {/* Pop-up Konfirmasi Hapus */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Delete Transaction?</h3>
            <p className="text-sm text-neutral-500 mb-6">
              This transaction will be permanently deleted and your balances will be reverted.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}
                className="flex-1 py-3 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalBottomSheet>
  );
}
