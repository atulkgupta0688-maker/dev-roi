// src/lib/spendEngine.ts

import type { AIPlatform } from './types';

export interface WastedTool {
  name: string;
  waste: number;
}

export interface SpendInsights {
  totalSpend: number;
  topToolName: string;
  topToolUsage: number;
  totalWaste: number;
  recommendation: string;
  wastedTools: WastedTool[];
}

export function calculateSpendInsights(platforms: AIPlatform[]): SpendInsights {
  if (platforms.length === 0) {
    return {
      totalSpend: 0,
      topToolName: '',
      topToolUsage: 0,
      totalWaste: 0,
      recommendation: 'Add your AI subscriptions to get spend insights.',
      wastedTools: [],
    };
  }

  const totalSpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);

  // Top tool by usage_percent
  const topTool = platforms.reduce(
    (best, p) => (p.usage_percent > best.usage_percent ? p : best),
    platforms[0]
  );

  // Waste per tool
  const wastedTools: WastedTool[] = platforms
    .map((p) => {
      const expectedCost = totalSpend * (p.usage_percent / 100);
      const waste = Math.max(0, p.monthly_cost - expectedCost);
      return { name: p.name, waste };
    })
    .filter((t) => t.waste > 0);

  const totalWaste = wastedTools.reduce((sum, t) => sum + t.waste, 0);

  // Rule-based recommendation
  let recommendation = 'Current allocation looks efficient.';

  const highCostLowUsage = platforms.find(
    (p) => p.monthly_cost > totalSpend * 0.4 && p.usage_percent < 20
  );
  if (highCostLowUsage) {
    recommendation = `Reduce licenses for ${highCostLowUsage.name}.`;
  } else if (topTool.usage_percent > 60) {
    recommendation = `Reallocate budget toward ${topTool.name}.`;
  }

  return {
    totalSpend,
    topToolName: topTool.name,
    topToolUsage: topTool.usage_percent,
    totalWaste,
    recommendation,
    wastedTools,
  };
}
