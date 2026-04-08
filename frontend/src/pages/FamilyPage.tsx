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
  const [copied, setCopied] = useState(false);

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
            inviteCode: joinCode.trim(),
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
    } catch {
      showMessage('Error', 'Error approving member');
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      await api.post(`/family/reject/${memberId}`);
      loadData();
    } catch {
      showMessage('Error', 'Error rejecting member');
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

  const copyInviteCode = () => {
    if (user?.inviteCode) {
      navigator.clipboard.writeText(user.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="text-center mt-3" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>;

  if (!user?.familyId) {
    return (
      <div className="dashboard-container fade-in flex flex-col items-center gap-3 mt-3">
        {user?.inviteCode && (
          <div className="card w-full text-center fade-in" style={{ maxWidth: '500px', background: 'linear-gradient(145deg, var(--primary-light) 0%, #ffffff 100%)', border: '1px solid var(--primary)', padding: '32px' }}>
            <div style={{ fontSize: '13px', color: 'var(--primary-dark)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              {t('family.yourInviteCode') || 'Your Personal Invite Code'}
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 800, 
              letterSpacing: '6px',
              color: 'var(--primary)',
              fontFamily: 'var(--mono)',
              padding: '12px 0',
            }}>
              {user.inviteCode}
            </div>
            <button 
              className="btn btn-primary" 
              onClick={copyInviteCode}
              style={{ padding: '8px 24px', fontSize: '14px', borderRadius: '20px' }}
            >
              {copied ? '✅ ' + (t('common.copied') || 'Copied!') : '📋 ' + (t('common.copy') || 'Copy Code')}
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '16px', lineHeight: '1.5' }}>
              {t('family.inviteCodeDesc') || 'Share this code so others can request to join your family after you create one.'}
            </p>
          </div>
        )}

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
            <p className="text-muted mb-3">{t('family.joinDesc') || 'Enter a family code or invite code to request to join.'}</p>
            <form onSubmit={handleJoinFamily} className="flex flex-col gap-2 mt-auto">
              <input 
                type="text" 
                className="form-control"
                style={{ padding: '12px' }}
                placeholder={t('family.codeOrInvite') || 'Family Code or Invite Code'} 
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
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0', fontSize: '15px' }}>Gerencie os membros da sua rede</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="badge-dark" style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>{t('family.code')}: {familyDetails?.familyCode}</span>
          {user?.inviteCode && (
            <span className="badge-dark" onClick={copyInviteCode} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}>
              {copied ? '✅' : '🔗'} {t('family.inviteCode') || 'Invite'}: {user.inviteCode}
            </span>
          )}
        </div>
      </header>

      {isOwner && pendingMembers.length > 0 && (
        <section className="card mb-3 notification-card">
          <h3 className="flex items-center gap-1" style={{ color: '#d97706', marginBottom: '16px' }}>
            <span>🔔</span> {t('family.pendingRequests') || 'Pending Requests'}
          </h3>
          <div className="table-responsive">
            <table className="transaction-table">
              <tbody>
                {pendingMembers.map((member) => (
                  <tr key={member._id}>
                     <td>
                       <div className="flex items-center gap-2">
                         <div className="avatar pending">{member.name.charAt(0).toUpperCase()}</div>
                         <div className="flex flex-col">
                            <span className="name" style={{ fontWeight: 600 }}>{member.name}</span>
                            <span className="email" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{member.email}</span>
                         </div>
                       </div>
                     </td>
                     <td className="text-right">
                        <div className="flex gap-1 justify-end">
                           <button className="btn btn-primary btn-sm" onClick={() => handleApprove(member._id)}>
                             Aprovar
                           </button>
                           <button className="btn btn-outline btn-sm" onClick={() => handleReject(member._id)}>
                             Recusar
                           </button>
                        </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card mb-3 table-card">
        <h3 style={{ marginBottom: '24px' }}>{t('family.members')}</h3>
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Nome do Membro</th>
                <th>E-mail</th>
                <th className="text-center">Ações</th>
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
                          {familyDetails?.owner === member._id && <span className="owner-badge" title="Proprietário">👑</span>}
                       </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{member.email}</td>
                  <td className="text-center" style={{ width: '80px' }}>
                    {isOwner && member._id !== user?._id && (
                       <button className="btn-icon delete-btn-large" onClick={() => handleRemove(member._id)} title="Remover Membro">
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
