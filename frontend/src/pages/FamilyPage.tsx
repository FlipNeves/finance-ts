import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Member {
  _id: string;
  name: string;
  email: string;
}

const FamilyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
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
      await api.post('/family/create', { name: familyName });
      const token = localStorage.getItem('token');
      if (token) await login(token); // Refresh user data
    } catch {
      alert(t('family.createError'));
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/family/join', { familyCode });
      alert(t('family.joinRequestSent') || 'Join request sent! Wait for owner approval.');
      setFamilyCode('');
    } catch {
      alert(t('family.joinError'));
    }
  };

  const handleApprove = async (memberId: string) => {
    try {
      await api.post(`/family/approve/${memberId}`);
      loadData();
    } catch {
      alert('Error approving member');
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      await api.post(`/family/reject/${memberId}`);
      loadData();
    } catch {
      alert('Error rejecting member');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await api.delete(`/family/members/${memberId}`);
        loadData();
      } catch {
        alert('Error removing member');
      }
    }
  };

  if (loading) return <div className="text-center mt-3">{t('common.loading')}</div>;

  if (!user?.familyId) {
    return (
      <div className="flex flex-col items-center gap-3 mt-3">
        <div className="card w-full" style={{ maxWidth: '500px' }}>
          <h2>{t('family.create')}</h2>
          <p className="text-muted mb-2">{t('family.createDesc') || 'Create a family group to start tracking together.'}</p>
          <form onSubmit={handleCreateFamily} className="flex flex-col gap-2">
            <input 
              type="text" 
              className="form-control"
              placeholder={t('family.name') || 'Family Name'} 
              value={familyName} 
              onChange={(e) => setFamilyName(e.target.value)} 
              required 
            />
            <button type="submit" className="btn btn-primary">{t('family.create')}</button>
          </form>
        </div>

        <div className="card w-full" style={{ maxWidth: '500px' }}>
          <h2>{t('family.join')}</h2>
          <p className="text-muted mb-2">{t('family.joinDesc') || 'Enter a family code to request to join.'}</p>
          <form onSubmit={handleJoinFamily} className="flex flex-col gap-2">
            <input 
              type="text" 
              className="form-control"
              placeholder={t('family.code')} 
              value={familyCode} 
              onChange={(e) => setFamilyCode(e.target.value)} 
              required 
            />
            <button type="submit" className="btn btn-outline">{t('family.join')}</button>
          </form>
        </div>
        
        <style>{`
          .form-control {
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background-color: var(--bg);
            color: var(--text);
            font-size: 16px;
          }
          .text-muted { color: var(--text-muted); font-size: 14px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container mt-3" style={{ maxWidth: '800px' }}>
      <header className="flex justify-between items-center mb-3">
        <div className="flex flex-col">
          <h1>{familyDetails?.name}</h1>
          <span className="badge" style={{ alignSelf: 'flex-start' }}>{t('family.code')}: {familyDetails?.familyCode}</span>
        </div>
      </header>

      {isOwner && pendingMembers.length > 0 && (
        <section className="card mb-3" style={{ borderColor: 'var(--primary)', borderLeftWidth: '4px' }}>
          <h3 style={{ color: 'var(--primary)' }}>🔔 {t('family.pendingRequests') || 'Pending Requests'}</h3>
          <ul className="member-list mt-2">
            {pendingMembers.map((member) => (
              <li key={member._id} className="member-item flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="avatar pending">{member.name.charAt(0).toUpperCase()}</div>
                  <div className="flex flex-col">
                    <span className="name">{member.name}</span>
                    <span className="email">{member.email}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => handleApprove(member._id)}>
                    {t('common.approve') || 'Approve'}
                  </button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => handleReject(member._id)}>
                    {t('common.reject') || 'Reject'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-3">
        <h3>{t('family.members')}</h3>
        <ul className="member-list mt-2">
          {members.map((member) => (
            <li key={member._id} className="member-item flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="avatar">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="name">{member.name}</span>
                    {familyDetails?.owner === member._id && <span className="owner-badge">👑</span>}
                  </div>
                  <span className="email">{member.email}</span>
                </div>
              </div>
              {isOwner && member._id !== user?._id && (
                <button className="btn-icon delete" onClick={() => handleRemove(member._id)}>🗑️</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <style>{`
        .member-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .member-item {
          padding: 12px;
          border-radius: 8px;
          background-color: var(--bg);
          transition: transform 0.2s;
        }
        .member-item:hover {
          transform: translateX(4px);
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .avatar.pending {
          background-color: var(--accent);
        }
        .member-item .name {
          font-weight: 600;
        }
        .member-item .email {
          font-size: 13px;
          color: var(--text-muted);
        }
        .owner-badge {
          font-size: 14px;
        }
        .btn-icon.delete:hover {
          background-color: #fee2e2;
          color: var(--danger);
        }
        .badge {
          background-color: var(--primary-light);
          color: var(--primary);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default FamilyPage;
