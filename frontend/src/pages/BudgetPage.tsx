import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useCategoryTranslation } from '../hooks/useCategoryTranslation';
import { useMessageModal } from '../contexts/MessageModalContext';

const BudgetPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { translateCategory } = useCategoryTranslation();
  const { showMessage } = useMessageModal();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [globalLimit, setGlobalLimit] = useState<number>(0);
  const [, setCategories] = useState<string[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<{ category: string; limit: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();

      const [catRes, budgetRes] = await Promise.all([
        api.get('/transactions/categories'),
        api.get('/budgets', { params: { month: m, year: y } }),
      ]);

      const cats = catRes.data || [];
      setCategories(cats);

      const budget = budgetRes.data;
      setGlobalLimit(budget.totalLimit || 0);

      const limits = budget.categoryLimits || [];
      const mergedLimits = cats.map((cat: string) => {
        const existing = limits.find((l: any) => l.category === cat);
        return { category: cat, limit: existing ? existing.limit : 0 };
      });
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
      showMessage(t('common.success'), t('budget.copiedSuccess'));
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('budget.copyError'));
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const m = currentMonth.getMonth() + 1;
      const y = currentMonth.getFullYear();
      const payload = {
        month: m,
        year: y,
        totalLimit: globalLimit,
        categoryLimits: categoryLimits.filter((c) => c.limit > 0),
      };
      await api.post('/budgets', payload);
      showMessage(t('common.success'), t('budget.savedSuccess'));
    } catch (err) {
      console.error(err);
      showMessage(t('common.error'), t('budget.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (cat: string, limit: number) => {
    setCategoryLimits((prev) => prev.map((c) => (c.category === cat ? { ...c, limit } : c)));
  };

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const monthLabel = currentMonth.toLocaleString(i18n.language, { month: 'long', year: 'numeric' });

  const totalCategoryAllocated = categoryLimits.reduce((sum, c) => sum + (c.limit || 0), 0);
  const unallocated = globalLimit - totalCategoryAllocated;

  return (
    <div className="bp-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">04 · Budget</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>{t('budget.title')}</h1>
          <p className="page-subtitle">{t('budget.description')}</p>
        </div>
        <div className="bp-month-nav" role="group">
          <button className="bp-nav-arrow" onClick={handlePrevMonth} aria-label="Previous month">&lt;</button>
          <span className="bp-nav-label">{monthLabel}</span>
          <button className="bp-nav-arrow" onClick={handleNextMonth} aria-label="Next month">&gt;</button>
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
            <button className="btn btn-primary bp-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? t('budget.saving') : t('budget.save')}
            </button>
          </div>
        </>
      )}

      <style>{`
        .bp-page { padding: 0; max-width: 880px; margin: 0 auto; }
        .fade-in { animation: fadeIn 0.35s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .bp-loading { text-align: center; padding: 60px; color: var(--text-secondary); font-style: italic; }

        .bp-month-nav {
          display: inline-flex;
          align-items: stretch;
          border: 1px solid var(--text);
        }
        .bp-nav-arrow {
          background: transparent;
          border: none;
          padding: 6px 14px;
          font-size: 14px;
          cursor: pointer;
          color: var(--text);
          font-family: var(--sans);
          transition: background 0.15s;
        }
        .bp-nav-arrow:hover { background: var(--bg); }
        .bp-nav-label {
          padding: 6px 18px;
          min-width: 160px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-left: 1px solid var(--text);
          border-right: 1px solid var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Global limit block */
        .bp-global-block {
          display: grid;
          grid-template-columns: 1.4fr 1.6fr auto;
          align-items: center;
          gap: 24px;
          padding: 28px 24px;
          border-top: 1px solid var(--text);
          border-bottom: 1px solid var(--border);
          margin-bottom: 0;
        }
        .bp-global-left { display: flex; flex-direction: column; gap: 4px; }
        .bp-global-help { font-size: 12px; color: var(--text-secondary); }
        .bp-global-input { display: flex; align-items: baseline; gap: 12px; }
        .bp-currency {
          font-family: var(--mono);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .bp-global-field {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--text);
          padding: 6px 0;
          font-family: var(--sans);
          font-size: 36px;
          font-weight: 500;
          color: var(--primary);
          letter-spacing: -1px;
          font-variant-numeric: tabular-nums;
          outline: none;
          width: 100%;
        }
        .bp-global-field:focus { border-bottom-color: var(--primary); }

        /* Summary strip */
        .bp-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-bottom: 1px solid var(--border);
          margin-bottom: 36px;
        }
        .bp-summary-item {
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-right: 1px solid var(--border);
        }
        .bp-summary-item:last-child { border-right: none; }
        .bp-summary-value {
          font-family: var(--sans);
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.5px;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }
        .bp-summary-value.is-up { color: var(--primary); }
        .bp-summary-value.is-down { color: var(--danger); }

        /* Categories list */
        .bp-category-section { margin-bottom: 32px; }
        .bp-section-head {
          padding-bottom: 14px;
          border-bottom: 1px solid var(--text);
          margin-bottom: 4px;
        }
        .bp-cat-list { display: flex; flex-direction: column; }
        .bp-cat-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
        }
        .bp-cat-row:last-child { border-bottom: none; }
        .bp-cat-name {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text);
        }
        .bp-cat-input {
          display: flex;
          align-items: baseline;
          gap: 8px;
          width: 220px;
        }
        .bp-cat-currency {
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .bp-cat-field {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          padding: 4px 0;
          font-family: var(--sans);
          font-size: 17px;
          font-weight: 500;
          color: var(--text);
          letter-spacing: -0.3px;
          font-variant-numeric: tabular-nums;
          text-align: right;
          outline: none;
          width: 100%;
        }
        .bp-cat-field:focus { border-bottom-color: var(--text); }
        .bp-cat-field::placeholder { font-style: italic; color: var(--text-secondary); font-weight: 400; font-size: 12px; letter-spacing: 0.04em; text-transform: none; }

        .bp-save-bar {
          padding-top: 20px;
          border-top: 1px solid var(--text);
          display: flex;
          justify-content: flex-end;
        }
        .bp-save-btn { padding: 14px 28px; font-size: 12px; letter-spacing: 0.14em; }

        @media (max-width: 768px) {
          .bp-month-nav { width: 100%; }
          .bp-nav-label { flex: 1; }
          .bp-global-block { grid-template-columns: 1fr; gap: 12px; padding: 20px 0; }
          .bp-global-actions { display: flex; }
          .bp-global-field { font-size: 28px; }
          .bp-summary { grid-template-columns: 1fr; }
          .bp-summary-item { border-right: none; border-bottom: 1px solid var(--border); }
          .bp-summary-item:last-child { border-bottom: none; }
          .bp-cat-row { grid-template-columns: 1fr; gap: 8px; }
          .bp-cat-input { width: 100%; }
          .bp-save-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default BudgetPage;
