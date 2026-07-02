"use client";
import { useContext } from "react";
import { AppContext } from "@/components/AppProvider";

export default function AnggaranPage() {
  const { budgets, transactions } = useContext(AppContext);
  
  // Hitung pengeluaran per kategori bulan ini
  const expensesByCategory = transactions
    .filter(tx => tx.type === 'pengeluaran')
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount);
      return acc;
    }, {});

  return (
    <div className="p-4 max-w-md mx-auto pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Anggaran</h1>
        <p className="text-sm text-neutral-400">Batas Pengeluaran Bulan Ini</p>
      </div>

      <div className="space-y-5">
        {budgets.map(budget => {
          const spent = expensesByCategory[budget.category] || 0;
          const limit = Number(budget.amount_limit);
          const percentage = Math.min((spent / limit) * 100, 100);
          const isWarning = percentage >= 80;
          const isDanger = percentage >= 100;

          return (
            <div key={budget.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="font-medium text-neutral-800">{budget.category}</h3>
                  <p className="text-xs text-neutral-400 mt-1">Rp {spent.toLocaleString('id-ID')} dari Rp {limit.toLocaleString('id-ID')}</p>
                </div>
                <span className={`text-xs font-semibold ${isDanger ? 'text-rose-600' : isWarning ? 'text-amber-500' : 'text-neutral-500'}`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
              {/* Minimalist Progress Bar */}
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-neutral-900'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
        
        {budgets.length === 0 && (
          <div className="text-center p-8 bg-white border border-neutral-100 rounded-2xl shadow-sm">
            <p className="text-neutral-400 text-sm">Belum ada anggaran yang diatur.</p>
          </div>
        )}
      </div>
    </div>
  );
}
