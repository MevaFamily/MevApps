"use client";
import { useContext, useState, useMemo } from "react";
import { AppContext } from "@/components/AppProvider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import Link from "next/link";
import { Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RangkumanPage() {
  const { categories, subcategories, transactions, budgets } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("pengeluaran");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedCats, setExpandedCats] = useState({});
  const [periodFilter, setPeriodFilter] = useState("Bulanan"); // Harian, Mingguan, Bulanan
  const router = useRouter();

  const handlePrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (periodFilter === "Harian") d.setDate(d.getDate() - 1);
      else if (periodFilter === "Mingguan") d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (periodFilter === "Harian") d.setDate(d.getDate() + 1);
      else if (periodFilter === "Mingguan") d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const year = currentDate.getFullYear();
  const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(currentDate.getDate()).padStart(2, '0');
  const monthKey = `${year}-${monthStr}`; // For budget lookup (always monthly)
  const fullDateStr = `${year}-${monthStr}-${dayStr}`;

  // Helper for Weekly
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  };
  const getEndOfWeek = (startDate) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 6);
    return d;
  };

  let displayDateStr = "";
  let currentMonthTx = [];

  if (periodFilter === "Harian") {
    displayDateStr = currentDate.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    currentMonthTx = transactions.filter(tx => tx.type === activeTab && tx.date === fullDateStr);
  } else if (periodFilter === "Mingguan") {
    const startW = getStartOfWeek(currentDate);
    const endW = getEndOfWeek(startW);
    const startWStr = startW.toISOString().split('T')[0];
    const endWStr = endW.toISOString().split('T')[0];
    displayDateStr = `${startW.getDate()} ${startW.toLocaleString('id-ID',{month:'short'})} - ${endW.getDate()} ${endW.toLocaleString('id-ID',{month:'short'})} ${endW.getFullYear()}`;
    
    currentMonthTx = transactions.filter(tx => {
      if (tx.type !== activeTab) return false;
      return tx.date >= startWStr && tx.date <= endWStr;
    });
  } else {
    displayDateStr = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    currentMonthTx = transactions.filter(tx => tx.type === activeTab && tx.date.startsWith(monthKey));
  }

  const expensesByCategory = currentMonthTx.reduce((acc, tx) => {
    const catKey = tx.category;
    const subKey = tx.subcategory;
    if (catKey) acc[catKey] = (acc[catKey] || 0) + Number(tx.amount);
    if (subKey) acc[subKey] = (acc[subKey] || 0) + Number(tx.amount);
    return acc;
  }, {});

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#f43f5e', '#eab308', '#d946ef', '#c026d3'];
  const INCOME_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#2dd4bf'];
  const activeColors = activeTab === 'pengeluaran' ? EXPENSE_COLORS : INCOME_COLORS;
  
  const rawChartData = filteredCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    value: expensesByCategory[cat.name] || 0
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  const totalAmount = rawChartData.reduce((sum, d) => sum + d.value, 0);

  const chartData = rawChartData.map((d, i) => ({
    ...d,
    color: activeColors[i % activeColors.length],
    percentage: totalAmount > 0 ? ((d.value / totalAmount) * 100).toFixed(1) : 0
  }));

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

  const handleSubClick = (subName) => {
    router.push(`/transaksi?month=${monthKey}&subcat=${encodeURIComponent(subName)}`);
  };

  const renderProgressBar = (spent, limit) => {
    if (limit <= 0) return null;
    const percentage = (spent / limit) * 100;
    const isWarning = percentage >= 80;
    const isDanger = percentage >= 100;
    return (
      <div className="w-full mt-2">
        <div className="flex justify-between text-[10px] font-medium mb-1">
          <span className="text-neutral-400">Terpakai: Rp {spent.toLocaleString('id-ID')}</span>
          <span className={`font-semibold ${isDanger ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-neutral-600'}`}>
            {percentage.toFixed(0)}% dari Rp {limit.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-1.5 rounded-full transition-all duration-500 ${isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-neutral-900'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-neutral-100 rounded-xl shadow-lg">
          <p className="font-semibold text-neutral-800 text-sm mb-1">{payload[0].name}</p>
          <p className="text-neutral-500 text-xs">
            Rp {payload[0].value.toLocaleString('id-ID')} ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    if (percent < 0.05) return null; // hide very small labels
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="10px" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-8 pb-24">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Rangkuman</h1>
          <p className="text-sm text-neutral-400 capitalize">Statistik Bulanan</p>
        </div>
        <Link href="/anggaran" className="p-2 bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200 transition-colors">
          <Settings size={20} />
        </Link>
      </div>

      {/* Period Tabs */}
      <div className="flex bg-neutral-100 p-1 rounded-xl mb-4">
        {['Harian', 'Mingguan', 'Bulanan'].map(p => (
          <button
            key={p} type="button"
            onClick={() => setPeriodFilter(p)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              periodFilter === p 
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Date Filter */}
      <div className="flex items-center justify-between bg-white border border-neutral-100 rounded-2xl p-2 mb-6 shadow-sm">
        <button onClick={handlePrev} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
          <ChevronLeft size={20} className="text-neutral-600" />
        </button>
        <span className="font-medium text-neutral-800 capitalize text-sm">{displayDateStr}</span>
        <button onClick={handleNext} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
          <ChevronRight size={20} className="text-neutral-600" />
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

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 mb-6">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Total {activeTab}</h2>
        <div className="text-3xl font-bold text-neutral-900 mb-6">
          Rp {totalAmount.toLocaleString('id-ID')}
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-neutral-400">
            Belum ada data {activeTab} bulan ini.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Rincian Per Kategori</h2>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900">Buka Semua</button>
            <span className="text-neutral-300">|</span>
            <button onClick={collapseAll} className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900">Tutup Semua</button>
          </div>
        </div>
        
        {(() => {
          const categoriesWithSpent = filteredCategories.map(cat => {
            const catSpent = expensesByCategory[cat.name] || 0;
            const subs = subcategories.filter(sc => sc.category_id === cat.id);
            return { ...cat, spent: catSpent, subs };
          })
          .filter(cat => cat.spent > 0 || cat.subs.some(s => (expensesByCategory[s.name] || 0) > 0))
          .sort((a, b) => b.spent - a.spent);

          return categoriesWithSpent.map(cat => {
            const subs = cat.subs;
            const catSpent = cat.spent;
            
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

            const catChartData = chartData.find(d => d.id === cat.id);
            const colorDot = catChartData ? catChartData.color : '#cbd5e1';
            const isExpanded = expandedCats[cat.id];

            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
                <div 
                  className={`flex justify-between items-start ${subs.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
                  onClick={() => subs.length > 0 && toggleExpand(cat.id)}
                >
                  <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colorDot }}></span>
                    {cat.name}
                    {catChartData && <span className="text-[10px] font-medium text-neutral-400">({catChartData.percentage}%)</span>}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900">
                      Rp {catSpent.toLocaleString('id-ID')}
                    </span>
                    {subs.length > 0 && (
                      <span className="text-neutral-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    )}
                  </div>
                </div>

                {activeTab === 'pengeluaran' && renderProgressBar(catSpent, catLimit)}

                {subs.length > 0 && isExpanded && (
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-neutral-100">
                    {(() => {
                      const subsWithSpent = subs.map(sub => {
                        const subSpent = expensesByCategory[sub.name] || 0;
                        const b = budgets.find(b => b.category === sub.id && b.month === monthKey);
                        const subLimit = b ? Number(b.amount_limit) : 0;
                        const subPercentOfCat = catSpent > 0 ? ((subSpent / catSpent) * 100).toFixed(0) : 0;
                        return { ...sub, spent: subSpent, limit: subLimit, percentOfCat: subPercentOfCat };
                      })
                      .filter(s => s.spent > 0)
                      .sort((a, b) => b.spent - a.spent);

                      return subsWithSpent.map(sub => (
                        <div 
                          key={sub.id} 
                          onClick={() => handleSubClick(sub.name)}
                          className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors group"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors flex items-center gap-1">
                              {sub.name} <span className="text-[10px] text-neutral-400 font-semibold">({sub.percentOfCat}%)</span>
                              <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-xs font-semibold text-neutral-800">
                              Rp {sub.spent.toLocaleString('id-ID')}
                            </span>
                          </div>
                          {activeTab === 'pengeluaran' && renderProgressBar(sub.spent, sub.limit)}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
