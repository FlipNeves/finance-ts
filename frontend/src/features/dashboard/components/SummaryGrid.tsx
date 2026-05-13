import { useTranslation } from 'react-i18next';
import Money from '../../../components/Money';
import type { Summary } from '../../../types/api';
import { calculateHealthScore } from '../lib/healthScore';

interface Props {
  summary: Summary;
  isCurrentMonth: boolean;
  daysInMonth: number;
  daysPassed: number;
}

export function SummaryGrid({ summary, isCurrentMonth, daysInMonth, daysPassed }: Props) {
  const { t } = useTranslation();

  const expenseDiff = summary.totalExpense - (summary.previousMonthExpense ?? 0);
  const incomeDiff = summary.totalIncome - (summary.previousMonthIncome ?? 0);
  const monthProgress = isCurrentMonth ? (daysPassed / daysInMonth) * 100 : 100;
  const health = calculateHealthScore({ summary, monthProgress });

  const healthColor =
    health.level === 'excellent' || health.level === 'good'
      ? health.level === 'excellent'
        ? 'var(--primary)'
        : 'var(--warning)'
      : 'var(--danger)';
  const healthColorScore =
    health.score >= 75 ? 'var(--primary)' : health.score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const healthLabel =
    health.level === 'excellent'
      ? t('dashboard.healthExcellent')
      : health.level === 'good'
        ? t('dashboard.healthGood')
        : health.level === 'warning'
          ? t('dashboard.healthWarning')
          : t('dashboard.healthCritical');
  const gaugeAngle = (health.score / 100) * 180;

  return (
    <div className="summary-grid">
      <div className="card summary-card summary-income">
        <div className="summary-inner">
          <span className="summary-label">
            <span className="dot dot-green"></span>
            <p className="text-green">{t('dashboard.totalIncome')}</p>
          </span>
          <span className="summary-value summary-value-income">
            <Money value={summary.totalIncome} />
          </span>
          <span className="summary-diff">
            <Money
              value={incomeDiff}
              sign={incomeDiff >= 0 ? 'up' : 'down'}
              tone={incomeDiff >= 0 ? 'income' : 'expense'}
            />{' '}
            {t('dashboard.vsPrevMonth')}
          </span>
        </div>
      </div>

      <div className="card summary-card summary-expense">
        <div className="summary-inner">
          <span className="summary-label">
            <span className="dot dot-red"></span>
            <p className="text-red">{t('dashboard.totalExpense')}</p>
          </span>
          <span className="summary-value summary-value-expense">
            <Money value={summary.totalExpense} />
          </span>
          <span className="summary-diff">
            <Money
              value={expenseDiff}
              sign={expenseDiff > 0 ? 'up' : 'down'}
              tone={expenseDiff <= 0 ? 'income' : 'expense'}
            />{' '}
            {t('dashboard.vsPrevMonth')}
          </span>
          {summary.totalExpense > 0 && (
            <div className="summary-breakdown">
              <span>
                {t('dashboard.fixed')}: <Money value={summary.fixedExpense} /> (
                {((summary.fixedExpense / summary.totalExpense) * 100).toFixed(0)}%)
              </span>
              <span>
                {t('dashboard.variable')}: <Money value={summary.variableExpense} />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="card summary-card summary-balance">
        <div className="summary-inner">
          <span className="summary-label">
            <span className="dot dot-blue"></span>
            <p className="text-blue">{t('dashboard.balance')}</p>
          </span>
          <span
            className={`summary-value summary-value-balance ${summary.balance < 0 ? 'negative' : 'positive'}`}
          >
            <Money value={summary.balance} />
          </span>
        </div>
      </div>

      <div className="card summary-card health-card summary-health">
        <div className="summary-inner">
          <span className="summary-label">
            <span className="dot" style={{ background: healthColor }}></span>
            <p style={{ color: healthColor }}>{t('dashboard.financialHealth')}</p>
            <span
              className="health-info"
              title={t('dashboard.healthMethodology')}
              aria-label={t('dashboard.healthBreakdown')}
            >
              ⓘ
            </span>
          </span>
          <div className="health-gauge-wrapper">
            <div className="health-gauge">
              <div className="health-gauge-bg"></div>
              <div
                className="health-gauge-fill"
                style={{
                  background: `conic-gradient(${healthColorScore} 0deg, ${healthColorScore} ${gaugeAngle}deg, transparent ${gaugeAngle}deg)`,
                }}
              ></div>
              <div className="health-gauge-cover"></div>
              <div className="health-gauge-value">
                <span className="health-score" style={{ color: healthColorScore }}>
                  {health.score}
                </span>
                <span className="health-label">{healthLabel}</span>
              </div>
            </div>
          </div>
          <div className="health-details">
            <div className="health-detail-row">
              <span>{t('dashboard.savingsRate')}</span>
              <span
                style={{
                  color:
                    health.savingsRate >= 20
                      ? 'var(--primary)'
                      : health.savingsRate >= 0
                        ? 'var(--warning)'
                        : 'var(--danger)',
                  fontWeight: 700,
                }}
              >
                {health.savingsRate.toFixed(0)}%
              </span>
            </div>
            {summary.budgetLimit > 0 && (
              <div className="health-detail-row">
                <span>{t('dashboard.budgetPace')}</span>
                <span
                  style={{
                    color: health.budgetPace <= 100 ? 'var(--primary)' : 'var(--danger)',
                    fontWeight: 700,
                  }}
                >
                  {health.budgetPace <= 95
                    ? t('dashboard.paceAhead')
                    : health.budgetPace <= 105
                      ? t('dashboard.paceOnTrack')
                      : t('dashboard.paceBehind')}
                </span>
              </div>
            )}
            <div className="health-detail-row">
              <span>{t('dashboard.trendVsPrev')}</span>
              <span
                style={{
                  color: health.expenseTrend <= 0 ? 'var(--primary)' : 'var(--danger)',
                  fontWeight: 700,
                }}
              >
                {health.expenseTrend > 0 ? '↑' : '↓'} {Math.abs(health.expenseTrend).toFixed(0)}%
              </span>
            </div>
            {summary.totalIncome > 0 && (
              <div className="health-detail-row" title={t('dashboard.fixedRatioHelp')}>
                <span>{t('dashboard.fixedRatio')}</span>
                <span
                  style={{
                    color: health.fixedRatio <= 50 ? 'var(--primary)' : 'var(--danger)',
                    fontWeight: 700,
                  }}
                >
                  {health.fixedRatio.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
