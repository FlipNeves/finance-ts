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
  monthsTracked?: number;
  currentMonthExpense?: number;
}

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SavingsMasterCard: React.FC<Props> = ({ savings, monthsTracked = 1, currentMonthExpense = 0 }) => {
  const { t } = useTranslation();

  if (!savings) return null;

  const positive = savings.totalAccumulated >= 0;
  const burn = monthsTracked > 0 ? savings.totalExpense / monthsTracked : 0;
  const runway =
    currentMonthExpense > 0 && savings.totalAccumulated > 0
      ? savings.totalAccumulated / currentMonthExpense
      : burn > 0 && savings.totalAccumulated > 0
        ? savings.totalAccumulated / burn
        : null;

  return (
    <section className="reserve-block" aria-label={t('dashboard.myReserve')}>
      <div className="reserve-left">
        <div className="reserve-eyebrow">
          <span className="reserve-eyebrow-dot" aria-hidden="true" />
          <span>{t('dashboard.dynamic')}</span>
        </div>
        <h2 className="reserve-headline">{t('dashboard.myReserve')}</h2>
        <p className="reserve-subhead">{t('dashboard.myReserveSubtitle')}</p>
      </div>

      <div className="reserve-figure">
        <span className="reserve-currency">R$</span>
        <span className={`reserve-amount ${positive ? 'is-positive' : 'is-negative'}`}>
          {formatBRL(savings.totalAccumulated)}
        </span>
        <span className="reserve-mini-label">{t('dashboard.accumulatedTotal')}</span>
      </div>

      <dl className="reserve-stats">
        <div className="reserve-stat">
          <dt>{t('dashboard.inflowAll')}</dt>
          <dd className="is-up">+ R$ {formatBRL(savings.totalIncome)}</dd>
        </div>
        <div className="reserve-stat">
          <dt>{t('dashboard.outflowAll')}</dt>
          <dd className="is-down">− R$ {formatBRL(savings.totalExpense)}</dd>
        </div>
        <div className="reserve-stat">
          <dt>{t('dashboard.burnRate')}</dt>
          <dd>R$ {formatBRL(burn)}</dd>
        </div>
        <div className="reserve-stat">
          <dt>{t('dashboard.runway')}</dt>
          <dd>{runway === null ? t('dashboard.runwayInfinite') : `${runway.toFixed(1)}`}</dd>
        </div>
      </dl>
    </section>
  );
};

export default SavingsMasterCard;
