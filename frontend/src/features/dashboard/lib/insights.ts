import type {
  AccountReport,
  DailySpendingPoint,
  Insight,
  Summary,
} from '../../../types/api';

export interface InsightDeps {
  summary: Summary;
  daily: DailySpendingPoint[];
  accounts: AccountReport[];
  locale: string;
  t: (key: string, vars?: Record<string, unknown>) => string;
  translateCategory: (cat: string) => string;
  resolveDescription: (description: string) => string;
  formatMoney: (amount: number) => string;
}

export function generateInsights({
  summary,
  daily,
  accounts,
  locale,
  t,
  translateCategory,
  resolveDescription,
  formatMoney,
}: InsightDeps): Insight[] {
  const out: Insight[] = [];
  const totalIncome = summary.totalIncome || 0;
  const totalExpense = summary.totalExpense || 0;

  if (summary.biggestExpense) {
    const be = summary.biggestExpense;
    out.push({
      id: 'biggest_expense',
      type: 'info',
      icon: '◆',
      message: t('dashboard.insightBiggestExpense', {
        description: resolveDescription(be.description),
        amount: formatMoney(be.amount),
        category: translateCategory(be.category),
      }),
    });
  }

  if (totalExpense > totalIncome && totalIncome > 0) {
    out.push({
      id: 'neg_balance',
      type: 'warning',
      icon: '⚠',
      message: t('dashboard.insightOverspend', {
        amount: formatMoney(totalExpense - totalIncome),
      }),
    });
  }

  if (summary.fixedExpense > 0 && totalIncome > 0) {
    const fixedPct = summary.fixedExpense / totalIncome;
    if (fixedPct > 0.5) {
      out.push({
        id: 'high_fixed',
        type: 'warning',
        icon: '▲',
        message: t('dashboard.insightHighFixed', { pct: (fixedPct * 100).toFixed(0) }),
      });
    }
  }

  if (accounts.length > 0) {
    const topAcc = accounts[0];
    if (topAcc.expense > 0 && totalExpense > 0) {
      const accPct = topAcc.expense / totalExpense;
      if (accPct > 0.7) {
        out.push({
          id: 'acc_concentrated',
          type: 'info',
          icon: '◐',
          message: t('dashboard.insightAccountConcentrated', {
            account: topAcc.bankAccount,
            pct: (accPct * 100).toFixed(0),
          }),
        });
      }
    }
  }

  if (daily.length > 0) {
    const maxDay = [...daily].sort((a, b) => b.amount - a.amount)[0];
    if (maxDay && maxDay.amount > 0) {
      const dateStr = new Date(maxDay.date).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC',
      });
      out.push({
        id: 'max_day',
        type: 'info',
        icon: '·',
        message: t('dashboard.insightMaxDay', {
          date: dateStr,
          amount: formatMoney(maxDay.amount),
        }),
      });
    }
  }

  if (totalIncome > 0) {
    const savingsRatio = (totalIncome - totalExpense) / totalIncome;
    if (savingsRatio >= 0.2 && out.length === 0) {
      out.push({
        id: 'healthy',
        type: 'success',
        icon: '✓',
        message: t('dashboard.insightHealthy', {
          pct: (savingsRatio * 100).toFixed(0),
        }),
      });
    }
  }

  return out;
}
