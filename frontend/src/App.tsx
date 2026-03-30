import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FamilyPage from './pages/FamilyPage';
import TransactionsPage from './pages/TransactionsPage';
import './App.css';

const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f4' }}>
      <div>
        <Link to="/" style={{ marginRight: '15px' }}>{t('dashboard.title')}</Link>
        {user && (
          <>
            <Link to="/transactions" style={{ marginRight: '15px' }}>{t('transactions.title')}</Link>
            <Link to="/family" style={{ marginRight: '15px' }}>{t('family.title')}</Link>
          </>
        )}
      </div>
      <div>
        <button onClick={() => changeLanguage('en')} style={{ marginRight: '5px' }}>EN</button>
        <button onClick={() => changeLanguage('pt')} style={{ marginRight: '15px' }}>PT</button>
        {user ? (
          <>
            <span style={{ marginRight: '15px' }}>{user.name}</span>
            <button onClick={logout}>{t('auth.logout')}</button>
          </>
        ) : (
          <Link to="/login">{t('auth.login')}</Link>
        )}
      </div>
    </nav>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <div style={{ padding: '20px' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={
              <PrivateRoute>
                <h1>Welcome to Dashboard (Work in Progress)</h1>
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
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
