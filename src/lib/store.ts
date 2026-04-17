import { create } from 'zustand';
import type { Workspace, AIPlatform, Developer, WorkspaceSnapshot } from './types';
import { DEMO_DATA } from './demoData';

interface AppState {
  isDemoMode: boolean;
  workspace: Workspace | null;
  platforms: AIPlatform[];
  developers: Developer[];
  snapshots: WorkspaceSnapshot[];

  setWorkspace: (workspace: Workspace | null) => void;
  setPlatforms: (platforms: AIPlatform[]) => void;
  setDevelopers: (developers: Developer[]) => void;
  setSnapshots: (snapshots: WorkspaceSnapshot[]) => void;
  addDeveloper: (dev: Developer) => void;
  updateDeveloper: (dev: Developer) => void;
  removeDeveloper: (devId: string) => void;

  saveWorkspaceData: (workspace: Workspace, platforms: AIPlatform[], developers?: Developer[]) => void;

  loadDemoData: () => void;
  clearData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDemoMode: false,
  workspace: null,
  platforms: [],
  developers: [],
  snapshots: [],

  setWorkspace: (workspace) => set({ workspace }),
  setPlatforms: (platforms) => set({ platforms }),
  setDevelopers: (developers) => set({ developers }),
  setSnapshots: (snapshots) => set({ snapshots }),

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

  saveWorkspaceData: (workspace, platforms, developers = []) => {
    set({ workspace, platforms, developers, isDemoMode: false });
  },

  loadDemoData: () => {
    set({
      isDemoMode: true,
      workspace: DEMO_DATA.workspace,
      platforms: DEMO_DATA.platforms,
      developers: DEMO_DATA.developers,
      snapshots: DEMO_DATA.snapshots,
    });
  },

  clearData: () => {
    set({
      isDemoMode: false,
      workspace: null,
      platforms: [],
      developers: [],
      snapshots: [],
    });
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
