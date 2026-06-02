import { useTranslation } from 'react-i18next';

type StatementImportSummaryProps = {
  toImport: number;
  duplicates: number;
  transfers: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
};

function money(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

export default function StatementImportSummary({
  toImport,
  duplicates,
  transfers,
  totalIncome,
  totalExpense,
  net,
}: StatementImportSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="si-summary">
      <div className="si-summary-item">
        <span className="eyebrow">{t('transactions.import.summaryToImport')}</span>
        <strong>{toImport}</strong>
      </div>
      <div className="si-summary-item">
        <span className="eyebrow">{t('transactions.import.summaryDuplicates')}</span>
        <strong>{duplicates}</strong>
      </div>
      <div className="si-summary-item">
        <span className="eyebrow">{t('transactions.import.summaryTransfers')}</span>
        <strong>{transfers}</strong>
      </div>
      <div className="si-summary-item">
        <span className="eyebrow eyebrow-primary">{t('transactions.import.summaryIncome')}</span>
        <strong className="si-up">{money(totalIncome)}</strong>
      </div>
      <div className="si-summary-item">
        <span className="eyebrow eyebrow-danger">{t('transactions.import.summaryExpense')}</span>
        <strong className="si-down">{money(totalExpense)}</strong>
      </div>
      <div className="si-summary-item">
        <span className="eyebrow">{t('transactions.import.summaryNet')}</span>
        <strong className={net >= 0 ? 'si-up' : 'si-down'}>{money(net)}</strong>
      </div>
    </div>
  );
}
