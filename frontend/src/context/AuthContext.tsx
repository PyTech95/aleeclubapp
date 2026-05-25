import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api, setToken, getToken } from '../api';
import { exchangeSessionId, extractSessionIdFromUrl } from '../utils/googleAuth';

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
      // Step 1 — On web, look for ?session_id / #session_id from Emergent Google redirect
      // and exchange it for our JWT BEFORE checking any existing token.
      if (Platform.OS === 'web') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w: any = (globalThis as any).window;
          const fullUrl = `${w.location.pathname}${w.location.search}${w.location.hash}`;
          const sid = extractSessionIdFromUrl(fullUrl);
          if (sid) {
            const data = await exchangeSessionId(sid);
            if (data?.user) {
              setUser(data.user);
              // Clean the URL so refresh doesn't re-trigger
              try { w.history.replaceState(null, '', w.location.pathname); } catch {}
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // fall through to normal token check
          // eslint-disable-next-line no-console
          console.warn('Google session exchange failed', e);
        }
      }

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
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      // Likely 401 after logout / token expired — clear state silently
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
