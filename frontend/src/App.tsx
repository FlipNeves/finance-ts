import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { MessageModalProvider } from './contexts/MessageModalContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FamilyPage from './pages/FamilyPage';
import TransactionsPage from './pages/TransactionsPage';
import DashboardPage from './pages/DashboardPage';
import BudgetPage from './pages/BudgetPage';
import './App.css';

/* Inline SVG logo */
const VerdantLogo = () => (
  <svg className="brand-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="6" fill="var(--primary)"/>
    <path d="M16 5C16 5 9 12 9 18c0 4 3.14 7 7 7s7-3 7-7c0-6-7-13-7-13z" fill="var(--primary-vivid)" opacity="0.9"/>
    <path d="M15.5 14v8.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M13.5 18.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const navItems = [
    { to: '/', label: t('dashboard.title'), icon: '📊' },
    { to: '/transactions', label: t('transactions.title'), icon: '💳' },
    { to: '/family', label: t('family.title'), icon: '👥' },
  ];

  return (
    <>
      <nav className="header">
        <div className="container header-inner">
          <div className="flex items-center gap-2">
            <Link to="/" className="brand">
              <VerdantLogo />
              <span className="brand-text">
                Verdant<span className="brand-text-accent">Cash</span>
              </span>
            </Link>
            {user && (
              <div className="nav-links flex gap-2 ml-3">
                {navItems.map(item => (
                  <Link key={item.to} to={item.to} className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="desktop-controls flex items-center gap-2">
              <div className="flex gap-1">
                <button className="btn-icon" onClick={() => changeLanguage('en')} title="English">EN</button>
                <button className="btn-icon" onClick={() => changeLanguage('pt')} title="Português">PT</button>
              </div>
              
              <button className="btn-icon" onClick={toggleTheme} title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}>
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              {user ? (
                <div className="flex items-center gap-2 ml-1">
                  <span className="user-name">{user.name}</span>
                  <button className="btn btn-outline" onClick={logout} style={{ padding: '6px 12px' }}>
                    {t('auth.logout')}
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
              )}
            </div>

            {user && (
              <button 
                className={`hamburger-btn ${menuOpen ? 'open' : ''}`} 
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                <div className="hamburger-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className={`fab-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      
      <div className={`fab-menu ${menuOpen ? 'open' : ''}`}>
        {user && (
          <div className="fab-user-info">
            <div className="fab-user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="fab-item-content">
              <span className="fab-user-name">{user.name}</span>
              <span className="fab-user-email">{user.email}</span>
            </div>
          </div>
        )}

        {navItems.map(item => (
          <Link 
            key={item.to} 
            to={item.to} 
            className="fab-item"
            onClick={() => setMenuOpen(false)}
          >
            <div className="fab-item-icon nav-icon">{item.icon}</div>
            <div className="fab-item-content">
              <span className="fab-item-label">{item.label}</span>
            </div>
          </Link>
        ))}

        <div className="fab-section-divider" />

        <button className="fab-item" onClick={toggleTheme}>
          <div className="fab-item-icon theme-icon">{theme === 'light' ? '🌙' : '☀️'}</div>
          <div className="fab-item-content">
            <span className="fab-item-label">{theme === 'light' ? t('common.darkMode') : t('common.lightMode')}</span>
          </div>
        </button>

        <button className="fab-item" onClick={() => changeLanguage(i18n.language === 'pt' ? 'en' : 'pt')}>
          <div className="fab-item-icon lang-icon">🌐</div>
          <div className="fab-item-content">
            <span className="fab-item-label">{i18n.language === 'pt' ? 'English' : 'Português'}</span>
            <span className="fab-item-sublabel">{t('common.language')}</span>
          </div>
        </button>

        <button className="fab-item" onClick={handleLogout}>
          <div className="fab-item-icon logout-icon">🚪</div>
          <div className="fab-item-content">
            <span className="fab-item-label">{t('auth.logout')}</span>
          </div>
        </button>
      </div>
    </>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>{/* loading */}</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  return (
    <Router>
      <Navigation />
      <main className="container mt-2" style={{ paddingBottom: '32px' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/family" element={<PrivateRoute><FamilyPage /></PrivateRoute>} />
          <Route path="/budget" element={<PrivateRoute><BudgetPage /></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
        </Routes>
      </main>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MessageModalProvider>
          <AppContent />
        </MessageModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
