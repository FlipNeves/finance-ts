import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumericFormat } from 'react-number-format';
import Modal from '../../components/Modal';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { useCategories } from '../../hooks/useCategories';
import { useCategoryTranslation } from '../../hooks/useCategoryTranslation';
import { useCreateGoal, useUpdateGoal } from './hooks/useGoals';
import type { Goal } from '../../types/api';
import './GoalFormModal.css';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editGoal?: Goal | null;
}

export default function GoalFormModal({
  isOpen,
  onClose,
  editGoal,
}: GoalFormModalProps) {
  const { t } = useTranslation();
  const { showMessage } = useMessageModal();
  const { translateCategory } = useCategoryTranslation();
  const categories = useCategories().data ?? [];
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | string>('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editGoal) {
      setTitle(editGoal.title);
      setTargetAmount(editGoal.targetAmount);
      setTargetDate(
        editGoal.targetDate
          ? new Date(editGoal.targetDate).toISOString().split('T')[0]
          : '',
      );
      setCategory(editGoal.category || '');
    } else {
      setTitle('');
      setTargetAmount('');
      setTargetDate('');
      setCategory('');
    }
  }, [isOpen, editGoal]);

  const submitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit =
    title.trim().length > 0 && Number(targetAmount) > 0 && !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    const payload = {
      title: title.trim(),
      targetAmount: Number(targetAmount),
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      category: category || null,
    };
    try {
      if (editGoal) {
        await updateMutation.mutateAsync({ id: editGoal._id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('goals.saveError'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editGoal ? t('goals.editGoal') : t('goals.newGoal')}
    >
      <div className="gf-body">
        <div className="gf-field">
          <label className="gf-label">{t('goals.fieldTitle')}</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('goals.titlePlaceholder')}
            autoFocus
          />
        </div>

        <div className="gf-field">
          <label className="gf-label">{t('goals.fieldTarget')}</label>
          <div className="gf-amount-wrapper">
            <span className="gf-currency">R$</span>
            <NumericFormat
              className="form-control gf-amount-input"
              value={targetAmount}
              onValueChange={(v) => setTargetAmount(v.floatValue ?? '')}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="gf-field">
          <label className="gf-label">
            {t('goals.fieldDeadline')} ({t('common.optional')})
          </label>
          <input
            type="date"
            className="form-control"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div className="gf-field">
          <label className="gf-label">
            {t('goals.fieldCategory')} ({t('common.optional')})
          </label>
          <select
            className="form-control"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t('goals.noCategory')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {translateCategory(c)}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary gf-save-btn"
          onClick={handleSave}
          disabled={!canSubmit}
        >
          {submitting ? '...' : editGoal ? t('common.save') : t('common.add')}
        </button>
      </div>
    </Modal>
  );
}
