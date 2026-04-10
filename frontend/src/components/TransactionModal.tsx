import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NumericFormat } from 'react-number-format';
import Modal from './Modal';
import api from '../services/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'income' | 'expense';
  initialCategories: string[];
  initialBankAccounts: string[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  type,
  initialCategories,
  initialBankAccounts,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [bankAccount, setBankAccount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [bankAccounts, setBankAccounts] = useState<string[]>(initialBankAccounts);
  
  const [isFixed, setIsFixed] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const resetForm = useCallback(() => {
    setStep(1);
    setDescription('');
    setAmount('');
    setCategories(initialCategories);
    setBankAccounts(initialBankAccounts);
    setCategory(initialCategories.length > 0 ? initialCategories[0] : '');
    setBankAccount(initialBankAccounts.length > 0 ? initialBankAccounts[0] : '');
    setIsCreatingCategory(false);
    setIsCreatingAccount(false);
    setNewCategory('');
    setNewBankAccount('');
  }, [initialCategories, initialBankAccounts]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleCreateCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newCategory.trim()) return;
    try {
      setLoading(true);
      await api.post('/family/categories', { category: newCategory.trim() });
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      setCategory(newCategory.trim());
      setNewCategory('');
      setIsCreatingCategory(false);
    } catch (err) {
      console.error(err);
      alert(t('transactions.categoryError') || 'Error creating category');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newBankAccount.trim()) return;
    try {
      setLoading(true);
      await api.post('/family/bank-accounts', { bankAccount: newBankAccount.trim() });
      const updatedAccounts = [...bankAccounts, newBankAccount.trim()];
      setBankAccounts(updatedAccounts);
      setBankAccount(newBankAccount.trim());
      setNewBankAccount('');
      setIsCreatingAccount(false);
    } catch (err) {
      console.error(err);
      alert(t('transactions.accountError') || 'Error creating bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    if (!numAmount || numAmount <= 0) return;
    
    setLoading(true);
    try {
      const res = await api.post('/transactions', {
        description: description || (type === 'income' ? 'Income' : 'Expense'),
        amount: numAmount,
        type,
        category: category || 'General',
        bankAccount: bankAccount || undefined,
        date: new Date(date),
        isFixed: type === 'expense' ? isFixed : false,
      });
      
      if (res.data?.alert) {
        alert(res.data.alert);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('transactions.addError') || 'Error adding transaction');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const canProceedStep1 = description.trim().length > 0 && category.trim().length > 0;

  const renderExpenseSteps = () => {
    switch (step) {
      case 1:
        return (
          <div className="tm-step">
            <h3 className="tm-step-title">{t('transactions.step1') || 'Step 1: Description & Category'}</h3>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.description')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ex: Supermarket"
                autoFocus
              />
            </div>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.category')}</label>
              {isCreatingCategory ? (
                <div className="tm-inline-create">
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ flex: 1 }}
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleCreateCategory} disabled={loading || !newCategory.trim()}>
                    {loading ? '...' : (t('common.add') || 'Add')}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsCreatingCategory(false)}>✕</button>
                </div>
              ) : (
                <div className="tm-select-row">
                  {categories.length > 0 ? (
                    <select className="form-control" style={{ flex: 1 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <div className="form-control tm-placeholder" style={{ flex: 1 }}>
                      {t('transactions.noCategoriesYet') || 'No categories yet — create one →'}
                    </div>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => setIsCreatingCategory(true)}>+</button>
                </div>
              )}
            </div>
            <div className="tm-checkbox">
              <input type="checkbox" id="isFixed" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
              <label htmlFor="isFixed">{t('transactions.isFixed')}</label>
            </div>
            <button className="btn btn-primary tm-next-btn" onClick={nextStep} disabled={!canProceedStep1}>
              {t('common.next') || 'Next'} →
            </button>
          </div>
        );
      case 2:
        return (
          <div className="tm-step">
            <h3 className="tm-step-title">{t('transactions.step2') || 'Step 2: Amount'}</h3>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.amount')}</label>
              <div className="tm-amount-wrapper">
                <span className="tm-currency">R$</span>
                <NumericFormat 
                  className="form-control tm-amount-input" 
                  value={amount} 
                  onValueChange={(values) => setAmount(values.floatValue || '')}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
            </div>
            <div className="tm-nav-buttons">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={prevStep}>← {t('common.back') || 'Back'}</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={nextStep} disabled={!amount || Number(amount) <= 0}>
                {t('common.next') || 'Next'} →
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="tm-step">
            <h3 className="tm-step-title">{t('transactions.step3') || 'Step 3: Account & Date'}</h3>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.bankAccount') || 'Bank Account'}</label>
              {isCreatingAccount ? (
                <div className="tm-inline-create">
                  <input 
                    type="text" 
                    className="form-control"
                    style={{ flex: 1 }} 
                    value={newBankAccount} 
                    onChange={(e) => setNewBankAccount(e.target.value)}
                    placeholder="New account name"
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleCreateAccount} disabled={loading || !newBankAccount.trim()}>
                    {loading ? '...' : (t('common.add') || 'Add')}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsCreatingAccount(false)}>✕</button>
                </div>
              ) : (
                <div className="tm-select-row">
                  {bankAccounts.length > 0 ? (
                    <select className="form-control" style={{ flex: 1 }} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
                      {bankAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : (
                    <div className="form-control tm-placeholder" style={{ flex: 1 }}>
                      {t('transactions.noAccountsYet') || 'No accounts yet — create one →'}
                    </div>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => setIsCreatingAccount(true)}>+</button>
                </div>
              )}
            </div>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.date')}</label>
              <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="tm-nav-buttons">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={prevStep}>← {t('common.back') || 'Back'}</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? '...' : (t('common.confirm') || 'Confirm')}
              </button>
            </div>
          </div>
        );
    }
  };

  const renderIncomeFlow = () => {
    return (
      <div className="tm-step">
        <div className="tm-field">
          <label className="tm-label">{t('transactions.amount')}</label>
          <div className="tm-amount-wrapper">
            <span className="tm-currency">R$</span>
            <NumericFormat 
              className="form-control tm-amount-input" 
              value={amount} 
              onValueChange={(values) => setAmount(values.floatValue || '')}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              placeholder="0,00"
              autoFocus
            />
          </div>
        </div>
        <div className="tm-field">
          <label className="tm-label">{t('transactions.description')} ({t('common.optional') || 'Optional'})</label>
          <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Salary" />
        </div>
        <div className="tm-field">
          <label className="tm-label">{t('transactions.bankAccount')} ({t('common.optional') || 'Optional'})</label>
          <select className="form-control" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
            <option value="">{t('common.select') || 'Select'}</option>
            {bankAccounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="tm-field">
          <label className="tm-label">{t('transactions.date')}</label>
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <button className="btn btn-primary tm-next-btn" onClick={handleSubmit} disabled={loading || !amount || Number(amount) <= 0}>
          {loading ? '...' : (t('common.add') || 'Add')}
        </button>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'expense' ? t('transactions.addExpense') || 'Add Expense' : t('transactions.addIncome') || 'Add Income'}>
      <div className="tm-modal">
        {type === 'expense' && (
          <div className="tm-steps-indicator">
            {[1, 2, 3].map(s => (
              <div key={s} className={`tm-step-dot ${step >= s ? 'active' : ''}`} />
            ))}
          </div>
        )}
        {type === 'expense' ? renderExpenseSteps() : renderIncomeFlow()}
      </div>

      <style>{`
        .tm-modal {}
        .tm-steps-indicator {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .tm-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--border);
          transition: background-color 0.3s, transform 0.3s;
        }
        .tm-step-dot.active {
          background-color: var(--primary);
          transform: scale(1.2);
        }
        .tm-step {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tm-step-title {
          font-size: 15px;
          color: var(--text-muted);
          text-align: center;
          margin: 0;
          font-weight: 500;
        }
        .tm-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tm-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .tm-inline-create {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .tm-select-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .tm-placeholder {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          font-size: 13px;
        }
        .tm-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tm-checkbox label {
          font-size: 14px;
          cursor: pointer;
          color: var(--text);
        }
        .tm-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary);
        }
        .tm-amount-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tm-currency {
          font-size: 28px;
          font-weight: 800;
          color: var(--primary);
          flex-shrink: 0;
        }
        .tm-amount-input {
          font-size: 28px !important;
          font-weight: 800 !important;
          text-align: center;
          flex: 1;
          min-width: 0;
        }
        .tm-nav-buttons {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }
        .tm-next-btn {
          width: 100%;
          padding: 14px;
          font-size: 15px;
          margin-top: 4px;
        }
        .form-control {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background-color: var(--bg);
          color: var(--text);
          font-size: 16px;
          width: 100%;
          transition: all 0.2s;
        }
        .form-control:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        @media (max-width: 768px) {
          .tm-currency { font-size: 24px; }
          .tm-amount-input { font-size: 24px !important; }
          .tm-inline-create {
            flex-wrap: wrap;
          }
          .tm-inline-create .form-control {
            min-width: 0;
          }
          .tm-nav-buttons {
            flex-direction: column;
          }
          .tm-nav-buttons .btn {
            flex: unset;
            width: 100%;
            padding: 14px;
          }
        }
      `}</style>
    </Modal>
  );
};

export default TransactionModal;
