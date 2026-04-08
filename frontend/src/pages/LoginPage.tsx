import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
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
      const response = await api.post('/auth/login', { email, password });
      await login(response.data.accessToken);
      navigate('/');
    } catch {
      setError(t('auth.invalidCredentials') || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper fade-in flex items-center justify-center">
      <div className="card auth-card shadow-lg">
        <div className="auth-header text-center mb-3">
          <div className="brand-logo mb-2">
            <span style={{ fontWeight: 800, fontSize: '32px', color: 'var(--primary)' }}>$</span>
          </div>
          <h2>Boas-vindas de volta</h2>
          <p className="text-muted" style={{ fontSize: '14px', margin: '4px 0 0 0' }}>
            Faça login para gerenciar suas finanças.
          </p>
        </div>

        {error && (
          <div className="error-alert mb-2" style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="input-group flex flex-col gap-1">
            <label>{t('auth.email') || 'E-mail'}</label>
            <input 
              type="email" 
              className="form-control"
              placeholder="seu@email.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label>{t('auth.password') || 'Senha'}</label>
            </div>
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
            {loading ? 'Entrando...' : (t('auth.login') || 'Entrar na Conta')}
          </button>
        </form>

        <div className="auth-footer text-center mt-3">
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {t('auth.noAccount') || 'Ainda não tem conta?'} <Link to="/register" style={{ fontWeight: 600, color: 'var(--primary)' }}>{t('auth.register') || 'Crie uma aqui'}</Link>
          </p>
        </div>
      </div>
      
      <style>{`
        .auth-wrapper {
           min-height: calc(100vh - var(--header-height) - 40px);
           padding: 20px;
        }
        
        .auth-card {
           width: 100%;
           max-width: 440px;
           padding: 40px;
           border-radius: 20px;
           border: 1px solid var(--border);
        }

        .brand-logo {
           display: inline-flex;
           align-items: center;
           justify-content: center;
           width: 64px;
           height: 64px;
           background: var(--primary-light);
           border-radius: 16px;
           margin: 0 auto;
        }

        .input-group label {
           font-size: 13px;
           font-weight: 600;
           color: var(--text);
        }

        .form-control {
          padding: 12px 14px;
        }
        
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default LoginPage;
