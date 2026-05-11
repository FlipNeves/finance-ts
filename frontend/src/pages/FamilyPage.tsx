import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMessageModal } from '../contexts/MessageModalContext';

interface Member {
  _id: string;
  name: string;
  email: string;
}

const FamilyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const { showMessage, showConfirm } = useMessageModal();
  const [joinCode, setJoinCode] = useState('');
  const [familyDetails, setFamilyDetails] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = familyDetails?.owner === user?._id;

  useEffect(() => {
    if (user?.familyId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [detailsRes, membersRes] = await Promise.all([
        api.get('/family/details'),
        api.get('/family/members'),
      ]);
      setFamilyDetails(detailsRes.data);
      setMembers(membersRes.data);

      if (detailsRes.data.owner === user?._id) {
        const pendingRes = await api.get('/family/pending');
        setPendingMembers(pendingRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/family/create', {});
      const token = localStorage.getItem('token');
      if (token) await login(token);
      showMessage(t('common.success') || 'Success', t('family.createSuccess') || 'Family created successfully!');
    } catch {
      showMessage(t('common.error') || 'Error', t('family.createError') || 'Failed to create family');
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    showConfirm(
      t('family.joinWarningTitle') || 'Warning: Data Loss',
      t('family.joinWarningDesc') || 'By joining a family, ALL your current individual transactions and records will be permanently deleted once approved. Do you want to proceed?',
      async () => {
        try {
          await api.post('/family/join', { familyCode: joinCode.trim() });
          showMessage(t('common.success') || 'Success', t('family.joinRequestSent') || 'Join request sent! Wait for owner approval.');
          setJoinCode('');
        } catch {
          showMessage(t('common.error') || 'Error', t('family.joinError') || 'Error joining family. Check the code and try again.');
        }
      },
      true
    );
  };

  const handleApprove = async (memberId: string) => {
    try {
      await api.post(`/family/approve/${memberId}`);
      loadData();
      showMessage(t('common.success'), t('family.joinRequestApproved') || 'Member approved successfully!');
    } catch {
      showMessage(t('common.error'), t('family.approveError') || 'Error approving member');
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      await api.post(`/family/reject/${memberId}`);
      loadData();
      showMessage(t('common.success'), t('family.joinRequestRejected') || 'Request rejected.');
    } catch {
      showMessage(t('common.error'), t('family.rejectError') || 'Error rejecting member');
    }
  };

  const handleRemove = (memberId: string) => {
    showConfirm(
      t('common.confirmDelete') || 'Are you sure?',
      t('family.removeConfirm') || 'Are you sure you want to remove this member?',
      async () => {
        try {
          await api.delete(`/family/members/${memberId}`);
          loadData();
        } catch {
          showMessage(t('common.error') || 'Error', t('common.error') || 'Error removing member');
        }
      },
      true
    );
  };

  if (loading) return <div className="fp-loading">{t('common.loading')}</div>;

  // ---------- No family yet: split-screen create/join ----------
  if (!user?.familyId) {
    return (
      <div className="fp-page fade-in">
        <header className="page-header">
          <div>
            <span className="eyebrow">03 · Family Setup</span>
            <h1 className="page-title" style={{ marginTop: 10 }}>{t('family.title')}</h1>
            <p className="page-subtitle">{t('family.createDesc')}</p>
          </div>
        </header>

        <section className="fp-split">
          <div className="fp-split-side">
            <span className="numeral">01</span>
            <h2 className="fp-side-title">{t('family.create')}</h2>
            <p className="fp-side-text">{t('family.createDesc') || 'Create a family group to start tracking together.'}</p>
            <form onSubmit={handleCreateFamily}>
              <button type="submit" className="btn btn-primary w-full">{t('family.create')}</button>
            </form>
          </div>

          <div className="fp-split-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <div className="fp-split-side">
            <span className="numeral">02</span>
            <h2 className="fp-side-title">{t('family.join')}</h2>
            <p className="fp-side-text">{t('family.joinDesc') || 'Enter a family code to request to join.'}</p>
            <form onSubmit={handleJoinFamily} className="fp-join-form">
              <input
                type="text"
                className="form-control"
                placeholder={t('family.code') || 'Family Code'}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-outline w-full">{t('family.join')}</button>
            </form>
          </div>
        </section>

        <style>{`
          .fp-page { padding: 0; max-width: 1100px; margin: 0 auto; }
          .fade-in { animation: fadeIn 0.35s cubic-bezier(.2,.7,.2,1) forwards; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .fp-loading { text-align: center; padding: 60px; color: var(--text-secondary); font-style: italic; }
          .fp-split {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 0;
            border-top: 1px solid var(--text);
            border-bottom: 1px solid var(--border);
            min-height: 320px;
          }
          .fp-split-side {
            padding: 40px 36px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            justify-content: center;
          }
          .fp-split-side .numeral { font-size: 11px; margin-bottom: 6px; }
          .fp-side-title {
            font-size: clamp(24px, 3vw, 32px);
            font-weight: 300;
            letter-spacing: -0.8px;
            line-height: 1.05;
            margin: 0;
          }
          .fp-side-title::first-letter { font-weight: 800; }
          .fp-side-text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 18px; max-width: 38ch; }
          .fp-join-form { display: flex; flex-direction: column; gap: 10px; }
          .fp-split-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            border-left: 1px solid var(--border);
            border-right: 1px solid var(--border);
            padding: 0 20px;
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
          }
          @media (max-width: 768px) {
            .fp-split { grid-template-columns: 1fr; }
            .fp-split-side { padding: 28px 20px; }
            .fp-split-divider { border-left: none; border-right: none; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 10px; }
          }
        `}</style>
      </div>
    );
  }

  // ---------- Has family ----------
  return (
    <div className="fp-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">03 · Family</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>{familyDetails?.name || t('family.title')}</h1>
          <p className="page-subtitle">{t('family.manageMembersDesc')}</p>
        </div>
        <div className="fp-code-block">
          <span className="eyebrow">{t('family.code')}</span>
          <span className="fp-code-value">{familyDetails?.familyCode}</span>
        </div>
      </header>

      {isOwner && (
        <section className="fp-section">
          <div className="fp-section-head">
            <h3 className="section-title">
              <span className="section-numeral">01</span>
              {t('family.pendingRequests')}
              {pendingMembers.length > 0 && <span className="fp-badge-count">{pendingMembers.length}</span>}
            </h3>
          </div>

          {pendingMembers.length > 0 ? (
            <table className="editorial-table fp-members-table">
              <tbody>
                {pendingMembers.map((member) => (
                  <tr key={member._id}>
                    <td style={{ width: '100%' }}>
                      <div className="fp-member-cell">
                        <div className="fp-avatar fp-avatar-pending">{member.name.charAt(0).toUpperCase()}</div>
                        <div className="fp-member-info">
                          <span className="fp-member-name">{member.name}</span>
                          <span className="fp-member-email">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      <div className="fp-row-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(member._id)}>
                          {t('common.approve')}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleReject(member._id)}>
                          {t('common.reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="fp-empty">
              <span className="fp-empty-glyph" aria-hidden="true">✓</span>
              <p>{t('family.noPendingRequests')}</p>
            </div>
          )}
        </section>
      )}

      <section className="fp-section">
        <div className="fp-section-head">
          <h3 className="section-title">
            <span className="section-numeral">02</span>
            {t('family.members')}
          </h3>
        </div>
        <table className="editorial-table fp-members-table">
          <thead>
            <tr>
              <th>{t('family.memberName')}</th>
              <th>{t('auth.email')}</th>
              <th className="text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member._id}>
                <td>
                  <div className="fp-member-cell">
                    <div className="fp-avatar">{member.name.charAt(0).toUpperCase()}</div>
                    <div className="fp-member-info">
                      <span className="fp-member-name">
                        {member.name}
                        {familyDetails?.owner === member._id && (
                          <span className="fp-owner-tag" title={t('family.owner')}>Owner</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="fp-member-email-cell">{member.email}</td>
                <td className="text-right">
                  {isOwner && member._id !== user?._id && (
                    <button
                      className="fp-icon-btn fp-icon-danger"
                      onClick={() => handleRemove(member._id)}
                      title={t('family.removeMember')}
                      aria-label={t('family.removeMember')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style>{`
        .fp-page { padding: 0; max-width: 1100px; margin: 0 auto; }
        .fade-in { animation: fadeIn 0.35s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fp-loading { text-align: center; padding: 60px; color: var(--text-secondary); font-style: italic; }

        .fp-code-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          padding: 12px 18px;
          border: 1px solid var(--text);
        }
        .fp-code-value {
          font-family: var(--mono);
          font-size: 18px;
          font-weight: 500;
          letter-spacing: 0.2em;
          color: var(--text);
        }

        .fp-section { margin-bottom: 36px; }
        .fp-section-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--text);
          margin-bottom: 0;
        }
        .fp-badge-count {
          margin-left: 6px;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--primary);
          font-weight: 500;
        }

        .fp-members-table { width: 100%; }
        .fp-member-cell { display: flex; align-items: center; gap: 14px; }
        .fp-avatar {
          width: 34px; height: 34px;
          border: 1px solid var(--text);
          background: transparent;
          color: var(--text);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--sans);
          font-weight: 400;
          font-size: 16px;
        }
        .fp-avatar-pending { border-color: var(--warning); color: var(--warning); }
        .fp-member-info { display: flex; flex-direction: column; gap: 2px; }
        .fp-member-name {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text);
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .fp-owner-tag {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 2px 6px;
          border: 1px solid var(--primary);
          color: var(--primary);
        }
        .fp-member-email { font-size: 11px; color: var(--text-secondary); letter-spacing: 0.04em; }
        .fp-member-email-cell { font-size: 12px; color: var(--text-secondary); }

        .fp-row-actions { display: inline-flex; gap: 4px; }

        .fp-icon-btn {
          background: transparent;
          border: 1px solid var(--border);
          width: 30px; height: 30px;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          border-radius: 0;
        }
        .fp-icon-btn:hover { border-color: var(--text); color: var(--text); }
        .fp-icon-btn.fp-icon-danger:hover { border-color: var(--danger); color: var(--danger); }

        .fp-empty {
          padding: 40px 0;
          text-align: center;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .fp-empty-glyph {
          width: 36px; height: 36px;
          border: 1px solid var(--primary);
          color: var(--primary);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }
        .fp-empty p { margin: 0; font-style: italic; font-size: 13px; }

        @media (max-width: 768px) {
          .fp-code-block { align-items: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default FamilyPage;
