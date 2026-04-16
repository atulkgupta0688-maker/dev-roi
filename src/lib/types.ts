// src/lib/types.ts

export type PlatformName =
  | 'GitHub Copilot'
  | 'ChatGPT Plus'
  | 'Gemini Advanced'
  | 'Cursor'
  | 'Claude'
  | 'Other';

export type MetricType = 'tickets' | 'prs';
export type RollingWindow = 30 | 60 | 90;
export type Recommendation = 'Keep' | 'Monitor' | 'Cut';

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  team_size: number;
  avg_annual_salary: number;
  monthly_hours: number;                      // default 160
  metric_type: MetricType;                    // 'tickets' | 'prs'
  rolling_window: RollingWindow;              // 30 | 60 | 90 days
  baseline_per_dev: number | null;            // avg tickets/PRs per dev per month before AI
  ai_adoption_month: string | null;           // "YYYY-MM" — when AI tools were introduced
  current_per_dev: number | null;             // avg tickets/PRs per dev per month now
  created_at: string;
  updated_at: string;
}

export interface AIPlatform {
  id: string;
  workspace_id: string;
  name: PlatformName;
  monthly_cost: number;                       // total monthly cost (flat or seats × per_seat)
  seats: number;
  adopted_date: string;                       // "YYYY-MM"
  usage_percent: number;                      // 0–100
  created_at: string;
}

export interface Developer {
  id: string;
  workspace_id: string;
  name: string;
  baseline_tickets: number | null;
  current_tickets: number | null;
  platform_ids: string[];
  created_at: string;
}

export interface WorkspaceData {
  workspace: Workspace;
  platforms: AIPlatform[];
  developers: Developer[];
}

export interface ROIMetrics {
  totalMonthlySpend: number;
  monthlyValue: number;
  netROI: number;
  roiMultiple: number;
  velocityLift: number;
  hourlyRate: number;
  paybackWeeks: number;
}

export interface PlatformROI {
  platform: AIPlatform;
  roiIndex: number;
  recommendation: Recommendation;
  velocityAttribution: number;
  platformValue: number;
}

export interface DeveloperWithScore extends Developer {
  leverageScore: number;
  leverageStatus: { label: string; color: string };
  velocityChangePct: number;
  attributedAICost: number;
}

export interface WorkspaceSnapshot {
  id: string;
  workspace_id: string;
  recorded_at: string;                        // ISO date string
  roi_multiple: number;
  velocity_lift_pct: number;
  net_monthly_value: number;
  total_spend: number;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    is_manager?: boolean;
  };
}
