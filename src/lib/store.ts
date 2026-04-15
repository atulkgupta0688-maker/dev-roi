import { create } from 'zustand';
import type { Workspace, AIPlatform, Developer, AuthUser, WorkspaceSnapshot } from './types';
import { DEMO_DATA, saveDemoToSession, clearDemoSession, isDemoSession, loadDemoFromSession } from './demoData';

interface AppState {
  // Auth
  user: AuthUser | null;
  isDemoMode: boolean;
  hasPendingData: boolean;   // true when wizard complete but user not yet saved

  // Data
  workspace: Workspace | null;
  platforms: AIPlatform[];
  developers: Developer[];
  snapshots: WorkspaceSnapshot[];

  // UI
  isAuthModalOpen: boolean;
  authModalTab: 'signin' | 'signup';

  // Actions
  setUser: (user: AuthUser | null) => void;
  setDemoMode: (demo: boolean) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setPlatforms: (platforms: AIPlatform[]) => void;
  setDevelopers: (developers: Developer[]) => void;
  setSnapshots: (snapshots: WorkspaceSnapshot[]) => void;
  addDeveloper: (dev: Developer) => void;
  updateDeveloper: (dev: Developer) => void;
  removeDeveloper: (devId: string) => void;
  setHasPendingData: (pending: boolean) => void;
  loadDemoData: () => void;
  clearData: () => void;
  setAuthModalOpen: (open: boolean, tab?: 'signin' | 'signup') => void;
  initFromSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isDemoMode: false,
  hasPendingData: false,
  workspace: null,
  platforms: [],
  developers: [],
  snapshots: [],
  isAuthModalOpen: false,
  authModalTab: 'signin',

  setUser: (user) => {
    if (user) {
      clearDemoSession();
      set({ user, isDemoMode: false });
    } else {
      set({ user });
    }
  },

  setDemoMode: (demo) => set({ isDemoMode: demo }),
  setWorkspace: (workspace) => set({ workspace }),
  setPlatforms: (platforms) => set({ platforms }),
  setDevelopers: (developers) => set({ developers }),
  setSnapshots: (snapshots) => set({ snapshots }),
  setHasPendingData: (hasPendingData) => set({ hasPendingData }),

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
      hasPendingData: false,
      workspace: DEMO_DATA.workspace,
      platforms: DEMO_DATA.platforms,
      developers: DEMO_DATA.developers,
      // @ts-expect-error snapshots added in Task 6
      snapshots: DEMO_DATA.snapshots,
    });
  },

  clearData: () => {
    clearDemoSession();
    set({
      isDemoMode: false,
      hasPendingData: false,
      workspace: null,
      platforms: [],
      developers: [],
      snapshots: [],
    });
  },

  setAuthModalOpen: (open, tab) =>
    set({ isAuthModalOpen: open, ...(tab ? { authModalTab: tab } : {}) }),

  initFromSession: () => {
    if (isDemoSession()) {
      const data = loadDemoFromSession();
      if (data) {
        set({
          isDemoMode: true,
          workspace: data.workspace,
          platforms: data.platforms,
          developers: data.developers,
          snapshots: (data as any).snapshots ?? [],
        });
      }
    }
  },
}));

export const selectWorkspaceData = (state: AppState) => ({
  workspace: state.workspace,
  platforms: state.platforms,
  developers: state.developers,
});

export const selectHasData = (state: AppState) =>
  state.workspace !== null &&
  state.workspace.baseline_per_dev !== null &&
  state.workspace.current_per_dev !== null;
