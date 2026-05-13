import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Money from '../../../components/Money';
import type { MemberReport } from '../../../types/api';
import './MemberSpendingCard.css';

interface Props {
  members: MemberReport[];
}

export default function MemberSpendingCard({ members }: Props) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!members || members.length === 0) return null;

  const totalFamilyExpense = members.reduce((sum, m) => sum + m.expense, 0);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="card member-spending-card">
      <h3 className="section-title">{t('dashboard.spendingByMember')}</h3>
      <div className="member-list">
        {members.map((m) => {
          const isExpanded = expandedId === m.userId;
          const sharePct = totalFamilyExpense > 0 ? (m.expense / totalFamilyExpense) * 100 : 0;
          return (
            <div key={m.userId} className={`member-item ${isExpanded ? 'expanded' : ''}`}>
              <div className="member-header" onClick={() => toggleExpand(m.userId)}>
                <div className="member-info">
                  <div className="member-avatar">{m.userName.charAt(0).toUpperCase()}</div>
                  <span className="member-name">{m.userName}</span>
                </div>
                <div className="member-summary">
                  <span className="member-expense">
                    <Money value={m.expense} />
                  </span>
                  <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="member-details slide-down">
                  <div className="detail-row">
                    <span>{t('transactions.income')}</span>
                    <Money value={m.income} tone="income" />
                  </div>
                  <div className="detail-row">
                    <span>{t('dashboard.balance')}</span>
                    <Money value={m.balance} tone="auto" />
                  </div>
                  <div className="detail-row mt-2">
                    <span className="text-sm text-muted">
                      {sharePct.toFixed(0)}% {t('dashboard.familyShareSuffix')}
                    </span>
                  </div>
                  <div className="budget-bar-track mt-1">
                    <div
                      className="budget-bar-fill"
                      style={{
                        width: `${sharePct}%`,
                        background: 'var(--primary)',
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
