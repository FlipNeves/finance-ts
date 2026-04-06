import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import api from '../services/api';
import TransactionModal from '../components/TransactionModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [summary, setSummary] = useState<{ totalIncome: number; totalExpense: number; balance: number } | null>(null);
  const [spending, setSpending] = useState<{ category: string; amount: number }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [evolution, setEvolution] = useState<any[]>([]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

  const [loading, setLoading] = useState(true);

  const COLORS = theme === 'light' 
    ? ['#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6']
    : ['#27ae60', '#2980b9', '#f39c12', '#d35400', '#c0392b', '#8e44ad'];

  useEffect(() => {
    if (user?.familyId) {
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
        api.get('/reports/evolution')
      ]);
      setSummary(summaryRes.data);
      setSpending(spendingRes.data);
      setTransactions(transRes.data.slice(0, 5)); 
      setCategories(catRes.data);
      setBankAccounts(familyRes.data.bankAccounts || []);
      setEvolution(evolutionRes.data.reverse()); // Ensure chronological order
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

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) return <div className="text-center mt-3">{t('common.loading')}</div>;



  return (
    <div className="dashboard-container">
      <header className="dashboard-header mb-3">
        <div className="header-left flex items-center gap-2">
          <h1>{t('dashboard.title')}</h1>
          <div className="month-selector flex items-center gap-1">
            <button className="btn btn-outline btn-sm" onClick={handlePrevMonth}>&lt;</button>
            <span style={{ fontWeight: 600, minWidth: '130px', textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel}</span>
            <button className="btn btn-outline btn-sm" onClick={handleNextMonth}>&gt;</button>
          </div>
        </div>
        <div className="header-actions flex gap-2">
          <select 
            className="form-control" 
            style={{ width: 'auto', padding: '6px 12px' }} 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">{t('dashboard.all') || 'All Types'}</option>
            <option value="income">{t('transactions.income')}</option>
            <option value="expense">{t('transactions.expense')}</option>
          </select>
          <button className="btn btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', padding: '6px 12px' }} onClick={() => openModal('income')}>
            + {t('transactions.addIncome') || 'Income'}
          </button>
          <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => openModal('expense')}>
            + {t('transactions.addExpense') || 'Expense'}
          </button>
        </div>
      </header>

      <div className="grid-summary">
        <div className="card summary-card income">
          <div className="flex flex-col">
            <span className="label">{t('dashboard.totalIncome')}</span>
            <span className="value">+{summary?.totalIncome.toFixed(2)}</span>
          </div>
          <div className="icon">📈</div>
        </div>
        <div className="card summary-card expense">
          <div className="flex flex-col">
            <span className="label">{t('dashboard.totalExpense')}</span>
            <span className="value">-{summary?.totalExpense.toFixed(2)}</span>
          </div>
          <div className="icon">📉</div>
        </div>
        <div className="card summary-card balance">
          <div className="flex flex-col">
            <span className="label">{t('dashboard.balance')}</span>
            <span className={`value ${summary && summary.balance < 0 ? 'negative' : 'positive'}`}>
              {summary?.balance.toFixed(2)}
            </span>
          </div>
          <div className="icon">💰</div>
        </div>
      </div>

       <div className="card mt-3">
        <div className="flex justify-between items-center mb-2">
           <h2>{t('transactions.recent')}</h2>
           <Link to="/transactions" className="btn btn-outline btn-sm">{t('dashboard.viewAll') || 'View All'} →</Link>
        </div>
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('common.user') || 'User'}</th>
                <th>{t('transactions.category')}</th>
                <th>{t('transactions.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '20px', color: 'var(--text-muted)' }}>
                    {t('transactions.noTransactions') || 'No transactions found.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id} className={tr.type}>
                    <td>{new Date(tr.date).toLocaleDateString()}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="desc">{tr.description || '-'}</span>
                        <span className="bank">{tr.bankAccount}</span>
                      </div>
                    </td>
                    <td><span style={{fontSize: '13px', color: 'var(--text-muted)'}}>{tr.userId?.name || '?'}</span></td>
                    <td><span className="badge">{tr.category}</span></td>
                    <td className="amount">
                      {tr.type === 'income' ? '+' : '-'}${tr.amount.toFixed(2)}
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

      <div className="grid-charts mt-3">
        <div className="card chart-container">
          <h3>{t('dashboard.spendingByCategory')} (Pie)</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const { category, percent } = props;
                      return `${category} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {spending.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
                {t('dashboard.noData') || 'No spending data for this period'}
              </div>
            )}
          </div>
        </div>

        <div className="card chart-container">
          <h3>{t('dashboard.spendingByCategory')} (Bar)</h3>
          <div className="chart-wrapper">
            {spending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip 
                     contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                     itemStyle={{ color: 'var(--text)' }}
                  />
                  <Legend />
                  <Bar dataKey="amount">
                    {spending.map((_, index) => (
                      <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
                {t('dashboard.noData') || 'No spending data for this period'}
              </div>
            )}
          </div>
        </div>

        <div className="card chart-container" style={{ gridColumn: '1 / -1' }}>
          <h3>{t('dashboard.evolution') || 'Last 3 Months Evolution'}</h3>
          <div className="chart-wrapper">
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip 
                     contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                     itemStyle={{ color: 'var(--text)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" name={t('transactions.income') || 'Income'} stroke={COLORS[0]} strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="expense" name={t('transactions.expense') || 'Expense'} stroke={COLORS[4]} strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="balance" name={t('dashboard.balance') || 'Balance'} stroke={COLORS[1]} strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
                {t('dashboard.noData') || 'No data evolution available'}
              </div>
            )}
          </div>
        </div>
      </div>

     

      

      <style>{`
        .dashboard-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           flex-wrap: wrap;
           gap: 16px;
        }
        .btn-sm {
           padding: 4px 10px;
           font-size: 14px;
        }
        .grid-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }
        .summary-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .summary-card .label {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-card .value {
          font-size: 28px;
          font-weight: 800;
          margin-top: 4px;
        }
        .summary-card .icon {
          font-size: 32px;
          opacity: 0.8;
        }
        .summary-card.income .value { color: var(--success); }
        .summary-card.expense .value { color: var(--danger); }
        .summary-card.balance .value.positive { color: var(--primary); }
        .summary-card.balance .value.negative { color: var(--danger); }

        .grid-charts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 24px;
        }
        .chart-container h3 {
          margin-bottom: 24px;
          font-size: 18px;
          font-weight: 700;
        }
        .chart-wrapper {
          height: 350px;
          width: 100%;
        }

        @media (max-width: 600px) {
          .grid-charts {
            grid-template-columns: 1fr;
          }
          .chart-wrapper {
            height: 300px;
          }
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
        
        /* Table Styles from Transactions */
        .transaction-table {
          width: 100%;
          border-collapse: collapse;
        }
        .transaction-table th {
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid var(--border);
          color: var(--text-muted);
          font-size: 14px;
          text-transform: uppercase;
        }
        .transaction-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          font-size: 15px;
        }
        .transaction-table tr:hover {
          background-color: var(--bg);
        }
        .transaction-table .amount {
          font-weight: 700;
          text-align: right;
        }
        .transaction-table tr.income .amount { color: var(--success); }
        .transaction-table tr.expense .amount { color: var(--danger); }
        .badge {
          background-color: var(--primary-light);
          color: var(--primary);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
        }
        .bank { font-size: 11px; color: var(--text-muted); }
        .desc { font-weight: 600; }
        .table-responsive { overflow-x: auto; }
      `}</style>
    </div>
  );
};

export default DashboardPage;
