import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

interface User {
  _id: string;
  email: string;
  name: string;
  familyId?: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login(token: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storedToken = localStorage.getItem('token');

      if (storedToken) {
        try {
          const response = await api.get('/users/profile');
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }

      setLoading(false);
    }

    loadStorageData();
  }, []);

  const login = async (token: string) => {
    localStorage.setItem('token', token);
    const response = await api.get('/users/profile');
    setUser(response.data);
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
};

export const useAuth = () => useContext(AuthContext);
