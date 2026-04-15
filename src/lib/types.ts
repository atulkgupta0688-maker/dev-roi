export type PlatformName = 'Claude' | 'ChatGPT' | 'GitHub Copilot' | 'Gemini' | 'Cursor' | 'Other';

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  team_size: number;
  avg_annual_salary: number;
  monthly_hours: number;
  baseline_start: string | null;   // "YYYY-MM"
  baseline_end: string | null;     // "YYYY-MM"
  baseline_tickets_per_dev: number | null;
  baseline_story_points: number | null;
  current_tickets_per_dev: number | null;
  current_story_points: number | null;
  current_period_start: string | null; // "YYYY-MM"
  current_period_end: string | null;   // "YYYY-MM"
  created_at: string;
  updated_at: string;
}

export interface AIPlatform {
  id: string;
  workspace_id: string;
  name: PlatformName;
  monthly_cost: number;
  seats: number;
  adopted_date: string; // "YYYY-MM"
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
  recommendation: 'Strong ROI' | 'Monitor' | 'Consider removing';
  velocityAttribution: number;
  platformValue: number;
}

export interface VelocityDataPoint {
  month: string;       // "Jan '24" for display
  yearMonth: string;   // "2024-01" for comparison
  tickets: number;
  baseline: number;
  isBaseline: boolean;
}

export interface CostPerTicketPoint {
  month: string;
  costPerTicket: number;
  baselineRef: number;
}

export interface DeveloperWithScore extends Developer {
  leverageScore: number;
  leverageStatus: { label: string; color: string };
  velocityChangePct: number;
  attributedAICost: number;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    is_manager?: boolean;
  };
}

export interface Insight {
  title: string;
  body: string;
  metric: string;
  type: 'positive' | 'warning' | 'info';
}
