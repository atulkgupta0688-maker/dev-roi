import { supabase } from '../supabase';
import type { Integration, IntegrationProvider } from './types';

export async function getIntegrations(workspaceId: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Integration[];
}

export async function upsertIntegration(
  workspaceId: string,
  provider: IntegrationProvider,
  config: object
): Promise<Integration> {
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .single();

  if (existing?.id) {
    const { data, error } = await supabase
      .from('integrations')
      .update({ config })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as Integration;
  } else {
    const { data, error } = await supabase
      .from('integrations')
      .insert({ workspace_id: workspaceId, provider, config })
      .select()
      .single();
    if (error) throw error;
    return data as Integration;
  }
}

export async function deleteIntegration(workspaceId: string, provider: IntegrationProvider) {
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('provider', provider);
  if (error) throw error;
}

export async function touchSyncTime(integrationId: string) {
  await supabase
    .from('integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', integrationId);
}
