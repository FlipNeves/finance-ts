import { useTranslation } from 'react-i18next';
import Money from './Money';
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
                <span className="account-balance">
                  <Money value={acc.balance} tone="auto" />
                </span>
              </div>
              <div className="account-flow">
                <span className="text-sm">
                  <Money value={acc.income} sign="up" tone="income" />
                </span>
                <span className="text-sm">
                  <Money value={acc.expense} sign="down" tone="expense" />
                </span>
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
