import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuickAddTransaction } from '../../transactions/hooks/useTransactions';
import { useCategoryTranslation } from '../../../hooks/useCategoryTranslation';
import Money from '../../../components/Money';
import type { QuickAddParsed } from '../../../types/api';

interface Props {
  onSuccess: () => void;
}

export function QuickAddBar({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<(QuickAddParsed & { alert?: string }) | null>(null);
  const [error, setError] = useState(false);

  const mutation = useQuickAddTransaction();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(
      { text: trimmed },
      {
        onSuccess: (res) => {
          setFeedback({ ...res.parsed, alert: res.alert });
          setError(false);
          setText('');
          onSuccess();
        },
        onError: () => {
          setFeedback(null);
          setError(true);
        },
      },
    );
  };

  return (
    <form className="quick-add" onSubmit={handleSubmit}>
      <div className="quick-add-row">
        <input
          className="quick-add-input"
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(false);
          }}
          placeholder={t('quickAdd.placeholder')}
          aria-label={t('quickAdd.label')}
          maxLength={200}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!text.trim() || mutation.isPending}
        >
          {mutation.isPending ? t('common.loading') : t('quickAdd.submit')}
        </button>
      </div>
      {error && <p className="quick-add-feedback is-error">{t('quickAdd.error')}</p>}
      {!error && feedback && (
        <p className="quick-add-feedback">
          {t('quickAdd.added')}: {feedback.description} ·{' '}
          <Money value={feedback.amount} tone={feedback.type === 'income' ? 'income' : 'expense'} /> ·{' '}
          {translateCategory(feedback.category)}
          {feedback.alert && <span className="quick-add-alert"> — {feedback.alert}</span>}
        </p>
      )}
      {!error && !feedback && <p className="quick-add-hint">{t('quickAdd.hint')}</p>}
    </form>
  );
}
