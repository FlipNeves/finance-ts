import React from 'react';
import { useTranslation } from 'react-i18next';
import './SavingsMasterCard.css';

interface SavingsData {
  totalAccumulated: number;
  totalIncome: number;
  totalExpense: number;
}

interface Props {
  savings: SavingsData | null;
}

const SavingsMasterCard: React.FC<Props> = ({ savings }) => {
  const { t } = useTranslation();

  if (!savings) return null;

  return (
    <div className="card savings-master-card fade-in">
      <div className="savings-header">
        <h3 className="section-title">💰 {t('dashboard.myReserve') || 'Minha Reserva (Patrimônio)'}</h3>
        <span className="savings-badge">{t('dashboard.dynamic') || 'Dinâmico'}</span>
      </div>
      
      <div className="savings-content">
        <div className="savings-main">
          <span className="savings-label">{t('dashboard.accumulatedTotal') || 'Patrimônio Atual (Acumulado)'}</span>
          <span className={`savings-value ${savings.totalAccumulated >= 0 ? 'positive' : 'negative'}`}>
            R$ {savings.totalAccumulated.toFixed(2)}
          </span>
        </div>

        <div className="savings-details">
          <div className="savings-detail-item">
            <span className="text-green text-sm">Total Receitas: R$ {savings.totalIncome.toFixed(2)}</span>
          </div>
          <div className="savings-detail-item">
            <span className="text-red text-sm">Total Despesas: R$ {savings.totalExpense.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsMasterCard;
