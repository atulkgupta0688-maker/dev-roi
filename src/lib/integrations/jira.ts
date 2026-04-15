import type { JiraProject, VelocityResult } from './types';
import { calcVelocity } from './linear';
import { supabase } from '../supabase';

// ─── Jira calls go through a Supabase Edge Function to avoid CORS ─────────────
// Deploy: supabase functions deploy jira-proxy

async function jiraProxy(domain: string, email: string, apiToken: string, path: string) {
  const { data, error } = await supabase.functions.invoke('jira-proxy', {
    body: { domain, email, apiToken, path },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function testJiraConnection(
  domain: string,
  email: string,
  apiToken: string
): Promise<string> {
  const data = await jiraProxy(domain, email, apiToken, '/myself');
  return data.displayName ?? data.emailAddress ?? email;
}

export async function getJiraProjects(
  domain: string,
  email: string,
  apiToken: string
): Promise<JiraProject[]> {
  const data = await jiraProxy(domain, email, apiToken, '/project/search?maxResults=50&orderBy=name');
  return (data.values ?? []).map((p: { id: string; key: string; name: string }) => ({
    id: p.id,
    key: p.key,
    name: p.name,
  }));
}

export async function getJiraVelocity(
  domain: string,
  email: string,
  apiToken: string,
  projectKey: string,
  from: Date,
  to: Date
): Promise<VelocityResult> {
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const jql = `project = "${projectKey}" AND status = Done AND resolutiondate >= "${fromStr}" AND resolutiondate <= "${toStr}"`;
  const fields = 'assignee,resolutiondate';

  let startAt = 0;
  const allIssues: Array<{ fields: { assignee?: { displayName: string }; resolutiondate: string } }> = [];

  while (true) {
    const data = await jiraProxy(
      domain, email, apiToken,
      `/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100&startAt=${startAt}`
    );
    allIssues.push(...data.issues);
    if (allIssues.length >= data.total || data.issues.length === 0) break;
    startAt += 100;
  }

  return calcVelocity(
    allIssues.map((i) => ({
      dev: i.fields.assignee?.displayName ?? 'Unassigned',
      date: i.fields.resolutiondate,
    })),
    from,
    to
  );
}
