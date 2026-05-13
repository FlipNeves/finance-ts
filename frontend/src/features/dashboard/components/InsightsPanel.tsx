import React from 'react';
import { useTranslation } from 'react-i18next';
import './InsightsPanel.css';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
  icon: string;
}

interface Props {
  insights: Insight[];
}

const InsightsPanel: React.FC<Props> = ({ insights }) => {
  const { t } = useTranslation();

  if (!insights || insights.length === 0) return null;

  return (
    <section className="insights-panel" aria-label={t('dashboard.insights') || 'Insights'}>
      <h3 className="section-title">{t('dashboard.insights') || 'Insights'}</h3>
      <div className="insights-list">
        {insights.map(insight => (
          <div key={insight.id} className={`insight-card insight-${insight.type}`}>
            <div className="insight-icon" aria-hidden="true">{insight.icon}</div>
            <div className="insight-content">{insight.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InsightsPanel;
