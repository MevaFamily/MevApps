"use client";
import { createContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const AppContext = createContext();

export default function AppProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial Fetch (Single Fetch Pattern)
    async function fetchData() {
      try {
        const [accRes, txRes, bdgRes, catRes, subcatRes] = await Promise.all([
          supabase.from("accounts").select("*").order("created_at", { ascending: true }),
          supabase.from("transactions").select("*").order("date", { ascending: false }).limit(100),
          supabase.from("budgets").select("*"),
          supabase.from("categories").select("*").order("name", { ascending: true }),
          supabase.from("subcategories").select("*").order("name", { ascending: true })
        ]);

        if (accRes.data) setAccounts(accRes.data);
        if (txRes.data) setTransactions(txRes.data);
        if (bdgRes.data) setBudgets(bdgRes.data);
        if (catRes.data) setCategories(catRes.data);
        if (subcatRes.data) setSubcategories(subcatRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Realtime Subscriptions
    const txChannel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
        if (payload.eventType === 'INSERT') {
          // Hanya tambahkan jika tidak ada ID yang sama (menghindari duplikasi dari optimistic update)
          setTransactions(prev => {
            const exists = prev.find(t => t.id === payload.new.id);
            if (exists) return prev;
            // Jika optimistic update menggunakan UUID asli dari client, ini jarang conflict
            return [payload.new, ...prev.filter(t => typeof t.id !== 'string' || !t.id.startsWith('temp-'))];
          });
        }
      })
      .subscribe();

    const accChannel = supabase
      .channel('public:accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, payload => {
        if (payload.eventType === 'UPDATE') {
          setAccounts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        }
      })
      .subscribe();

    const catChannel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => {
        if (payload.eventType === 'INSERT') {
          setCategories(prev => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .subscribe();

    const subcatChannel = supabase
      .channel('public:subcategories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, payload => {
        if (payload.eventType === 'INSERT') {
          setSubcategories(prev => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(accChannel);
      supabase.removeChannel(catChannel);
      supabase.removeChannel(subcatChannel);
    };
  }, []);

  return (
    <AppContext.Provider value={{
      accounts, setAccounts,
      transactions, setTransactions,
      budgets, setBudgets,
      categories, setCategories,
      subcategories, setSubcategories,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
}
