import { useTranslation } from 'react-i18next';
import Money from '../../../components/Money';
import { formatBRL } from '../../../lib/format';
import { usePrivacy } from '../../../contexts/PrivacyContext';
import type { TotalAccumulated } from '../../../types/api';
import './SavingsMasterCard.css';

interface Props {
  savings: TotalAccumulated | null;
  monthsTracked?: number;
  currentMonthExpense?: number;
}

export default function SavingsMasterCard({
  savings,
  monthsTracked = 1,
  currentMonthExpense = 0,
}: Props) {
  const { t } = useTranslation();
  const { valuesHidden } = usePrivacy();

  if (!savings) return null;

  const positive = savings.totalAccumulated >= 0;
  const burn = monthsTracked > 0 ? savings.totalExpense / monthsTracked : 0;
  const runway =
    currentMonthExpense > 0 && savings.totalAccumulated > 0
      ? savings.totalAccumulated / currentMonthExpense
      : burn > 0 && savings.totalAccumulated > 0
        ? savings.totalAccumulated / burn
        : null;

  const amountClass = valuesHidden
    ? 'reserve-amount'
    : `reserve-amount ${positive ? 'is-positive' : 'is-negative'}`;

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
        <span className={amountClass}>
          {valuesHidden ? '•••.•••,••' : formatBRL(savings.totalAccumulated)}
        </span>
        <span className="reserve-mini-label">{t('dashboard.accumulatedTotal')}</span>
      </div>

      <dl className="reserve-stats">
        <div className="reserve-stat">
          <dt>{t('dashboard.inflowAll')}</dt>
          <dd className={valuesHidden ? undefined : 'is-up'}>
            <Money value={savings.totalIncome} sign="positive" />
          </dd>
        </div>
        <div className="reserve-stat">
          <dt>{t('dashboard.outflowAll')}</dt>
          <dd className={valuesHidden ? undefined : 'is-down'}>
            <Money value={savings.totalExpense} sign="negative" />
          </dd>
        </div>
        <div className="reserve-stat">
          <dt>{t('dashboard.burnRate')}</dt>
          <dd>
            <Money value={burn} />
          </dd>
        </div>
        <div className="reserve-stat">
          <dt>{t('dashboard.runway')}</dt>
          <dd>
            {runway === null
              ? t('dashboard.runwayInfinite')
              : valuesHidden
                ? '•••'
                : `${runway.toFixed(1)}`}
          </dd>
        </div>
      </dl>
    </section>
  );
}
