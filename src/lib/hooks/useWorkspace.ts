import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAppStore } from '../store';
import type { Workspace, AIPlatform, Developer } from '../types';

export function useWorkspace() {
  const { user, isDemoMode, setWorkspace, setPlatforms, setDevelopers } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!user || isDemoMode) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch workspace
      const { data: wsData, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (wsError && wsError.code !== 'PGRST116') throw wsError;
      if (!wsData) {
        setLoading(false);
        return;
      }

      setWorkspace(wsData as Workspace);

      // Fetch platforms
      const { data: platformData, error: platformError } = await supabase
        .from('ai_platforms')
        .select('*')
        .eq('workspace_id', wsData.id)
        .order('created_at', { ascending: true });

      if (platformError) throw platformError;
      setPlatforms((platformData as AIPlatform[]) ?? []);

      // Fetch developers
      const { data: devData, error: devError } = await supabase
        .from('developers')
        .select('*')
        .eq('workspace_id', wsData.id)
        .order('created_at', { ascending: true });

      if (devError) throw devError;
      setDevelopers((devData as Developer[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode, setWorkspace, setPlatforms, setDevelopers]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return { loading, error, refetch: fetchWorkspace };
}

export async function saveWorkspace(
  userId: string,
  data: Partial<Workspace>
): Promise<Workspace | null> {
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .single();

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
  // Delete existing and re-insert
  await supabase.from('ai_platforms').delete().eq('workspace_id', workspaceId);

  if (platforms.length === 0) return [];

  const { data, error } = await supabase
    .from('ai_platforms')
    .insert(platforms.map((p) => ({ ...p, workspace_id: workspaceId })))
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
