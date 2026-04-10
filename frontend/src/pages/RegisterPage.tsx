import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      navigate('/login');
    } catch {
      setError(t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper fade-in flex items-center justify-center">
      <div className="card auth-card">
        <div className="auth-header text-center mb-3">
          <div className="auth-logo mb-2">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="var(--primary)"/>
              <path d="M16 5C16 5 9 12 9 18c0 4 3.14 7 7 7s7-3 7-7c0-6-7-13-7-13z" fill="var(--primary-vivid)" opacity="0.9"/>
              <path d="M15.5 14v8.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M13.5 18.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2>{t('auth.createAccount')}</h2>
          <p className="text-muted" style={{ fontSize: '14px', margin: '4px 0 0 0' }}>
            {t('auth.registerSubtitle')}
          </p>
        </div>

        {error && (
          <div className="error-alert mb-2" style={{ padding: '12px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="input-group flex flex-col gap-1">
            <label>{t('auth.name')}</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Maria Silva"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group flex flex-col gap-1">
            <label>{t('auth.email')}</label>
            <input 
              type="email" 
              className="form-control"
              placeholder="you@email.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group flex flex-col gap-1">
            <label>{t('auth.password')}</label>
            <input 
              type="password" 
              className="form-control"
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-1" style={{ padding: '12px', fontSize: '15px' }} disabled={loading}>
            {loading ? t('auth.creating') : t('auth.register')}
          </button>
        </form>

        <div className="auth-footer text-center mt-3">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {t('auth.alreadyHaveAccount')} <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary)' }}>{t('auth.login')}</Link>
          </p>
        </div>
      </div>
      
      <style>{`
        .auth-wrapper { min-height: calc(100vh - var(--header-height) - 40px); padding: 20px; }
        .auth-card { width: 100%; max-width: 440px; padding: 40px; border-radius: 16px; }
        .auth-logo { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: var(--primary-light); border-radius: 14px; margin: 0 auto; }
        .input-group label { font-size: 13px; font-weight: 600; color: var(--text); }
        .form-control { padding: 12px 14px; }
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 480px) { .auth-card { padding: 28px 20px; } }
      `}</style>
    </div>
  );
};

export default RegisterPage;
