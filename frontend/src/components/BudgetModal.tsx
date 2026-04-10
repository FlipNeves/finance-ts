import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import api from '../services/api';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [globalLimit, setGlobalLimit] = useState<number | string>('');
  const [categoryLimits, setCategoryLimits] = useState<{ category: string; limit: number | string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();

      const [catRes, budgetRes] = await Promise.all([
        api.get('/transactions/categories'),
        api.get('/budgets', { params: { month: m, year: y } })
      ]);
      
      const cats = catRes.data || [];

      const budget = budgetRes.data;
      setGlobalLimit(budget?.totalLimit || '');
      
      const limits = budget?.categoryLimits || [];
      // Combine active limits with categories, only show those with limits > 0 by default, plus empty ones?
      // Wait, let's keep all categories for simplicity, or provide an option to "delete".
      // The user wants to "apagar um campo". Let's show all categories but allow clearing the value.
      const mergedLimits = cats.map((cat: string) => {
        const existing = limits.find((l: any) => l.category === cat);
        return { category: cat, limit: existing && existing.limit > 0 ? existing.limit : '' };
      });
      
      // Let's only list categories that are active OR the user explicitly added.
      // For a better UX, since they want to "apagar", let's make it a list of *active* limits
      // and provide an "adicionar" button. But for simplicity and backward compatibility with their request,
      // I'll show all categories, and the "delete" button will just set the value to '' (which means 0 in backend).
      setCategoryLimits(mergedLimits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrevMonth = async () => {
    setLoading(true);
    try {
      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();
      await api.post('/budgets/copy', { month: m, year: y });
      await loadData();
      alert(t('budget.copiedSuccess'));
    } catch (err) {
      console.error(err);
      alert(t('budget.copyError'));
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();
      
      const numGlobalLimit = typeof globalLimit === 'string' ? parseFloat(globalLimit.toString().replace(/,/g, '')) : globalLimit;
      
      const parsedLimits = categoryLimits.map(c => {
        const val = typeof c.limit === 'string' ? parseFloat(c.limit.toString().replace(/,/g, '')) : c.limit;
        return { category: c.category, limit: val || 0 };
      }).filter(c => c.limit > 0);

      const payload = {
        month: m,
        year: y,
        totalLimit: numGlobalLimit || 0,
        categoryLimits: parsedLimits,
      };
      await api.post('/budgets', payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('budget.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (cat: string, limit: number | string) => {
    setCategoryLimits(prev => prev.map(c => c.category === cat ? { ...c, limit } : c));
  };

  const handleDeleteLimit = (cat: string) => {
    setCategoryLimits(prev => prev.map(c => c.category === cat ? { ...c, limit: '' } : c));
  };

  const [selectedNewCategory, setSelectedNewCategory] = useState('');

  const handleAddNewCategoryLimit = () => {
    if (selectedNewCategory) {
      handleLimitChange(selectedNewCategory, 0); // Sets to 0 temporarily so the input shows up
      setSelectedNewCategory('');
    }
  };

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Let's present the list as only the ACTIVE limits. That way they can "apagar" a field and it disappears.
  // And they have a dropdown to add a new category limit.
  // To initialize, active is any with limit > 0 or limit === 0 (but type is number not string). 
  // Let's modify the above active logic:
  
  const displayLimits = categoryLimits.filter(cl => cl.limit !== '');
  const availableCategories = categoryLimits.filter(cl => cl.limit === '').map(cl => cl.category);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('budget.title')}>
      <div className="flex flex-col gap-3">
        <div className="month-selector flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px' }}>
            <button className="btn-icon" onClick={handlePrevMonth}>&lt;</button>
            <span style={{ fontWeight: 600, minWidth: '140px', textAlign: 'center', textTransform: 'capitalize', fontSize: '14px' }}>{monthLabel}</span>
            <button className="btn-icon" onClick={handleNextMonth}>&gt;</button>
        </div>

        {loading ? (
          <div className="text-center text-muted py-4">{t('common.loading')}</div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-muted">{t('budget.globalLimit')}</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>R$</span>
                <NumericFormat 
                  className="form-control" 
                  style={{ fontSize: '20px', fontWeight: 700, width: '140px', textAlign: 'right' }}
                  value={globalLimit}
                  onValueChange={(values) => setGlobalLimit(values.floatValue ?? '')}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  placeholder="0,00"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
               <h3 style={{ fontSize: '16px', margin: 0 }}>{t('budget.categoryLimits')}</h3>
               {displayLimits.length === 0 && (
                 <button className="btn btn-outline btn-sm" onClick={handleCopyPrevMonth}>{t('budget.copyPrevMonth')}</button>
               )}
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {displayLimits.length === 0 ? (
                <div className="text-center text-muted py-2 text-sm">{t('budget.noLimits')}</div>
              ) : (
                displayLimits.map(cl => (
                  <div key={cl.category} className="flex justify-between items-center bg-[var(--bg-card)] p-2 rounded border border-[var(--border)]">
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{cl.category}</span>
                    <div className="flex items-center gap-1">
                      <span style={{ color: 'var(--text-muted)' }}>R$</span>
                      <NumericFormat 
                        className="form-control"
                        style={{ width: '120px', textAlign: 'right', padding: '6px 10px', fontSize: '14px' }}
                        value={cl.limit}
                        onValueChange={(values) => handleLimitChange(cl.category, values.floatValue ?? '')}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        placeholder="0,00"
                      />
                      <button 
                        className="btn-icon" 
                        onClick={() => handleDeleteLimit(cl.category)}
                        title={t('budget.deleteLimit')}
                        style={{ color: '#ef4444', padding: '6px' }}
                      >
                         ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {availableCategories.length > 0 && (
              <div className="flex gap-2 mt-2">
                <select 
                  className="form-control flex-1" 
                  value={selectedNewCategory} 
                  onChange={(e) => setSelectedNewCategory(e.target.value)}
                  style={{ fontSize: '14px', padding: '8px 12px' }}
                >
                  <option value="">{t('budget.selectCategory')}</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  className="btn btn-outline" 
                  onClick={handleAddNewCategoryLimit}
                  disabled={!selectedNewCategory}
                >
                  {t('common.add')}
                </button>
              </div>
            )}

            <button className="btn btn-primary w-full mt-3" onClick={handleSave} disabled={saving}>
              {saving ? t('budget.saving') : t('budget.save')}
            </button>
          </>
        )}
      </div>
      <style>{`
        .btn-icon {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background 0.2s;
          cursor: pointer;
        }
        .btn-icon:hover {
          background: var(--bg);
        }
      `}</style>
    </Modal>
  );
};

export default BudgetModal;
