"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import useAppStore from "@/store/useAppStore";
import TransactionForm from "@/components/TransactionForm";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

function TransaksiContent() {
  const transactions = useAppStore(state => state.transactions);
  const accounts = useAppStore(state => state.accounts);
  const categories = useAppStore(state => state.categories);
  const subcategories = useAppStore(state => state.subcategories);
  const budgets = useAppStore(state => state.budgets);
  const recurringBills = useAppStore(state => state.recurringBills);
  const hasMoreTransactions = useAppStore(state => state.hasMoreTransactions);
  const isLoadingMore = useAppStore(state => state.isLoadingMore);
  const fetchMoreTransactions = useAppStore(state => state.fetchMoreTransactions);
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryMonth = searchParams.get('month');
  const querySubcat = searchParams.get('subcat');

  const [selectedTx, setSelectedTx] = useState(null);

  // Parse queryMonth to Date object or use current date
  const [currentDate, setCurrentDate] = useState(() => {
    if (queryMonth) {
      const [y, m] = queryMonth.split('-');
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreTransactions && !isLoadingMore) {
          fetchMoreTransactions();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMoreTransactions, isLoadingMore, fetchMoreTransactions]);

  useEffect(() => {
    if (queryMonth) {
      const [year, month] = queryMonth.split('-');
      setCurrentDate(new Date(year, month - 1, 1));
    }
  }, [queryMonth]);

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  
  const currentMonthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Filter transaksi
  let filteredTx = transactions.filter(tx => {
    // Jika filter bulan aktif, gunakan itu. Jika tidak, gunakan bulan berjalan saja? Atau tampilkan semua?
    // Biasanya transaksi tampil per bulan.
    return tx.date.startsWith(monthKey);
  });
  
  if (querySubcat) {
    filteredTx = filteredTx.filter(tx => tx.subcategory === querySubcat);
  }

  // Hitung total pengeluaran bulan ini (berdasarkan filter aktif)
  const totalPengeluaranBulanIni = filteredTx
    .filter(tx => tx.type === 'pengeluaran')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Hitung total pengeluaran bulan ini keseluruhan (untuk perbandingan budget)
  const overallMonthlyExpense = transactions
    .filter(tx => tx.type === 'pengeluaran' && tx.date.startsWith(monthKey))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Hitung total budget limit keseluruhan bulan ini
  const expensesCategories = categories.filter(c => c.type === 'pengeluaran');
  let totalBudgetLimit = 0;
  expensesCategories.forEach(cat => {
    const subs = subcategories.filter(sc => sc.category_id === cat.id);
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
      totalBudgetLimit += catLimit;
    }
  });

  const budgetPercentage = totalBudgetLimit > 0 ? (overallMonthlyExpense / totalBudgetLimit) * 100 : 0;
  const budgetDiff = totalBudgetLimit - overallMonthlyExpense;
  const isOverBudget = budgetDiff < 0;
  const absDiff = Math.abs(budgetDiff);

  // Calculate due bills
  const realToday = new Date();
  const isCurrentMonth = currentDate.getMonth() === realToday.getMonth() && currentDate.getFullYear() === realToday.getFullYear();
  
  const unpaidBills = [];
  if (isCurrentMonth && recurringBills) {
    const currentDay = realToday.getDate();
    recurringBills.forEach(bill => {
      if (currentDay >= bill.due_date) {
        const hasPaid = transactions.some(tx => 
          tx.type === 'pengeluaran' && 
          tx.date.startsWith(monthKey) && 
          tx.category === bill.category && 
          (bill.subcategory ? tx.subcategory === bill.subcategory : true)
        );
        if (!hasPaid) {
          unpaidBills.push(bill);
        }
      }
    });
  }

  // Calculate unfilled budgets for quick add
  const expensesByCategoryAndSub = transactions
    .filter(tx => tx.type === 'pengeluaran' && tx.date.startsWith(monthKey))
    .reduce((acc, tx) => {
      const catKey = tx.category;
      const subKey = tx.subcategory;
      if (catKey) acc[catKey] = (acc[catKey] || 0) + Number(tx.amount);
      if (subKey) acc[`${catKey}::${subKey}`] = (acc[`${catKey}::${subKey}`] || 0) + Number(tx.amount);
      return acc;
    }, {});

  const unfilledBudgets = [];
  expensesCategories.forEach(cat => {
    const subs = subcategories.filter(sc => sc.category_id === cat.id);
    if (subs.length === 0) {
      const b = budgets.find(b => b.category === cat.id && b.month === monthKey);
      if (b) {
        const spent = expensesByCategoryAndSub[cat.name] || 0;
        const limit = Number(b.amount_limit);
        const remaining = limit - spent;
        if (remaining > 0) {
          // Check if already in Reminder (unpaidBills)
          const inReminder = unpaidBills.some(bill => bill.category === cat.name && !bill.subcategory);
          if (!inReminder) {
            unfilledBudgets.push({ id: cat.id, category: cat.name, subcategory: '', remaining });
          }
        }
      }
    } else {
      subs.forEach(s => {
        const b = budgets.find(b => b.category === s.id && b.month === monthKey);
        if (b) {
          const spent = expensesByCategoryAndSub[`${cat.name}::${s.name}`] || 0;
          const limit = Number(b.amount_limit);
          const remaining = limit - spent;
          if (remaining > 0) {
            // Check if already in Reminder (unpaidBills)
            const inReminder = unpaidBills.some(bill => bill.category === cat.name && bill.subcategory === s.name);
            if (!inReminder) {
              unfilledBudgets.push({ id: s.id, category: cat.name, subcategory: s.name, remaining });
            }
          }
        }
      });
    }
  });

  // Group by date
  const groupedTransactions = filteredTx.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="p-4 max-w-md mx-auto pt-8 pb-24">
      {/* Header Estetik */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Riwayat</h1>
          <p className="text-sm text-neutral-400 capitalize">{queryMonth ? `Filter: ${currentMonthName}` : "Bulan Ini"}</p>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {(querySubcat || queryMonth) && (
        <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
          <div className="flex flex-col gap-1">
            {querySubcat && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-indigo-500" />
                <span className="text-xs font-medium text-indigo-900">Sub Kategori: {querySubcat}</span>
              </div>
            )}
            {queryMonth && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-indigo-500" />
                <span className="text-xs font-medium text-indigo-900">Bulan: {currentMonthName}</span>
              </div>
            )}
          </div>
          <button onClick={() => router.replace('/transaksi')} className="p-1 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Rangkuman Bulan Ini */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 mb-8 flex justify-between items-center">
        <div className="flex-1">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Pengeluaran Bulan Ini</p>
          <p className="text-2xl font-bold text-neutral-900 mb-1.5">
            Rp {totalPengeluaranBulanIni.toLocaleString('id-ID')}
          </p>
          {totalBudgetLimit > 0 && (
            <p className="text-[10px] text-neutral-500 font-medium">
              {isOverBudget ? (
                <>Over budget: <span className="font-semibold text-rose-500">Rp {absDiff.toLocaleString('id-ID')}</span> ({budgetPercentage.toFixed(0)}%)</>
              ) : (
                <>Sisa budget: <span className="font-semibold text-emerald-500">Rp {absDiff.toLocaleString('id-ID')}</span> ({budgetPercentage.toFixed(0)}%)</>
              )}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
        </div>
      </div>

      {unpaidBills.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Reminder</h2>
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unpaidBills.length}</span>
            <p className="text-[10px] text-rose-500 ml-auto font-medium animate-pulse">Lewat Jatuh Tempo</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {unpaidBills.map(bill => (
              <div 
                key={bill.id}
                onClick={() => setSelectedTx({ isQuickAdd: true, type: 'pengeluaran', category: bill.category, subcategory: bill.subcategory, amount: bill.expected_amount })}
                className="shrink-0 snap-start bg-rose-50 border border-rose-100 rounded-xl p-3 w-44 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
              >
                <p className="text-xs font-semibold text-rose-900 truncate mb-1">
                  {bill.category} {bill.subcategory && <span className="font-normal text-[10px]">({bill.subcategory})</span>}
                </p>
                <p className="text-[10px] text-rose-600 mb-2 truncate">Jatuh tempo tgl {bill.due_date}</p>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-rose-600">Rp {Number(bill.expected_amount).toLocaleString('id-ID')}</p>
                  <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors text-rose-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unfilledBudgets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Shortcut</h2>
            <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{unfilledBudgets.length}</span>
            <p className="text-[10px] text-neutral-400 ml-auto">Pilih untuk catat cepat</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {unfilledBudgets.map(ub => (
              <div 
                key={ub.id}
                onClick={() => setSelectedTx({ isQuickAdd: true, type: 'pengeluaran', category: ub.category, subcategory: ub.subcategory, amount: ub.remaining })}
                className="shrink-0 snap-start bg-white border border-neutral-100 rounded-xl p-3 w-44 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
              >
                <p className="text-xs font-semibold text-neutral-900 truncate mb-2 group-hover:text-rose-600 transition-colors">
                  {ub.category} {ub.subcategory && <span className="text-neutral-400 font-normal text-[10px]">({ub.subcategory})</span>}
                </p>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-rose-500">Rp {ub.remaining.toLocaleString('id-ID')}</p>
                  <div className="w-5 h-5 rounded-full bg-neutral-50 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors text-neutral-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List Transaksi per Tanggal */}
      <div className="space-y-8">
        {sortedDates.map(date => {
          const dateObj = new Date(date);
          const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const txs = groupedTransactions[date];

          const totalPemasukanHarian = txs.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + Number(t.amount), 0);
          const totalPengeluaranHarian = txs.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + Number(t.amount), 0);

          return (
            <div key={date}>
              <div className="flex justify-between items-end mb-4 px-1 border-b border-neutral-100 pb-2">
                <h2 className="text-sm font-bold text-neutral-900 capitalize tracking-tight">{formattedDate}</h2>
                <div className="text-[10px] font-medium flex gap-2">
                  {totalPemasukanHarian > 0 && <span className="text-emerald-500">In: Rp {totalPemasukanHarian.toLocaleString('id-ID')}</span>}
                  {totalPengeluaranHarian > 0 && <span className="text-rose-500">Out: Rp {totalPengeluaranHarian.toLocaleString('id-ID')}</span>}
                </div>
              </div>
              <div className="space-y-3">
                {txs.map((tx, idx) => {
                  const isTransfer = tx.type === 'transfer';
                  const isPengeluaran = tx.type === 'pengeluaran';
                  const destAcc = isTransfer ? accounts.find(a => a.id === tx.destination_account_id) : null;
                  const accountInfoText = isTransfer 
                    ? `${tx.account_name} → ${destAcc ? destAcc.name : 'Tujuan'}`
                    : tx.account_name;
                  
                  return (
                    <div 
                      key={tx.id} 
                      className={`flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPengeluaran ? 'bg-rose-500' : isTransfer ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                      
                      <div className="flex gap-4 items-center w-full pl-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPengeluaran ? 'bg-rose-100 text-rose-500' : isTransfer ? 'bg-indigo-100 text-indigo-500' : 'bg-emerald-100 text-emerald-500'}`}>
                          {isPengeluaran ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : isTransfer ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 truncate flex items-center gap-1.5">
                            {tx.category || (isTransfer ? "Transfer" : "Lainnya")}
                            {tx.subcategory && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-sm font-medium text-neutral-600 truncate">
                                  {tx.subcategory}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-medium mt-0.5">{accountInfoText}</p>
                          {tx.note && <p className="text-[11px] text-neutral-400 italic truncate mt-1">{tx.note}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${isPengeluaran ? 'text-rose-600' : isTransfer ? 'text-indigo-600' : 'text-emerald-600'}`}>
                            {isPengeluaran ? '-' : isTransfer ? '' : '+'}Rp {Number(tx.amount).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {sortedDates.length === 0 && (
          <div className="text-center p-8 bg-neutral-50 rounded-2xl border border-neutral-100 mt-8">
            <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-neutral-500 font-medium">Belum ada transaksi</p>
            <p className="text-xs text-neutral-400 mt-1">Coba bulan lain atau tambahkan baru.</p>
          </div>
        )}
        
        {hasMoreTransactions && transactions.length > 0 && (
          <div ref={observerTarget} className="py-6 flex justify-center items-center">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium">
                <svg className="animate-spin h-4 w-4 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memuat data...
              </div>
            ) : (
              <span className="text-xs text-transparent">Gulir ke bawah</span>
            )}
          </div>
        )}
      </div>

      {/* Modal Edit Transaksi */}
      {selectedTx && (
        <TransactionForm 
          onClose={() => setSelectedTx(null)} 
          initialData={selectedTx} 
        />
      )}
    </div>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center mt-20 text-neutral-400">Memuat transaksi...</div>}>
      <TransaksiContent />
    </Suspense>
  );
}
