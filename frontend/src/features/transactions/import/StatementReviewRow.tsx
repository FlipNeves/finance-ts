import { useTranslation } from 'react-i18next';
import type { ImportPreviewRow, TransactionType } from '../../../types/api';

type StatementReviewRowProps = {
  row: ImportPreviewRow;
  categories: string[];
  bankAccounts: string[];
  translateCategory: (c: string) => string;
  onChange: (patch: Partial<ImportPreviewRow>) => void;
};

export default function StatementReviewRow({
  row,
  categories,
  bankAccounts,
  translateCategory,
  onChange,
}: StatementReviewRowProps) {
  const { t, i18n } = useTranslation();

  const dateValue = row.date ? row.date.slice(0, 10) : '';

  return (
    <tr className={`si-row ${row.include ? '' : 'si-row-off'} ${row.isDuplicate ? 'si-row-dup' : ''}`}>
      <td className="si-cell-check">
        <input
          type="checkbox"
          checked={row.include}
          onChange={(e) => onChange({ include: e.target.checked })}
          aria-label={t('transactions.import.colInclude')}
        />
      </td>
      <td>
        <input
          type="date"
          className="form-control si-input-sm"
          value={dateValue}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!isNaN(d.getTime())) onChange({ date: d.toISOString() });
          }}
        />
      </td>
      <td>
        <input
          type="text"
          className="form-control si-input-sm"
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <div className="si-badges">
          {row.isDuplicate && (
            <span className="si-badge si-badge-dup">
              {t('transactions.import.duplicateBadge')}
            </span>
          )}
          {row.isTransfer && (
            <span className="si-badge si-badge-transfer">
              {t('transactions.import.transferBadge')}
            </span>
          )}
        </div>
      </td>
      <td>
        <select
          className="form-control si-input-sm"
          value={row.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          {!categories.includes(row.category) && (
            <option value={row.category}>{translateCategory(row.category)}</option>
          )}
          {categories.map((c) => (
            <option key={c} value={c}>
              {translateCategory(c)}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="form-control si-input-sm"
          value={row.bankAccount ?? ''}
          onChange={(e) => onChange({ bankAccount: e.target.value || null })}
        >
          <option value="">—</option>
          {row.bankAccount && !bankAccounts.includes(row.bankAccount) && (
            <option value={row.bankAccount}>{row.bankAccount}</option>
          )}
          {bankAccounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="form-control si-input-sm"
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value as TransactionType })}
        >
          <option value="income">{t('transactions.income')}</option>
          <option value="expense">{t('transactions.expense')}</option>
        </select>
      </td>
      <td className={`text-right si-amount si-amount-${row.type}`}>
        <input
          type="number"
          step="0.01"
          min="0"
          className="form-control si-input-sm si-input-amount"
          value={row.amount}
          onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
          lang={i18n.language}
        />
      </td>
    </tr>
  );
}
