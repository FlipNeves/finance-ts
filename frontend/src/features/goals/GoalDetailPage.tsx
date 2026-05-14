import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Money from '../../components/Money';
import { useMessageModal } from '../../contexts/MessageModalContext';
import {
  useGoalQuery,
  useContributionsQuery,
  useDeleteContribution,
} from './hooks/useGoals';
import GoalFormModal from './GoalFormModal';
import ContributionModal from './ContributionModal';
import type { GoalStatus } from '../../types/api';
import './GoalDetailPage.css';

const STATUS_LABEL: Record<GoalStatus, { key: string; tone: string }> = {
  'on-track': { key: 'goals.statusOnTrack', tone: 'is-up' },
  'off-track': { key: 'goals.statusOffTrack', tone: 'is-warn' },
  achieved: { key: 'goals.statusAchieved', tone: 'is-up' },
  blocked: { key: 'goals.statusBlocked', tone: 'is-down' },
};

export default function GoalDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { showMessage, showConfirm } = useMessageModal();

  const goalQuery = useGoalQuery(id);
  const contributionsQuery = useContributionsQuery(id);
  const deleteContribution = useDeleteContribution(id);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isContribOpen, setIsContribOpen] = useState(false);

  if (goalQuery.isLoading) {
    return <div className="gd-loading">{t('common.loading')}</div>;
  }

  const goal = goalQuery.data;
  if (!goal) {
    return (
      <div className="gd-loading">
        <p>{t('goals.notFound')}</p>
        <Link to="/goals" className="btn btn-outline btn-sm">
          ← {t('goals.backToList')}
        </Link>
      </div>
    );
  }

  const status = STATUS_LABEL[goal.projection.status];
  const pct =
    goal.targetAmount > 0
      ? Math.min(100, (goal.projection.currentAmount / goal.targetAmount) * 100)
      : 0;

  const contributions = contributionsQuery.data ?? [];

  const handleDeleteContribution = (contributionId: string) => {
    showConfirm(
      t('common.confirmDelete'),
      t('goals.contributionDeleteConfirm'),
      () => {
        deleteContribution.mutate(contributionId, {
          onError: () =>
            showMessage(t('common.error'), t('goals.contributionError')),
        });
      },
      true,
    );
  };

  return (
    <div className="gd-page fade-in">
      <Link to="/goals" className="gd-back">
        ← {t('goals.backToList')}
      </Link>

      <header className="page-header gd-header">
        <div>
          {goal.category && <span className="eyebrow">{goal.category}</span>}
          <h1 className="gd-title">{goal.title}</h1>
          <p className="page-subtitle">
            {goal.targetDate
              ? t('goals.deadlineLine', {
                  date: new Date(goal.targetDate).toLocaleDateString(
                    i18n.language,
                  ),
                })
              : t('goals.noDeadline')}
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setIsFormOpen(true)}
        >
          {t('common.edit')}
        </button>
      </header>

      <section className="gd-hero">
        <div className="gd-hero-left">
          <span className="eyebrow">{t('goals.saved')}</span>
          <div className="gd-hero-amount">
            <Money value={goal.projection.currentAmount} />
          </div>
          <div className="gd-hero-of">
            <span className="eyebrow">{t('goals.target')}</span>
            <Money value={goal.targetAmount} />
          </div>
        </div>

        <div className="gd-hero-right">
          <div className="gd-progress" aria-hidden="true">
            <div
              className={`gd-progress-fill ${status.tone}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="gd-progress-label">
            <span className={`gd-status ${status.tone}`}>
              {t(status.key)}
            </span>
            <span className="gd-progress-pct">{pct.toFixed(1)}%</span>
          </div>
        </div>
      </section>

      <section className="gd-projection">
        <h3 className="section-title">
          <span className="section-numeral">01</span>
          {t('goals.projectionTitle')}
        </h3>
        <div className="gd-projection-grid">
          <div className="gd-projection-item">
            <span className="eyebrow">{t('goals.monthlyReserve')}</span>
            <span className="gd-projection-value">
              <Money value={goal.projection.monthlyReserve} />
            </span>
            <span className="gd-projection-help">
              {t('goals.reserveHelp')}
            </span>
          </div>
          <div className="gd-projection-item">
            <span className="eyebrow">{t('goals.remaining')}</span>
            <span className="gd-projection-value">
              <Money value={goal.projection.remaining} />
            </span>
          </div>
          <div className="gd-projection-item">
            <span className="eyebrow">{t('goals.eta')}</span>
            <span className="gd-projection-value">
              {goal.projection.etaMonths === null
                ? '—'
                : goal.projection.etaMonths === 0
                  ? t('goals.etaAchieved')
                  : t('goals.etaMonths', {
                      count: goal.projection.etaMonths,
                    })}
            </span>
            {goal.projection.monthsToTarget !== null && (
              <span className="gd-projection-help">
                {t('goals.targetMonths', {
                  count: goal.projection.monthsToTarget,
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="gd-contributions">
        <div className="gd-section-head">
          <h3 className="section-title">
            <span className="section-numeral">02</span>
            {t('goals.contributionsTitle')}
          </h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsContribOpen(true)}
          >
            + {t('goals.addContribution')}
          </button>
        </div>

        {contributions.length === 0 ? (
          <div className="gd-empty">{t('goals.noContributions')}</div>
        ) : (
          <ul className="gd-contribution-list">
            {contributions.map((c) => (
              <li key={c._id} className="gd-contribution-row">
                <span className="gd-contribution-date">
                  {new Date(c.date).toLocaleDateString(i18n.language)}
                </span>
                <span className="gd-contribution-amount">
                  <Money value={c.amount} sign="positive" tone="income" />
                </span>
                <span className="gd-contribution-note">
                  {c.note || <em className="gd-muted">—</em>}
                </span>
                <button
                  className="gd-contribution-remove"
                  onClick={() => handleDeleteContribution(c._id)}
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GoalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editGoal={goal}
      />
      <ContributionModal
        isOpen={isContribOpen}
        onClose={() => setIsContribOpen(false)}
        goal={goal}
      />
    </div>
  );
}
