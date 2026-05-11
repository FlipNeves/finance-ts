import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area, ComposedChart } from 'recharts';
import api from '../services/api';
import TransactionModal from '../components/TransactionModal';
import BudgetModal from '../components/BudgetModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCategoryTranslation } from '../hooks/useCategoryTranslation';
import MonthNavigator from '../components/MonthNavigator';
import AccountBalanceCard from '../components/AccountBalanceCard';
import MemberSpendingCard from '../components/MemberSpendingCard';
import InsightsPanel from '../components/InsightsPanel';
import SavingsMasterCard from '../components/SavingsMasterCard';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [summary, setSummary] = useState<any>(null);
  const [spending, setSpending] = useState<{ category: string; amount: number }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [evolution, setEvolution] = useState<any[]>([]);
  const [dailySpending, setDailySpending] = useState<any[]>([]);
  const [topSpending, setTopSpending] = useState<any>({type: '', data: []});
  const [categoryBudgets, setCategoryBudgets] = useState<{ category: string; limit: number }[]>([]);
  const [accountsReport, setAccountsReport] = useState<any[]>([]);
  const [membersReport, setMembersReport] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [totalAccumulated, setTotalAccumulated] = useState<any>(null);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const COLORS = theme === 'light' 
    ? ['#00684A', '#016BF8', '#FFC010', '#8b5cf6', '#ec4899', '#14b8a6']
    : ['#00ED64', '#0498EC', '#FFC010', '#a78bfa', '#f472b6', '#2dd4bf'];

  useEffect(() => {
    if (user?.familyId || user?._id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, currentMonth, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [summaryRes, spendingRes, transRes, catRes, familyRes, evolutionRes, topSpendingRes, dailyRes, accountsRes, membersRes, accumRes] = await Promise.all([
        api.get('/reports/summary', { params: { startDate: start, endDate: end } }),
        api.get('/reports/spending-by-category', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/transactions', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/transactions/categories'),
        api.get('/family/details').catch(() => api.get('/users/profile').catch(() => ({ data: { bankAccounts: [] } }))),
        api.get('/reports/evolution', { params: { endDate: end } }),
        api.get('/reports/top-spending', { params: { startDate: start, endDate: end } }),
        api.get('/reports/daily-spending', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/reports/balance-by-account', { params: { startDate: start, endDate: end } }),
        api.get('/reports/spending-by-member', { params: { startDate: start, endDate: end } }),
        api.get('/reports/total-accumulated')
      ]);
      setSummary(summaryRes.data);
      setSpending(spendingRes.data);
      setTransactions(transRes.data.slice(0, 5)); 
      setCategories(catRes.data);
      setBankAccounts(familyRes.data.bankAccounts || []);
      setEvolution(evolutionRes.data);
      setTopSpending(topSpendingRes.data);
      setAccountsReport(accountsRes.data);
      setMembersReport(membersRes.data);
      setTotalAccumulated(accumRes.data);

      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();
      try {
        const budgetRes = await api.get('/budgets', { params: { month: m, year: y } });
        setCategoryBudgets(budgetRes.data?.categoryLimits || []);
      } catch {
        setCategoryBudgets([]);
      }

      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      const nowDt = new Date();
      const isCurrMonth = nowDt.getMonth() === currentMonth.getMonth() && nowDt.getFullYear() === currentMonth.getFullYear();
      const daysPassed = isCurrMonth ? nowDt.getDate() : daysInMonth;

      let runningTotal = 0;
      const fullDailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
        const dateStr = date.toISOString().split('T')[0];
        const found = dailyRes.data.find((d: any) => d.date === dateStr);
        const dayAmount = found ? found.amount : 0;
        runningTotal += dayAmount;
        
        let label = date.toLocaleDateString(i18n.language, { day: '2-digit', weekday: 'short', timeZone: 'UTC' }).replace('.', '');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return {
          date: dateStr,
          amount: dayAmount,
          accumulated: runningTotal,
          label,
          forecast: null as number | null,
          budgetLimit: summaryRes.data.budgetLimit || null
        };
      });

      // Forecast: weighted moving average of last 7 days (more sensitive to recent behavior
      // than a flat monthly mean). Falls back to global average when history is short.
      if (isCurrMonth && daysPassed > 0) {
        const accumToday = fullDailyData[daysPassed - 1].accumulated;
        const window = Math.min(7, daysPassed);
        const windowSum = fullDailyData
          .slice(daysPassed - window, daysPassed)
          .reduce((acc, d) => acc + d.amount, 0);
        const recentAvg = window > 0 ? windowSum / window : 0;
        const globalAvg = accumToday / daysPassed;
        // Blend: 70% recent trend, 30% global mean — stabilizes against outlier days
        const projectedDailySpend = recentAvg * 0.7 + globalAvg * 0.3;

        fullDailyData.forEach((d, i) => {
          if (i + 1 > nowDt.getDate()) {
            d.forecast = accumToday + projectedDailySpend * (i + 1 - nowDt.getDate());
          } else if (i + 1 === nowDt.getDate()) {
            d.forecast = d.accumulated;
          }
        });
      }

      setDailySpending(fullDailyData);

      const newInsights: any[] = [];
      const totalIncome = summaryRes.data.totalIncome || 0;
      const totalExpense = summaryRes.data.totalExpense || 0;

      if (totalExpense > totalIncome && totalIncome > 0) {
        newInsights.push({
          id: 'neg_balance',
          type: 'warning',
          icon: '⚠',
          message: t('dashboard.insightOverspend', { amount: (totalExpense - totalIncome).toFixed(2) }),
        });
      }

      if (summaryRes.data.fixedExpense > 0 && totalIncome > 0) {
        const fixedPct = summaryRes.data.fixedExpense / totalIncome;
        if (fixedPct > 0.5) {
          newInsights.push({
            id: 'high_fixed',
            type: 'warning',
            icon: '▲',
            message: t('dashboard.insightHighFixed', { pct: (fixedPct * 100).toFixed(0) }),
          });
        }
      }

      if (accountsRes.data && accountsRes.data.length > 0) {
        const topAcc = accountsRes.data[0];
        if (topAcc.expense > 0 && totalExpense > 0) {
          const accPct = topAcc.expense / totalExpense;
          if (accPct > 0.7) {
            newInsights.push({
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

      if (dailyRes.data && dailyRes.data.length > 0) {
        const maxDay = [...dailyRes.data].sort((a, b) => b.amount - a.amount)[0];
        if (maxDay && maxDay.amount > 0) {
          const dateStr = new Date(maxDay.date).toLocaleDateString(i18n.language, {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'UTC',
          });
          newInsights.push({
            id: 'max_day',
            type: 'info',
            icon: '·',
            message: t('dashboard.insightMaxDay', { date: dateStr, amount: maxDay.amount.toFixed(2) }),
          });
        }
      }

      if (totalIncome > 0) {
        const savingsRatio = (totalIncome - totalExpense) / totalIncome;
        if (savingsRatio >= 0.2 && newInsights.length === 0) {
          newInsights.push({
            id: 'healthy',
            type: 'success',
            icon: '✓',
            message: t('dashboard.insightHealthy', { pct: (savingsRatio * 100).toFixed(0) }),
          });
        }
      }

      setInsights(newInsights);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setIsModalOpen(true);
  };



  if (loading) return <div className="text-center mt-3 text-muted">{t('common.loading')}</div>;

  const budgetPct = summary?.budgetLimit ? (summary.totalExpense / summary.budgetLimit) * 100 : 0;
  
  const expenseDiff = summary?.totalExpense - (summary?.previousMonthExpense || 0);
  const incomeDiff = summary?.totalIncome - (summary?.previousMonthIncome || 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetingMorning');
    if (hour < 18) return t('dashboard.greetingAfternoon');
    return t('dashboard.greetingEvening');
  };

  const now = new Date();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const isCurrentMonth = now.getMonth() === currentMonth.getMonth() && now.getFullYear() === currentMonth.getFullYear();
  const daysRemaining = isCurrentMonth ? daysInMonth - now.getDate() : 0;

  const headerSummaryText = summary
    ? summary.budgetLimit > 0
      ? t('dashboard.headerSummary', { spent: summary.totalExpense.toFixed(2), budget: summary.budgetLimit.toFixed(2) })
      : t('dashboard.headerSummaryNoBudget', { spent: summary.totalExpense.toFixed(2) })
    : '';

  return (
    <div className="dash fade-in">
      <header className="dash-header">
        <div className="dash-header-top">
          <div>
            <h1 className="dash-title">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="dash-subtitle">
              {headerSummaryText}
              {summary?.budgetLimit > 0 && (
                <span className="dash-budget-pct" style={{ color: budgetPct > 90 ? 'var(--danger)' : budgetPct > 75 ? 'var(--warning)' : 'var(--primary)' }}>
                  {' · '}{t('dashboard.budgetPercent', { percent: budgetPct.toFixed(0) })}
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
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">{t('dashboard.all')}</option>
            <option value="income">{t('transactions.income')}</option>
            <option value="expense">{t('transactions.expense')}</option>
          </select>
          <button className="btn btn-outline income-btn" onClick={() => openModal('income')}>
            + {t('transactions.addIncome')}
          </button>
          <button className="btn btn-primary expense-btn" onClick={() => openModal('expense')}>
            + {t('transactions.addExpense')}
          </button>
          <button className="btn btn-outline" onClick={() => setIsBudgetOpen(true)}>
            {t('dashboard.budgets')}
          </button>
        </div>
      </header>

      {totalAccumulated && (
        <SavingsMasterCard
          savings={totalAccumulated}
          monthsTracked={evolution.length || 1}
          currentMonthExpense={summary?.totalExpense || 0}
        />
      )}
      
      <div className="summary-grid">
        <div className="card summary-card summary-income">
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-green"></span>
              <p className="text-green">{t('dashboard.totalIncome')}</p>
            </span>
            <span className="summary-value summary-value-income">{`R$${summary?.totalIncome.toFixed(2)}`}</span>
            <span className="summary-diff" style={{ color: incomeDiff >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {incomeDiff >= 0 ? '↑' : '↓'} R$ {Math.abs(incomeDiff).toFixed(2)} {t('dashboard.vsPrevMonth')}
            </span>
          </div>
        </div>

        <div className="card summary-card summary-expense">
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-red"></span>
              <p className="text-red">{t('dashboard.totalExpense')}</p>
            </span>
            <span className="summary-value summary-value-expense">{`R$${summary?.totalExpense.toFixed(2)}`}</span>
            <span className="summary-diff" style={{ color: expenseDiff <= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {expenseDiff > 0 ? '↑' : '↓'} R$ {Math.abs(expenseDiff).toFixed(2)} {t('dashboard.vsPrevMonth')}
            </span>
            {summary?.totalExpense > 0 && (
              <div className="summary-breakdown">
                <span>{t('dashboard.fixed')}: R$ {summary.fixedExpense.toFixed(2)} ({(summary.fixedExpense/summary.totalExpense*100).toFixed(0)}%)</span>
                <span>{t('dashboard.variable')}: R$ {summary.variableExpense.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card summary-card summary-balance">
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-blue"></span>
              <p className="text-blue">{t('dashboard.balance')}</p>
            </span>
            <span className={`summary-value summary-value-balance ${summary && summary.balance < 0 ? 'negative' : 'positive'}`}>
              {`R$${summary?.balance.toFixed(2)}`}
            </span>
          </div>
        </div>

        {summary && (() => {
          const savingsRate = summary.totalIncome > 0
            ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100
            : 0;
          const monthProgress = isCurrentMonth ? (now.getDate() / daysInMonth) * 100 : 100;
          const budgetPace = summary.budgetLimit > 0
            ? (budgetPct / monthProgress) * 100
            : 0;
          const expenseTrend = summary.previousMonthExpense > 0
            ? ((summary.totalExpense - summary.previousMonthExpense) / summary.previousMonthExpense) * 100
            : 0;

          let healthScore = 0;
          if (savingsRate >= 20) healthScore += 40;
          else if (savingsRate >= 10) healthScore += 25;
          else if (savingsRate >= 0) healthScore += 10;

          if (summary.budgetLimit > 0) {
            if (budgetPace <= 100) healthScore += 35;
            else if (budgetPace <= 120) healthScore += 20;
            else healthScore += 5;
          } else {
            healthScore += 20;
          }

          if (expenseTrend <= 0) healthScore += 25;
          else if (expenseTrend <= 10) healthScore += 15;
          else healthScore += 5;

          const healthColor = healthScore >= 75 ? 'var(--primary)' : healthScore >= 50 ? 'var(--warning)' : 'var(--danger)';
          const healthLabel = healthScore >= 75
            ? t('dashboard.healthExcellent')
            : healthScore >= 50
              ? t('dashboard.healthGood')
              : healthScore >= 25
                ? t('dashboard.healthWarning')
                : t('dashboard.healthCritical');

          const gaugeAngle = (healthScore / 100) * 180;

          return (
            <div className="card summary-card health-card summary-health">
              <div className="summary-inner">
                <span className="summary-label">
                  <span className="dot" style={{ background: healthColor }}></span>
                  <p style={{ color: healthColor }}>{t('dashboard.financialHealth')}</p>
                  <span
                    className="health-info"
                    title={t('dashboard.healthMethodology')}
                    aria-label={t('dashboard.healthBreakdown')}
                  >
                    ⓘ
                  </span>
                </span>
                <div className="health-gauge-wrapper">
                  <div className="health-gauge">
                    <div className="health-gauge-bg"></div>
                    <div className="health-gauge-fill" style={{
                      background: `conic-gradient(${healthColor} 0deg, ${healthColor} ${gaugeAngle}deg, transparent ${gaugeAngle}deg)`,
                    }}></div>
                    <div className="health-gauge-cover"></div>
                    <div className="health-gauge-value">
                      <span className="health-score" style={{ color: healthColor }}>{healthScore}</span>
                      <span className="health-label">{healthLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="health-details">
                  <div className="health-detail-row">
                    <span>{t('dashboard.savingsRate')}</span>
                    <span style={{ color: savingsRate >= 20 ? 'var(--primary)' : savingsRate >= 0 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>
                      {savingsRate.toFixed(0)}%
                    </span>
                  </div>
                  {summary.budgetLimit > 0 && (
                    <div className="health-detail-row">
                      <span>{t('dashboard.budgetPace')}</span>
                      <span style={{ color: budgetPace <= 100 ? 'var(--primary)' : 'var(--danger)', fontWeight: 700 }}>
                        {budgetPace <= 95 ? t('dashboard.paceAhead') : budgetPace <= 105 ? t('dashboard.paceOnTrack') : t('dashboard.paceBehind')}
                      </span>
                    </div>
                  )}
                  <div className="health-detail-row">
                    <span>{t('dashboard.trendVsPrev')}</span>
                    <span style={{ color: expenseTrend <= 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 700 }}>
                      {expenseTrend > 0 ? '↑' : '↓'} {Math.abs(expenseTrend).toFixed(0)}%
                    </span>
                  </div>
                  {summary.totalIncome > 0 && (
                    <div className="health-detail-row" title={t('dashboard.fixedRatioHelp')}>
                      <span>{t('dashboard.fixedRatio')}</span>
                      <span style={{
                        color: (summary.fixedExpense / summary.totalIncome) <= 0.5 ? 'var(--primary)' : 'var(--danger)',
                        fontWeight: 700,
                      }}>
                        {((summary.fixedExpense / summary.totalIncome) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <InsightsPanel insights={insights} />

      {summary?.budgetLimit > 0 && (
        <div className="card budget-progress">
          <div className="budget-progress-header">
            <span>{t('dashboard.budgetProgress')}</span>
            <span>R$ {summary.totalExpense.toFixed(2)} / R$ {summary.budgetLimit.toFixed(2)} ({budgetPct.toFixed(0)}%)</span>
          </div>
          <div className="budget-bar-track">
            <div className="budget-bar-fill" style={{ 
              background: budgetPct > 90 ? 'var(--danger)' : budgetPct > 75 ? 'var(--warning)' : 'var(--primary)',
              width: Math.min(budgetPct, 100) + '%',
            }}></div>
          </div>
        </div>
      )}
      
      {summary?.biggestExpense && (
        <aside className="biggest-expense-alert" role="note">
          <span className="biggest-expense-glyph" aria-hidden="true">◆</span>
          <div className="biggest-expense-text">
            <span className="biggest-expense-eyebrow">{t('dashboard.biggestExpenseAlertPrefix')}</span>
            <span className="biggest-expense-body">
              {summary.biggestExpense.description === 'Income'
                ? t('transactions.income')
                : summary.biggestExpense.description === 'Expense'
                  ? t('transactions.expense')
                  : summary.biggestExpense.description}
              <strong> · R$ {summary.biggestExpense.amount.toFixed(2)} · </strong>
              {translateCategory(summary.biggestExpense.category)}
            </span>
          </div>
        </aside>
      )}

      {categoryBudgets.length > 0 && spending.length > 0 && (
        <div className="card cat-budget-section">
          <h3 className="section-title"><span className="section-numeral">01</span>{t('dashboard.categoryBudget')}</h3>
          <div className="cat-budget-grid">
            {categoryBudgets
              .filter(cb => cb.limit > 0)
              .map(cb => {
                const spendItem = spending.find(s => s.category === cb.category);
                const spent = spendItem ? spendItem.amount : 0;
                const pct = cb.limit > 0 ? (spent / cb.limit) * 100 : 0;
                const isOver = pct > 100;
                const barColor = pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--primary)';
                return (
                  <div key={cb.category} className="cat-budget-item">
                    <div className="cat-budget-header">
                      <span className="category-badge">{translateCategory(cb.category)}</span>
                      <span className="cat-budget-values" style={{ color: isOver ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        R$ {spent.toFixed(0)} / R$ {cb.limit.toFixed(0)}
                      </span>
                    </div>
                    <div className="cat-budget-bar-track">
                      <div className="cat-budget-bar-fill" style={{ width: Math.min(pct, 100) + '%', background: barColor }}></div>
                    </div>
                    <span className="cat-budget-status" style={{ color: isOver ? 'var(--danger)' : 'var(--primary)' }}>
                      {isOver
                        ? t('dashboard.overBudget', { amount: (spent - cb.limit).toFixed(2) })
                        : t('dashboard.remaining', { amount: (cb.limit - spent).toFixed(2) })
                      }
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="card transactions-section">
        <div className="transactions-header">
          <h2 className="section-title"><span className="section-numeral">02</span>{t('transactions.recent')}</h2>
          <Link to="/transactions" className="view-all-link">{t('dashboard.viewAll')} →</Link>
        </div>

        <div className="table-responsive desktop-table">
          <table className="tx-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('common.user')}</th>
                <th>{t('transactions.category')}</th>
                <th>{t('transactions.account')}</th>
                <th className="text-right">{t('transactions.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center empty-td">
                    {t('transactions.noTransactions')}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id}>
                    <td className="text-muted">{new Date(tr.date).toLocaleDateString(i18n.language)}</td>
                    <td><span className="tx-desc">{tr.description === 'Income' ? t('transactions.income') : tr.description === 'Expense' ? t('transactions.expense') : (tr.description || '-')}</span></td>
                    <td><span className="user-badge">{tr.userId?.name || '?'}</span></td>
                    <td><span className="category-badge">{translateCategory(tr.category)}</span></td>
                    <td><span className="tx-bank">{tr.bankAccount || '-'} {tr.isFixed ? t('transactions.fixedTag') : ''}</span></td>
                    <td className={`tx-amount ${tr.type}`}>
                      {tr.type === 'income' ? '+' : '-'}R${tr.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-tx-list">
          {transactions.length === 0 ? (
            <div className="empty-state-mobile">
              {t('transactions.noTransactions')}
            </div>
          ) : (
            transactions.map((tr) => (
              <div key={tr._id} className="tx-card">
                <div className="tx-card-top">
                  <div className="tx-card-left">
                    <span className="tx-card-desc">{tr.description === 'Income' ? t('transactions.income') : tr.description === 'Expense' ? t('transactions.expense') : (tr.description || '-')}</span>
                    <div className="tx-card-meta">
                      <span className="category-badge-sm">{translateCategory(tr.category)}</span>
                      <span className="tx-card-date">{new Date(tr.date).toLocaleDateString(i18n.language)}</span>
                    </div>
                  </div>
                  <span className={`tx-card-amount ${tr.type}`}>
                    {tr.type === 'income' ? '+' : '-'}R${tr.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        type={modalType}
        initialCategories={categories}
        initialBankAccounts={bankAccounts}
      />
      <BudgetModal 
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        onSuccess={loadData}
      />

      <div className="charts-grid">
        {accountsReport && accountsReport.length > 0 && (
          <div className="card chart-card">
            <AccountBalanceCard accounts={accountsReport} />
          </div>
        )}

        {membersReport && membersReport.length > 0 && (
          <div className="card chart-card">
            <MemberSpendingCard members={membersReport} />
          </div>
        )}

        <div className="card chart-card">
          <h3 className="section-title">
            <span className="section-numeral">04</span>
            {t('dashboard.topSpendingTitle')}
          </h3>
          <div className="chart-wrapper">
            {topSpending.data && topSpending.data.length > 0 ? (
              <ol className="top-spending-list">
                {topSpending.data.map((item: any, idx: number) => (
                  <li key={idx} className="top-spending-item">
                    <span className="ts-rank">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="ts-body">
                      <span className="ts-name">
                        {item.description === 'Income'
                          ? t('transactions.income')
                          : item.description === 'Expense'
                            ? t('transactions.expense')
                            : item.description || t('transactions.expense')}
                      </span>
                      <span className="ts-meta">
                        {item.date
                          ? new Date(item.date)
                              .toLocaleDateString(i18n.language, {
                                day: '2-digit',
                                month: '2-digit',
                                weekday: 'short',
                                timeZone: 'UTC',
                              })
                              .replace('.', '')
                          : ''}
                        {topSpending.type === 'family_transactions' && item.userName
                          ? ` · ${item.userName}`
                          : ''}
                      </span>
                    </div>
                    <span className="ts-amount">R$ {Number(item.amount || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="chart-empty">{t('dashboard.noTopSpending')}</div>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <h3 className="section-title"><span className="section-numeral">05</span>{t('dashboard.spendingByCategory')}</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending.map(s => ({...s, name: translateCategory(s.category)}))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip cursor={{ fill: 'var(--bg)', opacity: 0.5 }} contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text)' }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {spending.map((_, index) => (
                      <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </div>

        <div className="card chart-card chart-full">
          <h3 className="section-title"><span className="section-numeral">06</span>{t('dashboard.topSpendingDays')}</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailySpending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--text-secondary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--text-secondary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `R$${val}`}/>
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4', fill: 'var(--bg-card)', opacity: 0.1 }}
                  contentStyle={{ borderRadius: '0', border: '1px solid var(--text)', boxShadow: 'none', background: 'var(--bg-card)', color: 'var(--text)' }}
                  formatter={(val: any, name: any) => {
                    const key = typeof name === 'string' ? name : '';
                    return [
                      `R$ ${Number(val || 0).toFixed(2)}`,
                      key === 'accumulated'
                        ? t('dashboard.actualLabel')
                        : key === 'forecast'
                          ? t('dashboard.projectionLabel')
                          : key === 'budgetLimit'
                            ? t('dashboard.budgetLineLabel')
                            : t('transactions.amount'),
                    ];
                  }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'capitalize' }}
                />
                
                <Bar yAxisId="right" dataKey="amount" name="amount" fill="var(--danger)" opacity={0.3} radius={[2, 2, 0, 0]} />
                <Area yAxisId="left" type="monotone" dataKey="budgetLimit" name="budgetLimit" stroke="var(--danger)" strokeDasharray="5 5" strokeWidth={1.5} fillOpacity={0} activeDot={false} />
                <Area yAxisId="left" type="monotone" dataKey="forecast" name="forecast" stroke="var(--text-secondary)" strokeDasharray="3 3" strokeWidth={2.5} fillOpacity={1} fill="url(#colorForecast)" activeDot={false} />
                <Area yAxisId="left" type="stepAfter" dataKey="accumulated" name="accumulated" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDaily)" activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card chart-full">
          <h3 className="section-title"><span className="section-numeral">07</span>{t('dashboard.evolution')}</h3>
          <div className="chart-wrapper">
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `R$${val}`}/>
                  <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="income" name={t('transactions.income')} stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name={t('transactions.expense')} stroke="var(--danger)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
