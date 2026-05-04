import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../api';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'participant' | 'admin' | 'judge';
  [k: string]: any;
} | null;

type AuthContextT = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthContextT>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
        } catch {
          await setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    await setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
