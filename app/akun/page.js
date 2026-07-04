"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import useAppStore from "@/store/useAppStore";
import { supabase } from "@/lib/supabase";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import ModalBottomSheet from "@/components/ModalBottomSheet";
import { ChevronDown, ChevronUp } from "lucide-react";



export default function AkunPage() {
  const accounts = useAppStore(state => state.accounts);
  const setAccounts = useAppStore(state => state.setAccounts);
  const transactions = useAppStore(state => state.transactions);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [activeChartTab, setActiveChartTab] = useState("trend");
  
  const [name, setName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Umum");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const groupRef = useRef(null);
  const [balance, setBalance] = useState("");
  
  const netWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  const getHistoricalNetWorth = () => {
    let history = [];
    let runningNetWorth = netWorth;
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const monthLabel = d.toLocaleString('id-ID', { month: 'short' });
      
      history.unshift({ month: monthLabel, monthKey, netWorth: 0 });
    }
    
    for (let i = history.length - 1; i >= 0; i--) {
      history[i].netWorth = runningNetWorth;
      
      const monthTx = transactions.filter(tx => tx.date.startsWith(history[i].monthKey));
      const income = monthTx.filter(tx => tx.type === 'pemasukan').reduce((sum, tx) => sum + Number(tx.amount), 0);
      const expense = monthTx.filter(tx => tx.type === 'pengeluaran').reduce((sum, tx) => sum + Number(tx.amount), 0);
      const netFlow = income - expense;
      
      runningNetWorth -= netFlow;
    }
    return history;
  };

  const trendData = useMemo(() => getHistoricalNetWorth(), [transactions, netWorth]);

  const toggleGroupCollapse = (groupType) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupType]: !prev[groupType]
    }));
  };

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, ''); 
    if (rawValue) setBalance(Number(rawValue).toLocaleString('id-ID'));
    else setBalance("");
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (groupRef.current && !groupRef.current.contains(e.target)) setShowGroupDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openAddModal = () => {
    setEditData(null);
    setName("");
    setSelectedGroup(existingGroups[0] || "Umum");
    setShowGroupDropdown(false);
    setBalance("");
    setShowModal(true);
  };

  const openEditModal = (acc) => {
    setEditData(acc);
    setName(acc.name);
    setSelectedGroup(acc.type || "Lainnya");
    setShowGroupDropdown(false);
    setBalance(Number(acc.balance).toLocaleString('id-ID'));
    setShowModal(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Nama akun tidak boleh kosong.");
    
    const finalType = selectedGroup.trim();
    if (!finalType) return alert("Kelompok akun tidak boleh kosong.");
    
    const balanceNum = Number(balance.replace(/\./g, '')) || 0;
    const dbName = name.trim();
    const dbType = finalType;
    
    if (editData) {
      const updatedAccount = { ...editData, name: name.trim(), type: finalType, balance: balanceNum };
      setAccounts(prev => prev.map(a => a.id === editData.id ? updatedAccount : a));
      setShowModal(false);

      try {
        const { error } = await supabase.from('accounts').update({
          name: dbName, type: dbType, balance: balanceNum
        }).eq('id', editData.id);
        if (error) {
          alert("Gagal memperbarui akun di database: " + error.message);
          console.error("Supabase error:", error);
        }
      } catch(err) {
        alert("Terjadi kesalahan jaringan saat memperbarui akun.");
        console.error(err);
      }
    } else {
      const newId = crypto.randomUUID();
      const newAccount = { id: newId, name: name.trim(), type: finalType, balance: balanceNum, created_at: new Date().toISOString() };
      setAccounts(prev => [...prev, newAccount]);
      setShowModal(false);

      try {
        const { error } = await supabase.from('accounts').insert([{
          id: newAccount.id, name: dbName, type: dbType, balance: balanceNum
        }]);
        if (error) {
          alert("Gagal menambahkan akun ke database: " + error.message);
          console.error("Supabase error:", error);
        }
      } catch(err) {
        alert("Terjadi kesalahan jaringan saat menambahkan akun.");
        console.error(err);
      }
    }
  };

  const handleDelete = async () => {
    if (!editData) return;
    if (!confirm("Hapus akun ini secara permanen?")) return;

    setAccounts(prev => prev.filter(a => a.id !== editData.id));
    setShowModal(false);

    try {
      const { error } = await supabase.from('accounts').delete().eq('id', editData.id);
      if (error) {
        alert("Gagal menghapus akun di database: " + error.message);
        console.error("Supabase error:", error);
      }
    } catch(err) {
      alert("Terjadi kesalahan jaringan saat menghapus akun.");
      console.error(err);
    }
  };

  const groupedAccounts = useMemo(() => {
    return accounts.reduce((acc, curr) => {
      const gName = curr.type?.trim() || "Lainnya";
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(curr);
      return acc;
    }, {});
  }, [accounts]);

  const existingGroups = useMemo(() => {
    const groups = Object.keys(groupedAccounts);
    // Suggest some default ones if nothing is in DB
    if (groups.length === 0 || (groups.length === 1 && groups[0] === "Lainnya")) {
      return ["Uang Pribadi", "Tabungan", "Uang Istri"];
    }
    return groups;
  }, [groupedAccounts]);

  const pieData = useMemo(() => {
    return Object.entries(groupedAccounts).map(([group, accs]) => {
      const value = accs.reduce((sum, a) => sum + Number(a.balance), 0);
      return { name: group, value: value > 0 ? value : 0 };
    }).filter(item => item.value > 0);
  }, [groupedAccounts]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#4b5563'];

  const getAccountIcon = (acc) => {
    const nameLower = acc.name.toLowerCase();
    const typeLower = (acc.type || "").toLowerCase();
    if (nameLower.includes('tunai') || nameLower.includes('cash') || typeLower.includes('tunai') || typeLower.includes('cash')) {
      return (
        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    }
    if (nameLower.includes('gopay') || nameLower.includes('ovo') || nameLower.includes('dana') || nameLower.includes('wallet') || nameLower.includes('shopeepay') || nameLower.includes('linkaja') || typeLower.includes('wallet') || typeLower.includes('ewallet')) {
      return (
        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-900 text-white p-2 text-xs rounded-lg shadow-lg">
          <p className="font-semibold mb-1">{payload[0].payload.month}</p>
          <p>Rp {payload[0].value.toLocaleString('id-ID')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-8 pb-24">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Akun</h1>
          <p className="text-sm text-neutral-400">Total Kekayaan Bersih</p>
          <h2 className="text-3xl font-bold mt-1 text-neutral-900">
            Rp {netWorth.toLocaleString('id-ID')}
          </h2>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-neutral-900 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-neutral-800 transition-colors shadow-sm"
        >
          +
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {activeChartTab === 'trend' ? 'Tren Kekayaan (6 Bulan)' : 'Distribusi Aset'}
          </h3>
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
            <button 
              onClick={() => setActiveChartTab('trend')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${activeChartTab === 'trend' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Tren
            </button>
            <button 
              onClick={() => setActiveChartTab('distribusi')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${activeChartTab === 'distribusi' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Distribusi
            </button>
          </div>
        </div>
        
        <div className="h-44 w-full flex items-center justify-center">
          {activeChartTab === 'trend' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#a3a3a3' }} 
                  dy={10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} />
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="35%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Saldo']}
                    contentStyle={{ background: '#171717', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                  />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    iconType="circle"
                    formatter={(value, entry) => {
                      const total = pieData.reduce((sum, item) => sum + item.value, 0);
                      const itemVal = entry.payload.value;
                      const pct = total > 0 ? ((itemVal / total) * 100).toFixed(1) : 0;
                      return <span className="text-[10px] text-neutral-600 font-medium">{value} ({pct}%)</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-neutral-400">Tidak ada saldo aset untuk dianalisis</div>
            )
          )}
        </div>
      </div>

      <div className="space-y-6">
        {existingGroups.sort((a, b) => a.localeCompare(b)).map(groupType => {
          const groupAccs = groupedAccounts[groupType] || [];
          if (groupAccs.length === 0) return null;
          
          const groupTotal = groupAccs.reduce((sum, a) => sum + Number(a.balance), 0);
          const isCollapsed = collapsedGroups[groupType];

          return (
            <div key={groupType}>
              <div 
                onClick={() => toggleGroupCollapse(groupType)}
                className="flex justify-between items-center mb-3 px-1 cursor-pointer select-none hover:opacity-80 transition-opacity"
              >
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <span className="text-neutral-400">
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </span>
                  {groupType}
                </h3>
                <span className="text-xs font-bold text-neutral-800 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full shadow-sm">
                  Rp {groupTotal.toLocaleString('id-ID')}
                </span>
              </div>
              {!isCollapsed && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {groupAccs.map(acc => (
                    <div 
                      key={acc.id} 
                      onClick={() => openEditModal(acc)}
                      className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                          {getAccountIcon(acc)}
                        </div>
                        <h4 className="font-medium text-neutral-900">{acc.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-sm ${Number(acc.balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Rp {Number(acc.balance).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {accounts.length === 0 && (
          <div className="text-center p-8 bg-neutral-50 border border-neutral-100 rounded-2xl mt-4">
            <p className="text-neutral-400 text-sm">Belum ada akun, silakan tambah akun baru.</p>
          </div>
        )}
      </div>

      {/* Modal Form Akun */}
      <ModalBottomSheet 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editData ? 'Detail Akun' : 'Tambah Akun Baru'}
      >
        <form onSubmit={handleSaveAccount} className="space-y-4 pb-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Nama Akun</label>
                <input 
                  type="text" required
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Dompet Utama, BCA, GoPay"
                />
              </div>

              <div className="relative" ref={groupRef}>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Kelompok Akun</label>
                <input 
                  type="text" required
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={selectedGroup} 
                  onChange={(e) => { setSelectedGroup(e.target.value); setShowGroupDropdown(true); }}
                  onFocus={() => setShowGroupDropdown(true)}
                  placeholder="Pilih atau ketik kelompok baru..." 
                />
                {showGroupDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {existingGroups.filter(g => g !== "Lainnya" && g.toLowerCase().includes(selectedGroup.toLowerCase())).map(g => (
                      <div 
                        key={g} 
                        className="px-4 py-2.5 hover:bg-neutral-50 cursor-pointer text-sm text-neutral-800" 
                        onClick={() => { setSelectedGroup(g); setShowGroupDropdown(false); }}
                      >
                        {g}
                      </div>
                    ))}
                    {selectedGroup.trim() && !existingGroups.find(g => g.toLowerCase() === selectedGroup.trim().toLowerCase()) && (
                      <div 
                        className="px-4 py-2.5 hover:bg-neutral-50 cursor-pointer text-sm text-blue-600 font-semibold border-t border-neutral-50"
                        onClick={() => setShowGroupDropdown(false)}
                      >
                        + Tambah "{selectedGroup.trim()}" Sebagai Kelompok Baru
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {existingGroups.filter(g => g !== "Lainnya").map(g => (
                    <button 
                      key={g} 
                      type="button" 
                      onClick={() => {
                        setSelectedGroup(g);
                        setShowGroupDropdown(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        (selectedGroup === g) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Saldo Tersedia (Rp)</label>
                <input 
                  type="text" inputMode="numeric"
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-2xl font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                  value={balance} onChange={handleAmountChange}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editData && (
                  <button type="button" onClick={handleDelete} className="flex-1 bg-rose-50 text-rose-600 font-medium rounded-xl px-4 py-3.5 hover:bg-rose-100 transition-colors">
                    Hapus
                  </button>
                )}
                <button type="submit" className={`${editData ? 'flex-[2]' : 'w-full'} bg-neutral-950 text-white font-medium rounded-xl px-4 py-3.5 hover:bg-neutral-800 transition-colors`}>
                  Simpan Akun
                </button>
              </div>
            </form>
      </ModalBottomSheet>
    </div>
  );
}
