import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { usersApi } from '../lib/api';
import type { User } from '../types/api';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login(token: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storedToken = localStorage.getItem('token');

      if (storedToken) {
        try {
          const profile = await usersApi.profile();
          setUser(profile);
        } catch {
          localStorage.removeItem('token');
        }
      }

      setLoading(false);
    }

    loadStorageData();
  }, []);

  const login = async (token: string) => {
    localStorage.setItem('token', token);
    const profile = await usersApi.profile();
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
