import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TokenUsage {
  completionTokens: number;
  promptTokens: number;
  totalTokens: number;
}

interface TokenUsageState {
  dailyUsage: TokenUsage;
  updateUsage: (usage: Partial<TokenUsage>) => void;
  resetDailyUsage: () => void;
}

const defaultUsage: TokenUsage = {
  completionTokens: 0,
  promptTokens: 0,
  totalTokens: 0,
};

export const useTokenUsageStore = create<TokenUsageState>()(
  persist(
    (set) => ({
      dailyUsage: defaultUsage,
      updateUsage: (usage) =>
        set((state) => ({
          dailyUsage: {
            completionTokens: state.dailyUsage.completionTokens + (usage.completionTokens || 0),
            promptTokens: state.dailyUsage.promptTokens + (usage.promptTokens || 0),
            totalTokens: state.dailyUsage.totalTokens + (usage.totalTokens || 0),
          },
        })),
      resetDailyUsage: () =>
        set(() => ({
          dailyUsage: defaultUsage,
        })),
    }),
    {
      name: 'token-usage-storage',
      onRehydrateStorage: () => (state) => {
        // Check if it's a new day and reset if needed
        const lastResetDate = localStorage.getItem('lastTokenResetDate');
        const today = new Date().toDateString();
        
        if (lastResetDate !== today) {
          localStorage.setItem('lastTokenResetDate', today);
          if (state) {
            state.resetDailyUsage();
          }
        }
      },
    }
  )
);
