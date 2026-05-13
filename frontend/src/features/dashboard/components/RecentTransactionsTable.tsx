import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Money from '../../../components/Money';
import type { Transaction } from '../../../types/api';
import { useCategoryTranslation } from '../../../hooks/useCategoryTranslation';

interface Props {
  transactions: Transaction[];
}

export function RecentTransactionsTable({ transactions }: Props) {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();

  const resolveDescription = (description: string) => {
    if (description === 'Income') return t('transactions.income');
    if (description === 'Expense') return t('transactions.expense');
    return description || '-';
  };

  return (
    <div className="card transactions-section">
      <div className="transactions-header">
        <h2 className="section-title">
          <span className="section-numeral">09</span>
          {t('transactions.recent')}
        </h2>
        <Link to="/transactions" className="view-all-link">
          {t('dashboard.viewAll')} →
        </Link>
      </div>

      <div className="table-responsive desktop-table">
        <table className="tx-table">
          <thead>
            <tr>
              <th>{t('transactions.date')}</th>
              <th>{t('transactions.description')}</th>
              <th>{t('common.user')}</th>
              <th>{t('transactions.category')}</th>
              <th>{t('transactions.account')}</th>
              <th className="text-right">{t('transactions.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center empty-td">
                  {t('transactions.noTransactions')}
                </td>
              </tr>
            ) : (
              transactions.map((tr) => (
                <tr key={tr._id}>
                  <td className="text-muted">
                    {new Date(tr.date).toLocaleDateString(i18n.language)}
                  </td>
                  <td>
                    <span className="tx-desc">{resolveDescription(tr.description)}</span>
                  </td>
                  <td>
                    <span className="user-badge">{tr.userId?.name || '?'}</span>
                  </td>
                  <td>
                    <span className="category-badge">{translateCategory(tr.category)}</span>
                  </td>
                  <td>
                    <span className="tx-bank">
                      {tr.bankAccount || '-'} {tr.isFixed ? t('transactions.fixedTag') : ''}
                    </span>
                  </td>
                  <td className={`tx-amount ${tr.type}`}>
                    <Money
                      value={tr.amount}
                      sign={tr.type === 'income' ? 'positive' : 'negative'}
                      tone={tr.type === 'income' ? 'income' : 'expense'}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mobile-tx-list">
        {transactions.length === 0 ? (
          <div className="empty-state-mobile">{t('transactions.noTransactions')}</div>
        ) : (
          transactions.map((tr) => (
            <div key={tr._id} className="tx-card">
              <div className="tx-card-top">
                <div className="tx-card-left">
                  <span className="tx-card-desc">{resolveDescription(tr.description)}</span>
                  <div className="tx-card-meta">
                    <span className="category-badge-sm">{translateCategory(tr.category)}</span>
                    <span className="tx-card-date">
                      {new Date(tr.date).toLocaleDateString(i18n.language)}
                    </span>
                  </div>
                </div>
                <span className={`tx-card-amount ${tr.type}`}>
                  <Money
                    value={tr.amount}
                    sign={tr.type === 'income' ? 'positive' : 'negative'}
                    tone={tr.type === 'income' ? 'income' : 'expense'}
                  />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
