import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import GoldButton from '../../src/components/GoldButton';
import LuxInput from '../../src/components/LuxInput';
import { theme } from '../../src/theme';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onLogin = async () => {
    setErr('');
    if (!email || !password) { setErr('Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // index.tsx effect will redirect; but push directly for reliability
      const me = (await (await import('../../src/api')).api.get('/auth/me')).data;
      if (me.role === 'admin') router.replace('/admin');
      else router.replace('/(tabs)/home');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.h1}>Sign In</Text>
          <Text style={styles.sub}>Continue your journey to the spotlight.</Text>

          <View style={styles.form}>
            <LuxInput
              label="Email"
              placeholder="you@aleeclub.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="login-email"
            />
            <LuxInput
              label="Password"
              placeholder="Your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              testID="login-password"
            />
            {err ? <Text style={styles.err} testID="login-error">{err}</Text> : null}
            <View style={{ height: 12 }} />
            <GoldButton title="Sign In" onPress={onLogin} loading={loading} testID="login-submit" />
            <View style={{ marginTop: 18, alignItems: 'center' }}>
              <Text style={styles.small}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.replace('/auth/register')} testID="go-register">
                <Text style={styles.link}>Create one</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 28, paddingTop: 8, flexGrow: 1 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '600' },
  h1: { color: theme.white, fontSize: 42, fontFamily: 'Georgia', marginTop: 8, marginBottom: 8 },
  sub: { color: theme.textSecondary, fontSize: 14, marginBottom: 32 },
  form: { marginTop: 8 },
  err: { color: theme.danger, fontSize: 13, marginTop: 4 },
  small: { color: theme.textSecondary, fontSize: 13 },
  link: { color: theme.gold, fontSize: 14, fontWeight: '600', marginTop: 4, letterSpacing: 1 },
});
