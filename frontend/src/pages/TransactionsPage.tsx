import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMessageModal } from '../contexts/MessageModalContext';
import TransactionModal from '../components/TransactionModal';
import { useCategoryTranslation } from '../hooks/useCategoryTranslation';

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  bankAccount?: string;
  date: string;
  userId?: { name: string };
  isFixed?: boolean;
}

const TransactionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { user } = useAuth();
  const { showMessage, showConfirm } = useMessageModal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const currentDate = new Date();
  const rawMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const rawMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(rawMonthStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(rawMonthEnd.toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    if (user?.familyId || user?._id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, startDate, endDate, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) {
        const endDay = new Date(endDate);
        endDay.setHours(23, 59, 59, 999);
        params.endDate = endDay.toISOString();
      }
      if (typeFilter !== 'all') params.type = typeFilter;

      const [transRes, catRes, familyRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/transactions/categories'),
        api.get('/family/details').catch(() => ({ data: { bankAccounts: [] } })),
      ]);

      setTransactions(transRes.data);
      setCategories(catRes.data);
      setBankAccounts(familyRes.data?.bankAccounts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tr: Transaction) => {
    setModalType(tr.type as any);
    setSelectedTransaction(tr);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    showConfirm(
      t('common.confirmDelete') || 'Are you sure?',
      t('transactions.deleteConfirm') || 'Are you sure you want to delete this transaction?',
      async () => {
        try {
          await api.delete(`/transactions/${id}`);
          loadData();
        } catch {
          showMessage('Error', t('transactions.deleteError') || 'Error deleting transaction');
        }
      },
      true
    );
  };

  if (loading) return <div className="tx-loading">{t('common.loading')}</div>;

  const totalCount = transactions.length;
  const incomeCount = transactions.filter(t => t.type === 'income').length;
  const expenseCount = transactions.filter(t => t.type === 'expense').length;

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
            + {t('transactions.addIncome') || 'Add Income'}
          </button>
          <button className="btn btn-primary" onClick={() => openModal('expense')}>
            + {t('transactions.addExpense') || 'Add Expense'}
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
          <label className="form-label">{t('dashboard.startDate') || 'Start Date'}</label>
          <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="tx-filter-field">
          <label className="form-label">{t('dashboard.endDate') || 'End Date'}</label>
          <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="tx-filter-field">
          <label className="form-label">{t('transactions.type')}</label>
          <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
            <option value="all">{t('dashboard.all') || 'All Types'}</option>
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
                <th>{t('common.user') || 'User'}</th>
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
                    {t('transactions.noTransactions') || 'No transactions found.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id} className={`tr-${tr.type}`}>
                    <td className="tx-date">{new Date(tr.date).toLocaleDateString(i18n.language)}</td>
                    <td><span className="tx-desc">{tr.description === 'Income' ? t('transactions.income') : tr.description === 'Expense' ? t('transactions.expense') : (tr.description || '-')}</span></td>
                    <td><span className="tx-user">{tr.userId?.name || '?'}</span></td>
                    <td><span className="tx-cat">{translateCategory(tr.category)}</span></td>
                    <td><span className="tx-bank">{tr.bankAccount || '—'} {tr.isFixed ? <em className="tx-fixed">{t('transactions.fixedTag')}</em> : ''}</span></td>
                    <td className={`tx-amount tx-${tr.type}`}>
                      {tr.type === 'income' ? '+' : '−'} R$ {tr.amount.toFixed(2)}
                    </td>
                    <td className="text-right">
                      <div className="tx-row-actions">
                        <button
                          className="tx-icon-btn"
                          onClick={() => openEditModal(tr)}
                          title={t('common.edit') || 'Edit'}
                          aria-label={t('common.edit') || 'Edit'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="tx-icon-btn tx-icon-danger"
                          onClick={() => handleDelete(tr._id)}
                          title={t('transactions.removeTransaction') || 'Remove'}
                          aria-label={t('transactions.removeTransaction') || 'Remove'}
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
        onSuccess={loadData}
        type={modalType}
        initialCategories={categories}
        initialBankAccounts={bankAccounts}
        editTransaction={selectedTransaction}
      />

      <style>{`
        .tx-page { padding: 0; }
        .fade-in { animation: fadeIn 0.35s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .tx-loading { text-align: center; padding: 60px; color: var(--text-secondary); font-style: italic; }

        .tx-actions { display: flex; gap: 6px; align-items: end; }
        .tx-income-btn { color: var(--primary); border-color: var(--primary); }
        .tx-income-btn:hover { background: var(--primary); color: #fff !important; border-color: var(--primary); }

        /* Meta row: small editorial stats above the filters */
        .tx-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          margin-bottom: 28px;
          border-top: 1px solid var(--text);
          border-bottom: 1px solid var(--border);
        }
        .tx-meta-item {
          padding: 18px 22px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tx-meta-item:last-child { border-right: none; }
        .tx-meta-value {
          font-family: var(--sans);
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -0.8px;
          font-variant-numeric: tabular-nums;
          color: var(--text);
        }
        .tx-meta-up { color: var(--primary); }
        .tx-meta-down { color: var(--danger); }

        /* Filters: laid out as a hairline strip, not a card */
        .tx-filters {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          padding: 22px 0 26px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 28px;
        }
        .tx-filter-field { display: flex; flex-direction: column; }

        /* Table */
        .tx-table-wrap { border-top: 1px solid var(--text); padding-top: 4px; }
        .tx-table th { padding-top: 16px; padding-bottom: 14px; }
        .tx-table .text-right { text-align: right !important; }
        .tx-table td.tx-date { color: var(--text-secondary); font-variant-numeric: tabular-nums; font-size: 12px; letter-spacing: 0.02em; white-space: nowrap; }
        .tx-desc { font-weight: 500; color: var(--text); }
        .tx-user {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          padding-bottom: 1px;
        }
        .tx-cat {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          padding-bottom: 1px;
        }
        .tx-bank { font-size: 12px; color: var(--text-secondary); }
        .tx-fixed { font-style: normal; font-size: 10px; color: var(--warning); margin-left: 6px; letter-spacing: 0.06em; }
        .tx-amount {
          font-family: var(--sans);
          font-weight: 500;
          font-size: 17px;
          text-align: right;
          letter-spacing: -0.3px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .tx-amount.tx-income { color: var(--primary); }
        .tx-amount.tx-expense { color: var(--danger); }
        .tx-empty { padding: 60px !important; text-align: center; color: var(--text-secondary); font-style: italic; }

        .tx-row-actions { display: inline-flex; gap: 4px; justify-content: flex-end; }
        .tx-icon-btn {
          background: transparent;
          border: 1px solid var(--border);
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          border-radius: 0;
        }
        .tx-icon-btn:hover { border-color: var(--text); color: var(--text); }
        .tx-icon-btn.tx-icon-danger:hover { border-color: var(--danger); color: var(--danger); }

        .table-responsive { overflow-x: auto; }

        @media (max-width: 768px) {
          .tx-actions { flex-direction: column; width: 100%; }
          .tx-actions .btn { width: 100%; }
          .tx-meta { grid-template-columns: 1fr; }
          .tx-meta-item { border-right: none; border-bottom: 1px solid var(--border); }
          .tx-meta-item:last-child { border-bottom: none; }
          .tx-filters { grid-template-columns: 1fr; gap: 14px; padding: 16px 0; }
        }
      `}</style>
    </div>
  );
};

export default TransactionsPage;
