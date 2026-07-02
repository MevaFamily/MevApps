"use client";
import { useContext, useState, useEffect, Suspense } from "react";
import { AppContext } from "@/components/AppProvider";
import TransactionForm from "@/components/TransactionForm";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

function TransaksiContent() {
  const { transactions } = useContext(AppContext);
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryMonth = searchParams.get('month');
  const querySubcat = searchParams.get('subcat');

  const [selectedTx, setSelectedTx] = useState(null);

  // Parse queryMonth to Date object or use current date
  const [currentDate, setCurrentDate] = useState(() => {
    if (queryMonth) {
      const [year, month] = queryMonth.split('-');
      return new Date(year, month - 1, 1);
    }
    return new Date();
  });

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

  // Hitung total pengeluaran bulan ini
  const totalPengeluaranBulanIni = filteredTx
    .filter(tx => tx.type === 'pengeluaran')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

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
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Pengeluaran Bulan Ini</p>
          <p className="text-2xl font-bold text-neutral-900">
            Rp {totalPengeluaranBulanIni.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
        </div>
      </div>

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
                          <p className="font-semibold text-neutral-900 truncate">
                            {tx.category || (isTransfer ? "Transfer" : "Lainnya")}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-400 font-medium">{tx.account_name}</span>
                            {tx.subcategory && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600">
                                {tx.subcategory}
                              </span>
                            )}
                          </div>
                          {tx.notes && <p className="text-xs text-neutral-500 truncate mt-1">{tx.notes}</p>}
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
