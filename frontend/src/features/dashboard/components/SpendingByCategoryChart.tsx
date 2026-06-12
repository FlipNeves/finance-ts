import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCategoryTranslation } from '../../../hooks/useCategoryTranslation';
import { usePrivacy } from '../../../contexts/PrivacyContext';
import type { SpendingByCategory } from '../../../types/api';

interface Props {
  spending: SpendingByCategory[];
  prevSpending?: SpendingByCategory[];
  colors: string[];
}

export function SpendingByCategoryChart({ spending, prevSpending = [], colors }: Props) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { valuesHidden } = usePrivacy();

  const prevByCategory = new Map(prevSpending.map((p) => [p.category, p.amount]));
  const movers = spending
    .map((s) => {
      const prev = prevByCategory.get(s.category) ?? 0;
      if (prev <= 0) return null;
      const delta = ((s.amount - prev) / prev) * 100;
      return { category: s.category, delta };
    })
    .filter((m): m is { category: string; delta: number } => m !== null && Math.abs(m.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  return (
    <div className="card chart-card">
      <h3 className="section-title">
        <span className="section-numeral">04</span>
        {t('dashboard.spendingByCategory')}
      </h3>
      <div className="chart-wrapper">
        {spending.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={spending.map((s) => ({ ...s, name: translateCategory(s.category) }))}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(val) => (valuesHidden ? 'R$•••' : `R$${val}`)}
              />
              <Tooltip
                cursor={{ fill: 'var(--bg)', opacity: 0.5 }}
                contentStyle={{
                  borderRadius: 0,
                  border: '1px solid var(--text)',
                  boxShadow: 'none',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                }}
                formatter={(val) => (valuesHidden ? '•••.•••,••' : Number(val).toFixed(2))}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {spending.map((_, index) => (
                  <Cell key={`cell-bar-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">{t('dashboard.noData')}</div>
        )}
      </div>
      {movers.length > 0 && (
        <div className="mom-strip">
          <span className="mom-title">{t('dashboard.momTitle')}</span>
          {movers.map((m) => (
            <span
              key={m.category}
              className={`mom-chip ${m.delta > 0 ? 'is-up' : 'is-down'}`}
            >
              {translateCategory(m.category)}{' '}
              {m.delta > 0 ? '+' : ''}
              {m.delta.toFixed(0)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
