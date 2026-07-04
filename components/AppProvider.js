"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import useAppStore from "@/store/useAppStore";

export default function AppProvider({ children }) {
  const setAccounts = useAppStore(state => state.setAccounts);
  const setTransactions = useAppStore(state => state.setTransactions);
  const setBudgets = useAppStore(state => state.setBudgets);
  const setCategories = useAppStore(state => state.setCategories);
  const setSubcategories = useAppStore(state => state.setSubcategories);
  const setLoading = useAppStore(state => state.setLoading);
  const setSession = useAppStore(state => state.setSession);
  const session = useAppStore(state => state.session);
  const setRecurringBills = useAppStore(state => state.setRecurringBills);
  const setHasMoreTransactions = useAppStore(state => state.setHasMoreTransactions);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Reset states on logout
        setAccounts([]);
        setTransactions([]);
        setBudgets([]);
        setCategories([]);
        setSubcategories([]);
        setRecurringBills([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    
    setLoading(true);

    // Initial Fetch (Single Fetch Pattern)
    async function fetchData() {
      try {
        const [accRes, txRes, bdgRes, catRes, subcatRes, recurringBillsRes] = await Promise.all([
          supabase.from("accounts").select("*").order("created_at", { ascending: true }),
          supabase.from("transactions").select("*").order("date", { ascending: false }).range(0, 49),
          supabase.from("budgets").select("*"),
          supabase.from("categories").select("*").order("name", { ascending: true }),
          supabase.from("subcategories").select("*").order("name", { ascending: true }),
          supabase.from("recurring_bills").select("*").order("due_date", { ascending: true })
        ]);

        if (accRes.data) {
          const parsedAccounts = accRes.data.map(acc => {
            if (acc.name && acc.name.includes(' // ')) {
              const [group, displayName] = acc.name.split(' // ');
              return { ...acc, name: displayName, type: group };
            }
            return acc;
          });
          setAccounts(parsedAccounts);
        }
        if (txRes.data) {
          const parsedTransactions = txRes.data.map(tx => {
            if (tx.account_name && tx.account_name.includes(' // ')) {
              tx.account_name = tx.account_name.split(' // ')[1];
            }
            return tx;
          });
          setTransactions(parsedTransactions);
          if (parsedTransactions.length < 50) {
            setHasMoreTransactions(false);
          } else {
            setHasMoreTransactions(true);
          }
        }
        if (bdgRes.data) setBudgets(bdgRes.data);
        if (catRes.data) setCategories(catRes.data);
        if (subcatRes.data) setSubcategories(subcatRes.data);
        if (recurringBillsRes && recurringBillsRes.data) setRecurringBills(recurringBillsRes.data);
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
          let inserted = payload.new;
          if (inserted.account_name && inserted.account_name.includes(' // ')) {
            inserted.account_name = inserted.account_name.split(' // ')[1];
          }
          setTransactions(prev => {
            const exists = prev.find(t => t.id === inserted.id);
            if (exists) return prev;
            return [inserted, ...prev.filter(t => typeof t.id !== 'string' || !t.id.startsWith('temp-'))];
          });
        }
      })
      .subscribe();

    const accChannel = supabase
      .channel('public:accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, payload => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          let item = payload.new;
          if (item.name && item.name.includes(' // ')) {
            const [group, displayName] = item.name.split(' // ');
            item = { ...item, name: displayName, type: group };
          }
          setAccounts(prev => {
            if (payload.eventType === 'UPDATE') {
              return prev.map(a => a.id === item.id ? item : a);
            } else {
              const exists = prev.find(a => a.id === item.id);
              if (exists) return prev;
              return [...prev, item];
            }
          });
        } else if (payload.eventType === 'DELETE') {
          setAccounts(prev => prev.filter(a => a.id !== payload.old.id));
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

    const budgetChannel = supabase
      .channel('public:budgets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, payload => {
        if (payload.eventType === 'INSERT') {
          setBudgets(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setBudgets(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
        } else if (payload.eventType === 'DELETE') {
          setBudgets(prev => prev.filter(b => b.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(accChannel);
      supabase.removeChannel(catChannel);
      supabase.removeChannel(subcatChannel);
      supabase.removeChannel(budgetChannel);
    };
  }, [session]);

  return <>{children}</>;
}
