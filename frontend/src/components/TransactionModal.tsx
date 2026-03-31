import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic lists
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [bankAccounts, setBankAccounts] = useState<string[]>(initialBankAccounts);
  
  // Create new state
  const [newCategory, setNewCategory] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDescription('');
      setAmount('');
      setCategories(initialCategories);
      setBankAccounts(initialBankAccounts);
      setCategory(initialCategories[0] || '');
      setBankAccount(initialBankAccounts[0] || '');
    }
  }, [isOpen, initialCategories, initialBankAccounts]);

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await api.post('/family/categories', { category: newCategory });
      setCategories([...categories, newCategory]);
      setCategory(newCategory);
      setNewCategory('');
      setIsCreatingCategory(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAccount = async () => {
    if (!newBankAccount.trim()) return;
    try {
      await api.post('/family/bank-accounts', { bankAccount: newBankAccount });
      setBankAccounts([...bankAccounts, newBankAccount]);
      setBankAccount(newBankAccount);
      setNewBankAccount('');
      setIsCreatingAccount(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/transactions', {
        description,
        amount: parseFloat(amount),
        type,
        category,
        bankAccount,
        date: new Date(date),
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('transactions.addError'));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

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
                  />
                  <button className="btn btn-primary" onClick={handleCreateCategory}>Add</button>
                  <button className="btn btn-outline" onClick={() => setIsCreatingCategory(false)}>✕</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select className="form-control flex-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn btn-outline" onClick={() => setIsCreatingCategory(true)}>+</button>
                </div>
              )}
            </div>
            <button className="btn btn-primary mt-2" onClick={nextStep} disabled={!description || !category}>
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
                <span style={{ fontSize: '24px', fontWeight: 700 }}>$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control flex-1" 
                  style={{ fontSize: '24px', fontWeight: 800 }}
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-outline flex-1" onClick={prevStep}>← {t('common.back') || 'Back'}</button>
              <button className="btn btn-primary flex-1" onClick={nextStep} disabled={!amount || parseFloat(amount) <= 0}>
                {t('common.next') || 'Next'} →
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-2">
            <h3>{t('transactions.step3') || 'Step 3: Account'}</h3>
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
                  />
                  <button className="btn btn-primary" onClick={handleCreateAccount}>Add</button>
                  <button className="btn btn-outline" onClick={() => setIsCreatingAccount(false)}>✕</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select className="form-control flex-1" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
                    {bankAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button className="btn btn-outline" onClick={() => setIsCreatingAccount(true)}>+</button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
                <label>{t('transactions.date')}</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-outline flex-1" onClick={prevStep}>← {t('common.back') || 'Back'}</button>
              <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={loading || !bankAccount}>
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
          <input 
            type="number" 
            step="0.01" 
            className="form-control" 
            style={{ fontSize: '20px', fontWeight: 700 }}
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="0.00"
            required
            autoFocus
          />
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
        <button className="btn btn-primary mt-2" onClick={handleSubmit} disabled={loading || !amount}>
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
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background-color: var(--bg);
            color: var(--text);
            font-size: 16px;
            width: 100%;
        }
        .flex-1 { flex: 1; }
      `}</style>
    </Modal>
  );
};

export default TransactionModal;
