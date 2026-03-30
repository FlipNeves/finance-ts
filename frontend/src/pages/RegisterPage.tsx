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
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ccc' }}>
      <h1>{t('auth.register')}</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>{t('auth.name')}:</label><br />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>{t('auth.email')}:</label><br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>{t('auth.password')}:</label><br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>{t('auth.register')}</button>
      </form>
      <p style={{ marginTop: '20px' }}>
        {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
