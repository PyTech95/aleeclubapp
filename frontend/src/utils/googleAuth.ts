import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { api, setToken } from '../api';

/**
 * Native Google Sign-In helper using @react-native-google-signin/google-signin.
 *
 * Flow:
 *   1. GoogleSignin.hasPlayServices() (Android only, no-op on iOS)
 *   2. GoogleSignin.signIn() → returns idToken
 *   3. POST /api/auth/google { credential: idToken } → { token, user }
 *   4. Persist JWT in AsyncStorage and return the user record.
 *
 * NOTE: Requires a custom dev/prod build (not Expo Go).
 */

let configured = false;

export function configureGoogleSignIn(): void {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId) {
    // Fail loudly at configure-time so we don't ship broken auth.
    // eslint-disable-next-line no-console
    console.warn('[GoogleSignIn] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  }
  GoogleSignin.configure({
    webClientId: webClientId || '',
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });
  configured = true;
}

export type GoogleSignInResult = {
  token: string;
  user: any;
};

/**
 * Kick off the native Google Sign-In flow and exchange the idToken with our backend.
 * Returns { token, user } on success. Returns `null` if the user cancelled.
 * Throws for any other error (network, invalid token, backend rejection, etc.).
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult | null> {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch (e: any) {
    if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services are not available on this device');
    }
    throw e;
  }

  let userInfo: any;
  try {
    userInfo = await GoogleSignin.signIn();
  } catch (e: any) {
    // The library returns different shapes depending on version — handle both.
    const code = e?.code;
    if (
      code === statusCodes.SIGN_IN_CANCELLED ||
      code === statusCodes.IN_PROGRESS ||
      code === 'SIGN_IN_CANCELLED'
    ) {
      return null;
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services are not available on this device');
    }
    throw e;
  }

  // Locate idToken across the various response shapes used by v13+ / v16+.
  const idToken: string | undefined =
    userInfo?.idToken ||
    userInfo?.data?.idToken ||
    userInfo?.user?.idToken;

  if (!idToken) {
    throw new Error('Google did not return an ID token. Check your Web Client ID configuration.');
  }

  const { data } = await api.post('/auth/google', { credential: idToken });
  if (!data?.token || !data?.user) {
    throw new Error('Backend did not return a valid session');
  }
  await setToken(data.token);
  return { token: data.token, user: data.user };
}

/**
 * Sign the user out of Google (best-effort). Safe to call even if not signed in.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // ignore — Google session teardown is best-effort
  }
}
