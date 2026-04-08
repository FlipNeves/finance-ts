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
      if (token) await login(token); // Refresh user data
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
          await api.post('/family/join', { 
            familyCode: joinCode.trim(),
          });
          showMessage(t('common.success') || 'Success', t('family.joinRequestSent') || 'Join request sent! Wait for owner approval.');
          setJoinCode('');
        } catch {
          showMessage(t('common.error') || 'Error', t('family.joinError') || 'Error joining family. Check the code and try again.');
        }
      },
      true // isDestructive
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
          showMessage('Error', 'Error removing member');
        }
      },
      true
    );
  };

  if (loading) return <div className="text-center mt-3" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>;

  if (!user?.familyId) {
    return (
      <div className="dashboard-container fade-in flex flex-col items-center gap-3 mt-3">
        <div className="flex gap-3 flex-wrap justify-center w-full" style={{ maxWidth: '1024px' }}>
          <div className="card w-full" style={{ flex: '1', minWidth: '300px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{t('family.create')}</h2>
            <p className="text-muted mb-3">{t('family.createDesc') || 'Create a family group to start tracking together.'}</p>
            <form onSubmit={handleCreateFamily} className="flex flex-col gap-2">
              <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px' }}>{t('family.create')}</button>
            </form>
          </div>

          <div className="card w-full" style={{ flex: '1', minWidth: '300px' }}>
             <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{t('family.join')}</h2>
            <p className="text-muted mb-3">{t('family.joinDesc') || 'Enter a family code to request to join.'}</p>
            <form onSubmit={handleJoinFamily} className="flex flex-col gap-2 mt-auto">
              <input 
                type="text" 
                className="form-control"
                style={{ padding: '12px' }}
                placeholder={t('family.code') || 'Family Code'} 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value)} 
                required 
              />
              <button type="submit" className="btn btn-outline w-full" style={{ padding: '12px' }}>{t('family.join')}</button>
            </form>
          </div>
        </div>
        
        <style>{`
          .fade-in { animation: fadeIn 0.4s ease-out forwards; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header className="card mb-3" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: 'white', padding: '32px 40px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="flex flex-col">
          <h1 style={{ color: 'white', margin: 0, fontSize: '32px' }}>{familyDetails?.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0', fontSize: '15px' }}>{t('family.manageMembersDesc')}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="badge-dark" style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>{t('family.code')}: {familyDetails?.familyCode}</span>
        </div>
      </header>

      {isOwner && (
        <section className="card mb-3 management-card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="flex items-center gap-1">
              <span className="icon-group">👥</span> {t('family.pendingRequests')}
              {pendingMembers.length > 0 && <span className="badge-count">{pendingMembers.length}</span>}
            </h3>
          </div>
          
          <div className="table-responsive">
            {pendingMembers.length > 0 ? (
              <table className="transaction-table">
                <tbody>
                  {pendingMembers.map((member) => (
                    <tr key={member._id}>
                      <td style={{ width: '100%' }}>
                        <div className="flex items-center gap-2">
                          <div className="avatar pending">{member.name.charAt(0).toUpperCase()}</div>
                          <div className="flex flex-col">
                            <span className="name" style={{ fontWeight: 600 }}>{member.name}</span>
                            <span className="email" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                        <div className="flex gap-1 justify-end">
                          <button 
                            className="btn btn-primary btn-sm btn-approve" 
                            onClick={() => handleApprove(member._id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            {t('common.approve')}
                          </button>
                          <button 
                            className="btn btn-outline btn-sm btn-reject" 
                            onClick={() => handleReject(member._id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            {t('common.reject')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <p>{t('family.noPendingRequests')}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card mb-3 table-card">
        <h3 style={{ marginBottom: '24px' }}>{t('family.members')}</h3>
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>{t('family.memberName')}</th>
                <th>{t('auth.email')}</th>
                <th className="text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member._id}>
                  <td>
                    <div className="flex items-center gap-2">
                       <div className="avatar">
                         {member.name.charAt(0).toUpperCase()}
                       </div>
                       <div className="flex items-center gap-1">
                          <span className="name" style={{ fontWeight: 600 }}>{member.name}</span>
                          {familyDetails?.owner === member._id && <span className="owner-badge" title={t('family.owner')}>👑</span>}
                       </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{member.email}</td>
                  <td className="text-center" style={{ width: '80px' }}>
                    {isOwner && member._id !== user?._id && (
                       <button className="btn-icon delete-btn-large" onClick={() => handleRemove(member._id)} title={t('family.removeMember')}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                       </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .avatar.pending {
          background-color: #fef3c7;
          color: #d97706;
        }

        .owner-badge {
          font-size: 14px;
        }
        
        .notification-card {
           border: 1px solid #fcd34d;
           background-color: #fffbeb;
        }

        .management-card {
           border: 1px solid var(--border);
           background-color: var(--bg-card);
        }

        .management-card h3 {
           font-size: 18px;
           margin: 0;
        }

        .badge-count {
           background-color: var(--primary);
           color: white;
           font-size: 12px;
           padding: 2px 8px;
           border-radius: 12px;
           margin-left: 4px;
        }

        .icon-group {
           font-size: 20px;
        }

        .empty-state {
           padding: 40px 20px;
           text-align: center;
           color: var(--text-muted);
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: 12px;
        }

        .empty-icon {
           width: 48px;
           height: 48px;
           background-color: var(--bg);
           color: var(--primary);
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 24px;
           border: 2px dashed var(--border);
        }

        .btn-approve {
           background-color: #10b981;
           color: white;
        }
        .btn-approve:hover {
           background-color: #059669;
        }

        .btn-reject {
           border-color: #ef4444;
           color: #ef4444;
        }
        .btn-reject:hover {
           background-color: #fef2f2;
           border-color: #ef4444;
           color: #ef4444;
        }

        .transaction-table {
           width: 100%;
           border-collapse: separate;
           border-spacing: 0 8px;
        }
        
        .transaction-table th {
          text-align: left;
          padding: 8px 16px;
          color: var(--text-muted);
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }

        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        
        .transaction-table td {
          padding: 16px;
          font-size: 14px;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .transaction-table td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        .transaction-table td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
        
        .transaction-table tbody tr {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .transaction-table tbody tr:hover td {
          background: var(--bg);
        }

        .btn-sm {
           padding: 6px 14px;
           font-size: 13px;
        }
        
        .delete-btn-large {
           padding: 12px;
           color: var(--text-muted);
           display: flex;
           align-items: center;
           justify-content: center;
           margin: 0 auto;
           background: transparent;
           border: none;
           border-radius: 8px;
           cursor: pointer;
           transition: all 0.2s;
        }
        .delete-btn-large:hover {
           color: #ef4444;
           background-color: #fee2e2;
        }
      `}</style>
    </div>
  );
};

export default FamilyPage;
