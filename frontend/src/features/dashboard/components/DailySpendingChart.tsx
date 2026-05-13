import { useTranslation } from 'react-i18next';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DailySpendingChartPoint,
  IncomeSummary,
  Summary,
  UpcomingFixed,
} from '../../../types/api';
import { useCategoryTranslation } from '../../../hooks/useCategoryTranslation';

interface Props {
  daily: DailySpendingChartPoint[];
  upcomingFixed: UpcomingFixed[];
  incomeSummary: IncomeSummary;
  summary: Summary | undefined;
}

export function DailySpendingChart({ daily, upcomingFixed, incomeSummary, summary }: Props) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();

  const totalSpent = daily.reduce(
    (s, d) => s + (Number(d.actualVariable) || 0) + (Number(d.actualFixed) || 0),
    0,
  );
  const totalProjected = daily.reduce(
    (s, d) =>
      s + (Number(d.projectedVariable) || 0) + (Number(d.projectedFixed) || 0),
    0,
  );
  const upcomingFixedTotal = upcomingFixed.reduce(
    (s, f) => s + (Number(f.amount) || 0),
    0,
  );
  const budgetTotal = summary?.budgetLimit ?? 0;
  const endOfMonth = totalSpent + totalProjected;
  const daysInMonth = daily.length;
  const dailyTarget =
    budgetTotal > 0 && daysInMonth > 0 ? budgetTotal / daysInMonth : null;
  const todayLabel = daily.find((d) => d.isToday)?.label;
  const overBudget = budgetTotal > 0 && endOfMonth > budgetTotal;
  const totalIncome = incomeSummary.events.reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0,
  );
  const balance = totalIncome - totalSpent;
  const balancePositive = balance >= 0;

  const labelByDate: Record<string, string> = {};
  for (const d of daily) labelByDate[d.date] = d.label;

  const eventsByDate = new Map<string, { total: number; count: number; date: string }>();
  for (const e of incomeSummary.events) {
    const cur = eventsByDate.get(e.date);
    if (cur) {
      cur.total += Number(e.amount) || 0;
      cur.count += 1;
    } else {
      eventsByDate.set(e.date, {
        total: Number(e.amount) || 0,
        count: 1,
        date: e.date,
      });
    }
  }
  const missedDays = Array.from(new Set(incomeSummary.missed.map((m) => m.day)));

  return (
    <div className="card chart-card chart-full">
      <h3 className="section-title">
        <span className="section-numeral">02</span>
        {t('dashboard.topSpendingDays')}
      </h3>

      <div className="daily-header">
        {totalIncome > 0 && (
          <div className="dh-block">
            <span className="dh-label">{t('dashboard.incomeLabel')}</span>
            <span className="dh-value dh-income">+R$ {totalIncome.toFixed(2)}</span>
          </div>
        )}
        <div className="dh-block">
          <span className="dh-label">{t('dashboard.spentLabel')}</span>
          <span className="dh-value dh-spent">R$ {totalSpent.toFixed(2)}</span>
          {budgetTotal > 0 && <span className="dh-sub">/ R$ {budgetTotal.toFixed(2)}</span>}
        </div>
        {(totalIncome > 0 || totalSpent > 0) && (
          <div className="dh-block">
            <span className="dh-label">{t('dashboard.balanceLabel')}</span>
            <span className="dh-value dh-balance">
              {balancePositive ? '+' : '−'}R$ {Math.abs(balance).toFixed(2)}
            </span>
          </div>
        )}
        {totalProjected > 0 && (
          <div className="dh-block dh-projection">
            <span className="dh-label">{t('dashboard.projectionLabel')}</span>
            <span className={`dh-value ${overBudget ? 'over' : ''}`}>
              R$ {endOfMonth.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {incomeSummary.missed.length > 0 && (
        <div className="daily-subheader">
          <span className="dh-missed">
            {t('dashboard.missedIncome', { count: incomeSummary.missed.length })}
          </span>
        </div>
      )}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={daily} margin={{ top: 28, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
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
              cursor={{ fill: 'var(--bg-card)', opacity: 0.1 }}
              contentStyle={{
                borderRadius: '0',
                border: '1px solid var(--text)',
                boxShadow: 'none',
                background: 'var(--bg-card)',
                color: 'var(--text)',
              }}
              formatter={(val, name) => {
                const key = typeof name === 'string' ? name : '';
                const map: Record<string, string> = {
                  actualVariable: t('dashboard.actualVariableLabel'),
                  actualFixed: t('dashboard.actualFixedLabel'),
                  projectedVariable: t('dashboard.projectedVariableLabel'),
                  projectedFixed: t('dashboard.projectedFixedLabel'),
                };
                return [
                  `R$ ${Number(val || 0).toFixed(2)}`,
                  map[key] || t('dashboard.actualLabel'),
                ];
              }}
              labelStyle={{
                color: 'var(--text-secondary)',
                marginBottom: '4px',
                textTransform: 'capitalize',
              }}
            />

            <Bar dataKey="actualVariable" stackId="a" name="actualVariable" fill="var(--danger)" opacity={0.55} />
            <Bar
              dataKey="actualFixed"
              stackId="a"
              name="actualFixed"
              fill="var(--danger)"
              opacity={0.95}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="projectedVariable"
              stackId="b"
              name="projectedVariable"
              fill="var(--text-secondary)"
              opacity={0.25}
            />
            <Bar
              dataKey="projectedFixed"
              stackId="b"
              name="projectedFixed"
              fill="var(--text-secondary)"
              opacity={0.55}
              radius={[2, 2, 0, 0]}
            />

            {dailyTarget !== null && (
              <ReferenceLine
                y={dailyTarget}
                stroke="var(--danger)"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: t('dashboard.dailyTargetLabel', { amount: dailyTarget.toFixed(0) }),
                  position: 'insideTopRight',
                  fill: 'var(--text-secondary)',
                  fontSize: 10,
                }}
              />
            )}
            {todayLabel && (
              <ReferenceLine
                x={todayLabel}
                stroke="var(--text-secondary)"
                strokeDasharray="2 4"
                strokeWidth={1}
                opacity={0.6}
              />
            )}
            {Array.from(eventsByDate.values()).map((agg, i) => {
              const xLabel = labelByDate[agg.date];
              if (!xLabel) return null;
              const formatted = `+R$ ${Math.round(agg.total).toLocaleString('pt-BR')}`;
              const labelValue = agg.count > 1 ? `${formatted} (${agg.count})` : formatted;
              return (
                <ReferenceLine
                  key={`inc-${i}`}
                  x={xLabel}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  label={{
                    value: labelValue,
                    position: 'top',
                    offset: 8,
                    fill: 'var(--primary)',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />
              );
            })}
            {missedDays.map((day, i) => {
              const xLabel = daily[day - 1]?.label;
              if (!xLabel) return null;
              return (
                <ReferenceLine
                  key={`mis-${i}`}
                  x={xLabel}
                  stroke="var(--warning)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: '!',
                    position: 'top',
                    offset: 8,
                    fill: 'var(--warning)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {(incomeSummary.events.length > 0 || incomeSummary.missed.length > 0) && (
        <details className="upcoming-fixed income-events">
          <summary>
            {t('dashboard.incomeEventsSummary', {
              count: incomeSummary.events.length,
              amount: totalIncome.toFixed(2),
            })}
            {incomeSummary.missed.length > 0 && (
              <span className="badge-warning">
                {' '}
                · {t('dashboard.missedCount', { count: incomeSummary.missed.length })}
              </span>
            )}
          </summary>
          <ul className="upcoming-fixed-list">
            {incomeSummary.events.map((e, i) => (
              <li key={`e-${i}`}>
                <span className="uf-day">{t('dashboard.upcomingFixedDay', { day: e.day })}</span>
                <span className="uf-desc">{e.description}</span>
                <span className="uf-cat">{translateCategory(e.category)}</span>
                <span className="uf-amount income">+R$ {Number(e.amount).toFixed(2)}</span>
              </li>
            ))}
            {incomeSummary.missed.map((m, i) => (
              <li key={`m-${i}`} className="row-missed">
                <span className="uf-day">{t('dashboard.upcomingFixedDay', { day: m.day })}</span>
                <span className="uf-desc">
                  {m.description}{' '}
                  <span className="row-tag warning">{t('dashboard.missedTag')}</span>
                </span>
                <span className="uf-cat">{translateCategory(m.category)}</span>
                <span className="uf-amount muted">+R$ {Number(m.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {upcomingFixed.length > 0 && (
        <details className="upcoming-fixed">
          <summary>
            {t('dashboard.upcomingFixedSummary', {
              count: upcomingFixed.length,
              amount: upcomingFixedTotal.toFixed(2),
            })}
          </summary>
          <ul className="upcoming-fixed-list">
            {upcomingFixed.map((f, i) => (
              <li key={i}>
                <span className="uf-day">{t('dashboard.upcomingFixedDay', { day: f.day })}</span>
                <span className="uf-desc">{f.description}</span>
                <span className="uf-cat">{translateCategory(f.category)}</span>
                <span className="uf-amount">R$ {Number(f.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
