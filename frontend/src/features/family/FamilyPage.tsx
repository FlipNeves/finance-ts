import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useMessageModal } from '../../contexts/MessageModalContext';
import { useFamilyDetails } from '../../hooks/useFamilyDetails';
import {
  useApproveMember,
  useCreateFamily,
  useFamilyMembers,
  useFamilyPending,
  useJoinFamily,
  useRejectMember,
  useRemoveMember,
} from './hooks/useFamily';
import './FamilyPage.css';

export default function FamilyPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const { showMessage, showConfirm } = useMessageModal();
  const [joinCode, setJoinCode] = useState('');

  const detailsQuery = useFamilyDetails(Boolean(user?.familyId));
  const familyDetails = detailsQuery.data;
  const isOwner = familyDetails?.owner === user?._id;

  const membersQuery = useFamilyMembers(Boolean(user?.familyId));
  const pendingQuery = useFamilyPending(Boolean(user?.familyId) && isOwner);

  const createFamily = useCreateFamily();
  const joinFamily = useJoinFamily();
  const approve = useApproveMember();
  const reject = useRejectMember();
  const remove = useRemoveMember();

  const members = membersQuery.data ?? [];
  const pendingMembers = pendingQuery.data ?? [];
  const loading =
    (user?.familyId && (detailsQuery.isLoading || membersQuery.isLoading)) ?? false;

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    createFamily.mutate(undefined, {
      onSuccess: async () => {
        const token = localStorage.getItem('token');
        if (token) await login(token);
        showMessage(t('common.success'), t('family.createSuccess'));
      },
      onError: () => showMessage(t('common.error'), t('family.createError')),
    });
  };

  const handleJoinFamily = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    showConfirm(
      t('family.joinWarningTitle'),
      t('family.joinWarningDesc'),
      () => {
        joinFamily.mutate(code, {
          onSuccess: () => {
            showMessage(t('common.success'), t('family.joinRequestSent'));
            setJoinCode('');
          },
          onError: () => showMessage(t('common.error'), t('family.joinError')),
        });
      },
      true,
    );
  };

  const handleApprove = (memberId: string) => {
    approve.mutate(memberId, {
      onSuccess: () =>
        showMessage(t('common.success'), t('family.joinRequestApproved')),
      onError: () => showMessage(t('common.error'), t('family.approveError')),
    });
  };

  const handleReject = (memberId: string) => {
    reject.mutate(memberId, {
      onSuccess: () =>
        showMessage(t('common.success'), t('family.joinRequestRejected')),
      onError: () => showMessage(t('common.error'), t('family.rejectError')),
    });
  };

  const handleRemove = (memberId: string) => {
    showConfirm(
      t('common.confirmDelete'),
      t('family.removeConfirm'),
      () => {
        remove.mutate(memberId, {
          onError: () => showMessage(t('common.error'), t('common.error')),
        });
      },
      true,
    );
  };

  if (loading) return <div className="fp-loading">{t('common.loading')}</div>;

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
            <p className="fp-side-text">{t('family.createDesc')}</p>
            <form onSubmit={handleCreateFamily}>
              <button type="submit" className="btn btn-primary w-full">
                {t('family.create')}
              </button>
            </form>
          </div>

          <div className="fp-split-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <div className="fp-split-side">
            <span className="numeral">02</span>
            <h2 className="fp-side-title">{t('family.join')}</h2>
            <p className="fp-side-text">{t('family.joinDesc')}</p>
            <form onSubmit={handleJoinFamily} className="fp-join-form">
              <input
                type="text"
                className="form-control"
                placeholder={t('family.code')}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-outline w-full">
                {t('family.join')}
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fp-page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">03 · Family</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {familyDetails?.name || t('family.title')}
          </h1>
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
              {pendingMembers.length > 0 && (
                <span className="fp-badge-count">{pendingMembers.length}</span>
              )}
            </h3>
          </div>

          {pendingMembers.length > 0 ? (
            <table className="editorial-table fp-members-table">
              <tbody>
                {pendingMembers.map((member) => (
                  <tr key={member._id}>
                    <td style={{ width: '100%' }}>
                      <div className="fp-member-cell">
                        <div className="fp-avatar fp-avatar-pending">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="fp-member-info">
                          <span className="fp-member-name">{member.name}</span>
                          <span className="fp-member-email">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      <div className="fp-row-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprove(member._id)}
                        >
                          {t('common.approve')}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleReject(member._id)}
                        >
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
              <span className="fp-empty-glyph" aria-hidden="true">
                ✓
              </span>
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
                          <span className="fp-owner-tag" title={t('family.owner')}>
                            Owner
                          </span>
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
    </div>
  );
}
