import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, silently clear the stale token so subsequent calls won't error-loop
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      try { await AsyncStorage.removeItem('token'); } catch {}
    }
    return Promise.reject(error);
  }
);

export const setToken = async (token: string | null) => {
  if (token) await AsyncStorage.setItem('token', token);
  else await AsyncStorage.removeItem('token');
};

export const getToken = async () => AsyncStorage.getItem('token');
