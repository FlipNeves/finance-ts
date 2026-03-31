import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TransactionModal from '../components/TransactionModal';

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  bankAccount?: string;
  date: string;
}

const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    if (user?.familyId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [transRes, catRes, familyRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/transactions/categories'),
        api.get('/family/details'),
      ]);
      
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

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await api.delete(`/transactions/${id}`);
        loadData();
      } catch {
        alert(t('transactions.deleteError'));
      }
    }
  };

  if (loading) return <div className="text-center mt-3">{t('common.loading')}</div>;

  if (!user?.familyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 mt-3" style={{ minHeight: '50vh' }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
          <h2>{t('transactions.noFamily') || 'You need a family group first'}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0' }}>
            {t('transactions.noFamilyDesc') || 'Create or join a family group to start tracking your transactions together.'}
          </p>
          <Link to="/family" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '8px' }}>
            {t('family.title') || 'Go to Family'} →
          </Link>
        </div>
      </div>
    );
  }

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

      <section className="card transaction-list-container">
        <h2>{t('transactions.recent')}</h2>
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('transactions.category')}</th>
                <th>{t('transactions.amount')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
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
      `}</style>
    </div>
  );
};

export default TransactionsPage;
