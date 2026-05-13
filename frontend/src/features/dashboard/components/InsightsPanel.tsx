import { useTranslation } from 'react-i18next';
import type { Insight } from '../../../types/api';
import './InsightsPanel.css';

interface Props {
  insights: Insight[];
}

export default function InsightsPanel({ insights }: Props) {
  const { t } = useTranslation();

  if (!insights || insights.length === 0) return null;

  return (
    <section className="insights-panel" aria-label={t('dashboard.insights')}>
      <h3 className="section-title">{t('dashboard.insights')}</h3>
      <div className="insights-list">
        {insights.map((insight) => (
          <div key={insight.id} className={`insight-card insight-${insight.type}`}>
            <div className="insight-icon" aria-hidden="true">
              {insight.icon}
            </div>
            <div className="insight-content">{insight.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
