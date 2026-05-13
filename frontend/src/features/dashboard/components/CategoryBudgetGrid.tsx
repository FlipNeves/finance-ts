import { useTranslation } from 'react-i18next';
import type { BudgetLimit, SpendingByCategory } from '../../../types/api';
import { useCategoryTranslation } from '../../../hooks/useCategoryTranslation';

interface Props {
  categoryBudgets: BudgetLimit[];
  spending: SpendingByCategory[];
}

export function CategoryBudgetGrid({ categoryBudgets, spending }: Props) {
  const { t } = useTranslation();
  const { translateCategory } = useCategoryTranslation();

  const active = categoryBudgets.filter((cb) => cb.limit > 0);
  if (active.length === 0 || spending.length === 0) return null;

  return (
    <div className="card cat-budget-section">
      <h3 className="section-title">
        <span className="section-numeral">03</span>
        {t('dashboard.categoryBudget')}
      </h3>
      <div className="cat-budget-grid">
        {active.map((cb) => {
          const spendItem = spending.find((s) => s.category === cb.category);
          const spent = spendItem ? spendItem.amount : 0;
          const pct = cb.limit > 0 ? (spent / cb.limit) * 100 : 0;
          const isOver = pct > 100;
          const barColor =
            pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--primary)';
          return (
            <div key={cb.category} className="cat-budget-item">
              <div className="cat-budget-header">
                <span className="category-badge">{translateCategory(cb.category)}</span>
                <span
                  className="cat-budget-values"
                  style={{ color: isOver ? 'var(--danger)' : 'var(--text-secondary)' }}
                >
                  R$ {spent.toFixed(0)} / R$ {cb.limit.toFixed(0)}
                </span>
              </div>
              <div className="cat-budget-bar-track">
                <div
                  className="cat-budget-bar-fill"
                  style={{ width: Math.min(pct, 100) + '%', background: barColor }}
                ></div>
              </div>
              <span
                className="cat-budget-status"
                style={{ color: isOver ? 'var(--danger)' : 'var(--primary)' }}
              >
                {isOver
                  ? t('dashboard.overBudget', { amount: (spent - cb.limit).toFixed(2) })
                  : t('dashboard.remaining', { amount: (cb.limit - spent).toFixed(2) })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
