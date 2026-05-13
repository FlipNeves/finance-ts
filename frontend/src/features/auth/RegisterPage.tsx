import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import './AuthCard.css';

export default function RegisterPage() {
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
      await authApi.register({ name, email, password });
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
    </div>
  );
}
