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

  if (loading) return <div className="text-center mt-3" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>;

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header mb-3">
        <div className="header-left flex flex-col gap-1">
          <h1 className="header-title">{t('transactions.title')}</h1>
          <p className="header-subtitle text-muted">{t('transactions.subtitle')}</p>
        </div>
        <div className="header-actions flex gap-2 items-center">
          <button className="btn btn-outline income-btn" onClick={() => openModal('income')}>
            + {t('transactions.addIncome') || 'Add Income'}
          </button>
          <button className="btn btn-primary expense-btn" onClick={() => openModal('expense')}>
            + {t('transactions.addExpense') || 'Add Expense'}
          </button>
        </div>
      </header>
      
      <div className="card mb-3 p-3 flex flex-wrap gap-2 items-end" style={{ padding: '16px 24px' }}>
        <div className="flex flex-col gap-1" style={{ flex: '1', minWidth: '150px' }}>
           <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('dashboard.startDate') || 'Start Date'}</label>
           <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1" style={{ flex: '1', minWidth: '150px' }}>
           <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('dashboard.endDate') || 'End Date'}</label>
           <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1" style={{ flex: '1', minWidth: '150px' }}>
           <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('transactions.type')}</label>
           <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
             <option value="all">{t('dashboard.all') || 'All Types'}</option>
             <option value="income">{t('transactions.income')}</option>
             <option value="expense">{t('transactions.expense')}</option>
           </select>
        </div>
      </div>

      <div className="card table-card mb-3">
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>{t('transactions.date')}</th>
                <th>{t('transactions.description')}</th>
                <th>{t('common.user') || 'User'}</th>
                <th>{t('transactions.category')}</th>
                <th>{t('transactions.account')}</th>
                <th className="text-right">{t('transactions.amount')}</th>
                <th className="text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center empty-state">
                    {t('transactions.noTransactions') || 'No transactions found.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr._id} className={`tr-${tr.type}`}>
                    <td className="text-muted" style={{ width: '120px' }}>{new Date(tr.date).toLocaleDateString(i18n.language)}</td>
                    <td><span className="desc">{tr.description === 'Income' ? t('transactions.income') : tr.description === 'Expense' ? t('transactions.expense') : (tr.description || '-')}</span></td>
                    <td><span className="user-badge">{tr.userId?.name || '?'}</span></td>
                    <td><span className="category-badge">{translateCategory(tr.category)}</span></td>
                    <td><span className="bank">{tr.bankAccount || '-'} {tr.isFixed ? t('transactions.fixedTag') : ''}</span></td>
                    <td className={`amount ${tr.type}`}>
                      {tr.type === 'income' ? '+' : '-'}R${tr.amount.toFixed(2)}
                    </td>
                    <td className="text-center" style={{ width: '120px' }}>
                      <div className="flex gap-1 justify-center">
                        <button 
                          className="btn-icon edit-btn-large" 
                          onClick={() => openEditModal(tr)}
                          title={t('common.edit') || 'Editar'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button 
                          className="btn-icon delete-btn-large" 
                          onClick={() => handleDelete(tr._id)}
                          title="Remover Transação"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
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
      </div>

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
        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           flex-wrap: wrap;
           gap: 16px;
        }
        
        .header-title {
          font-size: 28px;
          margin-bottom: 0;
        }
        
        .header-subtitle {
          margin: 0;
          font-size: 14px;
        }

        .btn-icon {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .btn-icon:hover {
          background: var(--bg);
        }

        .income-btn { color: #10b981; border-color: #10b981; }
        .income-btn:hover { background: #d1fae5 !important; border-color: #059669; color: #059669; }

        .expense-btn { background-color: #ef4444; }
        .expense-btn:hover { background-color: #dc2626 !important; }

        .table-card {
          padding: 24px;
        }

        .transaction-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }
        
        .transaction-table th {
          text-align: left;
          padding: 8px 16px;
          color: var(--text-muted);
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }

        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        
        .transaction-table td {
          padding: 16px;
          font-size: 14px;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        /* Rounded row edges */
        .transaction-table td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        .transaction-table td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
        
        .transaction-table tbody tr {
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .transaction-table tbody tr:hover td {
          background: var(--bg);
        }
        
        .desc { font-weight: 600; color: var(--text); }

        .amount {
          font-weight: 700;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        
        .amount.income { color: #10b981; }
        .amount.expense { color: #ef4444; }

        .category-badge {
          background-color: var(--primary-light);
          color: var(--primary-dark);
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .user-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .bank { font-size: 12px; color: var(--text-muted); margin-top: 2px;}
        .desc { font-weight: 600; color: var(--text); }
        .empty-state { padding: 40px !important; color: var(--text-muted); }
        
        .table-responsive { overflow-x: auto; }

        .delete-btn-large, .edit-btn-large {
           padding: 10px;
           color: var(--text-muted);
           display: flex;
           align-items: center;
           justify-content: center;
        }
        
        .edit-btn-large:hover {
           color: var(--primary);
           background-color: var(--primary-light);
           box-shadow: var(--shadow-sm);
        }

        .delete-btn-large:hover {
           color: #ef4444;
           background-color: #fee2e2;
           box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
};

export default TransactionsPage;
