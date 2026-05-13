import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SavingsMasterCard from '../../components/SavingsMasterCard';
import AccountBalanceCard from '../../components/AccountBalanceCard';
import { useLifetimeData } from './hooks/useLifetime';
import './LifetimePage.css';

export default function LifetimePage() {
  const { t } = useTranslation();
  const { totalAccumulated, accountsReport, evolution, isLoading } = useLifetimeData();

  if (isLoading) return <div className="lt-loading">{t('common.loading')}</div>;

  const accounts = accountsReport.data ?? [];
  const evolutionData = evolution.data ?? [];
  const accumulated = totalAccumulated.data;

  const monthsTracked = evolutionData.length || 1;
  const totalIncome = accumulated?.totalIncome || 0;
  const totalExpense = accumulated?.totalExpense || 0;
  const savingsRateAllTime =
    totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  return (
    <div className="lt-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">05 · Lifetime</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {t('lifetime.title')}
          </h1>
          <p className="page-subtitle">{t('lifetime.subtitle')}</p>
        </div>
      </header>

      {accumulated && (
        <SavingsMasterCard
          savings={accumulated}
          monthsTracked={monthsTracked}
          currentMonthExpense={0}
        />
      )}

      <section className="lt-meta">
        <div className="lt-meta-item">
          <span className="eyebrow">{t('lifetime.monthsTracked')}</span>
          <span className="lt-meta-value">
            {String(monthsTracked).padStart(2, '0')}
          </span>
        </div>
        <div className="lt-meta-item">
          <span className="eyebrow eyebrow-primary">{t('lifetime.savingsRate')}</span>
          <span
            className={`lt-meta-value ${savingsRateAllTime >= 0 ? 'is-up' : 'is-down'}`}
          >
            {savingsRateAllTime.toFixed(0)}%
          </span>
        </div>
        <div className="lt-meta-item">
          <span className="eyebrow">{t('lifetime.activeAccounts')}</span>
          <span className="lt-meta-value">
            {String(accounts.length).padStart(2, '0')}
          </span>
        </div>
      </section>

      <div className="lt-grid">
        {accounts.length > 0 && (
          <section className="lt-section">
            <AccountBalanceCard accounts={accounts} />
          </section>
        )}

        <section className="lt-section lt-section-full">
          <h3 className="section-title">
            <span className="section-numeral">04</span>
            {t('lifetime.evolutionTitle')}
          </h3>
          <div className="lt-chart">
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={evolutionData}
                  margin={{ top: 16, right: 12, left: -16, bottom: 0 }}
                >
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.5}
                  />
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
    </div>
  );
}
