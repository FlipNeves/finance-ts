import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FamilyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.familyId) {
      loadMembers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMembers = async () => {
    try {
      const response = await api.get('/family/members');
      setMembers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/family/create', { name: familyName });
      const token = localStorage.getItem('token');
      if (token) await login(token); // Refresh user data
    } catch (err) {
      alert(t('family.createError'));
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/family/join', { familyCode });
      const token = localStorage.getItem('token');
      if (token) await login(token); // Refresh user data
    } catch (err) {
      alert(t('family.joinError'));
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;

  if (!user?.familyId) {
    return (
      <div style={{ maxWidth: '600px', margin: '50px auto' }}>
        <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc' }}>
          <h2>{t('family.create')}</h2>
          <form onSubmit={handleCreateFamily}>
            <input 
              type="text" 
              placeholder={t('auth.name')} 
              value={familyName} 
              onChange={(e) => setFamilyName(e.target.value)} 
              required 
            />
            <button type="submit">{t('family.create')}</button>
          </form>
        </section>

        <section style={{ padding: '20px', border: '1px solid #ccc' }}>
          <h2>{t('family.join')}</h2>
          <form onSubmit={handleJoinFamily}>
            <input 
              type="text" 
              placeholder={t('family.code')} 
              value={familyCode} 
              onChange={(e) => setFamilyCode(e.target.value)} 
              required 
            />
            <button type="submit">{t('family.join')}</button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto' }}>
      <h1>{t('family.title')}</h1>
      <section style={{ marginBottom: '20px' }}>
        <h3>{t('family.members')}</h3>
        <ul>
          {members.map((member) => (
            <li key={member._id}>{member.name} ({member.email})</li>
          ))}
        </ul>
      </section>
      {/* Categories and other settings can go here */}
    </div>
  );
};

export default FamilyPage;
