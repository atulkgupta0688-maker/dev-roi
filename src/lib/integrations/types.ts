export type IntegrationProvider = 'jira' | 'linear' | 'github';

export interface JiraConfig {
  domain: string;       // e.g. "mycompany.atlassian.net"
  email: string;
  apiToken: string;
  projectKey?: string;  // selected after connecting
}

export interface LinearConfig {
  apiKey: string;
  teamId?: string;      // selected after connecting
  teamName?: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;        // org or username
  repo?: string;        // selected after connecting
}

export interface Integration {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  config: JiraConfig | LinearConfig | GitHubConfig;
  last_synced_at: string | null;
  created_at: string;
}

// Normalised velocity result returned by every integration
export interface VelocityResult {
  totalTickets: number;
  uniqueDevs: number;
  avgTicketsPerDevPerMonth: number;
  months: number;
  devBreakdown: Array<{ name: string; tickets: number }>;
}

// Linear
export interface LinearTeam {
  id: string;
  name: string;
  memberCount: number;
}

// GitHub
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

// Jira
export interface JiraProject {
  id: string;
  key: string;
  name: string;
}
