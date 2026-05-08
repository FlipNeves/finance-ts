import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import api from '../services/api';
import TransactionModal from '../components/TransactionModal';
import BudgetModal from '../components/BudgetModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCategoryTranslation } from '../hooks/useCategoryTranslation';

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

      const [summaryRes, spendingRes, transRes, catRes, familyRes, evolutionRes, topSpendingRes, dailyRes] = await Promise.all([
        api.get('/reports/summary', { params: { startDate: start, endDate: end } }),
        api.get('/reports/spending-by-category', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/transactions', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/transactions/categories'),
        api.get('/family/details').catch(() => api.get('/users/profile').catch(() => ({ data: { bankAccounts: [] } }))),
        api.get('/reports/evolution', { params: { endDate: end } }),
        api.get('/reports/top-spending', { params: { startDate: start, endDate: end } }),
        api.get('/reports/daily-spending', { params: { startDate: start, endDate: end, type: typeFilter } })
      ]);
      setSummary(summaryRes.data);
      setSpending(spendingRes.data);
      setTransactions(transRes.data.slice(0, 5)); 
      setCategories(catRes.data);
      setBankAccounts(familyRes.data.bankAccounts || []);
      setEvolution(evolutionRes.data);
      setTopSpending(topSpendingRes.data);

      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();
      try {
        const budgetRes = await api.get('/budgets', { params: { month: m, year: y } });
        setCategoryBudgets(budgetRes.data?.categoryLimits || []);
      } catch {
        setCategoryBudgets([]);
      }

      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      const fullDailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
        const dateStr = date.toISOString().split('T')[0];
        const found = dailyRes.data.find((d: any) => d.date === dateStr);
        let label = date.toLocaleDateString(i18n.language, { day: '2-digit', weekday: 'short', timeZone: 'UTC' }).replace('.', '');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return {
          date: dateStr,
          amount: found ? found.amount : 0,
          label
        };
      });
      setDailySpending(fullDailyData);
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

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const monthLabel = currentMonth.toLocaleString(i18n.language, { month: 'long', year: 'numeric' });

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
          <div className="dash-month-nav">
            <button className="month-arrow" onClick={handlePrevMonth}>&lt;</button>
            <span className="month-label">{monthLabel}</span>
            <button className="month-arrow" onClick={handleNextMonth}>&gt;</button>
          </div>
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
      
      <div className="summary-grid">
        <div className="card summary-card">
          <div className="card-decoration"></div>
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-green"></span>
              <p className="text-green">{t('dashboard.totalIncome')}</p>
            </span>
            <span className="summary-value">{`R$${summary?.totalIncome.toFixed(2)}`}</span>
            <span className="summary-diff" style={{ color: incomeDiff >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {incomeDiff >= 0 ? '↑' : '↓'} R$ {Math.abs(incomeDiff).toFixed(2)} {t('dashboard.vsPrevMonth')}
            </span>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-decoration"></div>
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-red"></span>
              <p className="text-red">{t('dashboard.totalExpense')}</p>
            </span>
            <span className="summary-value">{`R$${summary?.totalExpense.toFixed(2)}`}</span>
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

        <div className="card summary-card">
          <div className="card-decoration"></div>
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-blue"></span>
              <p className="text-blue">{t('dashboard.balance')}</p>
            </span>
            <span className={`summary-value ${summary && summary.balance < 0 ? 'negative' : 'positive'}`}>
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
            <div className="card summary-card health-card">
              <div className="summary-inner">
                <span className="summary-label">
                  <span className="dot" style={{ background: healthColor }}></span>
                  <p style={{ color: healthColor }}>{t('dashboard.financialHealth')}</p>
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
                </div>
              </div>
            </div>
          );
        })()}
      </div>

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
        <div className="biggest-expense-alert">
          <span>⚠️</span>
          <span>{t('dashboard.biggestExpense')}: {summary.biggestExpense.description === 'Income' ? t('transactions.income') : summary.biggestExpense.description === 'Expense' ? t('transactions.expense') : summary.biggestExpense.description} (R$ {summary.biggestExpense.amount.toFixed(2)}) {t('dashboard.inCategory')} {translateCategory(summary.biggestExpense.category)}.</span>
        </div>
      )}

      {categoryBudgets.length > 0 && spending.length > 0 && (
        <div className="card cat-budget-section">
          <h3 className="section-title">{t('dashboard.categoryBudget')}</h3>
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
          <h2 className="section-title">{t('transactions.recent')}</h2>
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
        <div className="card chart-card">
          <h3 className="section-title">
            {t('dashboard.biggestExpense')}
          </h3>
          <div className="chart-wrapper">
            {topSpending.data && topSpending.data.length > 0 ? (
              <div className="top-spending-list flex flex-col gap-3">
                {Array.isArray(topSpending.data) && topSpending.data.map((item: any, idx: number) => (
                  <div key={idx} className="top-spending-item">
                    <span className="ts-name" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>{item.description === 'Income' ? t('transactions.income') : item.description === 'Expense' ? t('transactions.expense') : (item.description || 'Despesa')}
                        . {item.date ? new Date(item.date).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', weekday: 'short', timeZone: 'UTC'}).replace('.', '') : ''}
                        {topSpending.type === 'family_transactions' && item.userName ? ` • ${item.userName}` : ''}
                      </span>
                    </span>
                    <span className="ts-amount text-danger">R$ {Number(item.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty p-3 overflow-auto" style={{fontSize: '11px', whiteSpace: 'pre-wrap', textAlign: 'left'}}>
                {topSpending && Object.keys(topSpending).length > 0 
                  ? `Debug: Não há itens para listar.\n\nResposta recebida:\n${JSON.stringify(topSpending, null, 2)}` 
                  : t('dashboard.noData')}
              </div>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <h3 className="section-title">{t('dashboard.spendingByCategory')}</h3>
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
          <h3 className="section-title">{t('dashboard.topSpendingDays')}</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySpending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `R$${val}`}/>
                <Tooltip 
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} 
                  contentStyle={{ borderRadius: '6px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text)' }} 
                  formatter={(val: any) => [`R$ ${Number(val || 0).toFixed(2)}`, t('transactions.amount')]}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'capitalize' }}
                />
                <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDaily)" activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card chart-full">
          <h3 className="section-title">{t('dashboard.evolution')}</h3>
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

      {dailySpending.length > 0 && (() => {
        const maxAmount = Math.max(...dailySpending.map((d: any) => d.amount), 1);
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const startDow = (firstDayOfMonth.getDay() + 6) % 7;
        const weekdays = i18n.language === 'pt'
          ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const cells: React.ReactNode[] = [];
        for (let i = 0; i < startDow; i++) {
          cells.push(<div key={`empty-${i}`} className="cal-cell cal-empty"></div>);
        }
        dailySpending.forEach((day: any, idx: number) => {
          const intensity = day.amount > 0 ? Math.max(0.15, day.amount / maxAmount) : 0;
          const isToday = isCurrentMonth && idx + 1 === now.getDate();
          cells.push(
            <div
              key={day.date}
              className={`cal-cell ${isToday ? 'cal-today' : ''} ${day.amount === 0 ? 'cal-zero' : ''}`}
              style={{
                backgroundColor: day.amount > 0
                  ? `color-mix(in srgb, var(--danger) ${Math.round(intensity * 100)}%, var(--bg))`
                  : undefined,
              }}
              title={`${day.label}: R$ ${day.amount.toFixed(2)}`}
            >
              <span className="cal-day">{idx + 1}</span>
              {day.amount > 0 && <span className="cal-amount">R${day.amount.toFixed(0)}</span>}
            </div>
          );
        });
        return (
          <div className="card cal-section">
            <h3 className="section-title">{t('dashboard.financialCalendar')}</h3>
            <div className="cal-weekdays">
              {weekdays.map(d => <span key={d} className="cal-weekday">{d}</span>)}
            </div>
            <div className="cal-grid">
              {cells}
            </div>
          </div>
        );
      })()}

      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .dash-header { margin-bottom: 20px; }
        .dash-header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .dash-title { font-size: 26px; margin: 0; }
        .dash-subtitle { margin: 2px 0 0 0; font-size: 13px; color: var(--text-secondary); }
        .dash-budget-pct { font-weight: 700; }
        .dash-days-remaining { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 600; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); padding: 3px 10px; border-radius: 9999px; }
        .dash-month-nav { display: inline-flex; align-items: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px; flex-shrink: 0; }
        .month-arrow { background: transparent; border: none; padding: 6px 10px; border-radius: var(--radius); cursor: pointer; color: var(--text); font-weight: 700; transition: background 0.15s; }
        .month-arrow:hover { background: var(--bg); }
        .month-label { font-weight: 600; min-width: 120px; text-align: center; text-transform: capitalize; font-size: 13px; }
        .dash-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .dash-filter { width: auto; padding: 8px 12px; font-size: 13px; }
        .income-btn { color: var(--primary); border-color: var(--primary); }
        .income-btn:hover { background: var(--primary-light) !important; }
        .expense-btn { background-color: var(--danger) !important; }
        .expense-btn:hover { opacity: 0.9; }

        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
        .summary-card { position: relative; overflow: hidden; padding: 20px; }
        .summary-card:hover { box-shadow: var(--shadow-sm); }
        .card-decoration { position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; border-radius: 50%; opacity: 0.1; filter: blur(20px); z-index: 0; }
        .deco-green { background: var(--primary-vivid); }
        .deco-red { background: var(--danger); }
        .deco-blue { background: var(--info); }
        .summary-inner { position: relative; z-index: 1; display: flex; flex-direction: column; }
        .summary-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.3px; margin-bottom: 6px; text-transform: uppercase; }
        .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dot-green { background: var(--primary); }
        .dot-red { background: var(--danger); }
        .dot-blue { background: var(--info); }
        .text-green { color: var(--primary); }
        .text-red { color: var(--danger); }
        .text-blue { color: var(--info); }
        .summary-value { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .summary-value.positive { color: var(--primary); }
        .summary-value.negative { color: var(--danger); }
        .summary-diff { font-size: 11px; margin-top: 4px; }
        .summary-breakdown { display: flex; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-secondary); }

        .budget-progress { padding: 14px 20px; margin-bottom: 16px; }
        .budget-progress:hover { box-shadow: var(--shadow-sm); }
        .budget-progress-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; margin-bottom: 8px; gap: 8px; }
        .budget-bar-track { width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
        .budget-bar-fill { height: 100%; transition: width 0.5s ease-in-out; border-radius: 3px; }

        .biggest-expense-alert { background: var(--warning-light); color: var(--text); padding: 12px 16px; border-radius: var(--radius); border: 1px solid var(--warning); display: flex; align-items: flex-start; gap: 8px; font-size: 13px; font-weight: 500; margin-bottom: 16px; line-height: 1.4; }

        .transactions-section { margin-bottom: 16px; }
        .transactions-section:hover { box-shadow: var(--shadow-sm); }
        .transactions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-title { font-size: 16px; margin: 0; }
        .view-all-link { font-size: 13px; font-weight: 600; color: var(--primary); }
        [data-theme='dark'] .view-all-link { color: var(--primary-vivid); }
        .table-responsive { overflow-x: auto; }
        .tx-table { width: 100%; border-collapse: separate; border-spacing: 0 4px; }
        .tx-table th { text-align: left; padding: 8px 12px; color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
        .tx-table td { padding: 10px 12px; font-size: 13px; background: var(--bg-card); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .tx-table td:first-child { border-left: 1px solid var(--border); border-top-left-radius: var(--radius); border-bottom-left-radius: var(--radius); }
        .tx-table td:last-child { border-right: 1px solid var(--border); border-top-right-radius: var(--radius); border-bottom-right-radius: var(--radius); }
        .tx-table tbody tr:hover td { background: var(--bg); }
        .tx-desc { font-weight: 600; color: var(--text); }
        .tx-bank { font-size: 12px; color: var(--text-secondary); }
        .tx-amount { font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .tx-amount.income { color: var(--primary); }
        .tx-amount.expense { color: var(--danger); }
        .text-right { text-align: right !important; }
        .category-badge { background-color: var(--primary-light); color: var(--primary); padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        [data-theme='dark'] .category-badge { color: var(--primary-vivid); }
        .user-badge { display: inline-flex; align-items: center; background: var(--bg); border: 1px solid var(--border); padding: 3px 8px; border-radius: var(--radius); font-size: 11px; font-weight: 500; }
        .empty-td { padding: 32px !important; color: var(--text-secondary); }

        .mobile-tx-list { display: none; }
        .tx-card { padding: 14px 0; border-bottom: 1px solid var(--border); }
        .tx-card:last-child { border-bottom: none; }
        .tx-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .tx-card-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
        .tx-card-desc { font-weight: 600; font-size: 14px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tx-card-meta { display: flex; align-items: center; gap: 8px; }
        .category-badge-sm { background-color: var(--primary-light); color: var(--primary); padding: 2px 6px; border-radius: var(--radius); font-size: 10px; font-weight: 600; }
        [data-theme='dark'] .category-badge-sm { color: var(--primary-vivid); }
        .tx-card-date { font-size: 11px; color: var(--text-secondary); }
        .tx-card-amount { font-weight: 700; font-size: 15px; white-space: nowrap; flex-shrink: 0; }
        .tx-card-amount.income { color: var(--primary); }
        .tx-card-amount.expense { color: var(--danger); }
        .empty-state-mobile { padding: 32px 16px; text-align: center; color: var(--text-secondary); font-size: 14px; }

        .cal-section { margin-top: 16px; }
        .cal-section .section-title { margin-bottom: 12px; }
        .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
        .cal-weekday { text-align: center; font-size: 10px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cal-cell { aspect-ratio: 1; border-radius: var(--radius); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; transition: transform 0.15s, box-shadow 0.15s; cursor: default; background: var(--bg); border: 1px solid var(--border); }
        .cal-cell:hover:not(.cal-empty) { transform: scale(1.08); box-shadow: var(--shadow); z-index: 1; }
        .cal-cell.cal-empty { background: transparent; border: none; }
        .cal-cell.cal-zero { opacity: 0.5; }
        .cal-cell.cal-today { border: 2px solid var(--primary); }
        .cal-day { font-size: 12px; font-weight: 700; color: var(--text); }
        .cal-amount { font-size: 9px; font-weight: 600; color: var(--text-secondary); }

        .cat-budget-section { margin-bottom: 16px; }
        .cat-budget-section .section-title { margin-bottom: 16px; }
        .cat-budget-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .cat-budget-item { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }
        .cat-budget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .cat-budget-values { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .cat-budget-bar-track { width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
        .cat-budget-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .cat-budget-status { font-size: 10px; font-weight: 600; margin-top: 4px; display: block; }

        .health-card { padding: 20px; }
        .health-gauge-wrapper { display: flex; justify-content: center; margin: 8px 0 4px; }
        .health-gauge { position: relative; width: 120px; height: 64px; overflow: hidden; }
        .health-gauge-bg { position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--border); opacity: 0.3; }
        .health-gauge-fill { position: absolute; width: 120px; height: 120px; border-radius: 50%; transform: rotate(-90deg); transition: background 0.6s ease; }
        .health-gauge-cover { position: absolute; top: 12px; left: 12px; width: 96px; height: 96px; border-radius: 50%; background: var(--bg-card); }
        .health-gauge-value { position: absolute; bottom: 0; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .health-score { font-size: 28px; font-weight: 800; }
        .health-label { font-size: 10px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .health-details { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--border); }
        .health-detail-row { display: flex; justify-content: space-between; font-size: 11px; }
        .health-detail-row > span:first-child { color: var(--text-secondary); }

        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .chart-card { padding: 20px; }
        .chart-card:hover { box-shadow: var(--shadow-sm); }
        .chart-card .section-title { margin-bottom: 16px; }
        .chart-wrapper { height: 280px; width: 100%; overflow-y: auto; }
        .chart-full { grid-column: 1 / -1; }
        .chart-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 14px; }
        .top-spending-list { display: flex; flex-direction: column; gap: 12px; padding-right: 8px; }
        .top-spending-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg); border-radius: var(--radius); border: 1px solid var(--border); }
        .top-spending-item:hover { border-color: var(--primary); }
        .ts-name { font-weight: 600; font-size: 14px; color: var(--text); }
        .ts-amount { font-weight: 700; font-size: 15px; }

        @media (max-width: 768px) {
          .dash-header-top { flex-direction: column; gap: 10px; }
          .dash-title { font-size: 22px; }
          .dash-month-nav { align-self: stretch; justify-content: space-between; }
          .month-label { min-width: 0; flex: 1; }
          .dash-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .dash-filter { grid-column: 1 / -1; }
          .summary-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .health-card { grid-column: 1 / -1; }
          .health-gauge-wrapper { margin: 4px 0; }
          .cat-budget-grid { grid-template-columns: 1fr 1fr; }
          .summary-card { padding: 16px; }
          .summary-value { font-size: 24px; }
          .summary-label { font-size: 11px; }
          .summary-diff { font-size: 10px; }
          .summary-breakdown { font-size: 10px; gap: 8px; }
          .budget-progress { padding: 12px 16px; }
          .budget-progress-header { flex-direction: column; align-items: flex-start; gap: 4px; font-size: 12px; }
          .biggest-expense-alert { font-size: 12px; }
          .desktop-table { display: none !important; }
          .mobile-tx-list { display: block; }
          .charts-grid { grid-template-columns: 1fr; }
          .chart-wrapper { height: 220px; }
          .section-title { font-size: 15px; }
        }
        @media (max-width: 380px) {
          .dash-actions { grid-template-columns: 1fr; }
          .summary-value { font-size: 22px; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
