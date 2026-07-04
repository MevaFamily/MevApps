"use client";
import { useState } from "react";
import useAppStore from "@/store/useAppStore";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronUp } from "lucide-react";
import ModalBottomSheet from "@/components/ModalBottomSheet";

export default function AnggaranPage() {
  const categories = useAppStore(state => state.categories);
  const setCategories = useAppStore(state => state.setCategories);
  const subcategories = useAppStore(state => state.subcategories);
  const setSubcategories = useAppStore(state => state.setSubcategories);
  const transactions = useAppStore(state => state.transactions);
  const budgets = useAppStore(state => state.budgets);
  const setBudgets = useAppStore(state => state.setBudgets);
  const [activeTab, setActiveTab] = useState("pengeluaran");
  
  // Modal State
  const [modalType, setModalType] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [budgetLimitStr, setBudgetLimitStr] = useState("");
  const [expandedCats, setExpandedCats] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // States for integrated Recurring Bills
  const recurringBills = useAppStore(state => state.recurringBills);
  const setRecurringBills = useAppStore(state => state.setRecurringBills);
  const [isRecurring, setIsRecurring] = useState(false);
  const [dueDate, setDueDate] = useState("");

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
    
    // Check if recurring
    const rb = recurringBills.find(b => b.category === cat.name && !b.subcategory);
    setIsRecurring(!!rb);
    setDueDate(rb ? String(rb.due_date) : "");

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

    // Check if recurring
    const parentCat = categories.find(c => c.id === subcat.category_id);
    const rb = recurringBills.find(b => b.category === parentCat?.name && b.subcategory === subcat.name);
    setIsRecurring(!!rb);
    setDueDate(rb ? String(rb.due_date) : "");

    const b = budgets.find(b => b.category === subcat.id && b.month === monthKey);
    setBudgetLimitStr(b ? b.amount_limit.toLocaleString('id-ID') : "");
  };

  const closeModal = () => {
    setModalType(null);
    setEditItem(null);
    setParentCategory(null);
    setInputValue("");
    setBudgetLimitStr("");
    setShowDeleteConfirm(false);
    setIsRecurring(false);
    setDueDate("");
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

  const handleRecurringSave = async (catName, subcatName, amount, oldCatName, oldSubcatName) => {
    if (activeTab !== 'pengeluaran') return;

    const existing = recurringBills.find(b => 
      b.category === (oldCatName || catName) && 
      (oldSubcatName || subcatName ? b.subcategory === (oldSubcatName || subcatName) : !b.subcategory)
    );

    if (isRecurring) {
      const dueDateNum = Number(dueDate);
      const payload = {
        category: catName,
        subcategory: subcatName || null,
        due_date: dueDateNum,
        expected_amount: amount
      };

      if (existing) {
        setRecurringBills(prev => prev.map(b => b.id === existing.id ? { ...b, ...payload } : b));
        await supabase.from('recurring_bills').update(payload).eq('id', existing.id);
      } else {
        const newBill = { id: crypto.randomUUID(), ...payload };
        setRecurringBills(prev => [...prev, newBill].sort((a,b) => a.due_date - b.due_date));
        await supabase.from('recurring_bills').insert([newBill]);
      }
    } else {
      if (existing) {
        setRecurringBills(prev => prev.filter(b => b.id !== existing.id));
        await supabase.from('recurring_bills').delete().eq('id', existing.id);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const name = inputValue.trim();
    const budgetNum = Number(budgetLimitStr.replace(/\./g, '')) || 0;

    if (activeTab === 'pengeluaran' && isRecurring) {
      if (budgetNum <= 0) {
        alert("Nominal budget harus diisi untuk tagihan rutin!");
        return;
      }
      const dueDateNum = Number(dueDate);
      if (!dueDateNum || dueDateNum < 1 || dueDateNum > 31) {
        alert("Tanggal jatuh tempo harus antara 1-31!");
        return;
      }
    }

    if (modalType === 'category') {
      let finalCatId;
      let oldName = editItem ? editItem.name : "";
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
      if (subs.length === 0) {
        await saveBudget(finalCatId, budgetNum);
        await handleRecurringSave(name, null, budgetNum, oldName, null);
      }
    } else if (modalType === 'subcategory') {
      let finalSubId;
      let oldName = editItem ? editItem.name : "";
      const parentCat = editItem ? categories.find(c => c.id === editItem.category_id) : parentCategory;
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
      await saveBudget(finalSubId, budgetNum);
      await handleRecurringSave(parentCat.name, name, budgetNum, parentCat.name, oldName);
    }
    closeModal();
  };

  const confirmDelete = async () => {
    if (!editItem) return;

    let catName = "";
    let subcatName = "";

    if (modalType === 'category') {
      catName = editItem.name;
      setCategories(prev => prev.filter(c => c.id !== editItem.id));
      try { await supabase.from('categories').delete().eq('id', editItem.id); } catch (err) {}

      const existing = recurringBills.find(b => b.category === catName && !b.subcategory);
      if (existing) {
        setRecurringBills(prev => prev.filter(b => b.id !== existing.id));
        await supabase.from('recurring_bills').delete().eq('id', existing.id);
      }
      setRecurringBills(prev => prev.filter(b => b.category !== catName));
    } else {
      subcatName = editItem.name;
      const parentCat = categories.find(c => c.id === editItem.category_id);
      catName = parentCat ? parentCat.name : "";

      setSubcategories(prev => prev.filter(sc => sc.id !== editItem.id));
      try { await supabase.from('subcategories').delete().eq('id', editItem.id); } catch (err) {}

      const existing = recurringBills.find(b => b.category === catName && b.subcategory === subcatName);
      if (existing) {
        setRecurringBills(prev => prev.filter(b => b.id !== existing.id));
        await supabase.from('recurring_bills').delete().eq('id', existing.id);
      }
    }
    setShowDeleteConfirm(false);
    closeModal();
  };

  const toggleExpand = (catId) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const expandAll = () => {
    const all = {};
    filteredCategories.forEach(c => all[c.id] = true);
    setExpandedCats(all);
  };

  const collapseAll = () => {
    setExpandedCats({});
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
        {renderProgressBar(totalBulanIniSpentAccurate, totalBulanIniLimit)}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2 px-1">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Daftar Kategori</h2>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900">Buka Semua</button>
            <span className="text-neutral-300">|</span>
            <button onClick={collapseAll} className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900">Tutup Semua</button>
          </div>
        </div>
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

          const isExpanded = expandedCats[cat.id];

          return (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
              <div className="flex justify-between items-start mb-1">
                <div 
                  className={`flex-1 flex items-center gap-2 ${subs.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
                  onClick={() => subs.length > 0 ? toggleExpand(cat.id) : openEditCategory(cat, subs)}
                >
                  <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                    {cat.name}
                  </h3>
                  {subs.length === 0 && (
                    <button onClick={(e) => { e.stopPropagation(); openEditCategory(cat, subs); }} className="text-neutral-400 hover:text-neutral-900 p-1">
                      <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  )}
                  {subs.length > 0 && (
                    <span className="text-neutral-400 ml-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {subs.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); openEditCategory(cat, subs); }} className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 bg-neutral-50 rounded border border-neutral-200">
                      EDIT
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); openAddSubcategory(cat); }}
                    className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 bg-neutral-50 rounded border border-neutral-200"
                  >
                    + SUB
                  </button>
                </div>
              </div>

              {activeTab === 'pengeluaran' && renderProgressBar(catSpent, catLimit)}

              {subs.length > 0 && isExpanded && (
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
      <ModalBottomSheet
        isOpen={!!modalType}
        onClose={closeModal}
        title={`${editItem ? 'Edit' : 'Tambah'} ${modalType === 'category' ? 'Kategori' : 'Sub Kategori'}`}
      >
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
                <>
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white border border-neutral-100 rounded-xl p-3.5 shadow-sm">
                      <div>
                        <p className="text-xs font-semibold text-neutral-800">Jadwalkan Tagihan Bulanan</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Ingatkan untuk catat cepat tiap bulan</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecurring(!isRecurring);
                          if (!isRecurring && !dueDate) setDueDate("1");
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isRecurring ? 'bg-neutral-950' : 'bg-neutral-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {isRecurring && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Tanggal Jatuh Tempo</label>
                        <select
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 font-medium transition-all"
                          required={isRecurring}
                        >
                          <option value="" disabled>Pilih tanggal tagihan...</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={String(day)}>Setiap Tanggal {day}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                {editItem && (
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 bg-rose-50 text-rose-600 font-medium rounded-xl px-4 py-3.5 hover:bg-rose-100 transition-colors">
                    Hapus
                  </button>
                )}
                <button type="submit" className={`${editItem ? 'flex-[2]' : 'w-full'} bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors`}>
                  Simpan
                </button>
              </div>
            </form>
      </ModalBottomSheet>

      {/* Pop-up Konfirmasi Hapus */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] bg-neutral-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white p-5 rounded-2xl max-w-xs w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-neutral-900 text-lg mb-2">Hapus {modalType === 'category' ? 'Kategori' : 'Sub Kategori'}?</h3>
            <p className="text-sm text-neutral-400 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
