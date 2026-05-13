import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useMessageModal } from '../../contexts/MessageModalContext';
import TransactionModal from './TransactionModal';
import { useCategoryTranslation } from '../../hooks/useCategoryTranslation';
import { useCategories } from '../../hooks/useCategories';
import { useFamilyDetails } from '../../hooks/useFamilyDetails';
import { useDeleteTransaction, useTransactionsQuery } from './hooks/useTransactions';
import type { Transaction, TransactionType, TypeFilter } from '../../types/api';
import './TransactionsPage.css';

function defaultStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function defaultEnd() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

export default function TransactionsPage() {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { user } = useAuth();
  const { showMessage, showConfirm } = useMessageModal();

  const [startDate, setStartDate] = useState(defaultStart());
  const [endDate, setEndDate] = useState(defaultEnd());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filter = useMemo(() => {
    const start = startDate ? new Date(startDate).toISOString() : undefined;
    let end: string | undefined;
    if (endDate) {
      const endDay = new Date(endDate);
      endDay.setHours(23, 59, 59, 999);
      end = endDay.toISOString();
    }
    return {
      startDate: start,
      endDate: end,
      type: typeFilter === 'all' ? undefined : (typeFilter as TransactionType),
    };
  }, [startDate, endDate, typeFilter]);

  const transactionsQuery = useTransactionsQuery(filter);
  const categoriesQuery = useCategories();
  const familyQuery = useFamilyDetails(Boolean(user?.familyId || user?._id));
  const deleteMutation = useDeleteTransaction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const bankAccounts = familyQuery.data?.bankAccounts ?? [];

  const openModal = (type: TransactionType) => {
    setModalType(type);
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tr: Transaction) => {
    setModalType(tr.type);
    setSelectedTransaction(tr);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    showConfirm(
      t('common.confirmDelete'),
      t('transactions.deleteConfirm'),
      () => {
        deleteMutation.mutate(id, {
          onError: () => showMessage('Error', t('transactions.deleteError')),
        });
      },
      true,
    );
  };

  if (transactionsQuery.isLoading) {
    return <div className="tx-loading">{t('common.loading')}</div>;
  }

  const totalCount = transactions.length;
  const incomeCount = transactions.filter((tr) => tr.type === 'income').length;
  const expenseCount = transactions.filter((tr) => tr.type === 'expense').length;

  return (
    <div className="tx-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">02 · Ledger</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>{t('transactions.title')}</h1>
          <p className="page-subtitle">{t('transactions.subtitle')}</p>
        </div>
        <div className="tx-actions">
          <button className="btn btn-outline tx-income-btn" onClick={() => openModal('income')}>
            + {t('transactions.addIncome')}
          </button>
          <button className="btn btn-primary" onClick={() => openModal('expense')}>
            + {t('transactions.addExpense')}
          </button>
        </div>
      </header>

      <section className="tx-meta">
        <div className="tx-meta-item">
          <span className="eyebrow">Total entries</span>
          <span className="tx-meta-value">{String(totalCount).padStart(2, '0')}</span>
        </div>
        <div className="tx-meta-item">
          <span className="eyebrow eyebrow-primary">Inflows</span>
          <span className="tx-meta-value tx-meta-up">{String(incomeCount).padStart(2, '0')}</span>
        </div>
        <div className="tx-meta-item">
          <span className="eyebrow eyebrow-danger">Outflows</span>
          <span className="tx-meta-value tx-meta-down">{String(expenseCount).padStart(2, '0')}</span>
        </div>
      </section>

      <section className="tx-filters">
        <div className="tx-filter-field">
          <label className="form-label">{t('dashboard.startDate')}</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="tx-filter-field">
          <label className="form-label">{t('dashboard.endDate')}</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="tx-filter-field">
          <label className="form-label">{t('transactions.type')}</label>
          <select
            className="form-control"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">{t('dashboard.all')}</option>
            <option value="income">{t('transactions.income')}</option>
            <option value="expense">{t('transactions.expense')}</option>
          </select>
        </div>
      </section>

      <section className="tx-table-wrap">
        <div className="table-responsive">
          <table className="editorial-table tx-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('common.user')}</th>
                <th>{t('transactions.category')}</th>
                <th>{t('transactions.account')}</th>
                <th className="text-right">{t('transactions.amount')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="tx-empty">
                    {t('transactions.noTransactions')}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id} className={`tr-${tr.type}`}>
                    <td className="tx-date">{new Date(tr.date).toLocaleDateString(i18n.language)}</td>
                    <td>
                      <span className="tx-desc">
                        {tr.description === 'Income'
                          ? t('transactions.income')
                          : tr.description === 'Expense'
                            ? t('transactions.expense')
                            : tr.description || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="tx-user">{tr.userId?.name || '?'}</span>
                    </td>
                    <td>
                      <span className="tx-cat">{translateCategory(tr.category)}</span>
                    </td>
                    <td>
                      <span className="tx-bank">
                        {tr.bankAccount || '—'}{' '}
                        {tr.isFixed ? (
                          <em className="tx-fixed">{t('transactions.fixedTag')}</em>
                        ) : (
                          ''
                        )}
                      </span>
                    </td>
                    <td className={`tx-amount tx-${tr.type}`}>
                      {tr.type === 'income' ? '+' : '−'} R$ {tr.amount.toFixed(2)}
                    </td>
                    <td className="text-right">
                      <div className="tx-row-actions">
                        <button
                          className="tx-icon-btn"
                          onClick={() => openEditModal(tr)}
                          title={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="tx-icon-btn tx-icon-danger"
                          onClick={() => handleDelete(tr._id)}
                          title={t('transactions.removeTransaction')}
                          aria-label={t('transactions.removeTransaction')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSuccess={() => transactionsQuery.refetch()}
        type={modalType}
        initialCategories={categories}
        initialBankAccounts={bankAccounts}
        editTransaction={selectedTransaction}
      />
    </div>
  );
}
