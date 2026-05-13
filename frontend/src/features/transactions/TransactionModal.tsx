import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumericFormat } from 'react-number-format';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import { familyApi } from '../../lib/api';
import { useCategoryTranslation } from '../../hooks/useCategoryTranslation';
import { useCategories, categoriesQueryKey } from '../../hooks/useCategories';
import { useBankAccounts, bankAccountsQueryKey } from '../../hooks/useBankAccounts';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { useCreateTransaction, useUpdateTransaction } from './hooks/useTransactions';
import type { Transaction, TransactionType } from '../../types/api';
import './TransactionModal.css';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: TransactionType;
  editTransaction?: Transaction | null;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  editTransaction,
}: TransactionModalProps) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { showMessage } = useMessageModal();
  const queryClient = useQueryClient();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const categories = useCategories().data ?? [];
  const bankAccounts = useBankAccounts().data ?? [];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [bankAccount, setBankAccount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isFixed, setIsFixed] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setIsCreatingCategory(false);
    setIsCreatingAccount(false);
    setNewCategory('');
    setNewBankAccount('');
    if (editTransaction) {
      setDescription(editTransaction.description || '');
      setAmount(editTransaction.amount || '');
      setCategory(
        editTransaction.category || (categories.length > 0 ? categories[0] : ''),
      );
      setBankAccount(editTransaction.bankAccount || '');
      setDate(new Date(editTransaction.date).toISOString().split('T')[0]);
      setIsFixed(editTransaction.isFixed || false);
    } else {
      setDescription('');
      setAmount('');
      setCategory(categories.length > 0 ? categories[0] : '');
      setBankAccount(bankAccounts.length > 0 ? bankAccounts[0] : '');
      setDate(new Date().toISOString().split('T')[0]);
      setIsFixed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editTransaction]);

  const handleCreateCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    try {
      setLoading(true);
      await familyApi.addCategory(trimmed);
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      setCategory(trimmed);
      setNewCategory('');
      setIsCreatingCategory(false);
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('transactions.categoryError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = newBankAccount.trim();
    if (!trimmed) return;
    try {
      setLoading(true);
      await familyApi.addBankAccount(trimmed);
      await queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey });
      setBankAccount(trimmed);
      setNewBankAccount('');
      setIsCreatingAccount(false);
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('transactions.accountError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const numAmount =
      typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    if (!numAmount || numAmount <= 0) return;

    const payload = {
      description:
        description ||
        (type === 'income' ? t('transactions.income') : t('transactions.expense')),
      amount: numAmount,
      type,
      category: type === 'income' ? 'Income' : category || 'General',
      bankAccount: bankAccount || undefined,
      date: new Date(date),
      isFixed: type === 'expense' ? isFixed : false,
    };

    try {
      const result = editTransaction
        ? await updateMutation.mutateAsync({ id: editTransaction._id, payload })
        : await createMutation.mutateAsync(payload);

      if (result?.alert) {
        showMessage(t('common.success'), result.alert);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('transactions.addError'));
    }
  };

  const submitting = createMutation.isPending || updateMutation.isPending;
  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);
  const canProceedStep1 = description.trim().length > 0 && category.trim().length > 0;

  const renderExpenseSteps = () => {
    switch (step) {
      case 1:
        return (
          <div className="tm-step">
            <h3 className="tm-step-title">{t('transactions.step1')}</h3>
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
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateCategory}
                    disabled={loading || !newCategory.trim()}
                  >
                    {loading ? '...' : t('common.add')}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsCreatingCategory(false)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="tm-select-row">
                  {categories.length > 0 ? (
                    <select
                      className="form-control"
                      style={{ flex: 1 }}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {translateCategory(c)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="form-control tm-placeholder" style={{ flex: 1 }}>
                      {t('transactions.noCategoriesYet')}
                    </div>
                  )}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsCreatingCategory(true)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <div className="tm-checkbox">
              <input
                type="checkbox"
                id="isFixed"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
              />
              <label htmlFor="isFixed">{t('transactions.isFixed')}</label>
            </div>
            <button
              className="btn btn-primary tm-next-btn"
              onClick={nextStep}
              disabled={!canProceedStep1}
            >
              {t('common.next')} →
            </button>
          </div>
        );
      case 2:
        return (
          <div className="tm-step">
            <h3 className="tm-step-title">{t('transactions.step2')}</h3>
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
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={prevStep}>
                ← {t('common.back')}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={nextStep}
                disabled={!amount || Number(amount) <= 0}
              >
                {t('common.next')} →
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="tm-step">
            <h3 className="tm-step-title">{t('transactions.step3')}</h3>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.bankAccount')}</label>
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
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateAccount}
                    disabled={loading || !newBankAccount.trim()}
                  >
                    {loading ? '...' : t('common.add')}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsCreatingAccount(false)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="tm-select-row">
                  {bankAccounts.length > 0 ? (
                    <select
                      className="form-control"
                      style={{ flex: 1 }}
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                    >
                      {bankAccounts.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="form-control tm-placeholder" style={{ flex: 1 }}>
                      {t('transactions.noAccountsYet')}
                    </div>
                  )}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsCreatingAccount(true)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <div className="tm-field">
              <label className="tm-label">{t('transactions.date')}</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="tm-nav-buttons">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={prevStep}>
                ← {t('common.back')}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? '...'
                  : editTransaction
                    ? t('common.save')
                    : t('common.confirm')}
              </button>
            </div>
          </div>
        );
    }
  };

  const renderIncomeFlow = () => (
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
        <label className="tm-label">
          {t('transactions.description')} ({t('common.optional')})
        </label>
        <input
          type="text"
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Salary"
        />
      </div>
      <div className="tm-field">
        <label className="tm-label">
          {t('transactions.bankAccount')} ({t('common.optional')})
        </label>
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
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateAccount}
              disabled={loading || !newBankAccount.trim()}
            >
              {loading ? '...' : t('common.add')}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setIsCreatingAccount(false)}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="tm-select-row">
            {bankAccounts.length > 0 ? (
              <select
                className="form-control"
                style={{ flex: 1 }}
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
              >
                <option value="">{t('common.select')}</option>
                {bankAccounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <div className="form-control tm-placeholder" style={{ flex: 1 }}>
                {t('transactions.noAccountsYet')}
              </div>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setIsCreatingAccount(true)}
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="tm-field">
        <label className="tm-label">{t('transactions.date')}</label>
        <input
          type="date"
          className="form-control"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <button
        className="btn btn-primary tm-next-btn"
        onClick={handleSubmit}
        disabled={submitting || !amount || Number(amount) <= 0}
      >
        {submitting ? '...' : editTransaction ? t('common.save') : t('common.add')}
      </button>
    </div>
  );

  const titlePrefix = editTransaction ? `${t('common.edit')} ` : `${t('common.add')} `;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        type === 'expense'
          ? titlePrefix + t('transactions.expense')
          : titlePrefix + t('transactions.income')
      }
    >
      <div className="tm-modal">
        {type === 'expense' && (
          <div className="tm-steps-indicator">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`tm-step-dot ${step >= s ? 'active' : ''}`} />
            ))}
          </div>
        )}
        {type === 'expense' ? renderExpenseSteps() : renderIncomeFlow()}
      </div>
    </Modal>
  );
}
