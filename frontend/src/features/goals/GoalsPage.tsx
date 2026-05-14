import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Money from '../../components/Money';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { useGoalsQuery, useDeleteGoal } from './hooks/useGoals';
import GoalFormModal from './GoalFormModal';
import ContributionModal from './ContributionModal';
import type { Goal, GoalStatus } from '../../types/api';
import './GoalsPage.css';

const STATUS_LABEL: Record<GoalStatus, { key: string; tone: string }> = {
  'on-track': { key: 'goals.statusOnTrack', tone: 'is-up' },
  'off-track': { key: 'goals.statusOffTrack', tone: 'is-warn' },
  achieved: { key: 'goals.statusAchieved', tone: 'is-up' },
  blocked: { key: 'goals.statusBlocked', tone: 'is-down' },
};

function progressPercent(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(
    100,
    (goal.projection.currentAmount / goal.targetAmount) * 100,
  );
}

export default function GoalsPage() {
  const { t } = useTranslation();
  const { showMessage, showConfirm } = useMessageModal();
  const goalsQuery = useGoalsQuery();
  const deleteMutation = useDeleteGoal();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);

  const goals = goalsQuery.data ?? [];

  const handleNew = () => {
    setEditGoal(null);
    setIsFormOpen(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = (goal: Goal) => {
    showConfirm(
      t('common.confirmDelete'),
      t('goals.deleteConfirm'),
      () => {
        deleteMutation.mutate(goal._id, {
          onError: () => showMessage(t('common.error'), t('goals.deleteError')),
        });
      },
      true,
    );
  };

  if (goalsQuery.isLoading) {
    return <div className="gp-loading">{t('common.loading')}</div>;
  }

  return (
    <div className="gp-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">06 · Goals</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {t('goals.title')}
          </h1>
          <p className="page-subtitle">{t('goals.description')}</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          + {t('goals.newGoal')}
        </button>
      </header>

      {goals.length === 0 ? (
        <div className="gp-empty">
          <span className="eyebrow">{t('goals.noGoalsEyebrow')}</span>
          <p className="gp-empty-message">{t('goals.noGoalsMessage')}</p>
          <button className="btn btn-outline" onClick={handleNew}>
            + {t('goals.newGoal')}
          </button>
        </div>
      ) : (
        <section className="gp-list">
          {goals.map((goal) => {
            const pct = progressPercent(goal);
            const status = STATUS_LABEL[goal.projection.status];
            return (
              <Link to={`/goals/${goal._id}`} className="gp-strip-link">
                <article key={goal._id} className="gp-strip">
                  <div className="gp-strip-head">
                    <div className="gp-strip-title-block">
                      {goal.category && (
                        <span className="eyebrow">{goal.category}</span>
                      )}
                      <h2 className="gp-strip-title">
                          {goal.title}
                      </h2>
                    </div>
                    <div className="gp-strip-target">
                      <span className="eyebrow">{t('goals.target')}</span>
                      <Money value={goal.targetAmount} />
                    </div>
                  </div>


                  <div className="gp-strip-progress" aria-hidden="true">
                    <div
                      className={`gp-strip-progress-fill ${status.tone}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="gp-strip-progress-label">
                    <span className="eyebrow">
                      {t('goals.saved')} ·{' '}
                      <Money value={goal.projection.currentAmount} />
                    </span>
                    <span className="eyebrow gp-progress-pct">
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="gp-strip-meta">
                    <div className="gp-meta-item">
                      <span className="eyebrow">{t('goals.statusLabel')}</span>
                      <span className={`gp-status ${status.tone}`}>
                        {t(status.key)}
                      </span>
                    </div>
                    <div className="gp-meta-item">
                      <span className="eyebrow">{t('goals.eta')}</span>
                      <span className="gp-meta-value">
                        {goal.projection.etaMonths === null
                          ? '—'
                          : goal.projection.etaMonths === 0
                            ? t('goals.etaAchieved')
                            : t('goals.etaMonths', {
                                count: goal.projection.etaMonths,
                              })}
                      </span>
                    </div>
                    <div className="gp-meta-item">
                      <span className="eyebrow">{t('goals.monthlyReserve')}</span>
                      <span className="gp-meta-value">
                        <Money value={goal.projection.monthlyReserve} />
                      </span>
                    </div>
                    {goal.targetDate && (
                      <div className="gp-meta-item">
                        <span className="eyebrow">{t('goals.deadline')}</span>
                        <span className="gp-meta-value">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="gp-strip-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setContributingGoal(goal)}
                    >
                      + {t('goals.addContribution')}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEdit(goal)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      className="btn btn-outline btn-sm gp-danger-btn"
                      onClick={() => handleDelete(goal)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </article>
              </Link>

            );
          })}
        </section>
      )}

      <GoalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editGoal={editGoal}
      />
      <ContributionModal
        isOpen={Boolean(contributingGoal)}
        onClose={() => setContributingGoal(null)}
        goal={contributingGoal}
      />
    </div>
  );
}
