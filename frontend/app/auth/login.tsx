import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { api, setToken } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import GoldButton from '../../src/components/GoldButton';
import LuxInput from '../../src/components/LuxInput';
import { theme } from '../../src/theme';
import { startGoogleSignIn, exchangeSessionId } from '../../src/utils/googleAuth';

type Tab = 'phone' | 'email';
type EmailMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function AuthScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [tab, setTab] = useState<Tab>('phone');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Phone flow state
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState('');

  // Email flow state
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [eName, setEName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eCity, setECity] = useState('');
  const [ePassword, setEPassword] = useState('');
  const [eConfirm, setEConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [info, setInfo] = useState('');

  const switchTab = (t: Tab) => {
    setTab(t);
    setErr('');
    setInfo('');
  };

  // ============ PHONE FLOW (unchanged behavior) ============
  const sendOtp = async () => {
    setErr('');
    if (!phone.trim() || phone.trim().length < 6) { setErr('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/phone/start', { phone: phone.trim(), name, city });
      setHint(`Test OTP: ${data.test_code || '123456'}`);
      setPhoneStep('otp');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setErr('');
    if (otp.trim().length < 4) { setErr('Enter the OTP code'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/phone/verify', { phone: phone.trim(), code: otp.trim(), name, city });
      await setToken(data.token);
      setUser(data.user);
      router.replace(data.user?.role === 'admin' ? '/admin' : '/(tabs)/home');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // ============ EMAIL FLOW ============
  const emailSignIn = async () => {
    setErr('');
    if (!eEmail.trim() || !ePassword) { setErr('Enter email and password'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: eEmail.trim().toLowerCase(), password: ePassword });
      await setToken(data.token);
      setUser(data.user);
      router.replace(data.user?.role === 'admin' ? '/admin' : '/(tabs)/home');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const emailSignUp = async () => {
    setErr('');
    if (!eName.trim()) { setErr('Enter your full name'); return; }
    if (!ePhone.trim() || ePhone.trim().length < 6) { setErr('Enter a valid phone number'); return; }
    if (!eEmail.trim() || !eEmail.includes('@')) { setErr('Enter a valid email address'); return; }
    if (ePassword.length < 6) { setErr('Password must be at least 6 characters'); return; }
    if (ePassword !== eConfirm) { setErr('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: eName.trim(),
        email: eEmail.trim().toLowerCase(),
        password: ePassword,
        phone: ePhone.trim(),
        city: eCity.trim(),
      });
      await setToken(data.token);
      setUser(data.user);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Sign up failed');
    } finally { setLoading(false); }
  };

  const requestReset = async () => {
    setErr(''); setInfo('');
    if (!eEmail.trim() || !eEmail.includes('@')) { setErr('Enter the email of your account'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: eEmail.trim().toLowerCase() });
      // For MVP the backend returns the token directly; in production this comes via email.
      if (data.reset_token) {
        setResetToken(data.reset_token);
        setInfo(`Reset code: ${data.reset_token}  (use it below to set a new password)`);
      } else {
        setInfo('If this email is registered, a reset code has been sent.');
      }
      setEmailMode('reset');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Could not start reset');
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    setErr(''); setInfo('');
    if (!resetToken.trim()) { setErr('Enter the reset code'); return; }
    if (resetNewPwd.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: eEmail.trim().toLowerCase(),
        reset_token: resetToken.trim(),
        new_password: resetNewPwd,
      });
      setInfo('Password updated. Sign in with your new password.');
      setEmailMode('signin');
      setEPassword('');
      setResetToken('');
      setResetNewPwd('');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Reset failed');
    } finally { setLoading(false); }
  };

  // ============ GOOGLE ============
  const googleSignIn = async () => {
    setErr('');
    setLoading(true);
    try {
      const sid = await startGoogleSignIn();
      if (sid) {
        const data = await exchangeSessionId(sid);
        setUser(data.user);
        router.replace(data.user?.role === 'admin' ? '/admin' : '/(tabs)/home');
      }
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Google sign-in failed');
    } finally { setLoading(false); }
  };

  const socialMock = (provider: string) => {
    Alert.alert(`${provider} Sign-In`, `${provider} login coming soon. For now please use phone OTP, Google, or email.`);
  };

  // ============ RENDER ============
  const headingTitle = () => {
    if (tab === 'phone') return phoneStep === 'phone' ? 'Sign in or\nSign up' : 'Verify your\nnumber';
    if (emailMode === 'signup') return 'Create your\naccount';
    if (emailMode === 'forgot') return 'Forgot\npassword?';
    if (emailMode === 'reset') return 'Reset your\npassword';
    return 'Sign in with\nemail';
  };
  const headingSub = () => {
    if (tab === 'phone') return phoneStep === 'phone'
      ? "Continue with your phone number — we'll send you a one-time code."
      : `We sent a 6-digit code to ${phone}.`;
    if (emailMode === 'signup') return 'Join Alee Club to apply for pageants, build your portfolio and shine.';
    if (emailMode === 'forgot') return 'Enter the email you signed up with — we will send you a reset code.';
    if (emailMode === 'reset') return 'Enter the reset code and choose a new password.';
    return 'Welcome back, star. Sign in to your account.';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            onPress={() => {
              if (tab === 'phone' && phoneStep === 'otp') { setPhoneStep('phone'); return; }
              if (tab === 'email' && (emailMode === 'forgot' || emailMode === 'reset')) { setEmailMode('signin'); return; }
              if (tab === 'email' && emailMode === 'signup') { setEmailMode('signin'); return; }
              router.back();
            }}
            style={styles.back}
            testID="back-btn"
          >
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>WELCOME TO ALEE CLUB</Text>
          <Text style={styles.h1}>{headingTitle()}</Text>
          <Text style={styles.sub}>{headingSub()}</Text>

          {/* Tab Switcher */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'phone' && styles.tabActive]}
              onPress={() => switchTab('phone')}
              testID="tab-phone"
            >
              <Ionicons name="call" size={14} color={tab === 'phone' ? theme.gold : theme.textMuted} />
              <Text style={[styles.tabTxt, tab === 'phone' && styles.tabTxtActive]}>Phone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'email' && styles.tabActive]}
              onPress={() => switchTab('email')}
              testID="tab-email"
            >
              <Ionicons name="mail" size={14} color={tab === 'email' ? theme.gold : theme.textMuted} />
              <Text style={[styles.tabTxt, tab === 'email' && styles.tabTxtActive]}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* ============ PHONE TAB ============ */}
          {tab === 'phone' && phoneStep === 'phone' && (
            <View style={styles.form}>
              <LuxInput label="Full Name" placeholder="Your name" value={name} onChangeText={setName} testID="phone-name" />
              <LuxInput label="Phone Number" placeholder="+91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} testID="phone-input" />
              <LuxInput label="City (optional)" placeholder="Mumbai" value={city} onChangeText={setCity} testID="phone-city" />
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Send OTP" onPress={sendOtp} loading={loading} style={{ marginTop: 8 }} testID="send-otp-btn" />
            </View>
          )}

          {tab === 'phone' && phoneStep === 'otp' && (
            <View style={styles.form}>
              <LuxInput label="Enter OTP" placeholder="6-digit code" keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={6} testID="otp-input" />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Verify & Continue" onPress={verifyOtp} loading={loading} style={{ marginTop: 8 }} testID="verify-otp-btn" />
              <TouchableOpacity onPress={sendOtp} style={{ marginTop: 14, alignSelf: 'center' }}>
                <Text style={styles.resend}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============ EMAIL TAB ============ */}
          {tab === 'email' && emailMode === 'signin' && (
            <View style={styles.form}>
              <LuxInput label="Email Address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={eEmail} onChangeText={setEEmail} testID="email-input" />
              <PasswordInput label="Password" placeholder="Enter your password" value={ePassword} onChangeText={setEPassword} show={showPwd} setShow={setShowPwd} testID="password-input" />
              {info ? <Text style={styles.info}>{info}</Text> : null}
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Sign In" onPress={emailSignIn} loading={loading} style={{ marginTop: 8 }} testID="email-signin-btn" />
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={() => { setErr(''); setInfo(''); setEmailMode('forgot'); }} testID="forgot-link">
                  <Text style={styles.linkTxt}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setErr(''); setInfo(''); setEmailMode('signup'); }} testID="signup-link">
                  <Text style={styles.linkTxt}>Create account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {tab === 'email' && emailMode === 'signup' && (
            <View style={styles.form}>
              <LuxInput label="Full Name *" placeholder="Your name" value={eName} onChangeText={setEName} testID="signup-name" />
              <LuxInput label="Phone Number *" placeholder="+91 98765 43210" keyboardType="phone-pad" value={ePhone} onChangeText={setEPhone} testID="signup-phone" />
              <LuxInput label="Email Address *" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={eEmail} onChangeText={setEEmail} testID="signup-email" />
              <PasswordInput label="Password *" placeholder="Min 6 characters" value={ePassword} onChangeText={setEPassword} show={showPwd} setShow={setShowPwd} testID="signup-password" />
              <PasswordInput label="Confirm Password *" placeholder="Repeat password" value={eConfirm} onChangeText={setEConfirm} show={showConfirm} setShow={setShowConfirm} testID="signup-confirm" />
              <LuxInput label="City (optional)" placeholder="Mumbai" value={eCity} onChangeText={setECity} testID="signup-city" />
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Create Account" onPress={emailSignUp} loading={loading} style={{ marginTop: 8 }} testID="email-signup-btn" />
              <TouchableOpacity onPress={() => { setErr(''); setEmailMode('signin'); }} style={{ marginTop: 14, alignSelf: 'center' }}>
                <Text style={styles.resend}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === 'email' && emailMode === 'forgot' && (
            <View style={styles.form}>
              <LuxInput label="Email Address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={eEmail} onChangeText={setEEmail} testID="forgot-email" />
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Send Reset Code" onPress={requestReset} loading={loading} style={{ marginTop: 8 }} testID="forgot-send-btn" />
              <TouchableOpacity onPress={() => { setErr(''); setEmailMode('signin'); }} style={{ marginTop: 14, alignSelf: 'center' }}>
                <Text style={styles.resend}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === 'email' && emailMode === 'reset' && (
            <View style={styles.form}>
              <LuxInput label="Email Address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={eEmail} onChangeText={setEEmail} testID="reset-email" />
              <LuxInput label="Reset Code" placeholder="8-character code" autoCapitalize="characters" value={resetToken} onChangeText={setResetToken} testID="reset-token" />
              <PasswordInput label="New Password" placeholder="Min 6 characters" value={resetNewPwd} onChangeText={setResetNewPwd} show={showResetPwd} setShow={setShowResetPwd} testID="reset-new-password" />
              {info ? <Text style={styles.info}>{info}</Text> : null}
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Update Password" onPress={submitReset} loading={loading} style={{ marginTop: 8 }} testID="reset-submit-btn" />
              <TouchableOpacity onPress={() => { setErr(''); setInfo(''); setEmailMode('signin'); }} style={{ marginTop: 14, alignSelf: 'center' }}>
                <Text style={styles.resend}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============ SOCIAL CONTINUE (visible only on entry sub-modes) ============ */}
          {((tab === 'phone' && phoneStep === 'phone') || (tab === 'email' && emailMode === 'signin')) && (
            <>
              <View style={styles.divider}>
                <View style={styles.line} /><Text style={styles.dividerTxt}>OR CONTINUE WITH</Text><View style={styles.line} />
              </View>
              <TouchableOpacity style={styles.googleBtn} onPress={googleSignIn} disabled={loading} testID="social-google" activeOpacity={0.85}>
                <FontAwesome name="google" size={18} color="#fff" />
                <Text style={styles.googleTxt}>Continue with Google</Text>
              </TouchableOpacity>
              <View style={styles.socials}>
                <TouchableOpacity style={styles.socBtn} onPress={() => socialMock('Apple')} testID="social-apple">
                  <FontAwesome name="apple" size={20} color="#fff" />
                  <Text style={styles.socTxt}>Apple</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socBtn} onPress={() => socialMock('Facebook')} testID="social-fb">
                  <FontAwesome name="facebook" size={18} color="#fff" />
                  <Text style={styles.socTxt}>Facebook</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.legal}>
            By continuing you agree to Alee Club{' '}
            <Text style={styles.legalLinkInline} onPress={() => router.push('/legal/terms')}>Terms</Text>{' & '}
            <Text style={styles.legalLinkInline} onPress={() => router.push('/legal/privacy')}>Privacy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========== Password Input with visibility toggle ===========
function PasswordInput({ label, placeholder, value, onChangeText, show, setShow, testID }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.pwdLabel}>{label}</Text>
      <View style={styles.pwdWrap}>
        <TextInput
          style={styles.pwdInput}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          testID={testID}
        />
        <TouchableOpacity onPress={() => setShow(!show)} style={styles.pwdEye} testID={`${testID}-eye`}>
          <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 28, flexGrow: 1 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 34, lineHeight: 38, fontFamily: 'Georgia', marginTop: 8 },
  sub: { color: theme.textSecondary, fontSize: 14, marginTop: 10, marginBottom: 20, lineHeight: 20 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(212,175,55,0.12)', borderWidth: 1, borderColor: theme.borderGold },
  tabTxt: { color: theme.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  tabTxtActive: { color: theme.gold, fontWeight: '700' },
  form: { marginTop: 4 },
  err: { color: theme.danger, fontSize: 13, marginVertical: 8, textAlign: 'center' },
  info: { color: theme.gold, fontSize: 12, marginVertical: 6, textAlign: 'center', letterSpacing: 0.5, lineHeight: 18 },
  hint: { color: theme.gold, fontSize: 12, marginVertical: 6, textAlign: 'center', letterSpacing: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerTxt: { color: theme.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  socials: { flexDirection: 'row', gap: 10, marginTop: 10 },
  socBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  socTxt: { color: theme.white, fontSize: 13, fontWeight: '600' },
  googleBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  googleTxt: { color: theme.white, fontSize: 14, fontWeight: '600', letterSpacing: 0.4 },
  resend: { color: theme.gold, fontSize: 13, letterSpacing: 0.5, fontWeight: '600' },
  legal: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 28, lineHeight: 16 },
  legalLinkInline: { color: theme.gold, fontWeight: '600', textDecorationLine: 'underline' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 },
  linkTxt: { color: theme.gold, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  pwdLabel: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  pwdWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingRight: 4 },
  pwdInput: { flex: 1, color: theme.white, fontSize: 14, padding: 14 },
  pwdEye: { padding: 10 },
});
