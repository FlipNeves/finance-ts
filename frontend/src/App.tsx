import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FamilyPage from './pages/FamilyPage';
import TransactionsPage from './pages/TransactionsPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="header">
      <div className="container flex justify-between items-center" style={{ height: 'var(--header-height)' }}>
        <div className="flex items-center gap-2">
          <Link to="/" className="brand">
            <span style={{ fontWeight: 800, fontSize: '24px', color: 'var(--primary)' }}>$</span>
            <span style={{ fontWeight: 700, fontSize: '20px', marginLeft: '4px' }}>Financial</span>
          </Link>
          {user && (
            <div className="nav-links flex gap-2 ml-3">
              <Link to="/" className="nav-item">{t('dashboard.title')}</Link>
              <Link to="/transactions" className="nav-item">{t('transactions.title')}</Link>
              <Link to="/family" className="nav-item">{t('family.title')}</Link>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button className="btn-icon" onClick={() => changeLanguage('en')}>EN</button>
            <button className="btn-icon" onClick={() => changeLanguage('pt')}>PT</button>
          </div>
          
          <button className="btn-icon" onClick={toggleTheme}>
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
      </div>
    </nav>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  return (
    <Router>
      <Navigation />
      <main className="container mt-3">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          <Route path="/family" element={
            <PrivateRoute>
              <FamilyPage />
            </PrivateRoute>
          } />
          <Route path="/transactions" element={
            <PrivateRoute>
              <TransactionsPage />
            </PrivateRoute>
          } />
        </Routes>
      </main>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
