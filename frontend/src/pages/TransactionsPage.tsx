import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/transactions/categories'),
      ]);
      setTransactions(transRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0) setCategory(catRes.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/transactions', {
        description,
        amount: parseFloat(amount),
        type,
        category,
        date: new Date(date),
      });
      setDescription('');
      setAmount('');
      loadData();
    } catch (err) {
      alert(t('transactions.addError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await api.delete(`/transactions/${id}`);
        loadData();
      } catch (err) {
        alert(t('transactions.deleteError'));
      }
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto' }}>
      <h1>{t('transactions.title')}</h1>

      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc' }}>
        <h2>{t('transactions.add')}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>{t('transactions.description')}:</label><br />
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>{t('transactions.amount')}:</label><br />
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>{t('transactions.type')}:</label><br />
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="income">{t('transactions.income')}</option>
              <option value="expense">{t('transactions.expense')}</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>{t('transactions.category')}:</label><br />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>{t('transactions.date')}:</label><br />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <button type="submit">{t('common.add')}</button>
        </form>
      </section>

      <section>
        <h2>{t('transactions.recent')}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>{t('transactions.date')}</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>{t('transactions.description')}</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>{t('transactions.category')}</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>{t('transactions.amount')}</th>
              <th style={{ textAlign: 'center', padding: '10px' }}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tr) => (
              <tr key={tr._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{new Date(tr.date).toLocaleDateString()}</td>
                <td style={{ padding: '10px' }}>{tr.description}</td>
                <td style={{ padding: '10px' }}>{tr.category}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: tr.type === 'income' ? 'green' : 'red' }}>
                  {tr.type === 'income' ? '+' : '-'}${tr.amount.toFixed(2)}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button onClick={() => handleDelete(tr._id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default TransactionsPage;
