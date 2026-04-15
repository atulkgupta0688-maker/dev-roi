import type { WorkspaceData, VelocityDataPoint } from './types';

// ─── Demo Workspace ───────────────────────────────────────────────────────────

const DEMO_WORKSPACE_ID = 'demo-workspace-001';
const DEMO_CLAUDE_ID = 'demo-platform-claude';
const DEMO_COPILOT_ID = 'demo-platform-copilot';
const DEMO_CHATGPT_ID = 'demo-platform-chatgpt';

export const DEMO_DATA: WorkspaceData = {
  workspace: {
    id: DEMO_WORKSPACE_ID,
    user_id: 'demo-user-001',
    name: 'Acme Engineering',
    team_size: 8,
    avg_annual_salary: 130000,
    monthly_hours: 160,
    baseline_start: '2024-01',
    baseline_end: '2024-06',
    baseline_tickets_per_dev: 11,
    baseline_story_points: 34,
    current_tickets_per_dev: 16,
    current_story_points: 49,
    current_period_start: '2024-07',
    current_period_end: '2024-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  platforms: [
    {
      id: DEMO_CLAUDE_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Claude',
      monthly_cost: 800,
      seats: 8,
      adopted_date: '2024-07',
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_COPILOT_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'GitHub Copilot',
      monthly_cost: 400,
      seats: 8,
      adopted_date: '2024-07',
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_CHATGPT_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'ChatGPT',
      monthly_cost: 600,
      seats: 8,
      adopted_date: '2024-09',
      created_at: new Date().toISOString(),
    },
  ],
  developers: [
    {
      id: 'dev-001',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Arjun Mehta',
      baseline_tickets: 10,
      current_tickets: 17,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-002',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Sara Kim',
      baseline_tickets: 12,
      current_tickets: 19,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID, DEMO_CHATGPT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-003',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Dev Patel',
      baseline_tickets: 11,
      current_tickets: 12,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID, DEMO_CHATGPT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-004',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Priya Nair',
      baseline_tickets: 9,
      current_tickets: 16,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-005',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Tom Walsh',
      baseline_tickets: 13,
      current_tickets: 14,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-006',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Zara Ahmed',
      baseline_tickets: 10,
      current_tickets: 18,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-007',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Lucas Ferreira',
      baseline_tickets: 11,
      current_tickets: 17,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID, DEMO_CHATGPT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-008',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Ming Chen',
      baseline_tickets: 12,
      current_tickets: 20,
      platform_ids: [DEMO_CLAUDE_ID, DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
  ],
};

// ─── Fixed Velocity Chart Data ────────────────────────────────────────────────
// Pre-computed for demo to ensure consistent, realistic-looking chart

export const DEMO_VELOCITY_DATA: VelocityDataPoint[] = [
  { month: "Jan '24", yearMonth: '2024-01', tickets: 85,  baseline: 88, isBaseline: true },
  { month: "Feb '24", yearMonth: '2024-02', tickets: 90,  baseline: 88, isBaseline: true },
  { month: "Mar '24", yearMonth: '2024-03', tickets: 87,  baseline: 88, isBaseline: true },
  { month: "Apr '24", yearMonth: '2024-04', tickets: 91,  baseline: 88, isBaseline: true },
  { month: "May '24", yearMonth: '2024-05', tickets: 86,  baseline: 88, isBaseline: true },
  { month: "Jun '24", yearMonth: '2024-06', tickets: 89,  baseline: 88, isBaseline: true },
  { month: "Jul '24", yearMonth: '2024-07', tickets: 101, baseline: 88, isBaseline: false },
  { month: "Aug '24", yearMonth: '2024-08', tickets: 119, baseline: 88, isBaseline: false },
  { month: "Sep '24", yearMonth: '2024-09', tickets: 126, baseline: 88, isBaseline: false },
  { month: "Oct '24", yearMonth: '2024-10', tickets: 129, baseline: 88, isBaseline: false },
  { month: "Nov '24", yearMonth: '2024-11', tickets: 132, baseline: 88, isBaseline: false },
  { month: "Dec '24", yearMonth: '2024-12', tickets: 135, baseline: 88, isBaseline: false },
];

// ─── Session Storage Helpers ──────────────────────────────────────────────────

export function saveDemoToSession(): void {
  sessionStorage.setItem('devroi_demo_mode', 'true');
  sessionStorage.setItem('devroi_demo_data', JSON.stringify(DEMO_DATA));
}

export function loadDemoFromSession(): WorkspaceData | null {
  const data = sessionStorage.getItem('devroi_demo_data');
  if (!data) return null;
  try {
    return JSON.parse(data) as WorkspaceData;
  } catch {
    return null;
  }
}

export function isDemoSession(): boolean {
  return sessionStorage.getItem('devroi_demo_mode') === 'true';
}

export function clearDemoSession(): void {
  sessionStorage.removeItem('devroi_demo_mode');
  sessionStorage.removeItem('devroi_demo_data');
}

// ─── Platform Colors ──────────────────────────────────────────────────────────

export const PLATFORM_COLORS: Record<string, string> = {
  Claude: '#CC785C',
  ChatGPT: '#10A37F',
  'GitHub Copilot': '#6E40C9',
  Gemini: '#4285F4',
  Cursor: '#1A1A2E',
  Other: '#6B7280',
};

export const PLATFORM_ICONS: Record<string, string> = {
  Claude: 'C',
  ChatGPT: 'G',
  'GitHub Copilot': 'Co',
  Gemini: 'Ge',
  Cursor: 'Cu',
  Other: '?',
};

export const CHART_COLORS = ['#00D4FF', '#00FF94', '#CC785C', '#6E40C9', '#10A37F'];
