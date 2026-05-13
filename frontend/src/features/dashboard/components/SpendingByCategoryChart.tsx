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
  colors: string[];
}

export function SpendingByCategoryChart({ spending, colors }: Props) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { valuesHidden } = usePrivacy();

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
    </div>
  );
}
