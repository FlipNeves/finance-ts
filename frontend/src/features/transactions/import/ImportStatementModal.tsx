import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/Modal';
import { useCategories } from '../../../hooks/useCategories';
import { useBankAccounts } from '../../../hooks/useBankAccounts';
import { useCategoryTranslation } from '../../../hooks/useCategoryTranslation';
import { useMessageModal } from '../../../contexts/MessageModalContext';
import {
  useImportPreview,
  useImportPreviewPdf,
  useImportCommit,
} from '../hooks/useTransactions';
import type { ImportPreviewRow, ImportSource } from '../../../types/api';
import StatementUploadStep from './StatementUploadStep';
import StatementReviewTable from './StatementReviewTable';
import StatementImportSummary from './StatementImportSummary';
import './ImportStatementModal.css';

type ImportStatementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (range?: { start: string; end: string }) => void;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function ImportStatementModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportStatementModalProps) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { showMessage } = useMessageModal();

  const categories = useCategories().data ?? [];
  const bankAccounts = useBankAccounts().data ?? [];

  const previewMutation = useImportPreview();
  const previewPdfMutation = useImportPreviewPdf();
  const commitMutation = useImportCommit();

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setRows([]);
      setError(null);
    }
  }, [isOpen]);

  // Server returns the parsed rows; from here on they are editable client state.
  const handleAnalyze = (source: ImportSource, bankAccount: string) => {
    setError(null);
    const account = bankAccount || undefined;
    const handlers = {
      onSuccess: (data: { rows: ImportPreviewRow[] }) => {
        if (!data.rows || data.rows.length === 0) {
          setError(t('transactions.import.noRows'));
          return;
        }
        setRows(data.rows);
        setStep('review');
      },
      onError: () => setError(t('transactions.import.parseError')),
    };

    if (source.kind === 'pdf') {
      previewPdfMutation.mutate({ file: source.file, bankAccount: account }, handlers);
    } else {
      previewMutation.mutate({ csv: source.csv, bankAccount: account }, handlers);
    }
  };

  const updateRow = (tempId: string, patch: Partial<ImportPreviewRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)),
    );
  };

  const toggleAll = (include: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, include })));
  };

  // Derived summary so totals react to the user's edits/toggles instantly.
  const summary = useMemo(() => {
    const included = rows.filter((r) => r.include);
    const totalIncome = included
      .filter((r) => r.type === 'income')
      .reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpense = included
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + (r.amount || 0), 0);
    return {
      toImport: included.length,
      duplicates: rows.filter((r) => r.isDuplicate).length,
      transfers: rows.filter((r) => r.isTransfer).length,
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      net: round2(totalIncome - totalExpense),
    };
  }, [rows]);

  const handleCommit = () => {
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) return;
    // Date span of what we're importing, so the list can jump to show it.
    const sortedDates = selected.map((r) => r.date).sort();
    const range = sortedDates.length
      ? { start: sortedDates[0], end: sortedDates[sortedDates.length - 1] }
      : undefined;
    commitMutation.mutate(rows, {
      onSuccess: (data) => {
        const fmtDay = (iso: string) =>
          new Date(iso).toLocaleDateString(undefined, { timeZone: 'UTC' });
        showMessage(
          t('transactions.import.successTitle'),
          range
            ? t('transactions.import.successBodyPeriod', {
                inserted: data.inserted,
                start: fmtDay(range.start),
                end: fmtDay(range.end),
              })
            : t('transactions.import.successBody', {
                inserted: data.inserted,
                skipped: data.skippedDuplicates,
              }),
        );
        onSuccess(range);
        onClose();
      },
      onError: () =>
        showMessage(t('common.error'), t('transactions.import.commitError')),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('transactions.import.title')}
      size={step === 'review' ? 'wide' : 'default'}
    >
      <div className="si-modal">
        {step === 'upload' ? (
          <StatementUploadStep
            bankAccounts={bankAccounts}
            loading={previewMutation.isPending || previewPdfMutation.isPending}
            error={error}
            onAnalyze={handleAnalyze}
          />
        ) : (
          <div className="si-step">
            <h3 className="si-step-title">{t('transactions.import.reviewTitle')}</h3>
            <p className="si-hint">{t('transactions.import.reviewHint')}</p>

            <StatementImportSummary
              toImport={summary.toImport}
              duplicates={summary.duplicates}
              transfers={summary.transfers}
              totalIncome={summary.totalIncome}
              totalExpense={summary.totalExpense}
              net={summary.net}
            />

            <StatementReviewTable
              rows={rows}
              categories={categories}
              bankAccounts={bankAccounts}
              translateCategory={translateCategory}
              onRowChange={updateRow}
              onToggleAll={toggleAll}
            />

            <div className="si-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep('upload')}
              >
                ← {t('transactions.import.back')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={summary.toImport === 0 || commitMutation.isPending}
                onClick={handleCommit}
              >
                {commitMutation.isPending
                  ? t('transactions.import.confirming')
                  : `${t('transactions.import.confirm')} (${summary.toImport})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
