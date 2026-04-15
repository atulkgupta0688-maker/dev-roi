import type { LinearTeam, VelocityResult } from './types';

const GQL = 'https://api.linear.app/graphql';

async function gql(apiKey: string, query: string, variables?: object) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear API returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function testLinearConnection(apiKey: string): Promise<string> {
  const data = await gql(apiKey, `query { viewer { name email } }`);
  return data.viewer.name ?? data.viewer.email;
}

export async function getLinearTeams(apiKey: string): Promise<LinearTeam[]> {
  const data = await gql(
    apiKey,
    `query {
      teams {
        nodes {
          id
          name
          members { nodes { id } }
        }
      }
    }`
  );
  return data.teams.nodes.map((t: { id: string; name: string; members: { nodes: unknown[] } }) => ({
    id: t.id,
    name: t.name,
    memberCount: t.members.nodes.length,
  }));
}

export async function getLinearVelocity(
  apiKey: string,
  teamId: string,
  from: Date,
  to: Date
): Promise<VelocityResult> {
  // Fetch in batches of 250 (Linear's max)
  let after: string | null = null;
  const allIssues: Array<{ assignee: { name: string } | null; completedAt: string }> = [];

  while (true) {
    const data = await gql(
      apiKey,
      `query($teamId: ID!, $after: DateTime!, $before: DateTime!, $cursor: String) {
        issues(
          filter: {
            team: { id: { eq: $teamId } }
            completedAt: { gte: $after, lte: $before }
            state: { type: { eq: "completed" } }
          }
          first: 250
          after: $cursor
        ) {
          nodes { assignee { name } completedAt }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {
        teamId,
        after: from.toISOString(),
        before: to.toISOString(),
        cursor: after,
      }
    );

    allIssues.push(...data.issues.nodes);
    if (!data.issues.pageInfo.hasNextPage) break;
    after = data.issues.pageInfo.endCursor;
  }

  return calcVelocity(
    allIssues.map((i) => ({ dev: i.assignee?.name ?? 'Unassigned', date: i.completedAt })),
    from,
    to
  );
}

// ─── Shared velocity calculator ───────────────────────────────────────────────

export function calcVelocity(
  tickets: Array<{ dev: string; date: string }>,
  from: Date,
  to: Date
): VelocityResult {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;

  const byDev: Record<string, number> = {};
  for (const t of tickets) {
    byDev[t.dev] = (byDev[t.dev] ?? 0) + 1;
  }

  const devBreakdown = Object.entries(byDev)
    .map(([name, tickets]) => ({ name, tickets }))
    .sort((a, b) => b.tickets - a.tickets);

  const uniqueDevs = devBreakdown.filter((d) => d.name !== 'Unassigned').length || 1;
  const totalTickets = tickets.length;
  const avgTicketsPerDevPerMonth = totalTickets / uniqueDevs / Math.max(months, 1);

  return { totalTickets, uniqueDevs, avgTicketsPerDevPerMonth, months, devBreakdown };
}
