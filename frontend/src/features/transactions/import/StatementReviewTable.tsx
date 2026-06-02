import { useTranslation } from 'react-i18next';
import type { ImportPreviewRow } from '../../../types/api';
import StatementReviewRow from './StatementReviewRow';

type StatementReviewTableProps = {
  rows: ImportPreviewRow[];
  categories: string[];
  bankAccounts: string[];
  translateCategory: (c: string) => string;
  onRowChange: (tempId: string, patch: Partial<ImportPreviewRow>) => void;
  onToggleAll: (include: boolean) => void;
};

export default function StatementReviewTable({
  rows,
  categories,
  bankAccounts,
  translateCategory,
  onRowChange,
  onToggleAll,
}: StatementReviewTableProps) {
  const { t } = useTranslation();
  const allIncluded = rows.length > 0 && rows.every((r) => r.include);

  return (
    <div className="si-table-wrap">
      <table className="editorial-table si-table">
        <thead>
          <tr>
            <th className="si-cell-check">
              <input
                type="checkbox"
                checked={allIncluded}
                onChange={(e) => onToggleAll(e.target.checked)}
                aria-label={
                  allIncluded
                    ? t('transactions.import.deselectAll')
                    : t('transactions.import.selectAll')
                }
              />
            </th>
            <th>{t('transactions.import.colDate')}</th>
            <th>{t('transactions.import.colDescription')}</th>
            <th>{t('transactions.import.colCategory')}</th>
            <th>{t('transactions.import.colAccount')}</th>
            <th>{t('transactions.import.colType')}</th>
            <th className="text-right">{t('transactions.import.colAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <StatementReviewRow
              key={row.tempId}
              row={row}
              categories={categories}
              bankAccounts={bankAccounts}
              translateCategory={translateCategory}
              onChange={(patch) => onRowChange(row.tempId, patch)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
