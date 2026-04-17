import type { WorkspaceData, WorkspaceSnapshot } from './types';

// ─── Demo IDs ─────────────────────────────────────────────────────────────────

const DEMO_WORKSPACE_ID = 'demo-workspace-001';
const DEMO_COPILOT_ID = 'demo-platform-copilot';
const DEMO_CURSOR_ID = 'demo-platform-cursor';
const DEMO_CHATGPT_ID = 'demo-platform-chatgpt';
const DEMO_GEMINI_ID = 'demo-platform-gemini';
const DEMO_CLAUDE_ID = 'demo-platform-claude';

// ─── Demo Data ────────────────────────────────────────────────────────────────
//
// Tuned so the ROI engine produces a realistic spread of recommendations:
//   GitHub Copilot  → Keep    (~4.1× ROI — oldest tool, proven)
//   Cursor          → Monitor (~1.9× ROI — solid but recent)
//   ChatGPT Plus    → Monitor (~1.3× ROI — borderline)
//   Gemini Advanced → Cut     (~0.7× ROI — too new, low usage)
//   Claude          → Cut     (~0.4× ROI — just adopted)
//
// Workspace: 4 devs, $55k salary, 5% velocity lift → ~$917/mo value
// Total AI spend: $596/mo → net ROI ~$321/mo, 1.54× multiple

export const DEMO_DATA: WorkspaceData & { snapshots: WorkspaceSnapshot[] } = {
  workspace: {
    id: DEMO_WORKSPACE_ID,
    user_id: 'demo-user-001',
    name: 'Momentum Engineering',
    team_size: 4,
    avg_annual_salary: 55000,
    monthly_hours: 160,
    metric_type: 'tickets',
    rolling_window: 30,
    baseline_per_dev: 20,
    ai_adoption_month: '2023-07',
    current_per_dev: 21,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  platforms: [
    {
      id: DEMO_COPILOT_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'GitHub Copilot',
      monthly_cost: 76,   // 4 seats × $19
      seats: 4,
      adopted_date: '2023-07',
      usage_percent: 45,
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_CURSOR_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Cursor',
      monthly_cost: 160,  // 4 seats × $40 (Pro)
      seats: 4,
      adopted_date: '2025-01',
      usage_percent: 30,
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_CHATGPT_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'ChatGPT Plus',
      monthly_cost: 120,  // 4 seats × $30 (Team)
      seats: 4,
      adopted_date: '2025-06',
      usage_percent: 15,
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_GEMINI_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Gemini Advanced',
      monthly_cost: 120,  // 4 seats × $30
      seats: 4,
      adopted_date: '2025-11',
      usage_percent: 6,
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_CLAUDE_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Claude',
      monthly_cost: 120,  // 4 seats × $30 (Team)
      seats: 4,
      adopted_date: '2026-02',
      usage_percent: 4,
      created_at: new Date().toISOString(),
    },
  ],
  developers: [
    {
      // Power user: Copilot + Cursor → strong lift, high leverage
      id: 'dev-001',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Alex Chen',
      baseline_tickets: 18,
      current_tickets: 21,
      platform_ids: [DEMO_COPILOT_ID, DEMO_CURSOR_ID],
      created_at: new Date().toISOString(),
    },
    {
      // Steady performer: Copilot + ChatGPT → modest lift
      id: 'dev-002',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Mia Rodríguez',
      baseline_tickets: 21,
      current_tickets: 22,
      platform_ids: [DEMO_COPILOT_ID, DEMO_CHATGPT_ID],
      created_at: new Date().toISOString(),
    },
    {
      // Struggling with new tools: Gemini + Claude → slight regression
      id: 'dev-003',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Ben Walsh',
      baseline_tickets: 22,
      current_tickets: 21,
      platform_ids: [DEMO_GEMINI_ID, DEMO_CLAUDE_ID],
      created_at: new Date().toISOString(),
    },
    {
      // Moderate: Copilot + Cursor → solid but not exceptional
      id: 'dev-004',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Priya Sharma',
      baseline_tickets: 19,
      current_tickets: 20,
      platform_ids: [DEMO_COPILOT_ID, DEMO_CURSOR_ID],
      created_at: new Date().toISOString(),
    },
  ],
  snapshots: [
    {
      id: 'snap-001',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2023-10-01T00:00:00Z',
      roi_multiple: 1.1,
      velocity_lift_pct: 2.1,
      net_monthly_value: 80,
      total_spend: 76,
    },
    {
      id: 'snap-002',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2024-06-01T00:00:00Z',
      roi_multiple: 1.3,
      velocity_lift_pct: 3.8,
      net_monthly_value: 190,
      total_spend: 236,
    },
    {
      id: 'snap-003',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2025-01-01T00:00:00Z',
      roi_multiple: 1.5,
      velocity_lift_pct: 5.0,
      net_monthly_value: 317,
      total_spend: 596,
    },
  ],
};

export const CHART_COLORS = ['#00D4FF', '#00FF94', '#6366F1', '#F59E0B', '#FF4D6D'];
