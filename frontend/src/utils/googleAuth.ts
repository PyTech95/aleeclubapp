import { Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { api, setToken } from '../api';

/**
 * Emergent-managed Google OAuth helper.
 *
 * Flow:
 *   1. Build a platform-specific redirect URL.
 *   2. Open https://auth.emergentagent.com/?redirect=<encoded>.
 *   3. On return, parse `session_id` from the URL.
 *   4. POST it to our backend `/auth/google/session` which returns { token, user }
 *      in the SAME shape used by the phone OTP flow.
 */

const EMERGENT_AUTH_URL = 'https://auth.emergentagent.com/';

export function buildRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // On web we must redirect back to an existing route — root '/' is safest.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = (globalThis as any).window;
    return `${w.location.origin}/`;
  }
  // Native (Expo Go / production) — generates either exp://<host>/--/auth or <scheme>://auth
  return ExpoLinking.createURL('auth');
}

export function buildAuthUrl(redirectUrl: string): string {
  return `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
}

/**
 * Extract session_id from a URL's hash fragment (#session_id=...) or query (?session_id=...).
 */
export function extractSessionIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // Hash fragment first
    const hashIdx = url.indexOf('#');
    if (hashIdx >= 0) {
      const hash = url.substring(hashIdx + 1);
      const params = new URLSearchParams(hash);
      const sid = params.get('session_id');
      if (sid) return sid;
    }
    // Query string
    const qIdx = url.indexOf('?');
    if (qIdx >= 0) {
      const qs = url.substring(qIdx + 1).split('#')[0];
      const params = new URLSearchParams(qs);
      const sid = params.get('session_id');
      if (sid) return sid;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Exchange the Emergent session_id for our backend JWT token.
 * Returns the upserted user record.
 */
export async function exchangeSessionId(sessionId: string) {
  const { data } = await api.post('/auth/google/session', { session_id: sessionId });
  if (data?.token) {
    await setToken(data.token);
  }
  return data; // { token, user }
}

/**
 * Kick off Google sign-in. On web this triggers a full-page redirect.
 * On native this opens an in-app browser and resolves with the redirected URL.
 *
 * On native we return the `session_id` (if found) so the caller can finish
 * the exchange immediately. On web this function never resolves because the
 * page navigates away — handle the `session_id` parsing in your root layout.
 */
export async function startGoogleSignIn(): Promise<string | null> {
  const redirectUrl = buildRedirectUrl();
  const authUrl = buildAuthUrl(redirectUrl);

  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = (globalThis as any).window;
    w.location.href = authUrl;
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
  if (result.type !== 'success' || !result.url) return null;
  return extractSessionIdFromUrl(result.url);
}

/**
 * Get the initial deep-link URL on cold start (mobile only).
 */
export async function getInitialDeepLink(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await Linking.getInitialURL();
  } catch {
    return null;
  }
}
