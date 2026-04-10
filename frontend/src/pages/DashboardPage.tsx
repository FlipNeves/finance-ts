import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import api from '../services/api';
import TransactionModal from '../components/TransactionModal';
import BudgetModal from '../components/BudgetModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [summary, setSummary] = useState<any>(null);
  const [spending, setSpending] = useState<{ category: string; amount: number }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [evolution, setEvolution] = useState<any[]>([]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  // Soft fintech colors for charts
  const COLORS = theme === 'light' 
    ? ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    : ['#059669', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0d9488'];

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

      const [summaryRes, spendingRes, transRes, catRes, familyRes, evolutionRes] = await Promise.all([
        api.get('/reports/summary', { params: { startDate: start, endDate: end } }),
        api.get('/reports/spending-by-category', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/transactions', { params: { startDate: start, endDate: end, type: typeFilter } }),
        api.get('/transactions/categories'),
        api.get('/family/details').catch(() => ({ data: { bankAccounts: [] } })),
        api.get('/reports/evolution', { params: { endDate: end } })
      ]);
      setSummary(summaryRes.data);
      setSpending(spendingRes.data);
      setTransactions(transRes.data.slice(0, 5)); 
      setCategories(catRes.data);
      setBankAccounts(familyRes.data.bankAccounts || []);
      setEvolution(evolutionRes.data);
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
  
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) return <div className="text-center mt-3" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>;

  const budgetPct = summary?.budgetLimit ? (summary.totalExpense / summary.budgetLimit) * 100 : 0;
  
  const expenseDiff = summary?.totalExpense - (summary?.previousMonthExpense || 0);
  const incomeDiff = summary?.totalIncome - (summary?.previousMonthIncome || 0);

  return (
    <div className="dash fade-in">
      {/* HEADER: Title + Controls */}
      <header className="dash-header">
        <div className="dash-header-top">
          <div>
            <h1 className="dash-title">{t('dashboard.title')}</h1>
            <p className="dash-subtitle">Acompanhe suas finanças com clareza.</p>
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
            <option value="all">{t('dashboard.all') || 'All Types'}</option>
            <option value="income">{t('transactions.income')}</option>
            <option value="expense">{t('transactions.expense')}</option>
          </select>
          <button className="btn btn-outline income-btn" onClick={() => openModal('income')}>
            + {t('transactions.addIncome') || 'Income'}
          </button>
          <button className="btn btn-primary expense-btn" onClick={() => openModal('expense')}>
            + {t('transactions.addExpense') || 'Expense'}
          </button>
          <button className="btn btn-outline" onClick={() => setIsBudgetOpen(true)}>
            Orçamentos
          </button>
        </div>
      </header>
      
      {/* SUMMARY CARDS */}
      <div className="summary-grid">
        <div className="card summary-card">
          <div className="card-decoration deco-green"></div>
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-green"></span>
              {t('dashboard.totalIncome')}
            </span>
            <span className="summary-value">{`R$${summary?.totalIncome.toFixed(2)}`}</span>
            <span className="summary-diff" style={{ color: incomeDiff >= 0 ? '#10b981' : '#ef4444' }}>
              {incomeDiff >= 0 ? '↑' : '↓'} R$ {Math.abs(incomeDiff).toFixed(2)} vs mês anterior
            </span>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-decoration deco-red"></div>
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-red"></span>
              {t('dashboard.totalExpense')}
            </span>
            <span className="summary-value">{`R$${summary?.totalExpense.toFixed(2)}`}</span>
            <span className="summary-diff" style={{ color: expenseDiff <= 0 ? '#10b981' : '#ef4444' }}>
              {expenseDiff > 0 ? '↑' : '↓'} R$ {Math.abs(expenseDiff).toFixed(2)} vs mês anterior
            </span>
            {summary?.totalExpense > 0 && (
              <div className="summary-breakdown">
                <span>Fixo: R$ {summary.fixedExpense.toFixed(2)} ({(summary.fixedExpense/summary.totalExpense*100).toFixed(0)}%)</span>
                <span>Var: R$ {summary.variableExpense.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-decoration deco-blue"></div>
          <div className="summary-inner">
            <span className="summary-label">
              <span className="dot dot-blue"></span>
              {t('dashboard.balance')}
            </span>
            <span className={`summary-value ${summary && summary.balance < 0 ? 'negative' : 'positive'}`}>
              {`R$${summary?.balance.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* BUDGET PROGRESS */}
      {summary?.budgetLimit > 0 && (
        <div className="card budget-progress">
          <div className="budget-progress-header">
            <span>Progresso do Orçamento Mensal</span>
            <span>R$ {summary.totalExpense.toFixed(2)} / R$ {summary.budgetLimit.toFixed(2)} ({budgetPct.toFixed(0)}%)</span>
          </div>
          <div className="budget-bar-track">
            <div className="budget-bar-fill" style={{ 
              background: budgetPct > 90 ? '#ef4444' : budgetPct > 75 ? '#f59e0b' : '#10b981',
              width: Math.min(budgetPct, 100) + '%',
            }}></div>
          </div>
        </div>
      )}
      
      {/* BIGGEST EXPENSE */}
      {summary?.biggestExpense && (
        <div className="biggest-expense-alert">
          <span>⚠️</span>
          <span>Maior despesa do mês: {summary.biggestExpense.description} (R$ {summary.biggestExpense.amount.toFixed(2)}) na categoria {summary.biggestExpense.category}.</span>
        </div>
      )}

      {/* RECENT TRANSACTIONS */}
      <div className="card transactions-section">
        <div className="transactions-header">
          <h2 className="section-title">{t('transactions.recent')}</h2>
          <Link to="/transactions" className="view-all-link">{t('dashboard.viewAll') || 'View All'} →</Link>
        </div>

        {/* Desktop table */}
        <div className="table-responsive desktop-table">
          <table className="tx-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('common.user') || 'User'}</th>
                <th>{t('transactions.category')}</th>
                <th>Conta</th>
                <th className="text-right">{t('transactions.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center empty-td">
                    {t('transactions.noTransactions') || 'No transactions found.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id}>
                    <td className="text-muted">{new Date(tr.date).toLocaleDateString()}</td>
                    <td><span className="tx-desc">{tr.description || '-'}</span></td>
                    <td><span className="user-badge">{tr.userId?.name || '?'}</span></td>
                    <td><span className="category-badge">{tr.category}</span></td>
                    <td><span className="tx-bank">{tr.bankAccount || '-'} {tr.isFixed ? '(Fixa)' : ''}</span></td>
                    <td className={`tx-amount ${tr.type}`}>
                      {tr.type === 'income' ? '+' : '-'}R${tr.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="mobile-tx-list">
          {transactions.length === 0 ? (
            <div className="empty-state-mobile">
              {t('transactions.noTransactions') || 'No transactions found.'}
            </div>
          ) : (
            transactions.map((tr) => (
              <div key={tr._id} className="tx-card">
                <div className="tx-card-top">
                  <div className="tx-card-left">
                    <span className="tx-card-desc">{tr.description || '-'}</span>
                    <div className="tx-card-meta">
                      <span className="category-badge-sm">{tr.category}</span>
                      <span className="tx-card-date">{new Date(tr.date).toLocaleDateString()}</span>
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

      {/* CHARTS */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h3 className="section-title">{t('dashboard.spendingByCategory')} (Pie)</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spending}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {spending.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">{t('dashboard.noData') || 'No spending data for this period'}</div>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <h3 className="section-title">{t('dashboard.spendingByCategory')} (Bar)</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip cursor={{ fill: 'var(--bg)', opacity: 0.5 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {spending.map((_, index) => (
                      <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">{t('dashboard.noData') || 'No spending data for this period'}</div>
            )}
          </div>
        </div>

        <div className="card chart-card chart-full">
          <h3 className="section-title">{t('dashboard.evolution') || 'Last 3 Months Evolution'}</h3>
          <div className="chart-wrapper">
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(val) => `R$${val}`}/>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="income" name={t('transactions.income') || 'Income'} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name={t('transactions.expense') || 'Expense'} stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">{t('dashboard.noData') || 'No data evolution available'}</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ========== HEADER ========== */
        .dash-header {
          margin-bottom: 20px;
        }
        .dash-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }
        .dash-title {
          font-size: 26px;
          margin: 0;
        }
        .dash-subtitle {
          margin: 2px 0 0 0;
          font-size: 14px;
          color: var(--text-muted);
        }
        .dash-month-nav {
          display: inline-flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 2px;
          flex-shrink: 0;
        }
        .month-arrow {
          background: transparent;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text);
          font-weight: 700;
          transition: background 0.2s;
        }
        .month-arrow:hover { background: var(--bg); }
        .month-label {
          font-weight: 600;
          min-width: 120px;
          text-align: center;
          text-transform: capitalize;
          font-size: 13px;
        }
        .dash-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .dash-filter {
          width: auto;
          padding: 8px 12px;
          font-size: 13px;
        }
        .income-btn { color: #10b981; border-color: #10b981; }
        .income-btn:hover { background: #d1fae5 !important; border-color: #059669; color: #059669; }
        .expense-btn { background-color: #ef4444; }
        .expense-btn:hover { background-color: #dc2626 !important; }

        /* ========== SUMMARY GRID ========== */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        .summary-card {
          position: relative;
          overflow: hidden;
          padding: 20px;
        }
        .summary-card:hover { transform: none; }
        .card-decoration {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          opacity: 0.15;
          filter: blur(20px);
          z-index: 0;
        }
        .deco-green { background: #10b981; }
        .deco-red { background: #ef4444; }
        .deco-blue { background: #3b82f6; }
        .summary-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
        }
        .summary-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.3px;
          margin-bottom: 6px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dot-green { background: #10b981; }
        .dot-red { background: #ef4444; }
        .dot-blue { background: #3b82f6; }
        .summary-value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .summary-value.positive { color: #10b981; }
        .summary-value.negative { color: #ef4444; }
        .summary-diff {
          font-size: 11px;
          margin-top: 4px;
        }
        .summary-breakdown {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(128,128,128,0.2);
          font-size: 11px;
          color: var(--text-muted);
        }

        /* ========== BUDGET PROGRESS ========== */
        .budget-progress {
          padding: 14px 20px;
          margin-bottom: 16px;
        }
        .budget-progress:hover { transform: none; }
        .budget-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
          gap: 8px;
        }
        .budget-bar-track {
          width: 100%;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
        }
        .budget-bar-fill {
          height: 100%;
          transition: width 0.5s ease-in-out;
          border-radius: 4px;
        }

        /* ========== BIGGEST EXPENSE ========== */
        .biggest-expense-alert {
          background: var(--primary-light);
          color: var(--primary-dark);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid var(--primary);
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        /* ========== TRANSACTIONS TABLE (Desktop) ========== */
        .transactions-section { margin-bottom: 16px; }
        .transactions-section:hover { transform: none; }
        .transactions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 17px;
          margin: 0;
        }
        .view-all-link {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
        }
        .table-responsive { overflow-x: auto; }
        .tx-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 6px;
        }
        .tx-table th {
          text-align: left;
          padding: 8px 12px;
          color: var(--text-muted);
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }
        .tx-table td {
          padding: 12px;
          font-size: 13px;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .tx-table td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        .tx-table td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
        .tx-table tbody tr:hover td { background: var(--bg); }
        .tx-desc { font-weight: 600; color: var(--text); }
        .tx-bank { font-size: 12px; color: var(--text-muted); }
        .tx-amount {
          font-weight: 700;
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .tx-amount.income { color: #10b981; }
        .tx-amount.expense { color: #ef4444; }
        .text-right { text-align: right !important; }
        .category-badge {
          background-color: var(--primary-light);
          color: var(--primary-dark);
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .user-badge {
          display: inline-flex;
          align-items: center;
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
        }
        .empty-td { padding: 32px !important; color: var(--text-muted); }

        /* ========== TRANSACTIONS MOBILE CARDS ========== */
        .mobile-tx-list {
          display: none;
        }
        .tx-card {
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
        }
        .tx-card:last-child { border-bottom: none; }
        .tx-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .tx-card-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }
        .tx-card-desc {
          font-weight: 600;
          font-size: 14px;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tx-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .category-badge-sm {
          background-color: var(--primary-light);
          color: var(--primary-dark);
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
        }
        .tx-card-date {
          font-size: 11px;
          color: var(--text-muted);
        }
        .tx-card-amount {
          font-weight: 700;
          font-size: 15px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tx-card-amount.income { color: #10b981; }
        .tx-card-amount.expense { color: #ef4444; }
        .empty-state-mobile {
          padding: 32px 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        /* ========== CHARTS ========== */
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .chart-card { padding: 20px; }
        .chart-card:hover { transform: none; }
        .chart-card .section-title { margin-bottom: 16px; }
        .chart-wrapper {
          height: 280px;
          width: 100%;
        }
        .chart-full { grid-column: 1 / -1; }
        .chart-empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        /* ========== MOBILE ========== */
        @media (max-width: 768px) {
          .dash-header-top {
            flex-direction: column;
            gap: 10px;
          }
          .dash-title { font-size: 22px; }
          .dash-month-nav { align-self: stretch; justify-content: space-between; }
          .month-label { min-width: 0; flex: 1; }
          .dash-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .dash-filter {
            grid-column: 1 / -1;
          }

          .summary-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .summary-card { padding: 16px; }
          .summary-value { font-size: 24px; }
          .summary-label { font-size: 12px; }
          .summary-diff { font-size: 10px; }
          .summary-breakdown { font-size: 10px; gap: 8px; }

          .budget-progress { padding: 12px 16px; }
          .budget-progress-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
            font-size: 12px;
          }

          .biggest-expense-alert { font-size: 12px; }

          /* Hide desktop table, show mobile cards */
          .desktop-table { display: none !important; }
          .mobile-tx-list { display: block; }

          .charts-grid {
            grid-template-columns: 1fr;
          }
          .chart-wrapper { height: 220px; }

          .section-title { font-size: 15px; }
        }

        @media (max-width: 380px) {
          .dash-actions {
            grid-template-columns: 1fr;
          }
          .summary-value { font-size: 22px; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
