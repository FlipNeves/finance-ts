import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [summary, setSummary] = useState<{ totalIncome: number; totalExpense: number; balance: number } | null>(null);
  const [spending, setSpending] = useState<{ category: string; amount: number }[]>([]);
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
  }, [user]);

  const loadData = async () => {
    try {
      const [summaryRes, spendingRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/spending-by-category'),
      ]);
      setSummary(summaryRes.data);
      setSpending(spendingRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-3">{t('common.loading')}</div>;

  if (!user?.familyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 mt-3" style={{ minHeight: '50vh' }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <h2>{t('dashboard.noFamily') || 'Welcome!'}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0' }}>
            {t('dashboard.noFamilyDesc') || 'To see your financial dashboard, first create or join a family group.'}
          </p>
          <Link to="/family" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '8px' }}>
            {t('family.title') || 'Go to Family'} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="flex justify-between items-center mb-3">
        <h1>{t('dashboard.title')}</h1>
        <button className="btn btn-outline" onClick={loadData}>🔄 {t('common.refresh') || 'Refresh'}</button>
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
      </div>

      <style>{`
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
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
