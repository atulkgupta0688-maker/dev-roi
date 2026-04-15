import type {
  Workspace,
  AIPlatform,
  Developer,
  WorkspaceData,
  ROIMetrics,
  PlatformROI,
  DeveloperWithScore,
  WorkspaceSnapshot,
  Recommendation,
} from './types';

// ─── Core Calculations ────────────────────────────────────────────────────────

export function calculateVelocityLift(baseline: number, current: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function calculateHourlyRate(annualSalary: number, monthlyHours: number): number {
  if (monthlyHours === 0) return 0;
  return annualSalary / 12 / monthlyHours;
}

export function calculateMonthlyValue(
  velocityLiftPct: number,
  teamSize: number,
  hourlyRate: number,
  monthlyHours: number
): number {
  return (velocityLiftPct / 100) * teamSize * hourlyRate * monthlyHours;
}

export function calculatePaybackWeeks(monthlyValue: number, monthlySpend: number): number {
  if (monthlyValue <= 0) return 999;
  return (monthlySpend / monthlyValue) * 4.33;
}

export function getRecommendation(roiIndex: number): Recommendation {
  if (roiIndex > 2) return 'Keep';
  if (roiIndex >= 0.8) return 'Monitor';
  return 'Cut';
}

// ─── Composite Metrics ────────────────────────────────────────────────────────

export function calculateROIMetrics(data: WorkspaceData): ROIMetrics {
  const { workspace, platforms } = data;

  const baseline = workspace.baseline_per_dev ?? 0;
  const current = workspace.current_per_dev ?? 0;

  const velocityLift = calculateVelocityLift(baseline, current);
  const hourlyRate = calculateHourlyRate(workspace.avg_annual_salary, workspace.monthly_hours);
  const monthlyValue = calculateMonthlyValue(
    velocityLift,
    workspace.team_size,
    hourlyRate,
    workspace.monthly_hours
  );
  const totalMonthlySpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);
  const netROI = monthlyValue - totalMonthlySpend;
  const roiMultiple = totalMonthlySpend > 0 ? monthlyValue / totalMonthlySpend : 0;
  const paybackWeeks = calculatePaybackWeeks(monthlyValue, totalMonthlySpend);

  return {
    totalMonthlySpend,
    monthlyValue,
    netROI,
    roiMultiple,
    velocityLift,
    hourlyRate,
    paybackWeeks,
  };
}

// ─── Platform Attribution ─────────────────────────────────────────────────────

function parseYearMonth(ym: string): Date {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function monthsBetween(start: Date, end: Date): number {
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
  );
}

export function calculatePlatformROIs(data: WorkspaceData): PlatformROI[] {
  const { workspace, platforms } = data;
  const metrics = calculateROIMetrics(data);

  if (platforms.length === 0) return [];

  const adoptionStart = workspace.ai_adoption_month
    ? parseYearMonth(workspace.ai_adoption_month)
    : new Date();
  const now = new Date();

  const platformMonths = platforms.map((p) => {
    const adopted = parseYearMonth(p.adopted_date);
    const monthsActive = Math.max(0, monthsBetween(adopted, now) + 1);
    const monthsSinceAdoption = Math.max(0, monthsBetween(adoptionStart, now) + 1);
    return { platform: p, monthsActive: Math.min(monthsActive, monthsSinceAdoption) };
  });

  const totalWeighted = platformMonths.reduce(
    (sum, pm) => sum + pm.platform.monthly_cost * pm.monthsActive,
    0
  );

  return platforms
    .map((p) => {
      const pm = platformMonths.find((x) => x.platform.id === p.id)!;
      const weighted = p.monthly_cost * pm.monthsActive;
      const attribution = totalWeighted > 0 ? weighted / totalWeighted : 1 / platforms.length;
      const platformValue = metrics.monthlyValue * attribution;
      const roiIndex = p.monthly_cost > 0 ? platformValue / p.monthly_cost : 0;

      return {
        platform: p,
        roiIndex,
        recommendation: getRecommendation(roiIndex),
        velocityAttribution: attribution * 100,
        platformValue,
      };
    })
    .sort((a, b) => b.roiIndex - a.roiIndex);
}

// ─── Developer Leverage ───────────────────────────────────────────────────────

function getLeverageStatus(score: number): { label: string; color: string } {
  if (score > 30) return { label: 'High leverage', color: '#00FF94' };
  if (score >= 10) return { label: 'On track', color: 'rgba(255,255,255,0.5)' };
  return { label: 'Low leverage', color: '#F59E0B' };
}

export function enrichDevelopers(
  devs: Developer[],
  workspace: Workspace,
  platforms: AIPlatform[]
): DeveloperWithScore[] {
  return devs.map((dev) => {
    const baseline = dev.baseline_tickets ?? 0;
    const current = dev.current_tickets ?? 0;
    const velocityChangePct = baseline > 0 ? calculateVelocityLift(baseline, current) : 0;

    const devPlatforms = platforms.filter((p) => dev.platform_ids.includes(p.id));
    const attributedAICost = devPlatforms.reduce(
      (sum, p) => sum + p.monthly_cost / Math.max(p.seats, 1),
      0
    );

    const monthlySalaryCost = workspace.avg_annual_salary / 12;
    const velocityChangeFraction = baseline > 0 ? (current - baseline) / baseline : 0;
    const leverageScore =
      attributedAICost > 0
        ? velocityChangeFraction / (attributedAICost / monthlySalaryCost)
        : 0;

    return {
      ...dev,
      leverageScore,
      leverageStatus: getLeverageStatus(leverageScore),
      velocityChangePct,
      attributedAICost,
    };
  });
}

// ─── What-if Simulator ────────────────────────────────────────────────────────

export function calculateWhatIf(
  data: WorkspaceData,
  disabledPlatformIds: Set<string>
): ROIMetrics {
  const activePlatforms = data.platforms.filter((p) => !disabledPlatformIds.has(p.id));
  return calculateROIMetrics({ ...data, platforms: activePlatforms });
}

// ─── Snapshot Helper ──────────────────────────────────────────────────────────

export function getSnapshotFromMetrics(
  workspaceId: string,
  metrics: ROIMetrics
): Omit<WorkspaceSnapshot, 'id' | 'recorded_at'> {
  return {
    workspace_id: workspaceId,
    roi_multiple: metrics.roiMultiple,
    velocity_lift_pct: metrics.velocityLift,
    net_monthly_value: metrics.netROI,
    total_spend: metrics.totalMonthlySpend,
  };
}
