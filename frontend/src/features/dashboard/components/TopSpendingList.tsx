import { useTranslation } from 'react-i18next';
import type { TopSpending } from '../../../types/api';

interface Props {
  topSpending: TopSpending;
}

export function TopSpendingList({ topSpending }: Props) {
  const { t, i18n } = useTranslation();

  const resolveDescription = (description: string) => {
    if (description === 'Income') return t('transactions.income');
    if (description === 'Expense') return t('transactions.expense');
    return description || t('transactions.expense');
  };

  return (
    <div className="card chart-card">
      <h3 className="section-title">
        <span className="section-numeral">05</span>
        {t('dashboard.topSpendingTitle')}
      </h3>
      <div className="chart-wrapper">
        {topSpending.data && topSpending.data.length > 0 ? (
          <ol className="top-spending-list">
            {topSpending.data.map((item, idx) => (
              <li key={idx} className="top-spending-item">
                <span className="ts-rank">{String(idx + 1).padStart(2, '0')}</span>
                <div className="ts-body">
                  <span className="ts-name">{resolveDescription(item.description)}</span>
                  <span className="ts-meta">
                    {item.date
                      ? new Date(item.date)
                          .toLocaleDateString(i18n.language, {
                            day: '2-digit',
                            month: '2-digit',
                            weekday: 'short',
                            timeZone: 'UTC',
                          })
                          .replace('.', '')
                      : ''}
                    {topSpending.type === 'family_transactions' && item.userName
                      ? ` · ${item.userName}`
                      : ''}
                  </span>
                </div>
                <span className="ts-amount">R$ {Number(item.amount || 0).toFixed(2)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="chart-empty">{t('dashboard.noTopSpending')}</div>
        )}
      </div>
    </div>
  );
}
