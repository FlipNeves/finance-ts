import { useEffect, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import { budgetsApi, transactionsApi } from '../../lib/api';
import { useCategoryTranslation } from '../../hooks/useCategoryTranslation';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { budgetKey } from './hooks/useBudget';
import './BudgetModal.css';

interface CategoryLimitEntry {
  category: string;
  limit: number | string;
}

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BudgetModal({ isOpen, onClose, onSuccess }: BudgetModalProps) {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { showMessage } = useMessageModal();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [globalLimit, setGlobalLimit] = useState<number | string>('');
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNewCategory, setSelectedNewCategory] = useState('');

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [cats, budget] = await Promise.all([
          transactionsApi.categories(),
          budgetsApi.get({ month, year }),
        ]);
        if (cancelled) return;
        setGlobalLimit(budget?.totalLimit || '');
        const limits = budget?.categoryLimits || [];
        const merged: CategoryLimitEntry[] = cats.map((cat) => {
          const existing = limits.find((l) => l.category === cat);
          return {
            category: cat,
            limit: existing && existing.limit > 0 ? existing.limit : '',
          };
        });
        setCategoryLimits(merged);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, month, year]);

  const handleCopyPrevMonth = async () => {
    setLoading(true);
    try {
      await budgetsApi.copyPrevious({ month, year });
      queryClient.invalidateQueries({ queryKey: budgetKey(month, year) });
      showMessage(t('common.success'), t('budget.copiedSuccess'));
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('budget.copyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const numGlobalLimit =
        typeof globalLimit === 'string'
          ? parseFloat(globalLimit.toString().replace(/,/g, ''))
          : globalLimit;

      const parsedLimits = categoryLimits
        .map((c) => {
          const val =
            typeof c.limit === 'string'
              ? parseFloat(c.limit.toString().replace(/,/g, ''))
              : c.limit;
          return { category: c.category, limit: val || 0 };
        })
        .filter((c) => c.limit > 0);

      await budgetsApi.save({
        month,
        year,
        totalLimit: numGlobalLimit || 0,
        categoryLimits: parsedLimits,
      });
      queryClient.invalidateQueries({ queryKey: budgetKey(month, year) });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('budget.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (cat: string, limit: number | string) => {
    setCategoryLimits((prev) =>
      prev.map((c) => (c.category === cat ? { ...c, limit } : c)),
    );
  };

  const handleDeleteLimit = (cat: string) => {
    setCategoryLimits((prev) =>
      prev.map((c) => (c.category === cat ? { ...c, limit: '' } : c)),
    );
  };

  const handleAddNewCategoryLimit = () => {
    if (selectedNewCategory) {
      handleLimitChange(selectedNewCategory, 0);
      setSelectedNewCategory('');
    }
  };

  const handlePrevMonth = () =>
    setCurrentMonth(new Date(year, month - 2, 1));
  const handleNextMonth = () =>
    setCurrentMonth(new Date(year, month, 1));
  const monthLabel = currentMonth.toLocaleString(i18n.language, {
    month: 'long',
    year: 'numeric',
  });

  const displayLimits = categoryLimits.filter((cl) => cl.limit !== '');
  const availableCategories = categoryLimits.filter((cl) => cl.limit === '').map((cl) => cl.category);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('budget.title')}>
      <div className="bm-body">
        <div className="bm-month-nav">
          <button className="bm-nav-arrow" onClick={handlePrevMonth} aria-label="Previous">
            &lt;
          </button>
          <span className="bm-nav-label">{monthLabel}</span>
          <button className="bm-nav-arrow" onClick={handleNextMonth} aria-label="Next">
            &gt;
          </button>
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
                <button className="btn btn-outline btn-sm" onClick={handleCopyPrevMonth}>
                  {t('budget.copyPrevMonth')}
                </button>
              )}
            </div>

            <div className="bm-cat-list">
              {displayLimits.length === 0 ? (
                <div className="bm-empty">{t('budget.noLimits')}</div>
              ) : (
                displayLimits.map((cl) => (
                  <div key={cl.category} className="bm-cat-row">
                    <span className="bm-cat-name">{translateCategory(cl.category)}</span>
                    <div className="bm-cat-input">
                      <span className="bm-cat-currency">R$</span>
                      <NumericFormat
                        className="bm-cat-field"
                        value={cl.limit}
                        onValueChange={(values) =>
                          handleLimitChange(cl.category, values.floatValue ?? '')
                        }
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
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {translateCategory(c)}
                    </option>
                  ))}
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
    </Modal>
  );
}
