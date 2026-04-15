import type { GitHubRepo, VelocityResult } from './types';
import { calcVelocity } from './linear';

const BASE = 'https://api.github.com';

async function gh(token: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 401) throw new Error('Invalid GitHub token');
  if (res.status === 403) throw new Error('GitHub rate limit hit or insufficient permissions');
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  return res.json();
}

export async function testGitHubConnection(token: string): Promise<string> {
  const user = await gh(token, '/user');
  return user.login;
}

export async function getGitHubRepos(token: string, owner: string): Promise<GitHubRepo[]> {
  // Try org repos first, fall back to user repos
  try {
    const repos = await gh(token, `/orgs/${owner}/repos?per_page=50&sort=updated&type=all`);
    return repos;
  } catch {
    const repos = await gh(token, `/users/${owner}/repos?per_page=50&sort=updated`);
    return repos;
  }
}

export async function getGitHubVelocity(
  token: string,
  owner: string,
  repo: string,
  from: Date,
  to: Date
): Promise<VelocityResult> {
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  // Search for merged PRs in the date range
  const query = `repo:${owner}/${repo} is:pr is:merged merged:${fromStr}..${toStr}`;

  let page = 1;
  const allPRs: Array<{ user: { login: string }; merged_at: string }> = [];

  while (page <= 10) {
    const data = await gh(
      token,
      `/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`
    );
    allPRs.push(...data.items);
    if (allPRs.length >= data.total_count || data.items.length === 0) break;
    page++;
    // GitHub search API rate limit: add a small delay
    await new Promise((r) => setTimeout(r, 250));
  }

  // Also count issues closed in the same period as a supplementary metric
  const issueQuery = `repo:${owner}/${repo} is:issue is:closed closed:${fromStr}..${toStr}`;
  const issueData = await gh(
    token,
    `/search/issues?q=${encodeURIComponent(issueQuery)}&per_page=100`
  );

  const allItems = [
    ...allPRs.map((pr) => ({ dev: pr.user?.login ?? 'unknown', date: pr.merged_at })),
    ...issueData.items.map((i: { user: { login: string }; closed_at: string }) => ({
      dev: i.user?.login ?? 'unknown',
      date: i.closed_at,
    })),
  ];

  return calcVelocity(allItems, from, to);
}
