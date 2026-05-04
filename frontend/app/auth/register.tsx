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

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onRegister = async () => {
    setErr('');
    if (!name || !email || !password) { setErr('Please fill name, email and password'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, phone.trim());
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>JOIN THE CLUB</Text>
          <Text style={styles.h1}>Create{'\n'}Your Account</Text>
          <Text style={styles.sub}>Unlock pageants, auditions & your luxury portfolio.</Text>

          <View style={styles.form}>
            <LuxInput label="Full Name" placeholder="Jane Doe" value={name} onChangeText={setName} testID="reg-name" />
            <LuxInput label="Email" placeholder="you@aleeclub.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} testID="reg-email" />
            <LuxInput label="Phone (optional)" placeholder="+91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} testID="reg-phone" />
            <LuxInput label="Password" placeholder="Minimum 6 characters" secureTextEntry value={password} onChangeText={setPassword} testID="reg-password" />
            {err ? <Text style={styles.err} testID="reg-error">{err}</Text> : null}
            <View style={{ height: 12 }} />
            <GoldButton title="Create Account" onPress={onRegister} loading={loading} testID="reg-submit" />
            <View style={{ marginTop: 18, alignItems: 'center' }}>
              <Text style={styles.small}>Already a member?</Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login')} testID="go-login">
                <Text style={styles.link}>Sign in</Text>
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
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '600' },
  h1: { color: theme.white, fontSize: 40, lineHeight: 44, fontFamily: 'Georgia', marginTop: 8, marginBottom: 8 },
  sub: { color: theme.textSecondary, fontSize: 14, marginBottom: 28 },
  form: { marginTop: 8 },
  err: { color: theme.danger, fontSize: 13, marginTop: 4 },
  small: { color: theme.textSecondary, fontSize: 13 },
  link: { color: theme.gold, fontSize: 14, fontWeight: '600', marginTop: 4, letterSpacing: 1 },
});
