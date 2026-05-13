import { useTranslation } from 'react-i18next';
import MonthNavigator from '../../../components/MonthNavigator';
import type { Summary, TypeFilter } from '../../../types/api';

interface Props {
  userName?: string;
  summary: Summary | undefined;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  isCurrentMonth: boolean;
  daysRemaining: number;
  typeFilter: TypeFilter;
  setTypeFilter: (filter: TypeFilter) => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onOpenBudget: () => void;
}

export function DashboardHeader({
  userName,
  summary,
  currentMonth,
  setCurrentMonth,
  isCurrentMonth,
  daysRemaining,
  typeFilter,
  setTypeFilter,
  onAddIncome,
  onAddExpense,
  onOpenBudget,
}: Props) {
  const { t } = useTranslation();

  const budgetPct =
    summary && summary.budgetLimit > 0
      ? (summary.totalExpense / summary.budgetLimit) * 100
      : 0;
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? t('dashboard.greetingMorning')
      : greetingHour < 18
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening');

  const headerSummaryText = summary
    ? summary.budgetLimit > 0
      ? t('dashboard.headerSummary', {
          spent: summary.totalExpense.toFixed(2),
          budget: summary.budgetLimit.toFixed(2),
        })
      : t('dashboard.headerSummaryNoBudget', { spent: summary.totalExpense.toFixed(2) })
    : '';

  return (
    <>
      <header className="dash-header">
        <div className="dash-header-top">
          <div>
            <h1 className="dash-title">
              {greeting}, {userName?.split(' ')[0]} 👋
            </h1>
            <p className="dash-subtitle">
              {headerSummaryText}
              {summary && summary.budgetLimit > 0 && (
                <span
                  className="dash-budget-pct"
                  style={{
                    color:
                      budgetPct > 90
                        ? 'var(--danger)'
                        : budgetPct > 75
                          ? 'var(--warning)'
                          : 'var(--primary)',
                  }}
                >
                  {' · '}
                  {t('dashboard.budgetPercent', { percent: budgetPct.toFixed(0) })}
                </span>
              )}
            </p>
            {isCurrentMonth && (
              <span className="dash-days-remaining">
                {t('dashboard.daysRemaining', { count: daysRemaining })}
              </span>
            )}
          </div>
          <MonthNavigator currentMonth={currentMonth} onChange={setCurrentMonth} />
        </div>
        <div className="dash-actions">
          <select
            className="form-control dash-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">{t('dashboard.all')}</option>
            <option value="income">{t('transactions.income')}</option>
            <option value="expense">{t('transactions.expense')}</option>
          </select>
          <button className="btn btn-outline income-btn" onClick={onAddIncome}>
            + {t('transactions.addIncome')}
          </button>
          <button className="btn btn-primary expense-btn" onClick={onAddExpense}>
            + {t('transactions.addExpense')}
          </button>
          <button className="btn btn-outline" onClick={onOpenBudget}>
            {t('dashboard.budgets')}
          </button>
        </div>
      </header>

      {summary && summary.budgetLimit > 0 && (
        <div className="card budget-progress">
          <div className="budget-progress-header">
            <span>{t('dashboard.budgetProgress')}</span>
            <span>
              R$ {summary.totalExpense.toFixed(2)} / R$ {summary.budgetLimit.toFixed(2)} (
              {budgetPct.toFixed(0)}%)
            </span>
          </div>
          <div className="budget-bar-track">
            <div
              className="budget-bar-fill"
              style={{
                background:
                  budgetPct > 90
                    ? 'var(--danger)'
                    : budgetPct > 75
                      ? 'var(--warning)'
                      : 'var(--primary)',
                width: Math.min(budgetPct, 100) + '%',
              }}
            ></div>
          </div>
        </div>
      )}
    </>
  );
}
