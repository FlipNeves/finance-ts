import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumericFormat } from 'react-number-format';
import Modal from '../../components/Modal';
import Money from '../../components/Money';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { useAddContribution } from './hooks/useGoals';
import type { Goal } from '../../types/api';
import './GoalFormModal.css';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
}

export default function ContributionModal({
  isOpen,
  onClose,
  goal,
}: ContributionModalProps) {
  const { t } = useTranslation();
  const { showMessage } = useMessageModal();
  const addMutation = useAddContribution(goal?._id ?? '');

  const [amount, setAmount] = useState<number | string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
  }, [isOpen, goal?._id]);

  if (!goal) return null;

  const submitting = addMutation.isPending;
  const canSubmit = Number(amount) > 0 && !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    try {
      await addMutation.mutateAsync({
        amount: Number(amount),
        date: new Date(date).toISOString(),
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('goals.contributionError'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('goals.addContribution')}>
      <div className="gf-body">
        <div className="gf-goal-summary">
          <span className="eyebrow">{t('goals.target')}</span>
          <h3 className="gf-goal-summary-title">{goal.title}</h3>
          <div className="gf-goal-summary-numbers">
            <span>
              <span className="eyebrow">{t('goals.saved')}</span>
              <Money value={goal.projection.currentAmount} />
            </span>
            <span>
              <span className="eyebrow">{t('goals.target')}</span>
              <Money value={goal.targetAmount} />
            </span>
          </div>
        </div>

        <div className="gf-field">
          <label className="gf-label">{t('goals.contributionAmount')}</label>
          <div className="gf-amount-wrapper">
            <span className="gf-currency">R$</span>
            <NumericFormat
              className="form-control gf-amount-input"
              value={amount}
              onValueChange={(v) => setAmount(v.floatValue ?? '')}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              placeholder="0,00"
              autoFocus
            />
          </div>
        </div>

        <div className="gf-field">
          <label className="gf-label">{t('goals.contributionDate')}</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="gf-field">
          <label className="gf-label">
            {t('goals.contributionNote')} ({t('common.optional')})
          </label>
          <input
            type="text"
            className="form-control"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('goals.notePlaceholder')}
          />
        </div>

        <button
          className="btn btn-primary gf-save-btn"
          onClick={handleSave}
          disabled={!canSubmit}
        >
          {submitting ? '...' : t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}
