"use client";
import { useState } from "react";
import useAppStore from "@/store/useAppStore";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ModalBottomSheet from "@/components/ModalBottomSheet";

export default function LanggananPage() {
  const router = useRouter();
  const recurringBills = useAppStore(state => state.recurringBills);
  const setRecurringBills = useAppStore(state => state.setRecurringBills);
  const categories = useAppStore(state => state.categories).filter(c => c.type === 'pengeluaran');
  const subcategories = useAppStore(state => state.subcategories);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [dueDate, setDueDate] = useState("1");
  const [amountStr, setAmountStr] = useState("");

  const filteredSubcategories = subcategories.filter(sc => sc.category_id === categoryId);

  const openAdd = () => {
    setEditItem(null);
    setCategoryId("");
    setSubcategoryId("");
    setDueDate("1");
    setAmountStr("");
    setModalOpen(true);
  };

  const openEdit = (bill) => {
    setEditItem(bill);
    const cat = categories.find(c => c.name === bill.category);
    if (cat) {
      setCategoryId(cat.id);
      const subcat = subcategories.find(sc => sc.name === bill.subcategory && sc.category_id === cat.id);
      if (subcat) setSubcategoryId(subcat.id);
    }
    setDueDate(String(bill.due_date));
    setAmountStr(Number(bill.expected_amount).toLocaleString('id-ID'));
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus tagihan rutin ini?")) return;
    
    // Optimistic update
    setRecurringBills(prev => prev.filter(b => b.id !== id));
    
    const { error } = await supabase.from('recurring_bills').delete().eq('id', id);
    if (error) {
      alert("Gagal menghapus tagihan");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId) return alert("Pilih kategori");
    if (!dueDate || Number(dueDate) < 1 || Number(dueDate) > 31) return alert("Tanggal harus 1-31");
    
    const amountNum = Number(amountStr.replace(/\./g, ''));
    if (amountNum < 0) return alert("Nominal tidak valid");

    const cat = categories.find(c => c.id === categoryId);
    const subcat = subcategories.find(sc => sc.id === subcategoryId);

    const payload = {
      category: cat.name,
      subcategory: subcat ? subcat.name : null,
      due_date: Number(dueDate),
      expected_amount: amountNum
    };

    if (editItem) {
      // Update
      const newBill = { ...editItem, ...payload };
      setRecurringBills(prev => prev.map(b => b.id === editItem.id ? newBill : b));
      setModalOpen(false);
      await supabase.from('recurring_bills').update(payload).eq('id', editItem.id);
    } else {
      // Insert
      const newBill = { id: crypto.randomUUID(), ...payload };
      setRecurringBills(prev => [...prev, newBill].sort((a,b) => a.due_date - b.due_date));
      setModalOpen(false);
      await supabase.from('recurring_bills').insert([newBill]);
    }
  };

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (rawValue) setAmountStr(Number(rawValue).toLocaleString('id-ID'));
    else setAmountStr("");
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100 text-neutral-600 hover:bg-neutral-50"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Tagihan Rutin</h1>
            <p className="text-xs text-neutral-400">Pengingat otomatis bulanan</p>
          </div>
        </div>
        <button 
          onClick={openAdd}
          className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {recurringBills.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-neutral-100 mt-8">
            <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-neutral-500 font-medium">Belum ada tagihan rutin</p>
            <p className="text-xs text-neutral-400 mt-1">Tambahkan tagihan seperti listrik atau internet.</p>
          </div>
        ) : (
          recurringBills.map(bill => (
            <div key={bill.id} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-indigo-600">{bill.due_date}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-900 truncate">{bill.category}</p>
                <p className="text-xs text-neutral-500 truncate">{bill.subcategory || "Semua"}</p>
                <p className="text-sm font-semibold text-rose-500 mt-1">Rp {Number(bill.expected_amount).toLocaleString('id-ID')}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => openEdit(bill)} className="p-2 text-neutral-400 hover:text-indigo-600 bg-neutral-50 rounded-full transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(bill.id)} className="p-2 text-neutral-400 hover:text-rose-600 bg-neutral-50 rounded-full transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <ModalBottomSheet isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">{editItem ? 'Edit Tagihan' : 'Tambah Tagihan'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Kategori Utama</label>
                <select 
                  value={categoryId} 
                  onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(""); }}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 outline-none font-medium transition-all"
                  required
                >
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {filteredSubcategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sub Kategori (Opsional)</label>
                  <select 
                    value={subcategoryId} 
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 outline-none font-medium transition-all"
                  >
                    <option value="">Semua (Kosongkan)</option>
                    {filteredSubcategories.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Tgl Jatuh Tempo</label>
                  <input 
                    type="number"
                    min="1" max="31"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 outline-none font-medium transition-all"
                    required
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Perkiraan Nominal</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-neutral-500 sm:text-sm font-semibold">Rp</span>
                    </div>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={amountStr}
                      onChange={handleAmountChange}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 pl-10 outline-none font-medium transition-all"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-sm px-5 py-4 text-center transition-all shadow-md shadow-indigo-200 active:scale-[0.98]"
                >
                  Simpan Tagihan
                </button>
              </div>
            </form>
          </div>
        </ModalBottomSheet>
      )}
    </div>
  );
}
