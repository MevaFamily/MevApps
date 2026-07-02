"use client";
import { useContext, useState } from "react";
import { AppContext } from "@/components/AppProvider";
import TransactionForm from "@/components/TransactionForm";

export default function TransaksiPage() {
  const { transactions } = useContext(AppContext);
  const [selectedTx, setSelectedTx] = useState(null);

  // Fungsi utilitas mengelompokkan transaksi per tanggal
  const groupedTransactions = transactions.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  // Dapatkan bulan aktif (misal dari transaksi pertama atau saat ini)
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 max-w-md mx-auto pt-8 pb-24">
      {/* Header Estetik */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Riwayat</h1>
        <p className="text-sm text-neutral-400 capitalize">{currentMonth}</p>
      </div>

      {/* List Transaksi per Tanggal */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions).map(([date, items]) => {
          // Hitung total harian
          const dailyExpense = items.filter(i => i.type === 'pengeluaran').reduce((sum, curr) => sum + curr.amount, 0);
          const dailyIncome = items.filter(i => i.type === 'pemasukan').reduce((sum, curr) => sum + curr.amount, 0);

          return (
          <div key={date} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-neutral-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-neutral-800">{date}</span>
              <div className="text-xs font-medium flex gap-3">
                {dailyIncome > 0 && <span className="text-emerald-600">+{dailyIncome.toLocaleString('id-ID')}</span>}
                {dailyExpense > 0 && <span className="text-rose-600">-{dailyExpense.toLocaleString('id-ID')}</span>}
              </div>
            </div>
            
            <div className="flex flex-col">
              {items.map((tx, index) => (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className={`flex justify-between items-center px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity ${
                    index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                  } ${index !== items.length - 1 ? 'border-b border-neutral-100' : ''}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-800">
                        {tx.category || tx.type}
                      </span>
                      {tx.subcategory && (
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-semibold rounded-md tracking-wide uppercase">
                          {tx.subcategory}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">{tx.note || '-'}</span>
                  </div>
                  {/* Warna yang jelas untuk tipe transaksi */}
                  <span className={`font-semibold ${
                    tx.type === 'pemasukan' ? 'text-emerald-600' : 
                    tx.type === 'pengeluaran' ? 'text-rose-600' : 
                    'text-blue-600'
                  }`}>
                    {tx.type === 'pengeluaran' ? '-' : tx.type === 'pemasukan' ? '+' : ''}
                    Rp {Number(tx.amount).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )})}
        {transactions.length === 0 && (
          <p className="text-center text-neutral-400 mt-10 text-sm">Belum ada transaksi.</p>
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
