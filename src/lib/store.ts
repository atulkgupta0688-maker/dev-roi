import { create } from 'zustand';
import type { Workspace, AIPlatform, Developer, AuthUser } from './types';
import { DEMO_DATA, saveDemoToSession, clearDemoSession, isDemoSession, loadDemoFromSession } from './demoData';

interface AppState {
  // Auth
  user: AuthUser | null;
  isDemoMode: boolean;

  // Data
  workspace: Workspace | null;
  platforms: AIPlatform[];
  developers: Developer[];

  // UI
  isAuthModalOpen: boolean;
  authModalTab: 'signin' | 'signup';
  isWaitlistModalOpen: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setDemoMode: (demo: boolean) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setPlatforms: (platforms: AIPlatform[]) => void;
  setDevelopers: (developers: Developer[]) => void;
  addDeveloper: (dev: Developer) => void;
  updateDeveloper: (dev: Developer) => void;
  removeDeveloper: (devId: string) => void;
  loadDemoData: () => void;
  clearData: () => void;
  setAuthModalOpen: (open: boolean, tab?: 'signin' | 'signup') => void;
  setWaitlistModalOpen: (open: boolean) => void;
  initFromSession: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isDemoMode: false,
  workspace: null,
  platforms: [],
  developers: [],
  isAuthModalOpen: false,
  authModalTab: 'signin',
  isWaitlistModalOpen: false,

  // Actions
  setUser: (user) => {
    if (user) {
      // Logging in as a real user — clear any lingering demo session
      clearDemoSession();
      set({ user, isDemoMode: false, workspace: null, platforms: [], developers: [] });
    } else {
      set({ user });
    }
  },

  setDemoMode: (demo) => set({ isDemoMode: demo }),

  setWorkspace: (workspace) => set({ workspace }),

  setPlatforms: (platforms) => set({ platforms }),

  setDevelopers: (developers) => set({ developers }),

  addDeveloper: (dev) =>
    set((state) => ({ developers: [...state.developers, dev] })),

  updateDeveloper: (dev) =>
    set((state) => ({
      developers: state.developers.map((d) => (d.id === dev.id ? dev : d)),
    })),

  removeDeveloper: (devId) =>
    set((state) => ({
      developers: state.developers.filter((d) => d.id !== devId),
    })),

  loadDemoData: () => {
    saveDemoToSession();
    set({
      isDemoMode: true,
      workspace: DEMO_DATA.workspace,
      platforms: DEMO_DATA.platforms,
      developers: DEMO_DATA.developers,
    });
  },

  clearData: () => {
    clearDemoSession();
    set({
      isDemoMode: false,
      workspace: null,
      platforms: [],
      developers: [],
    });
  },

  setAuthModalOpen: (open, tab) =>
    set({ isAuthModalOpen: open, ...(tab ? { authModalTab: tab } : {}) }),

  setWaitlistModalOpen: (open) => set({ isWaitlistModalOpen: open }),

  initFromSession: () => {
    if (isDemoSession()) {
      const data = loadDemoFromSession();
      if (data) {
        set({
          isDemoMode: true,
          workspace: data.workspace,
          platforms: data.platforms,
          developers: data.developers,
        });
      }
    }
  },
}));

// Selector helpers
export const selectWorkspaceData = (state: AppState) => ({
  workspace: state.workspace,
  platforms: state.platforms,
  developers: state.developers,
});

export const selectHasData = (state: AppState) =>
  state.workspace !== null &&
  (state.workspace.baseline_tickets_per_dev !== null ||
    state.workspace.current_tickets_per_dev !== null);
