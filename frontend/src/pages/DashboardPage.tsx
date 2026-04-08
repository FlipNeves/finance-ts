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
      setEvolution(evolutionRes.data); // Ensure chronological order since backend already provides it oldest to newest
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
    <div className="dashboard-container fade-in">
      <header className="dashboard-header mb-3">
        <div className="header-left flex flex-col gap-1">
          <h1 className="header-title">{t('dashboard.title')}</h1>
          <p className="header-subtitle text-muted">Acompanhe suas finanças com clareza.</p>
        </div>
        <div className="header-actions flex gap-2 items-center">
          <div className="month-selector flex items-center">
            <button className="btn-icon" onClick={handlePrevMonth}>&lt;</button>
            <span className="month-label">{monthLabel}</span>
            <button className="btn-icon" onClick={handleNextMonth}>&gt;</button>
          </div>
          <select 
            className="form-control" 
            style={{ width: 'auto' }} 
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
          <button className="btn btn-outline" onClick={() => setIsBudgetOpen(true)} style={{ marginLeft: '8px' }}>
            Orçamentos
          </button>
        </div>
      </header>
      
      <div className="grid-summary mb-3">
        <div className="card summary-card income-card">
          <div className="card-bg-decoration decoration-green"></div>
          <div className="flex flex-col relative z-10">
            <span className="label flex items-center gap-1">
              <span className="dot dot-success"></span>
              {t('dashboard.totalIncome')}
            </span>
            <span className="value">R${summary?.totalIncome.toFixed(2)}</span>
            <span style={{ fontSize: '12px', marginTop: '4px', color: incomeDiff >= 0 ? '#10b981' : '#ef4444' }}>
              {incomeDiff >= 0 ? '↑' : '↓'} R$ {Math.abs(incomeDiff).toFixed(2)} vs mês anterior
            </span>
          </div>
        </div>
        <div className="card summary-card expense-card">
           <div className="card-bg-decoration decoration-red"></div>
          <div className="flex flex-col relative z-10">
            <span className="label flex items-center gap-1">
               <span className="dot dot-danger"></span>
              {t('dashboard.totalExpense')}
            </span>
            <span className="value">R${summary?.totalExpense.toFixed(2)}</span>
            <span style={{ fontSize: '12px', marginTop: '4px', color: expenseDiff <= 0 ? '#10b981' : '#ef4444' }}>
              {expenseDiff > 0 ? '↑' : '↓'} R$ {Math.abs(expenseDiff).toFixed(2)} vs mês anterior
            </span>
            {summary?.totalExpense > 0 && (
              <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(128,128,128,0.2)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Fixo: R$ {summary.fixedExpense.toFixed(2)} ({(summary.fixedExpense/summary.totalExpense*100).toFixed(0)}%)</span>
                <span>Var: R$ {summary.variableExpense.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="card summary-card balance-card">
          <div className="card-bg-decoration decoration-blue"></div>
          <div className="flex flex-col relative z-10">
            <span className="label flex items-center gap-1">
               <span className="dot dot-info"></span>
              {t('dashboard.balance')}
            </span>
            <span className={`value ${summary && summary.balance < 0 ? 'negative' : 'positive'}`}>
              R${summary?.balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {summary?.budgetLimit > 0 && (
        <div className="card mb-3 p-3 flex flex-col gap-1" style={{ padding: '16px 24px' }}>
            <div className="flex justify-between items-center text-sm" style={{ fontWeight: 600 }}>
              <span>Progresso do Orçamento Mensal</span>
              <span>R$ {summary.totalExpense.toFixed(2)} / R$ {summary.budgetLimit.toFixed(2)} ({budgetPct.toFixed(0)}%)</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: budgetPct > 90 ? '#ef4444' : budgetPct > 75 ? '#f59e0b' : '#10b981',
                width: Math.min(budgetPct, 100) + '%',
                transition: 'width 0.5s ease-in-out'
              }}></div>
            </div>
        </div>
      )}
      
      {summary?.biggestExpense && (
        <div className="mb-3" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
          <span>⚠️</span>
          <span>Maior despesa do mês: {summary.biggestExpense.description} (R$ {summary.biggestExpense.amount.toFixed(2)}) na categoria {summary.biggestExpense.category}.</span>
        </div>
      )}

      {/* Rest of the tables and charts remain the same structure */}
       <div className="card mb-3 table-card">
        <div className="flex justify-between items-center mb-2 table-header">
           <h2 className="section-title">{t('transactions.recent')}</h2>
           <Link to="/transactions" className="btn btn-outline btn-sm view-all-btn">{t('dashboard.viewAll') || 'View All'} →</Link>
        </div>
        <div className="table-responsive">
          <table className="transaction-table">
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
                  <td colSpan={6} className="text-center empty-state">
                    {t('transactions.noTransactions') || 'No transactions found.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id} className={`tr-${tr.type}`}>
                    <td className="text-muted">{new Date(tr.date).toLocaleDateString()}</td>
                    <td><span className="desc">{tr.description || '-'}</span></td>
                    <td><span className="user-badge">{tr.userId?.name || '?'}</span></td>
                    <td><span className="category-badge">{tr.category}</span></td>
                    <td><span className="bank">{tr.bankAccount || '-'} {tr.isFixed ? '(Fixa)' : ''}</span></td>
                    <td className={`amount ${tr.type}`}>
                      {tr.type === 'income' ? '+' : '-'}R${tr.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      <div className="grid-charts mt-3">
        <div className="card chart-container shadow-sm">
          <h3 className="section-title">{t('dashboard.spendingByCategory')} (Pie)</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spending}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {spending.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center empty-state">
                {t('dashboard.noData') || 'No spending data for this period'}
              </div>
            )}
          </div>
        </div>

        <div className="card chart-container shadow-sm">
          <h3 className="section-title">{t('dashboard.spendingByCategory')} (Bar)</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                     cursor={{ fill: 'var(--bg)', opacity: 0.5 }}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {spending.map((_, index) => (
                      <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center empty-state">
                {t('dashboard.noData') || 'No spending data for this period'}
              </div>
            )}
          </div>
        </div>

        <div className="card chart-container area-chart-card shadow-sm" style={{ gridColumn: '1 / -1' }}>
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
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(val) => `R$${val}`}/>
                  <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="income" name={t('transactions.income') || 'Income'} stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name={t('transactions.expense') || 'Expense'} stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center empty-state">
                {t('dashboard.noData') || 'No data evolution available'}
              </div>
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

        .dashboard-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           flex-wrap: wrap;
           gap: 16px;
        }
        
        .header-title {
          font-size: 28px;
          margin-bottom: 0;
        }
        
        .header-subtitle {
          margin: 0;
          font-size: 14px;
        }
        
        .text-muted { color: var(--text-muted); }

        .month-selector {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 4px;
        }
        
        .month-label {
          font-weight: 600;
          min-width: 140px;
          text-align: center;
          text-transform: capitalize;
          font-size: 14px;
        }

        .btn-icon {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .btn-icon:hover {
          background: var(--bg);
        }

        .income-btn { color: #10b981; border-color: #10b981; }
        .income-btn:hover { background: #d1fae5 !important; border-color: #059669; color: #059669; }

        .expense-btn { background-color: #ef4444; }
        .expense-btn:hover { background-color: #dc2626 !important; }

        .grid-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .summary-card {
          position: relative;
          overflow: hidden;
          padding: 24px 28px;
        }

        .card-bg-decoration {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          opacity: 0.15;
          filter: blur(20px);
          z-index: 0;
        }

        .decoration-green { background: #10b981; }
        .decoration-red { background: #ef4444; }
        .decoration-blue { background: #3b82f6; }

        .summary-card .label {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-success { background: #10b981; }
        .dot-danger { background: #ef4444; }
        .dot-info { background: #3b82f6; }

        .summary-card .value {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
        }
        
        .summary-card .value.positive { color: #10b981; }
        .summary-card .value.negative { color: #ef4444; }

        .section-title {
          font-size: 18px;
          margin-bottom: 0;
        }

        .table-card {
          padding: 24px;
        }

        .view-all-btn {
          border: none;
          box-shadow: none;
          color: var(--primary);
        }

        .transaction-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }
        
        .transaction-table th {
          text-align: left;
          padding: 8px 16px;
          color: var(--text-muted);
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }

        .text-right { text-align: right !important; }
        
        .transaction-table td {
          padding: 16px;
          font-size: 14px;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        /* Rounded row edges */
        .transaction-table td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        .transaction-table td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
        
        .transaction-table tbody tr {
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .transaction-table tbody tr:hover td {
          background: var(--bg);
          cursor: pointer;
        }

        .amount {
          font-weight: 700;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        
        .amount.income { color: #10b981; }
        .amount.expense { color: #ef4444; }

        .category-badge {
          background-color: var(--primary-light);
          color: var(--primary-dark);
          padding: 4px 10px;
          border-radius: 9999px; /* Pill */
          font-size: 12px;
          font-weight: 600;
        }
        
        .user-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .bank { font-size: 12px; color: var(--text-muted); margin-top: 2px;}
        .desc { font-weight: 600; color: var(--text); }
        .empty-state { padding: 40px !important; color: var(--text-muted); }
        
        .table-responsive { overflow-x: auto; }

        .grid-charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        .chart-container { padding: 24px; }
        .chart-container .section-title { margin-bottom: 24px; }
        
        .chart-wrapper {
          height: 300px;
          width: 100%;
        }

        @media (max-width: 600px) {
          .grid-charts { grid-template-columns: 1fr; }
          .chart-wrapper { height: 260px; }
          .dashboard-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; justify-content: space-between; flex-wrap: wrap; }
          .transaction-table td { padding: 12px 8px; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
