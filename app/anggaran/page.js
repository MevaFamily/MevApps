"use client";
import { useContext, useState } from "react";
import { AppContext } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function AnggaranPage() {
  const { categories, setCategories, subcategories, setSubcategories, transactions, budgets, setBudgets } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("pengeluaran");
  
  // Modal State
  const [modalType, setModalType] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [budgetLimitStr, setBudgetLimitStr] = useState("");

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;

  const expensesByCategory = transactions
    .filter(tx => tx.type === activeTab && tx.date.startsWith(monthKey))
    .reduce((acc, tx) => {
      const catKey = tx.category;
      const subKey = tx.subcategory;
      if (catKey) acc[catKey] = (acc[catKey] || 0) + Number(tx.amount);
      if (subKey) acc[subKey] = (acc[subKey] || 0) + Number(tx.amount);
      return acc;
    }, {});

  // Kalkulasi Total Budget & Pemakaian
  let totalBulanIniLimit = 0;
  let totalBulanIniSpent = 0;

  filteredCategories.forEach(cat => {
    const subs = subcategories.filter(sc => sc.category_id === cat.id);
    const catSpent = expensesByCategory[cat.name] || 0;
    
    let catLimit = 0;
    if (subs.length === 0) {
      const b = budgets.find(b => b.category === cat.id && b.month === monthKey);
      if (b) catLimit += Number(b.amount_limit);
    } else {
      subs.forEach(s => {
        const b = budgets.find(b => b.category === s.id && b.month === monthKey);
        if (b) catLimit += Number(b.amount_limit);
      });
    }

    if (catLimit > 0) {
      totalBulanIniLimit += catLimit;
    }
  });

  const totalBulanIniSpentAccurate = transactions
    .filter(tx => tx.type === activeTab && tx.date.startsWith(monthKey))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const openAddCategory = () => {
    setModalType('category');
    setEditItem(null);
    setInputValue("");
    setBudgetLimitStr("");
  };

  const openEditCategory = (cat, subs) => {
    setModalType('category');
    setEditItem(cat);
    setInputValue(cat.name);
    if (subs.length === 0) {
      const b = budgets.find(b => b.category === cat.id && b.month === monthKey);
      setBudgetLimitStr(b ? b.amount_limit.toLocaleString('id-ID') : "");
    } else {
      setBudgetLimitStr("");
    }
  };

  const openAddSubcategory = (cat) => {
    setModalType('subcategory');
    setEditItem(null);
    setParentCategory(cat);
    setInputValue("");
    setBudgetLimitStr("");
  };

  const openEditSubcategory = (subcat) => {
    setModalType('subcategory');
    setEditItem(subcat);
    setInputValue(subcat.name);
    const b = budgets.find(b => b.category === subcat.id && b.month === monthKey);
    setBudgetLimitStr(b ? b.amount_limit.toLocaleString('id-ID') : "");
  };

  const closeModal = () => {
    setModalType(null);
    setEditItem(null);
    setParentCategory(null);
    setInputValue("");
    setBudgetLimitStr("");
  };

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (rawValue) setBudgetLimitStr(Number(rawValue).toLocaleString('id-ID'));
    else setBudgetLimitStr("");
  };

  const saveBudget = async (itemId, amount) => {
    const existing = budgets.find(b => b.category === itemId && b.month === monthKey);
    if (existing) {
      const updated = { ...existing, amount_limit: amount };
      setBudgets(prev => prev.map(b => b.id === existing.id ? updated : b));
      await supabase.from('budgets').update({ amount_limit: amount }).eq('id', existing.id);
    } else {
      const newB = { id: crypto.randomUUID(), category: itemId, amount_limit: amount, month: monthKey };
      setBudgets(prev => [...prev, newB]);
      await supabase.from('budgets').insert([newB]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const name = inputValue.trim();
    const budgetNum = Number(budgetLimitStr.replace(/\./g, '')) || 0;

    if (modalType === 'category') {
      let finalCatId;
      if (editItem) {
        finalCatId = editItem.id;
        setCategories(prev => prev.map(c => c.id === editItem.id ? { ...c, name } : c));
        try { await supabase.from('categories').update({ name }).eq('id', editItem.id); } catch (err) {}
      } else {
        finalCatId = crypto.randomUUID();
        const newCat = { id: finalCatId, name, type: activeTab };
        setCategories(prev => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
        try { await supabase.from('categories').insert([newCat]); } catch (err) {}
      }
      
      const subs = subcategories.filter(sc => sc.category_id === finalCatId);
      if (subs.length === 0 && budgetNum > 0) {
        await saveBudget(finalCatId, budgetNum);
      }
    } else if (modalType === 'subcategory') {
      let finalSubId;
      if (editItem) {
        finalSubId = editItem.id;
        setSubcategories(prev => prev.map(sc => sc.id === editItem.id ? { ...sc, name } : sc));
        try { await supabase.from('subcategories').update({ name }).eq('id', editItem.id); } catch (err) {}
      } else {
        finalSubId = crypto.randomUUID();
        const newSubcat = { id: finalSubId, name, category_id: parentCategory.id };
        setSubcategories(prev => [...prev, newSubcat].sort((a,b) => a.name.localeCompare(b.name)));
        try { await supabase.from('subcategories').insert([newSubcat]); } catch (err) {}
      }
      if (budgetNum > 0) {
        await saveBudget(finalSubId, budgetNum);
      }
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!editItem) return;
    if (!confirm(`Hapus ${modalType === 'category' ? 'kategori' : 'sub kategori'} ini?`)) return;

    if (modalType === 'category') {
      setCategories(prev => prev.filter(c => c.id !== editItem.id));
      try { await supabase.from('categories').delete().eq('id', editItem.id); } catch (err) {}
    } else {
      setSubcategories(prev => prev.filter(sc => sc.id !== editItem.id));
      try { await supabase.from('subcategories').delete().eq('id', editItem.id); } catch (err) {}
    }
    closeModal();
  };

  const renderProgressBar = (spent, limit) => {
    if (limit <= 0) return null;
    const percentage = Math.min((spent / limit) * 100, 100);
    const isWarning = percentage >= 80;
    const isDanger = percentage >= 100;
    return (
      <div className="w-full mt-2">
        <div className="flex justify-between text-[10px] font-medium mb-1">
          <span className="text-neutral-400">Terpakai: Rp {spent.toLocaleString('id-ID')}</span>
          <span className="text-neutral-500 font-bold">{percentage.toFixed(0)}% dari Rp {limit.toLocaleString('id-ID')}</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-1.5 rounded-full transition-all duration-500 ${isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-neutral-900'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-8 pb-24">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Anggaran</h1>
          <p className="text-sm text-neutral-400">Pengaturan & Batas Budget</p>
        </div>
        <button 
          onClick={openAddCategory}
          className="text-sm font-medium text-neutral-900 bg-neutral-100 px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors"
        >
          + Kategori
        </button>
      </div>

      <div className="flex bg-neutral-100 p-1 rounded-xl mb-6">
        {['pengeluaran', 'pemasukan'].map(tab => (
          <button
            key={tab} type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab 
                ? (tab === 'pengeluaran' ? 'bg-rose-500 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm')
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 mb-6">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Total Budget {activeTab}</p>
        <p className="text-2xl font-bold text-neutral-900 mb-1">
          Rp {totalBulanIniLimit.toLocaleString('id-ID')}
        </p>
        <p className="text-xs text-neutral-500">
          Terpakai: <span className="font-semibold text-neutral-800">Rp {totalBulanIniSpentAccurate.toLocaleString('id-ID')}</span> 
          {totalBulanIniLimit > 0 && ` (${((totalBulanIniSpentAccurate / totalBulanIniLimit) * 100).toFixed(1)}%)`}
        </p>
        {renderProgressBar(totalBulanIniSpentAccurate, totalBulanIniLimit)}
      </div>

      <div className="space-y-4">
        {filteredCategories.map(cat => {
          const subs = subcategories.filter(sc => sc.category_id === cat.id);
          const catSpent = expensesByCategory[cat.name] || 0;
          
          let catLimit = 0;
          if (subs.length === 0) {
            const b = budgets.find(b => b.category === cat.id && b.month === monthKey);
            catLimit = b ? Number(b.amount_limit) : 0;
          } else {
            subs.forEach(s => {
              const b = budgets.find(b => b.category === s.id && b.month === monthKey);
              if (b) catLimit += Number(b.amount_limit);
            });
          }

          return (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
              <div className="flex justify-between items-start mb-1">
                <div 
                  className="flex-1 cursor-pointer hover:opacity-80"
                  onClick={() => openEditCategory(cat, subs)}
                >
                  <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                    {cat.name}
                    <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </h3>
                </div>
                <button 
                  onClick={() => openAddSubcategory(cat)}
                  className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 bg-neutral-50 rounded border border-neutral-200"
                >
                  + SUB
                </button>
              </div>

              {activeTab === 'pengeluaran' && renderProgressBar(catSpent, catLimit)}

              {subs.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  {subs.map(sub => {
                    const subSpent = expensesByCategory[sub.name] || 0;
                    const b = budgets.find(b => b.category === sub.id && b.month === monthKey);
                    const subLimit = b ? Number(b.amount_limit) : 0;

                    return (
                      <div key={sub.id} className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                        <div 
                          className="flex justify-between items-center cursor-pointer hover:opacity-80"
                          onClick={() => openEditSubcategory(sub)}
                        >
                          <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                            {sub.name}
                            <svg className="w-3 h-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </span>
                        </div>
                        {activeTab === 'pengeluaran' && renderProgressBar(subSpent, subLimit)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center p-8 bg-white border border-neutral-100 rounded-2xl shadow-sm">
            <p className="text-neutral-400 text-sm">Belum ada kategori {activeTab}.</p>
          </div>
        )}
      </div>

      {/* Modal Form Kategori / Sub Kategori */}
      {modalType && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center"
          onClick={closeModal}
        >
          <div 
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editItem ? 'Edit' : 'Tambah'} {modalType === 'category' ? 'Kategori' : 'Sub Kategori'}
              </h2>
              <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-900 p-2">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4 pb-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Nama {modalType === 'category' ? 'Kategori' : 'Sub Kategori'}</label>
                <input 
                  type="text" required autoFocus
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Masukkan nama...`}
                />
              </div>

              {activeTab === 'pengeluaran' && (modalType === 'subcategory' || (modalType === 'category' && (!editItem || subcategories.filter(sc => sc.category_id === editItem?.id).length === 0))) && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Batas Budget Bulan Ini (Opsional)</label>
                  <input 
                    type="text" inputMode="numeric"
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    value={budgetLimitStr} onChange={handleAmountChange}
                    placeholder={`Masukkan angka (Rp)...`}
                  />
                  {modalType === 'category' && (
                    <p className="text-[10px] text-neutral-400 mt-1">Jika kategori ini ditambahkan sub kategori nantinya, pengaturan budget utama akan dimatikan dan bergantung pada sub kategori.</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {editItem && (
                  <button type="button" onClick={handleDelete} className="flex-1 bg-rose-50 text-rose-600 font-medium rounded-xl px-4 py-3.5 hover:bg-rose-100 transition-colors">
                    Hapus
                  </button>
                )}
                <button type="submit" className={`${editItem ? 'flex-[2]' : 'w-full'} bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors`}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
