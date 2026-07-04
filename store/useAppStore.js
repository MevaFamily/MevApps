import { create } from 'zustand';
import { supabase } from "@/lib/supabase";

const useAppStore = create((set, get) => ({
  session: null,
  loading: true,
  accounts: [],
  transactions: [],
  budgets: [],
  categories: [],
  subcategories: [],
  hasMoreTransactions: true,
  isLoadingMore: false,

  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  
  setAccounts: (accountsOrUpdater) => set((state) => ({ 
    accounts: typeof accountsOrUpdater === 'function' ? accountsOrUpdater(state.accounts) : accountsOrUpdater 
  })),
  
  setTransactions: (transactionsOrUpdater) => set((state) => ({ 
    transactions: typeof transactionsOrUpdater === 'function' ? transactionsOrUpdater(state.transactions) : transactionsOrUpdater 
  })),
  
  setBudgets: (budgetsOrUpdater) => set((state) => ({ 
    budgets: typeof budgetsOrUpdater === 'function' ? budgetsOrUpdater(state.budgets) : budgetsOrUpdater 
  })),
  
  setCategories: (categoriesOrUpdater) => set((state) => ({ 
    categories: typeof categoriesOrUpdater === 'function' ? categoriesOrUpdater(state.categories) : categoriesOrUpdater 
  })),
  
  setSubcategories: (subcategoriesOrUpdater) => set((state) => ({ 
    subcategories: typeof subcategoriesOrUpdater === 'function' ? subcategoriesOrUpdater(state.subcategories) : subcategoriesOrUpdater 
  })),

  setHasMoreTransactions: (val) => set({ hasMoreTransactions: val }),
  
  fetchMoreTransactions: async () => {
    const { transactions, hasMoreTransactions, isLoadingMore } = get();
    if (!hasMoreTransactions || isLoadingMore) return;
    
    set({ isLoadingMore: true });
    try {
      const from = transactions.length;
      const to = from + 49;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .range(from, to);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const parsedTxs = data.map(tx => {
          if (tx.account_name && tx.account_name.includes(' // ')) {
            tx.account_name = tx.account_name.split(' // ')[1];
          }
          return tx;
        });
        
        set((state) => {
          const existingIds = new Set(state.transactions.map(t => t.id));
          const newTxs = parsedTxs.filter(t => !existingIds.has(t.id));
          return { transactions: [...state.transactions, ...newTxs] };
        });
      }
      
      if (!data || data.length < 50) {
        set({ hasMoreTransactions: false });
      }
    } catch (error) {
      console.error("Error fetching more transactions:", error);
    } finally {
      set({ isLoadingMore: false });
    }
  },

  resetState: () => set({
    accounts: [],
    transactions: [],
    budgets: [],
    categories: [],
    subcategories: [],
    loading: false,
    hasMoreTransactions: true,
    isLoadingMore: false
  })
}));

export default useAppStore;
