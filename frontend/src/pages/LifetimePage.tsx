import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SavingsMasterCard from '../components/SavingsMasterCard';
import AccountBalanceCard from '../components/AccountBalanceCard';

const LifetimePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [totalAccumulated, setTotalAccumulated] = useState<any>(null);
  const [accountsReport, setAccountsReport] = useState<any[]>([]);
  const [evolution, setEvolution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.familyId || user?._id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const farPast = new Date('2000-01-01').toISOString();
      const now = new Date().toISOString();

      const [accumRes, accountsRes, evolutionRes] = await Promise.all([
        api.get('/reports/total-accumulated'),
        api.get('/reports/balance-by-account', { params: { startDate: farPast, endDate: now } }),
        api.get('/reports/evolution', { params: { endDate: now, months: 12 } }),
      ]);

      setTotalAccumulated(accumRes.data);
      setAccountsReport(accountsRes.data);
      setEvolution(evolutionRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="lt-loading">{t('common.loading')}</div>;

  const monthsTracked = evolution.length || 1;
  const totalIncome = totalAccumulated?.totalIncome || 0;
  const totalExpense = totalAccumulated?.totalExpense || 0;
  const savingsRateAllTime = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  return (
    <div className="lt-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">05 · Lifetime</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>{t('lifetime.title')}</h1>
          <p className="page-subtitle">{t('lifetime.subtitle')}</p>
        </div>
      </header>

      {totalAccumulated && (
        <SavingsMasterCard
          savings={totalAccumulated}
          monthsTracked={monthsTracked}
          currentMonthExpense={0}
        />
      )}

      <section className="lt-meta">
        <div className="lt-meta-item">
          <span className="eyebrow">{t('lifetime.monthsTracked')}</span>
          <span className="lt-meta-value">{String(monthsTracked).padStart(2, '0')}</span>
        </div>
        <div className="lt-meta-item">
          <span className="eyebrow eyebrow-primary">{t('lifetime.savingsRate')}</span>
          <span className={`lt-meta-value ${savingsRateAllTime >= 0 ? 'is-up' : 'is-down'}`}>
            {savingsRateAllTime.toFixed(0)}%
          </span>
        </div>
        <div className="lt-meta-item">
          <span className="eyebrow">{t('lifetime.activeAccounts')}</span>
          <span className="lt-meta-value">{String(accountsReport.length).padStart(2, '0')}</span>
        </div>
      </section>

      <div className="lt-grid">
        {accountsReport && accountsReport.length > 0 && (
          <section className="lt-section">
            <AccountBalanceCard accounts={accountsReport} />
          </section>
        )}

        <section className="lt-section lt-section-full">
          <h3 className="section-title">
            <span className="section-numeral">04</span>
            {t('lifetime.evolutionTitle')}
          </h3>
          <div className="lt-chart">
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ltIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ltExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={(val) => `R$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 0,
                      border: '1px solid var(--text)',
                      boxShadow: 'none',
                      background: 'var(--bg-card)',
                      color: 'var(--text)',
                    }}
                  />
                  <Legend iconType="square" wrapperStyle={{ paddingTop: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name={t('transactions.income')}
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ltIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name={t('transactions.expense')}
                    stroke="var(--danger)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ltExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="lt-empty">{t('dashboard.noData')}</div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .lt-page { padding: 0; }
        .fade-in { animation: fadeIn 0.35s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .lt-loading { text-align: center; padding: 60px; color: var(--text-secondary); font-style: italic; }

        .lt-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          margin-bottom: 32px;
          border-top: 1px solid var(--text);
          border-bottom: 1px solid var(--border);
        }
        .lt-meta-item {
          padding: 18px 22px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lt-meta-item:last-child { border-right: none; }
        .lt-meta-value {
          font-family: var(--sans);
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -0.8px;
          font-variant-numeric: tabular-nums;
          color: var(--text);
        }
        .lt-meta-value.is-up { color: var(--primary); }
        .lt-meta-value.is-down { color: var(--danger); }

        .lt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-top: 1px solid var(--text);
        }
        .lt-section {
          padding: 24px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .lt-section:nth-child(2n) { border-right: none; }
        .lt-section.lt-section-full {
          grid-column: 1 / -1;
          border-right: none;
        }
        .lt-section .section-title { margin-bottom: 20px; }

        .lt-chart { height: 320px; width: 100%; }
        .lt-empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-style: italic;
        }

        @media (max-width: 960px) {
          .lt-grid { grid-template-columns: 1fr; }
          .lt-section { border-right: none; }
        }

        @media (max-width: 768px) {
          .lt-meta { grid-template-columns: 1fr; }
          .lt-meta-item { border-right: none; border-bottom: 1px solid var(--border); }
          .lt-meta-item:last-child { border-bottom: none; }
          .lt-section { padding: 18px 0; }
          .lt-chart { height: 260px; }
        }
      `}</style>
    </div>
  );
};

export default LifetimePage;
