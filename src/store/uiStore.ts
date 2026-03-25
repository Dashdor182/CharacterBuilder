import { create } from 'zustand';
import type { FoundryItem } from '../types/pf2e';

interface TooltipState {
  item: FoundryItem | null;
  anchor: { x: number; y: number; width: number; height: number } | null;
}

interface UiState {
  darkMode: boolean;
  collapsedSections: Set<string>;
  tooltip: TooltipState;
  shareModalOpen: boolean;
  settingsOpen: boolean;
  confirmModal: { message: string; onConfirm: () => void } | null;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;

  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  toggleSection: (id: string) => void;
  setSectionCollapsed: (id: string, collapsed: boolean) => void;
  showTooltip: (item: FoundryItem, anchor: TooltipState['anchor']) => void;
  hideTooltip: () => void;
  setShareModalOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  dismissConfirm: () => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissNotification: () => void;
}

function getSystemDarkMode(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const DARK_MODE_KEY = 'pf2e_dark_mode';

export const useUiStore = create<UiState>((set, get) => ({
  darkMode: (() => {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    return stored !== null ? stored === 'true' : getSystemDarkMode();
  })(),
  collapsedSections: new Set<string>(),
  tooltip: { item: null, anchor: null },
  shareModalOpen: false,
  settingsOpen: false,
  confirmModal: null,
  notification: null,

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem(DARK_MODE_KEY, String(next));
    set({ darkMode: next });
  },

  setDarkMode: (v) => {
    localStorage.setItem(DARK_MODE_KEY, String(v));
    set({ darkMode: v });
  },

  toggleSection: (id) => {
    const collapsed = new Set(get().collapsedSections);
    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);
    set({ collapsedSections: collapsed });
  },

  setSectionCollapsed: (id, collapsed) => {
    const sections = new Set(get().collapsedSections);
    if (collapsed) sections.add(id);
    else sections.delete(id);
    set({ collapsedSections: sections });
  },

  showTooltip: (item, anchor) => set({ tooltip: { item, anchor } }),
  hideTooltip: () => set({ tooltip: { item: null, anchor: null } }),

  setShareModalOpen: (v) => set({ shareModalOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  showConfirm: (message, onConfirm) => set({ confirmModal: { message, onConfirm } }),
  dismissConfirm: () => set({ confirmModal: null }),

  showNotification: (message, type = 'info') => {
    set({ notification: { message, type } });
    setTimeout(() => {
      if (get().notification?.message === message) {
        set({ notification: null });
      }
    }, 3500);
  },
  dismissNotification: () => set({ notification: null }),
}));
