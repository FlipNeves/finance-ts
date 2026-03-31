import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { email, password, name });
      navigate('/login');
    } catch {
      setError(t('auth.registrationError'));
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - var(--header-height) - 100px)' }}>
      <div className="card w-full" style={{ maxWidth: '400px' }}>
        <h1 className="text-center">{t('auth.register')}</h1>
        {error && <p className="text-center" style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label style={{ fontWeight: 600 }}>{t('auth.name')}</label>
            <input 
              type="text" 
              className="form-control"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label style={{ fontWeight: 600 }}>{t('auth.email')}</label>
            <input 
              type="email" 
              className="form-control"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label style={{ fontWeight: 600 }}>{t('auth.password')}</label>
            <input 
              type="password" 
              className="form-control"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary mt-1">{t('auth.register')}</button>
        </form>
        <p className="text-center mt-2">
          {t('auth.alreadyHaveAccount')} <Link to="/login" style={{ fontWeight: 600 }}>{t('auth.login')}</Link>
        </p>
      </div>
      
      <style>{`
        .form-control {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background-color: var(--bg);
          color: var(--text);
          font-size: 16px;
          transition: border-color 0.2s;
        }
        .form-control:focus {
          outline: none;
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
