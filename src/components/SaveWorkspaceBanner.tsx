import { useAppStore } from '../lib/store';

export function SaveWorkspaceBanner() {
  const { user, isDemoMode, hasPendingData, setAuthModalOpen } = useAppStore();

  if (user || isDemoMode || !hasPendingData) return null;

  return (
    <div className="mb-6 flex items-center justify-between bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">Save your workspace</p>
        <p className="text-xs text-white/50 mt-0.5">
          Create a free account to save these results and track ROI month over month.
        </p>
      </div>
      <button
        onClick={() => setAuthModalOpen(true, 'signup')}
        className="btn-primary text-sm px-4 py-2 flex-shrink-0 ml-4"
      >
        Save results
      </button>
    </div>
  );
}
