import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
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

export default function PhoneAuth() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');

  const sendOtp = async () => {
    setErr('');
    if (!phone.trim() || phone.trim().length < 6) { setErr('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/phone/start', { phone: phone.trim(), name, city });
      setHint(`Test OTP: ${data.test_code || '123456'}`);
      setStep('otp');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setErr('');
    if (otp.trim().length < 4) { setErr('Enter the OTP code'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/phone/verify', {
        phone: phone.trim(), code: otp.trim(), name, city,
      });
      await setToken(data.token);
      setUser(data.user);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const socialMock = (provider: string) => {
    Alert.alert(`${provider} Sign-In`, `${provider} login coming soon. For now please use phone OTP or Google.`);
  };

  const googleSignIn = async () => {
    setErr('');
    setLoading(true);
    try {
      const sid = await startGoogleSignIn();
      // On web, the browser redirects away and this promise never resolves.
      // On native, we receive a session_id back here.
      if (sid) {
        const data = await exchangeSessionId(sid);
        setUser(data.user);
        router.replace(data.user?.role === 'admin' ? '/admin' : '/(tabs)/home');
      }
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => step === 'otp' ? setStep('phone') : router.back()} style={styles.back} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>WELCOME TO ALEE CLUB</Text>
          <Text style={styles.h1}>{step === 'phone' ? 'Sign in or\nSign up' : 'Verify your\nnumber'}</Text>
          <Text style={styles.sub}>
            {step === 'phone'
              ? 'Continue with your phone number — we\'ll send you a one-time code.'
              : `We sent a 6-digit code to ${phone}.`}
          </Text>

          {step === 'phone' ? (
            <View style={styles.form}>
              <LuxInput
                label="Full Name"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                testID="phone-name"
              />
              <LuxInput
                label="Phone Number"
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                testID="phone-input"
              />
              <LuxInput
                label="City (optional)"
                placeholder="Mumbai"
                value={city}
                onChangeText={setCity}
                testID="phone-city"
              />
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Send OTP" onPress={sendOtp} loading={loading} style={{ marginTop: 8 }} testID="send-otp-btn" />

              <View style={styles.divider}>
                <View style={styles.line} /><Text style={styles.dividerTxt}>OR CONTINUE WITH</Text><View style={styles.line} />
              </View>

              <TouchableOpacity
                style={styles.googleBtn}
                onPress={googleSignIn}
                disabled={loading}
                testID="social-google"
                activeOpacity={0.85}
              >
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
            </View>
          ) : (
            <View style={styles.form}>
              <LuxInput
                label="Enter OTP"
                placeholder="6-digit code"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                testID="otp-input"
              />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <GoldButton title="Verify & Continue" onPress={verifyOtp} loading={loading} style={{ marginTop: 8 }} testID="verify-otp-btn" />
              <TouchableOpacity onPress={sendOtp} style={{ marginTop: 14, alignSelf: 'center' }}>
                <Text style={styles.resend}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.legal}>By continuing you agree to Alee Club Terms & Privacy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 28, flexGrow: 1 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 38, lineHeight: 42, fontFamily: 'Georgia', marginTop: 8 },
  sub: { color: theme.textSecondary, fontSize: 14, marginTop: 12, marginBottom: 28, lineHeight: 20 },
  form: { marginTop: 8 },
  err: { color: theme.danger, fontSize: 13, marginVertical: 6, textAlign: 'center' },
  hint: { color: theme.gold, fontSize: 12, marginVertical: 6, textAlign: 'center', letterSpacing: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerTxt: { color: theme.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  socials: { flexDirection: 'row', gap: 10, marginTop: 10 },
  socBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  socTxt: { color: theme.white, fontSize: 13, fontWeight: '600' },
  googleBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  googleTxt: { color: theme.white, fontSize: 14, fontWeight: '600', letterSpacing: 0.4 },
  resend: { color: theme.gold, fontSize: 13, letterSpacing: 1, fontWeight: '600' },
  legal: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
