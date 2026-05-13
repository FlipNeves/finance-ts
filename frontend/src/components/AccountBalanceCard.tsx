import { useTranslation } from 'react-i18next';
import type { AccountReport } from '../types/api';
import './AccountBalanceCard.css';

interface Props {
  accounts: AccountReport[];
}

export default function AccountBalanceCard({ accounts }: Props) {
  const { t } = useTranslation();

  if (!accounts || accounts.length === 0) return null;

  return (
    <div className="card account-balance-card">
      <h3 className="section-title">{t('dashboard.balanceByAccount') || 'Saldo por Conta'}</h3>
      <div className="account-list">
        {accounts.map(acc => {
          const totalFlow = acc.income + acc.expense;
          const expensePct = totalFlow > 0 ? (acc.expense / totalFlow) * 100 : 0;
          return (
            <div key={acc.bankAccount} className="account-item">
              <div className="account-header">
                <span className="account-name">🏦 {acc.bankAccount}</span>
                <span className="account-balance" style={{ color: acc.balance < 0 ? 'var(--danger)' : 'var(--primary)' }}>
                  R$ {acc.balance.toFixed(2)}
                </span>
              </div>
              <div className="account-flow">
                <span className="text-green text-sm">↑ R$ {acc.income.toFixed(2)}</span>
                <span className="text-red text-sm">↓ R$ {acc.expense.toFixed(2)}</span>
              </div>
              <div className="budget-bar-track mt-1">
                <div 
                  className="budget-bar-fill" 
                  style={{ 
                    width: `${expensePct}%`,
                    background: expensePct > 80 ? 'var(--danger)' : 'var(--warning)'
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
