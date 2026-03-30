import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface SpendingByCategory {
  category: string;
  amount: number;
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, spendingRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/spending-by-category'),
      ]);
      setSummary(summaryRes.data);
      setSpending(spendingRes.data);
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '50px auto' }}>
      <h1>{t('dashboard.title')}</h1>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div style={{ flex: 1, padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h3>{t('dashboard.totalIncome')}</h3>
          <p style={{ fontSize: '24px', color: 'green', fontWeight: 'bold' }}>+${summary?.totalIncome.toFixed(2)}</p>
        </div>
        <div style={{ flex: 1, padding: '20px', background: '#ffebee', borderRadius: '8px' }}>
          <h3>{t('dashboard.totalExpense')}</h3>
          <p style={{ fontSize: '24px', color: 'red', fontWeight: 'bold' }}>-${summary?.totalExpense.toFixed(2)}</p>
        </div>
        <div style={{ flex: 1, padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3>{t('dashboard.balance')}</h3>
          <p style={{ fontSize: '24px', color: summary?.balance >= 0 ? 'blue' : 'orange', fontWeight: 'bold' }}>
            ${summary?.balance.toFixed(2)}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '400px', height: '400px' }}>
          <h3>{t('dashboard.spendingByCategory')} (Pie)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spending}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="amount"
                nameKey="category"
              >
                {spending.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, minWidth: '400px', height: '400px' }}>
          <h3>{t('dashboard.spendingByCategory')} (Bar)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
