import { create } from 'zustand';
import type { GameData } from '../types/pf2e';
import { loadGameData, clearCache, type LoadProgress } from '../data/loader';

interface DataState {
  gameData: GameData | null;
  loading: boolean;
  progress: LoadProgress | null;
  error: string | null;

  loadData: (forceRefresh?: boolean) => Promise<void>;
  clearError: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  gameData: null,
  loading: false,
  progress: null,
  error: null,

  loadData: async (forceRefresh = false) => {
    if (get().loading) return;

    set({ loading: true, error: null, progress: { stage: 'Starting…', current: 0, total: 1 } });

    try {
      if (forceRefresh) await clearCache();
      const data = await loadGameData(
        (progress: LoadProgress) => set({ progress }),
        forceRefresh,
      );
      set({ gameData: data, loading: false, progress: null });
    } catch (err) {
      set({
        loading: false,
        progress: null,
        error: err instanceof Error ? err.message : 'Failed to load game data',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
