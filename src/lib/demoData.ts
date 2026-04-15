import type { WorkspaceData, WorkspaceSnapshot } from './types';

const DEMO_WORKSPACE_ID = 'demo-workspace-001';
const DEMO_COPILOT_ID = 'demo-platform-copilot';
const DEMO_CHATGPT_ID = 'demo-platform-chatgpt';
const DEMO_GEMINI_ID = 'demo-platform-gemini';

export const DEMO_DATA: WorkspaceData & { snapshots: WorkspaceSnapshot[] } = {
  workspace: {
    id: DEMO_WORKSPACE_ID,
    user_id: 'demo-user-001',
    name: 'Acme Engineering',
    team_size: 8,
    avg_annual_salary: 130000,
    monthly_hours: 160,
    metric_type: 'tickets',
    rolling_window: 30,
    baseline_per_dev: 11,
    ai_adoption_month: '2024-07',
    current_per_dev: 16,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  platforms: [
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
      name: 'ChatGPT Plus',
      monthly_cost: 200,
      seats: 8,
      adopted_date: '2024-07',
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_GEMINI_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Gemini Advanced',
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
      platform_ids: [DEMO_COPILOT_ID, DEMO_CHATGPT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-002',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Sara Kim',
      baseline_tickets: 12,
      current_tickets: 20,
      platform_ids: [DEMO_COPILOT_ID, DEMO_CHATGPT_ID, DEMO_GEMINI_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-003',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Dev Patel',
      baseline_tickets: 11,
      current_tickets: 15,
      platform_ids: [DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-004',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Jamie Torres',
      baseline_tickets: 9,
      current_tickets: 10,
      platform_ids: [DEMO_GEMINI_ID],
      created_at: new Date().toISOString(),
    },
  ],
  snapshots: [
    {
      id: 'snap-001',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2024-08-01T00:00:00Z',
      roi_multiple: 2.1,
      velocity_lift_pct: 18,
      net_monthly_value: 3200,
      total_spend: 600,
    },
    {
      id: 'snap-002',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2024-10-01T00:00:00Z',
      roi_multiple: 2.8,
      velocity_lift_pct: 27,
      net_monthly_value: 4100,
      total_spend: 1200,
    },
    {
      id: 'snap-003',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2025-01-01T00:00:00Z',
      roi_multiple: 3.2,
      velocity_lift_pct: 45,
      net_monthly_value: 6200,
      total_spend: 1200,
    },
  ],
};

export const CHART_COLORS = ['#00D4FF', '#00FF94', '#6366F1', '#F59E0B', '#FF4D6D'];

const SESSION_KEY = 'dev-roi-demo';

export function saveDemoToSession(): void {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isDemoSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function loadDemoFromSession(): typeof DEMO_DATA | null {
  return isDemoSession() ? DEMO_DATA : null;
}
