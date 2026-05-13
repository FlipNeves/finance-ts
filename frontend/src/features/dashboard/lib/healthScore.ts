import type { Summary } from '../../../types/api';

export type HealthLevel = 'excellent' | 'good' | 'warning' | 'critical';

export interface HealthScoreResult {
  score: number;
  level: HealthLevel;
  savingsRate: number;
  budgetPace: number;
  expenseTrend: number;
  fixedRatio: number;
}

export interface HealthInput {
  summary: Summary;
  monthProgress: number;
}

export function calculateHealthScore({
  summary,
  monthProgress,
}: HealthInput): HealthScoreResult {
  const savingsRate =
    summary.totalIncome > 0
      ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100
      : 0;

  const budgetPct =
    summary.budgetLimit > 0 ? (summary.totalExpense / summary.budgetLimit) * 100 : 0;
  const budgetPace = summary.budgetLimit > 0 && monthProgress > 0
    ? (budgetPct / monthProgress) * 100
    : 0;

  const expenseTrend =
    (summary.previousMonthExpense ?? 0) > 0
      ? ((summary.totalExpense - (summary.previousMonthExpense ?? 0)) /
          (summary.previousMonthExpense ?? 1)) * 100
      : 0;

  const fixedRatio =
    summary.totalIncome > 0 ? (summary.fixedExpense / summary.totalIncome) * 100 : 0;

  let score = 0;
  if (savingsRate >= 20) score += 40;
  else if (savingsRate >= 10) score += 25;
  else if (savingsRate >= 0) score += 10;

  if (summary.budgetLimit > 0) {
    if (budgetPace <= 100) score += 35;
    else if (budgetPace <= 120) score += 20;
    else score += 5;
  } else {
    score += 20;
  }

  if (expenseTrend <= 0) score += 25;
  else if (expenseTrend <= 10) score += 15;
  else score += 5;

  const level: HealthLevel =
    score >= 75 ? 'excellent' : score >= 50 ? 'good' : score >= 25 ? 'warning' : 'critical';

  return { score, level, savingsRate, budgetPace, expenseTrend, fixedRatio };
}
