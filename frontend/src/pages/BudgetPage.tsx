import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const BudgetPage: React.FC = () => {
  const { t } = useTranslation();
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
        api.get('/budgets', { params: { month: m, year: y } })
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
      alert('Orçamento copiado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao copiar ou orçamento anterior não existe.');
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
        categoryLimits: categoryLimits.filter(c => c.limit > 0),
      };
      await api.post('/budgets', payload);
      alert('Orçamento salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (cat: string, limit: number) => {
    setCategoryLimits(prev => prev.map(c => c.category === cat ? { ...c, limit } : c));
  };

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <header className="flex justify-between items-center mb-3">
        <div>
          <h2>{t('budget.title') || 'Orçamento Mensal'}</h2>
          <p className="text-muted">{t('budget.description') || 'Defina seus limites de gastos por categoria para controlar o seu mês.'}</p>
        </div>
        <div className="month-selector flex items-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px' }}>
            <button className="btn-icon" onClick={handlePrevMonth}>&lt;</button>
            <span style={{ fontWeight: 600, minWidth: '140px', textAlign: 'center', textTransform: 'capitalize', fontSize: '14px' }}>{monthLabel}</span>
            <button className="btn-icon" onClick={handleNextMonth}>&gt;</button>
        </div>
      </header>

      {loading ? (
        <div className="text-center text-muted">Carregando...</div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="flex justify-between items-center mb-2">
              <h3>Limite Global do Mês</h3>
              <button className="btn btn-outline btn-sm" onClick={handleCopyPrevMonth}>Copiar do Mês Passado</button>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>R$</span>
              <input 
                type="number" 
                className="form-control" 
                style={{ fontSize: '24px', fontWeight: 700 }}
                value={globalLimit}
                onChange={e => setGlobalLimit(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="card mb-3">
            <h3 className="mb-2">Limites por Categoria</h3>
            <div className="flex flex-col gap-2">
              {categoryLimits.map(cl => (
                <div key={cl.category} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <span style={{ fontWeight: 500 }}>{cl.category}</span>
                  <div className="flex items-center gap-1" style={{ maxWidth: '200px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>R$</span>
                    <input 
                      type="number" 
                      className="form-control"
                      value={cl.limit || ''}
                      onChange={e => handleLimitChange(cl.category, Number(e.target.value))}
                      placeholder="Sem limite"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Orçamento'}
          </button>
        </>
      )}
    </div>
  );
};

export default BudgetPage;
