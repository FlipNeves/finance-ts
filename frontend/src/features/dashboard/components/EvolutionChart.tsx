import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EvolutionPoint } from '../../../types/api';

interface Props {
  evolution: EvolutionPoint[];
}

export function EvolutionChart({ evolution }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card chart-card chart-full">
      <h3 className="section-title">
        <span className="section-numeral">08</span>
        {t('dashboard.evolution')}
      </h3>
      <div className="chart-wrapper">
        {evolution.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
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
              <Legend iconType="square" wrapperStyle={{ paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="income"
                name={t('transactions.income')}
                stroke="var(--primary)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name={t('transactions.expense')}
                stroke="var(--danger)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorExpense)"
              />
              <Line
                type="monotone"
                dataKey="balance"
                name={t('dashboard.balanceSeriesLabel')}
                stroke="var(--text)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--text)' }}
                activeDot={{ r: 5, fill: 'var(--text)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">{t('dashboard.noData')}</div>
        )}
      </div>
    </div>
  );
}
