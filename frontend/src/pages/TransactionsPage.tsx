import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMessageModal } from '../contexts/MessageModalContext';
import TransactionModal from '../components/TransactionModal';

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  bankAccount?: string;
  date: string;
  userId?: { name: string };
}

const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showMessage, showConfirm } = useMessageModal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

  const currentDate = new Date();
  const rawMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const rawMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(rawMonthStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(rawMonthEnd.toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    if (user?.familyId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, startDate, endDate, typeFilter]);

  const loadData = async () => {
    try {
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
        api.get('/family/details'),
      ]);
      console.log(transRes);
      
      setTransactions(transRes.data);
      setCategories(catRes.data);
      setBankAccounts(familyRes.data.bankAccounts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
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

  if (loading) return <div className="text-center mt-3">{t('common.loading')}</div>;



  return (
    <div className="container mt-3" style={{ maxWidth: '1000px' }}>
      <header className="flex justify-between items-center mb-3">
        <h1>{t('transactions.title')}</h1>
        <div className="flex gap-2">
          <button className="btn btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => openModal('income')}>
            + {t('transactions.addIncome') || 'Add Income'}
          </button>
          <button className="btn btn-primary" onClick={() => openModal('expense')}>
            + {t('transactions.addExpense') || 'Add Expense'}
          </button>
        </div>
      </header>
      
      <div className="card mb-3 filters-card">
        <div className="filter-group">
           <label>{t('dashboard.startDate') || 'Start Date'}</label>
           <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
           <label>{t('dashboard.endDate') || 'End Date'}</label>
           <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="filter-group">
           <label>{t('transactions.type')}</label>
           <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
             <option value="all">{t('dashboard.all') || 'All Types'}</option>
             <option value="income">{t('transactions.income')}</option>
             <option value="expense">{t('transactions.expense')}</option>
           </select>
        </div>
      </div>

      <section className="card transaction-list-container">
        <h2>{t('transactions.recent')}</h2>
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('common.user') || 'User'}</th>
                <th>{t('transactions.category')}</th>
                <th>{t('transactions.amount')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                    {t('transactions.noTransactions') || 'No transactions found.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id} className={tr.type}>
                    <td>{new Date(tr.date).toLocaleDateString()}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="desc">{tr.description || '-'}</span>
                        <span className="bank">{tr.bankAccount}</span>
                      </div>
                    </td>
                    <td><span style={{fontSize: '13px', color: 'var(--text-muted)'}}>{tr.userId?.name || '?'}</span></td>
                    <td><span className="badge">{tr.category}</span></td>
                    <td className="amount">
                      {tr.type === 'income' ? '+' : '-'}${tr.amount.toFixed(2)}
                    </td>
                    <td>
                      <button className="btn-icon delete" onClick={() => handleDelete(tr._id)}>🗑️</button>
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
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        type={modalType}
        initialCategories={categories}
        initialBankAccounts={bankAccounts}
      />

      <style>{`
        .transaction-table {
          width: 100%;
          border-collapse: collapse;
        }
        .transaction-table th {
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid var(--border);
          color: var(--text-muted);
          font-size: 14px;
          text-transform: uppercase;
        }
        .transaction-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          font-size: 15px;
        }
        .transaction-table tr:hover {
          background-color: var(--bg);
        }
        .transaction-table .amount {
          font-weight: 700;
          text-align: right;
        }
        .transaction-table tr.income .amount { color: var(--success); }
        .transaction-table tr.expense .amount { color: var(--danger); }
        
        .badge {
          background-color: var(--primary-light);
          color: var(--primary);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
        }
        .bank {
          font-size: 11px;
          color: var(--text-muted);
        }
        .desc {
          font-weight: 600;
        }
        .btn-icon.delete:hover {
          background-color: #fee2e2;
          color: var(--danger);
        }
        .table-responsive {
          overflow-x: auto;
        }
        
        .filters-card {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          padding: 16px 20px;
          align-items: flex-end;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 150px;
        }
        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .filter-group .form-control {
          padding: 10px 12px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default TransactionsPage;
