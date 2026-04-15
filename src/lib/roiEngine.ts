import type {
  Workspace,
  AIPlatform,
  Developer,
  WorkspaceData,
  ROIMetrics,
  PlatformROI,
  VelocityDataPoint,
  CostPerTicketPoint,
  DeveloperWithScore,
  Insight,
} from './types';

// ─── Core Calculation Functions ───────────────────────────────────────────────

export function calculateVelocityLift(baselineTickets: number, currentTickets: number): number {
  if (baselineTickets === 0) return 0;
  return ((currentTickets - baselineTickets) / baselineTickets) * 100;
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

export function calculateROIIndex(
  platformCost: number,
  totalPlatformCost: number,
  monthlyValue: number
): number {
  if (platformCost === 0 || totalPlatformCost === 0) return 0;
  return (monthlyValue * (platformCost / totalPlatformCost)) / platformCost;
}

export function calculateCostPerTicket(totalAICost: number, totalTicketsClosed: number): number {
  if (totalTicketsClosed === 0) return 0;
  return totalAICost / totalTicketsClosed;
}

export function calculatePaybackWeeks(monthlyValue: number, monthlySpend: number): number {
  if (monthlyValue <= 0) return 999;
  return (monthlySpend / monthlyValue) * 4.33;
}

export function getRecommendation(
  roiIndex: number
): 'Strong ROI' | 'Monitor' | 'Consider removing' {
  if (roiIndex > 2) return 'Strong ROI';
  if (roiIndex >= 0.8) return 'Monitor';
  return 'Consider removing';
}

// ─── Composite Metrics ────────────────────────────────────────────────────────

export function calculateROIMetrics(data: WorkspaceData): ROIMetrics {
  const { workspace, platforms } = data;

  const baseline = workspace.baseline_tickets_per_dev ?? 0;
  const current = workspace.current_tickets_per_dev ?? 0;

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

  const periodStart = workspace.current_period_start
    ? parseYearMonth(workspace.current_period_start)
    : new Date();
  const periodEnd = workspace.current_period_end
    ? parseYearMonth(workspace.current_period_end)
    : new Date();

  const totalPeriodMonths = monthsBetween(periodStart, periodEnd) + 1;

  const platformMonths = platforms.map((p) => {
    const adopted = parseYearMonth(p.adopted_date);
    const monthsActive = Math.min(
      totalPeriodMonths,
      Math.max(0, totalPeriodMonths - monthsBetween(periodStart, adopted))
    );
    return { platform: p, monthsActive };
  });

  const totalWeighted = platformMonths.reduce(
    (sum, pm) => sum + pm.platform.monthly_cost * pm.monthsActive,
    0
  );

  return platforms.map((p) => {
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
  });
}

// ─── Developer Leverage ───────────────────────────────────────────────────────

export function calculateDeveloperLeverageScore(
  dev: Developer,
  workspace: Workspace,
  platforms: AIPlatform[]
): number {
  if (!dev.baseline_tickets || !dev.current_tickets || dev.baseline_tickets === 0) return 0;

  const velocityChangeFraction =
    (dev.current_tickets - dev.baseline_tickets) / dev.baseline_tickets;
  const monthlySalaryCost = workspace.avg_annual_salary / 12;

  const devPlatforms = platforms.filter((p) => dev.platform_ids.includes(p.id));
  const attributedAICost = devPlatforms.reduce((sum, p) => {
    return sum + p.monthly_cost / Math.max(p.seats, 1);
  }, 0);

  if (attributedAICost === 0) return 0;
  return velocityChangeFraction / (attributedAICost / monthlySalaryCost);
}

export function getLeverageStatus(score: number): { label: string; color: string } {
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
    const leverageScore = calculateDeveloperLeverageScore(dev, workspace, platforms);
    const leverageStatus = getLeverageStatus(leverageScore);
    const velocityChangePct =
      dev.baseline_tickets && dev.baseline_tickets > 0
        ? calculateVelocityLift(dev.baseline_tickets, dev.current_tickets ?? 0)
        : 0;
    const devPlatforms = platforms.filter((p) => dev.platform_ids.includes(p.id));
    const attributedAICost = devPlatforms.reduce(
      (sum, p) => sum + p.monthly_cost / Math.max(p.seats, 1),
      0
    );

    return { ...dev, leverageScore, leverageStatus, velocityChangePct, attributedAICost };
  });
}

// ─── Chart Data Generators ────────────────────────────────────────────────────

export function generateVelocityChartData(
  workspace: Workspace,
  fixedData?: VelocityDataPoint[]
): VelocityDataPoint[] {
  if (fixedData) return fixedData;
  if (!workspace.baseline_start || !workspace.baseline_tickets_per_dev) return [];

  const teamSize = workspace.team_size;
  const baselineTotal = Math.round(workspace.baseline_tickets_per_dev * teamSize);
  const currentTotal = Math.round(
    (workspace.current_tickets_per_dev ?? workspace.baseline_tickets_per_dev) * teamSize
  );

  const startDate = parseYearMonth(workspace.baseline_start);
  const endDate = workspace.current_period_end
    ? parseYearMonth(workspace.current_period_end)
    : new Date();
  const baselineEndDate = workspace.baseline_end
    ? parseYearMonth(workspace.baseline_end)
    : startDate;
  const currentStartDate = workspace.current_period_start
    ? parseYearMonth(workspace.current_period_start)
    : new Date(baselineEndDate.getFullYear(), baselineEndDate.getMonth() + 1, 1);

  const data: VelocityDataPoint[] = [];
  let cur = new Date(startDate);

  while (cur <= endDate) {
    const yearMonth = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const month = cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const isBaseline = cur <= baselineEndDate;
    const isCurrent = cur >= currentStartDate;
    // Gap months between periods: carry the baseline value but mark not-baseline
    // so the chart shows a flat bridge rather than a hole
    const tickets = isBaseline ? baselineTotal : isCurrent ? currentTotal : baselineTotal;

    data.push({ month, yearMonth, tickets, baseline: baselineTotal, isBaseline });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return data;
}

export function generateCostPerTicketData(
  workspace: Workspace,
  platforms: AIPlatform[],
  velocityData: VelocityDataPoint[]
): CostPerTicketPoint[] {
  const hourlyRate = calculateHourlyRate(workspace.avg_annual_salary, workspace.monthly_hours);
  const hoursPerTicket =
    workspace.monthly_hours / (workspace.baseline_tickets_per_dev ?? 1);
  const baselineCostPerTicket = Math.round(hourlyRate * hoursPerTicket);

  return velocityData
    .filter((d) => !d.isBaseline)
    .map((d) => {
      const monthSpend = platforms.reduce((sum, p) => {
        const adoptedDate = parseYearMonth(p.adopted_date);
        const dataDate = parseYearMonth(d.yearMonth);
        return sum + (dataDate >= adoptedDate ? p.monthly_cost : 0);
      }, 0);

      return {
        month: d.month,
        costPerTicket: d.tickets > 0 ? Math.round(monthSpend / d.tickets) : 0,
        baselineRef: baselineCostPerTicket,
      };
    });
}

// ─── Insights Generator ───────────────────────────────────────────────────────

export function generateInsights(data: WorkspaceData): Insight[] {
  const { workspace, platforms } = data;

  if (!workspace.baseline_tickets_per_dev || !workspace.current_tickets_per_dev || platforms.length === 0) {
    return [
      {
        title: 'Setup Required',
        metric: '—',
        body: 'Complete the setup wizard to unlock AI-powered insights. We need your baseline and current metrics to run the analysis.',
        type: 'info',
      },
      {
        title: 'Add AI Platforms',
        metric: '—',
        body: "Tell us which AI tools your team uses and what you pay for them. We'll attribute ROI by adoption date and seat cost.",
        type: 'info',
      },
    ];
  }

  const metrics = calculateROIMetrics(data);
  const platformROIs = calculatePlatformROIs(data);
  const insights: Insight[] = [];

  // ── 1. Phantom headcount ──────────────────────────────────────────────────
  const phantomDevs = (metrics.velocityLift / 100) * workspace.team_size;
  const phantomAnnualCost = Math.round(phantomDevs * workspace.avg_annual_salary);
  if (metrics.velocityLift > 0) {
    insights.push({
      title: 'Phantom Headcount Effect',
      metric: `+${phantomDevs.toFixed(1)} FTE`,
      body: `Your AI stack is producing the equivalent output of ${phantomDevs.toFixed(1)} additional developers — capacity worth $${phantomAnnualCost.toLocaleString()}/yr to hire, onboard, and retain.`,
      type: 'positive',
    });
  } else {
    insights.push({
      title: 'No Velocity Lift Yet',
      metric: '0% lift',
      body: "Velocity hasn't improved since adopting AI tools. Run an adoption audit to check whether the team is actively using the platforms you're paying for.",
      type: 'warning',
    });
  }

  // ── 2. Cost-per-ticket efficiency ─────────────────────────────────────────
  const baselineMonthlyCostPerDev = workspace.avg_annual_salary / 12;
  const baselineCPT = Math.round(baselineMonthlyCostPerDev / workspace.baseline_tickets_per_dev);
  const aiCostPerDev = metrics.totalMonthlySpend / workspace.team_size;
  const currentCPT = Math.round(
    (baselineMonthlyCostPerDev + aiCostPerDev) / workspace.current_tickets_per_dev
  );
  const cptReduction = Math.round(((baselineCPT - currentCPT) / baselineCPT) * 100);

  if (cptReduction > 0) {
    insights.push({
      title: 'Cost Per Shipped Ticket',
      metric: `-${cptReduction}% per unit`,
      body: `Before AI: $${baselineCPT.toLocaleString()} per ticket. After AI: $${currentCPT.toLocaleString()} per ticket. Each unit of work now costs ${cptReduction}% less to deliver — even after factoring in platform fees.`,
      type: 'positive',
    });
  } else {
    insights.push({
      title: 'Cost Per Shipped Ticket',
      metric: `$${currentCPT.toLocaleString()}/ticket`,
      body: `Your cost per ticket is $${currentCPT.toLocaleString()} vs a $${baselineCPT.toLocaleString()} baseline. Velocity needs to increase further to offset platform costs at the per-ticket level.`,
      type: 'warning',
    });
  }

  // ── 3. Annual net return vs. headcount ────────────────────────────────────
  const annualNet = Math.round(metrics.netROI * 12);
  const annualValue = Math.round(metrics.monthlyValue * 12);
  const fractionOfHire = (annualNet / workspace.avg_annual_salary).toFixed(1);
  insights.push({
    title: 'Annual Net Return',
    metric: `$${annualNet.toLocaleString()}/yr`,
    body: `Your AI tools generate $${annualValue.toLocaleString()} in annual productivity value. Net of spend, that's $${annualNet.toLocaleString()} in pure gain — enough to fund ${fractionOfHire}× the cost of a senior hire.`,
    type: metrics.netROI > 0 ? 'positive' : 'warning',
  });

  // ── 4. Platform budget health ─────────────────────────────────────────────
  if (platformROIs.length > 1) {
    const sorted = [...platformROIs].sort((a, b) => b.roiIndex - a.roiIndex);
    const worst = sorted[sorted.length - 1];
    const best = sorted[0];
    if (worst.roiIndex < 1) {
      const leakPct = Math.round((worst.platform.monthly_cost / metrics.totalMonthlySpend) * 100);
      insights.push({
        title: 'Budget Leak Detected',
        metric: `$${worst.platform.monthly_cost.toLocaleString()}/mo at risk`,
        body: `${worst.platform.name} accounts for ${leakPct}% of your AI budget but hasn't broken even (${worst.roiIndex.toFixed(1)}× ROI). Cutting or renegotiating seats frees up $${worst.platform.monthly_cost.toLocaleString()}/mo with minimal throughput impact.`,
        type: 'warning',
      });
    } else {
      insights.push({
        title: 'Expansion Opportunity',
        metric: `${best.platform.name} at ${best.roiIndex.toFixed(1)}×`,
        body: `${best.platform.name} is your highest-returning tool and all platforms are above breakeven. Expanding seat coverage on your top performer is your highest-leverage next move.`,
        type: 'info',
      });
    }
  } else if (platformROIs.length === 1) {
    const roi = platformROIs[0];
    insights.push({
      title: roi.roiIndex > 2 ? 'Strong Single-Platform ROI' : 'Consider Diversifying',
      metric: `${roi.roiIndex.toFixed(1)}× return`,
      body: roi.roiIndex > 2
        ? `${roi.platform.name} is delivering a strong ${roi.roiIndex.toFixed(1)}× return. Piloting a second complementary tool (e.g. code review AI) would let you build comparative leverage data.`
        : `${roi.platform.name} is at ${roi.roiIndex.toFixed(1)}×. A complementary AI tool for documentation or code review could compound your gains without significant added cost.`,
      type: roi.roiIndex > 2 ? 'positive' : 'info',
    });
  }

  // ── 5. Annual sprint surplus ──────────────────────────────────────────────
  const extraTicketsPerMonth = Math.round(
    (workspace.current_tickets_per_dev - workspace.baseline_tickets_per_dev) * workspace.team_size
  );
  const extraTicketsPerYear = extraTicketsPerMonth * 12;
  const baselineSprintTickets = workspace.baseline_tickets_per_dev * workspace.team_size * 0.5;
  const extraSprints =
    baselineSprintTickets > 0 ? (extraTicketsPerYear / baselineSprintTickets).toFixed(1) : null;

  if (extraTicketsPerYear > 0) {
    insights.push({
      title: 'Annual Sprint Surplus',
      metric: `+${extraTicketsPerYear.toLocaleString()} tickets/yr`,
      body: `At your current velocity lift, your team will ship ${extraTicketsPerYear.toLocaleString()} more tickets this year than they would without AI${extraSprints ? ` — the equivalent of ${extraSprints} bonus sprints of capacity` : ''}.`,
      type: 'positive',
    });
  }

  return insights;
}

// ─── CBA Report Generator ─────────────────────────────────────────────────────

export function generateExecutiveSummary(data: WorkspaceData): string {
  const { workspace, platforms } = data;
  if (!workspace.baseline_tickets_per_dev || !workspace.current_tickets_per_dev) {
    return 'Insufficient data to generate executive summary. Please complete the setup wizard.';
  }

  const metrics = calculateROIMetrics(data);
  const platformROIs = calculatePlatformROIs(data);
  const topPlatform = [...platformROIs].sort((a, b) => b.roiIndex - a.roiIndex)[0];
  const vlRounded = Math.round(metrics.velocityLift);
  const monthlyValue = Math.round(metrics.monthlyValue).toLocaleString();
  const totalSpend = Math.round(metrics.totalMonthlySpend).toLocaleString();
  const netBenefit = Math.round(metrics.netROI).toLocaleString();
  const roiMultiple = metrics.roiMultiple.toFixed(1);
  const paybackWeeks = Math.round(metrics.paybackWeeks);

  const paybackStr = metrics.paybackWeeks < 1
    ? 'less than one week'
    : `approximately ${paybackWeeks} weeks`;

  return `${workspace.name}'s engineering team of ${workspace.team_size} developers has achieved a ${vlRounded}% velocity lift since adopting AI development tools, increasing from ${workspace.baseline_tickets_per_dev} to ${workspace.current_tickets_per_dev} tickets per developer per month. This productivity improvement translates to an estimated $${monthlyValue} in monthly value created — representing the equivalent developer capacity unlocked through AI-assisted workflows. Against a total monthly AI platform spend of $${totalSpend} across ${platforms.length} platform${platforms.length !== 1 ? 's' : ''}, the net monthly benefit is $${netBenefit}, yielding a ${roiMultiple}× return on every dollar invested in AI tooling. The team's AI spend paid for itself in ${paybackStr}${topPlatform ? `, with ${topPlatform.platform.name} delivering the strongest individual platform ROI at ${topPlatform.roiIndex.toFixed(1)}×` : ''}.`;
}

// ─── What-if Simulator ────────────────────────────────────────────────────────

export function calculateWhatIf(
  data: WorkspaceData,
  disabledPlatformIds: Set<string>
): ROIMetrics {
  const activePlatforms = data.platforms.filter((p) => !disabledPlatformIds.has(p.id));
  return calculateROIMetrics({ ...data, platforms: activePlatforms });
}
