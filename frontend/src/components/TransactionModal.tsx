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
      await api.post('/transactions', {
        description: description || (type === 'income' ? 'Income' : 'Expense'),
        amount: numAmount,
        type,
        category: category || 'General',
        bankAccount: bankAccount || undefined,
        date: new Date(date),
      });
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
          <div className="flex flex-col gap-2">
            <h3>{t('transactions.step1') || 'Step 1: Description & Category'}</h3>
            <div className="flex flex-col gap-1">
              <label>{t('transactions.description')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ex: Supermarket"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label>{t('transactions.category')}</label>
              {isCreatingCategory ? (
                <div className="flex gap-1">
                  <input 
                    type="text" 
                    className="form-control flex-1" 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleCreateCategory} disabled={loading || !newCategory.trim()}>
                    {loading ? '...' : (t('common.add') || 'Add')}
                  </button>
                  <button className="btn btn-outline" onClick={() => setIsCreatingCategory(false)}>✕</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  {categories.length > 0 ? (
                    <select className="form-control flex-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <div className="form-control flex-1" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {t('transactions.noCategoriesYet') || 'No categories yet — create one →'}
                    </div>
                  )}
                  <button className="btn btn-outline" onClick={() => setIsCreatingCategory(true)} style={{ minWidth: '42px' }}>+</button>
                </div>
              )}
            </div>
            <button className="btn btn-primary mt-2 w-full" onClick={nextStep} disabled={!canProceedStep1}>
              {t('common.next') || 'Next'} →
            </button>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-2">
            <h3>{t('transactions.step2') || 'Step 2: Amount'}</h3>
            <div className="flex flex-col gap-1">
              <label>{t('transactions.amount')}</label>
              <div className="flex items-center gap-1">
                <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>$</span>
                <NumericFormat 
                  className="form-control flex-1" 
                  style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center' }}
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
            <div className="flex gap-2 mt-2">
              <button className="btn btn-outline flex-1" onClick={prevStep}>← {t('common.back') || 'Back'}</button>
              <button className="btn btn-primary flex-1" onClick={nextStep} disabled={!amount || Number(amount) <= 0}>
                {t('common.next') || 'Next'} →
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-2">
            <h3>{t('transactions.step3') || 'Step 3: Account & Date'}</h3>
            <div className="flex flex-col gap-1">
              <label>{t('transactions.bankAccount') || 'Bank Account'}</label>
              {isCreatingAccount ? (
                <div className="flex gap-1">
                  <input 
                    type="text" 
                    className="form-control flex-1" 
                    value={newBankAccount} 
                    onChange={(e) => setNewBankAccount(e.target.value)}
                    placeholder="New account name"
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleCreateAccount} disabled={loading || !newBankAccount.trim()}>
                    {loading ? '...' : (t('common.add') || 'Add')}
                  </button>
                  <button className="btn btn-outline" onClick={() => setIsCreatingAccount(false)}>✕</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  {bankAccounts.length > 0 ? (
                    <select className="form-control flex-1" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
                      {bankAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : (
                    <div className="form-control flex-1" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {t('transactions.noAccountsYet') || 'No accounts yet — create one →'}
                    </div>
                  )}
                  <button className="btn btn-outline" onClick={() => setIsCreatingAccount(true)} style={{ minWidth: '42px' }}>+</button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
                <label>{t('transactions.date')}</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-outline flex-1" onClick={prevStep}>← {t('common.back') || 'Back'}</button>
              <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? '...' : (t('common.confirm') || 'Confirm')}
              </button>
            </div>
          </div>
        );
    }
  };

  const renderIncomeFlow = () => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label>{t('transactions.amount')}</label>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>$</span>
            <NumericFormat 
              className="form-control" 
              style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center' }}
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
        <div className="flex flex-col gap-1">
          <label>{t('transactions.description')} ({t('common.optional') || 'Optional'})</label>
          <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Salary" />
        </div>
        <div className="flex flex-col gap-1">
          <label>{t('transactions.bankAccount')} ({t('common.optional') || 'Optional'})</label>
          <div className="flex gap-1">
            <select className="form-control flex-1" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
              <option value="">{t('common.select') || 'Select'}</option>
              {bankAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label>{t('transactions.date')}</label>
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <button className="btn btn-primary mt-2 w-full" onClick={handleSubmit} disabled={loading || !amount || Number(amount) <= 0}>
          {loading ? '...' : (t('common.add') || 'Add')}
        </button>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'expense' ? t('transactions.addExpense') || 'Add Expense' : t('transactions.addIncome') || 'Add Income'}>
      <div className="modal-stepper">
        {type === 'expense' && (
          <div className="steps-indicator flex gap-1 mb-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`step-dot ${step >= s ? 'active' : ''}`} />
            ))}
          </div>
        )}
        {type === 'expense' ? renderExpenseSteps() : renderIncomeFlow()}
      </div>

      <style>{`
        .steps-indicator {
          justify-content: center;
        }
        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--border);
          transition: background-color 0.3s;
        }
        .step-dot.active {
          background-color: var(--primary);
        }
        h3 {
          font-size: 16px;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 16px;
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
        .flex-1 { flex: 1; }
      `}</style>
    </Modal>
  );
};

export default TransactionModal;
