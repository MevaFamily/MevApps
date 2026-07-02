"use client";
import { useContext } from "react";
import { AppContext } from "@/components/AppProvider";

export default function TransaksiPage() {
  const { transactions } = useContext(AppContext);

  // Fungsi utilitas mengelompokkan transaksi per tanggal
  const groupedTransactions = transactions.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-md mx-auto pt-8">
      {/* Header Estetik */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Riwayat</h1>
        <p className="text-sm text-neutral-400">Bulan Ini</p>
      </div>

      {/* List Transaksi per Tanggal */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions).map(([date, items]) => (
          <div key={date} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-50">
              <span className="text-sm font-medium text-neutral-400">{date}</span>
            </div>
            
            <div className="space-y-4">
              {items.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-800">
                      {tx.category || tx.type} {tx.subcategory ? `> ${tx.subcategory}` : ''}
                    </span>
                    <span className="text-xs text-neutral-400">{tx.note || '-'}</span>
                  </div>
                  {/* Warna yang jelas untuk tipe transaksi */}
                  <span className={`font-semibold ${
                    tx.type === 'pemasukan' ? 'text-emerald-600' : 
                    tx.type === 'pengeluaran' ? 'text-rose-600' : 
                    'text-neutral-900'
                  }`}>
                    {tx.type === 'pengeluaran' ? '-' : tx.type === 'pemasukan' ? '+' : ''}
                    Rp {Number(tx.amount).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <p className="text-center text-neutral-400 mt-10 text-sm">Belum ada transaksi.</p>
        )}
      </div>
    </div>
  );
}
