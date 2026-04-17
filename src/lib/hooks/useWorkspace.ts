import { useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAppStore } from '../store';
import type { Workspace, AIPlatform, Developer, WorkspaceSnapshot } from '../types';

// ─── Hook: load workspace on auth ─────────────────────────────────────────────

export function useWorkspace() {
  const { user, isDemoMode, setWorkspace, setPlatforms, setDevelopers, setSnapshots } = useAppStore();

  const fetchWorkspace = useCallback(async () => {
    if (!user || isDemoMode) return;

    const { data: wsData, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wsError && wsError.code !== 'PGRST116') throw wsError;
    if (!wsData) return;

    setWorkspace(wsData as Workspace);

    const [platformRes, devRes, snapshotRes] = await Promise.allSettled([
      supabase.from('ai_platforms').select('*').eq('workspace_id', wsData.id).order('created_at'),
      supabase.from('developers').select('*').eq('workspace_id', wsData.id).order('created_at'),
      supabase.from('workspace_snapshots').select('*').eq('workspace_id', wsData.id).order('recorded_at'),
    ]);

    setPlatforms(
      platformRes.status === 'fulfilled' && !platformRes.value.error
        ? (platformRes.value.data as AIPlatform[]) ?? []
        : []
    );
    setDevelopers(
      devRes.status === 'fulfilled' && !devRes.value.error
        ? (devRes.value.data as Developer[]) ?? []
        : []
    );
    setSnapshots(
      snapshotRes.status === 'fulfilled' && !snapshotRes.value.error
        ? (snapshotRes.value.data as WorkspaceSnapshot[]) ?? []
        : []
    );
  }, [user, isDemoMode, setWorkspace, setPlatforms, setDevelopers, setSnapshots]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return { refetch: fetchWorkspace };
}

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

export async function saveWorkspace(
  userId: string,
  data: Partial<Workspace>
): Promise<Workspace> {
  const { data: existing, error: lookupError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .single();

  // Only treat "no rows" (PGRST116) as expected; any other error is a real failure
  if (lookupError && lookupError.code !== 'PGRST116') throw lookupError;

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from('workspaces')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated as Workspace;
  } else {
    const { data: created, error } = await supabase
      .from('workspaces')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return created as Workspace;
  }
}

export async function savePlatforms(
  workspaceId: string,
  platforms: Partial<AIPlatform>[]
): Promise<AIPlatform[]> {
  await supabase.from('ai_platforms').delete().eq('workspace_id', workspaceId);
  if (platforms.length === 0) return [];
  const { data, error } = await supabase
    .from('ai_platforms')
    .insert(
      platforms.map(({ id: _id, created_at: _ca, ...rest }) => ({
        ...rest,
        workspace_id: workspaceId,
      }))
    )
    .select();
  if (error) throw error;
  return (data as AIPlatform[]) ?? [];
}

export async function upsertDeveloper(
  workspaceId: string,
  dev: Partial<Developer>
): Promise<Developer> {
  if (dev.id) {
    const { data, error } = await supabase
      .from('developers')
      .update({ ...dev, workspace_id: workspaceId })
      .eq('id', dev.id)
      .select()
      .single();
    if (error) throw error;
    return data as Developer;
  } else {
    const { data, error } = await supabase
      .from('developers')
      .insert({ ...dev, workspace_id: workspaceId })
      .select()
      .single();
    if (error) throw error;
    return data as Developer;
  }
}

export async function deleteDeveloper(devId: string): Promise<void> {
  const { error } = await supabase.from('developers').delete().eq('id', devId);
  if (error) throw error;
}

// ─── Snapshot CRUD ────────────────────────────────────────────────────────────

export async function saveSnapshot(
  workspaceId: string,
  metrics: { roiMultiple: number; velocityLift: number; netROI: number; totalMonthlySpend: number }
): Promise<WorkspaceSnapshot> {
  const { data, error } = await supabase
    .from('workspace_snapshots')
    .insert({
      workspace_id: workspaceId,
      roi_multiple: metrics.roiMultiple,
      velocity_lift_pct: metrics.velocityLift,
      net_monthly_value: metrics.netROI,
      total_spend: metrics.totalMonthlySpend,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkspaceSnapshot;
}

// ─── Save pending data after auth ────────────────────────────────────────────

export async function savePendingWorkspace(
  userId: string,
  workspace: Workspace,
  platforms: AIPlatform[],
  developers: Developer[]
): Promise<{ workspace: Workspace; platforms: AIPlatform[]; developers: Developer[] }> {
  const savedWorkspace = await saveWorkspace(userId, {
    name: workspace.name,
    team_size: workspace.team_size,
    avg_annual_salary: workspace.avg_annual_salary,
    monthly_hours: workspace.monthly_hours,
    metric_type: workspace.metric_type,
    rolling_window: workspace.rolling_window,
    baseline_per_dev: workspace.baseline_per_dev,
    ai_adoption_month: workspace.ai_adoption_month,
    current_per_dev: workspace.current_per_dev,
  });

  const savedPlatforms = await savePlatforms(savedWorkspace.id, platforms);

  const savedDevelopers = await Promise.all(
    developers.map((dev) => upsertDeveloper(savedWorkspace.id, { ...dev, id: undefined }))
  );

  return { workspace: savedWorkspace, platforms: savedPlatforms, developers: savedDevelopers };
}
