import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import api from '../services/api';
import { useCategoryTranslation } from '../hooks/useCategoryTranslation';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
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
  const monthLabel = currentMonth.toLocaleString(i18n.language, { month: 'long', year: 'numeric' });

  // Let's present the list as only the ACTIVE limits. That way they can "apagar" a field and it disappears.
  // And they have a dropdown to add a new category limit.
  // To initialize, active is any with limit > 0 or limit === 0 (but type is number not string). 
  // Let's modify the above active logic:
  
  const displayLimits = categoryLimits.filter(cl => cl.limit !== '');
  const availableCategories = categoryLimits.filter(cl => cl.limit === '').map(cl => cl.category);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('budget.title')}>
      <div className="bm-body">
        <div className="bm-month-nav">
          <button className="bm-nav-arrow" onClick={handlePrevMonth} aria-label="Previous">&lt;</button>
          <span className="bm-nav-label">{monthLabel}</span>
          <button className="bm-nav-arrow" onClick={handleNextMonth} aria-label="Next">&gt;</button>
        </div>

        {loading ? (
          <div className="bm-loading">{t('common.loading')}</div>
        ) : (
          <>
            <div className="bm-global-row">
              <div className="bm-global-label">
                <span className="eyebrow">{t('budget.globalLimit')}</span>
              </div>
              <div className="bm-global-input">
                <span className="bm-currency">R$</span>
                <NumericFormat
                  className="bm-global-field"
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

            <div className="bm-section-head">
              <h3 className="section-title">
                <span className="section-numeral">01</span>
                {t('budget.categoryLimits')}
              </h3>
              {displayLimits.length === 0 && (
                <button className="btn btn-outline btn-sm" onClick={handleCopyPrevMonth}>{t('budget.copyPrevMonth')}</button>
              )}
            </div>

            <div className="bm-cat-list">
              {displayLimits.length === 0 ? (
                <div className="bm-empty">{t('budget.noLimits')}</div>
              ) : (
                displayLimits.map(cl => (
                  <div key={cl.category} className="bm-cat-row">
                    <span className="bm-cat-name">{translateCategory(cl.category)}</span>
                    <div className="bm-cat-input">
                      <span className="bm-cat-currency">R$</span>
                      <NumericFormat
                        className="bm-cat-field"
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
                        className="bm-icon-btn"
                        onClick={() => handleDeleteLimit(cl.category)}
                        title={t('budget.deleteLimit')}
                        aria-label={t('budget.deleteLimit')}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {availableCategories.length > 0 && (
              <div className="bm-add-row">
                <select
                  className="form-control"
                  value={selectedNewCategory}
                  onChange={(e) => setSelectedNewCategory(e.target.value)}
                >
                  <option value="">{t('budget.selectCategory')}</option>
                  {availableCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
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

            <button className="btn btn-primary bm-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? t('budget.saving') : t('budget.save')}
            </button>
          </>
        )}
      </div>
      <style>{`
        .bm-body { display: flex; flex-direction: column; gap: 20px; }
        .bm-loading { text-align: center; padding: 30px; color: var(--text-secondary); font-style: italic; }

        .bm-month-nav {
          display: inline-flex;
          align-items: stretch;
          border: 1px solid var(--text);
          align-self: stretch;
        }
        .bm-nav-arrow {
          background: transparent;
          border: none;
          padding: 8px 14px;
          font-size: 14px;
          cursor: pointer;
          color: var(--text);
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .bm-nav-arrow:hover { background: var(--bg); }
        .bm-nav-label {
          flex: 1;
          padding: 8px 12px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-left: 1px solid var(--text);
          border-right: 1px solid var(--text);
        }

        .bm-global-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 0;
          border-top: 1px solid var(--text);
          border-bottom: 1px solid var(--border);
        }
        .bm-global-label .eyebrow { display: block; }
        .bm-global-input { display: flex; align-items: baseline; gap: 10px; }
        .bm-currency {
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .bm-global-field {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--text);
          padding: 4px 0;
          font-family: var(--sans);
          font-size: 28px;
          font-weight: 500;
          color: var(--primary);
          letter-spacing: -0.8px;
          font-variant-numeric: tabular-nums;
          text-align: right;
          width: 160px;
          outline: none;
        }

        .bm-section-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--text);
        }

        .bm-cat-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; }
        .bm-cat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          gap: 10px;
        }
        .bm-cat-row:last-child { border-bottom: none; }
        .bm-cat-name {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text);
        }
        .bm-cat-input { display: flex; align-items: baseline; gap: 8px; }
        .bm-cat-currency {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .bm-cat-field {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          padding: 4px 0;
          width: 110px;
          font-family: var(--sans);
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          text-align: right;
          outline: none;
        }
        .bm-cat-field:focus { border-bottom-color: var(--text); }
        .bm-icon-btn {
          background: transparent;
          border: 1px solid var(--border);
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.15s;
        }
        .bm-icon-btn:hover { border-color: var(--danger); color: var(--danger); }

        .bm-empty { padding: 24px 0; text-align: center; color: var(--text-secondary); font-style: italic; font-size: 13px; }

        .bm-add-row { display: flex; gap: 8px; padding-top: 8px; }
        .bm-add-row .form-control { flex: 1; }

        .bm-save-btn {
          padding: 14px;
          font-size: 12px;
          letter-spacing: 0.14em;
          margin-top: 8px;
        }
      `}</style>
    </Modal>
  );
};

export default BudgetModal;
