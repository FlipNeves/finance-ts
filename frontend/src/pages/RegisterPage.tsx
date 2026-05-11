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
    <div className="auth-wrapper fade-in">
      <div className="auth-card">
        <header className="auth-header">
          <span className="auth-eyebrow">VerdantCash · Family Finance</span>
          <h1 className="auth-title">{t('auth.createAccount')}</h1>
          <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
        </header>

        {error && (
          <div className="auth-error" role="alert">
            <span className="auth-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="form-label" htmlFor="name">{t('auth.name')}</label>
            <input
              id="name"
              type="text"
              className="form-control"
              placeholder="Maria Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="form-label" htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="form-label" htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? t('auth.creating') : t('auth.register')}
          </button>
        </form>

        <footer className="auth-footer">
          <span className="auth-footer-text">{t('auth.alreadyHaveAccount')}</span>
          <Link to="/login" className="auth-footer-link">{t('auth.login')} →</Link>
        </footer>
      </div>

      <style>{`
        .auth-wrapper {
          min-height: calc(100vh - var(--header-height) - 40px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-card);
          border: 1px solid var(--text);
          padding: 48px 40px 36px;
          position: relative;
        }
        .auth-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--primary);
        }
        .auth-header { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
        .auth-eyebrow {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 14px;
        }
        .auth-title {
          font-size: clamp(28px, 4vw, 36px);
          font-weight: 300;
          letter-spacing: -1.2px;
          line-height: 1.05;
          margin: 0 0 8px;
        }
        .auth-title::first-letter { font-weight: 800; }
        .auth-subtitle {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.45;
        }
        .auth-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: transparent;
          border-left: 3px solid var(--danger);
          color: var(--danger);
          margin-bottom: 18px;
          font-size: 13px;
          font-weight: 500;
        }
        .auth-error-icon {
          width: 22px; height: 22px;
          border: 1px solid var(--danger);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 12px;
        }
        .auth-form { display: flex; flex-direction: column; gap: 18px; }
        .auth-field { display: flex; flex-direction: column; }
        .auth-submit { margin-top: 8px; padding: 14px; font-size: 12px; letter-spacing: 0.12em; }
        .auth-footer {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .auth-footer-text { font-size: 12px; color: var(--text-secondary); }
        .auth-footer-link {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text);
        }
        .auth-footer-link:hover { color: var(--primary); text-decoration: none; }

        .fade-in { animation: fadeIn 0.35s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 480px) {
          .auth-card { padding: 32px 22px 26px; }
          .auth-title { font-size: 26px; }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
