import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslation } from '../../hooks/useCategoryTranslation';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { useCategories } from '../../hooks/useCategories';
import { useBudgetQuery, useCopyPreviousBudget, useSaveBudget } from './hooks/useBudget';
import type { BudgetLimit } from '../../types/api';
import './BudgetPage.css';

export default function BudgetPage() {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { showMessage } = useMessageModal();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  const categoriesQuery = useCategories();
  const budgetQuery = useBudgetQuery(month, year);
  const saveMutation = useSaveBudget(month, year);
  const copyMutation = useCopyPreviousBudget(month, year);

  const [globalLimit, setGlobalLimit] = useState(0);
  const [categoryLimits, setCategoryLimits] = useState<BudgetLimit[]>([]);

  useEffect(() => {
    const categories = categoriesQuery.data ?? [];
    const budget = budgetQuery.data;
    if (!budget) return;

    setGlobalLimit(budget.totalLimit || 0);
    const limits = budget.categoryLimits || [];
    const merged = categories.map<BudgetLimit>((cat) => {
      const existing = limits.find((l) => l.category === cat);
      return { category: cat, limit: existing ? existing.limit : 0 };
    });
    setCategoryLimits(merged);
  }, [categoriesQuery.data, budgetQuery.data]);

  const totalCategoryAllocated = useMemo(
    () => categoryLimits.reduce((sum, c) => sum + (c.limit || 0), 0),
    [categoryLimits],
  );
  const unallocated = globalLimit - totalCategoryAllocated;

  const loading =
    categoriesQuery.isLoading || budgetQuery.isLoading || copyMutation.isPending;
  const saving = saveMutation.isPending;

  const handleCopyPrevMonth = () => {
    copyMutation.mutate(undefined, {
      onSuccess: () => showMessage(t('common.success'), t('budget.copiedSuccess')),
      onError: () => showMessage(t('common.error'), t('budget.copyError')),
    });
  };

  const handleSave = () => {
    saveMutation.mutate(
      {
        month,
        year,
        totalLimit: globalLimit,
        categoryLimits: categoryLimits.filter((c) => c.limit > 0),
      },
      {
        onSuccess: () => showMessage(t('common.success'), t('budget.savedSuccess')),
        onError: () => showMessage(t('common.error'), t('budget.saveError')),
      },
    );
  };

  const handleLimitChange = (cat: string, limit: number) => {
    setCategoryLimits((prev) =>
      prev.map((c) => (c.category === cat ? { ...c, limit } : c)),
    );
  };

  const handlePrevMonth = () =>
    setCurrentMonth(new Date(year, month - 2, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month, 1));
  const monthLabel = currentMonth.toLocaleString(i18n.language, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bp-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">04 · Budget</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {t('budget.title')}
          </h1>
          <p className="page-subtitle">{t('budget.description')}</p>
        </div>
        <div className="bp-month-nav" role="group">
          <button className="bp-nav-arrow" onClick={handlePrevMonth} aria-label="Previous month">
            &lt;
          </button>
          <span className="bp-nav-label">{monthLabel}</span>
          <button className="bp-nav-arrow" onClick={handleNextMonth} aria-label="Next month">
            &gt;
          </button>
        </div>
      </header>

      {loading ? (
        <div className="bp-loading">{t('common.loading')}</div>
      ) : (
        <>
          <section className="bp-global-block">
            <div className="bp-global-left">
              <span className="eyebrow">{t('budget.globalLimit')}</span>
              <span className="bp-global-help">Total spendable ceiling for this month</span>
            </div>
            <div className="bp-global-input">
              <span className="bp-currency">R$</span>
              <input
                type="number"
                className="bp-global-field"
                value={globalLimit}
                onChange={(e) => setGlobalLimit(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="bp-global-actions">
              <button className="btn btn-outline btn-sm" onClick={handleCopyPrevMonth}>
                {t('budget.copyPrevMonth')}
              </button>
            </div>
          </section>

          <section className="bp-summary">
            <div className="bp-summary-item">
              <span className="eyebrow">Allocated by category</span>
              <span className="bp-summary-value">R$ {totalCategoryAllocated.toFixed(2)}</span>
            </div>
            <div className="bp-summary-item">
              <span className="eyebrow">Unallocated (free)</span>
              <span className={`bp-summary-value ${unallocated < 0 ? 'is-down' : 'is-up'}`}>
                R$ {unallocated.toFixed(2)}
              </span>
            </div>
          </section>

          <section className="bp-category-section">
            <div className="bp-section-head">
              <h3 className="section-title">
                <span className="section-numeral">01</span>
                {t('budget.categoryLimits')}
              </h3>
            </div>
            <div className="bp-cat-list">
              {categoryLimits.map((cl) => (
                <div key={cl.category} className="bp-cat-row">
                  <span className="bp-cat-name">{translateCategory(cl.category)}</span>
                  <div className="bp-cat-input">
                    <span className="bp-cat-currency">R$</span>
                    <input
                      type="number"
                      className="bp-cat-field"
                      value={cl.limit || ''}
                      onChange={(e) => handleLimitChange(cl.category, Number(e.target.value))}
                      placeholder={t('dashboard.noLimit')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="bp-save-bar">
            <button
              className="btn btn-primary bp-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('budget.saving') : t('budget.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
