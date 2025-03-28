import { create } from 'zustand';

interface AccountsStoreState {
  analyzingAccountIds: string[];
  isAccountBeingAnalyzed: (id: string) => boolean;
  startAnalyzing: (ids: string[]) => void;
  stopAnalyzing: (ids: string[]) => void;
  clearAllAnalyzing: () => void;
}

export const useAccountsStore = create<AccountsStoreState>((set, get) => ({
  analyzingAccountIds: [],
  
  isAccountBeingAnalyzed: (id: string) => {
    return get().analyzingAccountIds.includes(id);
  },
  
  startAnalyzing: (ids: string[]) => {
    set((state) => {
      // Filter out any duplicates
      const uniqueIds = [...new Set([...state.analyzingAccountIds, ...ids])];
      console.log(`🔄 [Store] Started analyzing ${ids.length} accounts, total: ${uniqueIds.length}`);
      return {
        analyzingAccountIds: uniqueIds,
      };
    });
  },
  
  stopAnalyzing: (ids: string[]) => {
    set((state) => {
      const newIds = state.analyzingAccountIds.filter(
        (id) => !ids.includes(id)
      );
      console.log(`🔄 [Store] Stopped analyzing ${ids.length} accounts, remaining: ${newIds.length}`);
      return {
        analyzingAccountIds: newIds,
      };
    });
  },
  
  clearAllAnalyzing: () => {
    set({ analyzingAccountIds: [] });
    console.log(`🔄 [Store] Cleared all analyzing accounts`);
  },
})); 