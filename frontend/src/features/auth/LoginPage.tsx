import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import './AuthCard.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await authApi.login({ email, password });
      await login(accessToken);
      navigate('/');
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper fade-in">
      <div className="auth-card">
        <header className="auth-header">
          <span className="auth-eyebrow">VerdantCash · Family Finance</span>
          <h1 className="auth-title">{t('auth.welcomeBack')}</h1>
          <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>
        </header>

        {error && (
          <div className="auth-error" role="alert">
            <span className="auth-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <footer className="auth-footer">
          <span className="auth-footer-text">{t('auth.noAccount')}</span>
          <Link to="/register" className="auth-footer-link">{t('auth.register')} →</Link>
        </footer>
      </div>
    </div>
  );
}
