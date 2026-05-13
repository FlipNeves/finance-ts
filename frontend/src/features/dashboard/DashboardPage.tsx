import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { useCategoryTranslation } from '../../hooks/useCategoryTranslation';
import TransactionModal from '../transactions/TransactionModal';
import BudgetModal from '../budget/BudgetModal';
import AccountBalanceCard from '../../components/AccountBalanceCard';
import InsightsPanel from './components/InsightsPanel';
import MemberSpendingCard from './components/MemberSpendingCard';
import type { TypeFilter } from '../../types/api';
import { useDashboardData, useDashboardInvalidation } from './hooks/useDashboardData';
import { buildDailyProjection } from './lib/dailyProjection';
import { generateInsights } from './lib/insights';
import { DashboardHeader } from './components/DashboardHeader';
import { SummaryGrid } from './components/SummaryGrid';
import { DailySpendingChart } from './components/DailySpendingChart';
import { CategoryBudgetGrid } from './components/CategoryBudgetGrid';
import { SpendingByCategoryChart } from './components/SpendingByCategoryChart';
import { TopSpendingList } from './components/TopSpendingList';
import { EvolutionChart } from './components/EvolutionChart';
import { RecentTransactionsTable } from './components/RecentTransactionsTable';
import './DashboardPage.css';

const LIGHT_COLORS = ['#00684A', '#016BF8', '#FFC010', '#8b5cf6', '#ec4899', '#14b8a6'];
const DARK_COLORS = ['#00ED64', '#0498EC', '#FFC010', '#a78bfa', '#f472b6', '#2dd4bf'];

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { valuesHidden } = usePrivacy();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  const data = useDashboardData(currentMonth, typeFilter);
  const invalidateDashboard = useDashboardInvalidation();

  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

  const summary = data.summary.data;
  const dailyRaw = data.daily.data ?? [];
  const upcomingFixed = data.upcomingFixed.data ?? [];
  const incomeSummary = data.incomeSummary.data ?? { events: [], upcoming: [], missed: [] };
  const accountsReport = data.accountsReport.data ?? [];
  const membersReport = data.membersReport.data ?? [];
  const spending = data.spending.data ?? [];
  const evolution = data.evolution.data ?? [];
  const topSpending = data.topSpending.data ?? { type: '', data: [] };
  const transactions = data.transactions.data ?? [];
  const categoryBudgets = data.budget.data?.categoryLimits ?? [];

  const dailySpending = useMemo(() => {
    if (!data.daily.data) return [];
    return buildDailyProjection({
      reference: currentMonth,
      daysInMonth: data.range.daysInMonth,
      isCurrentMonth: data.range.isCurrentMonth,
      daysPassed: data.range.daysPassed,
      daily: dailyRaw,
      upcomingFixed,
      locale: i18n.language,
    });
  }, [
    data.daily.data,
    currentMonth,
    data.range.daysInMonth,
    data.range.isCurrentMonth,
    data.range.daysPassed,
    dailyRaw,
    upcomingFixed,
    i18n.language,
  ]);

  const insights = useMemo(() => {
    if (!summary) return [];
    return generateInsights({
      summary,
      daily: dailyRaw,
      accounts: accountsReport,
      locale: i18n.language,
      t,
      translateCategory,
      resolveDescription: (d) =>
        d === 'Income'
          ? t('transactions.income')
          : d === 'Expense'
            ? t('transactions.expense')
            : d,
      formatMoney: (n) => (valuesHidden ? '•••.•••,••' : n.toFixed(2)),
    });
  }, [summary, dailyRaw, accountsReport, i18n.language, t, translateCategory, valuesHidden]);

  if (data.isLoading) {
    return <div className="text-center mt-3 text-muted">{t('common.loading')}</div>;
  }

  if (!user?.familyId && !user?._id) {
    return <div className="text-center mt-3 text-muted">{t('common.loading')}</div>;
  }

  const daysRemaining = data.range.isCurrentMonth
    ? data.range.daysInMonth - data.range.daysPassed
    : 0;

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <div className="dash fade-in">
      <DashboardHeader
        userName={user?.name}
        summary={summary}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        isCurrentMonth={data.range.isCurrentMonth}
        daysRemaining={daysRemaining}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onAddIncome={() => openModal('income')}
        onAddExpense={() => openModal('expense')}
        onOpenBudget={() => setIsBudgetOpen(true)}
      />

      {summary && (
        <SummaryGrid
          summary={summary}
          isCurrentMonth={data.range.isCurrentMonth}
          daysInMonth={data.range.daysInMonth}
          daysPassed={data.range.daysPassed}
        />
      )}

      <div className="dash-divider-bold" role="presentation" />

      <InsightsPanel insights={insights} />

      <div className="charts-grid">
        <DailySpendingChart
          daily={dailySpending}
          upcomingFixed={upcomingFixed}
          incomeSummary={incomeSummary}
          summary={summary}
        />
      </div>

      <CategoryBudgetGrid categoryBudgets={categoryBudgets} spending={spending} />

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={invalidateDashboard}
        type={modalType}
      />

      <BudgetModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        onSuccess={invalidateDashboard}
      />

      <div className="charts-grid">
        <SpendingByCategoryChart spending={spending} colors={colors} />
        <TopSpendingList topSpending={topSpending} />
        {accountsReport.length > 0 && (
          <div className="card chart-card">
            <AccountBalanceCard accounts={accountsReport} />
          </div>
        )}
        {membersReport.length > 0 && (
          <div className="card chart-card">
            <MemberSpendingCard members={membersReport} />
          </div>
        )}
        <EvolutionChart evolution={evolution} />
      </div>

      <RecentTransactionsTable transactions={transactions} />
    </div>
  );
}
