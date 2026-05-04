import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'pay' | 'done'>('form');
  const [form, setForm] = useState({ full_name: '', phone: '', city: '' });
  const [createdApp, setCreatedApp] = useState<any>(null);

  useEffect(() => {
    api.get(`/events/${id}`).then((r) => setEvent(r.data));
  }, [id]);

  useEffect(() => {
    if (user) setForm((f) => ({
      full_name: f.full_name || user.name || '',
      phone: f.phone || user.phone || '',
      city: f.city || user.city || '',
    }));
  }, [user]);

  const submit = async () => {
    if (!form.full_name || !form.phone || !form.city) {
      Alert.alert('Required', 'Please fill name, phone and city.'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/applications', {
        event_id: id,
        full_name: form.full_name,
        age: user?.age || 18,
        gender: 'any',
        city: form.city,
        phone: form.phone,
        photos: [],
        videos: [],
        is_draft: false,
      });
      setCreatedApp(data);
      if (data.fee > 0 && data.payment_status !== 'paid') setStep('pay');
      else setStep('done');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Submission failed');
    } finally { setLoading(false); }
  };

  const completePayment = async () => {
    setLoading(true);
    try {
      await api.post('/payments/create-order', { application_id: createdApp.id });
      await api.post('/payments/verify', { application_id: createdApp.id, mock: true });
      setStep('done');
    } catch (e: any) {
      Alert.alert('Payment Error', e?.response?.data?.detail || 'Payment failed');
    } finally { setLoading(false); }
  };

  if (!event) return null;

  const ebFee = event.early_bird_fee || 0;
  const ebDeadline = event.early_bird_deadline || '';
  const ebActive = ebFee && ebDeadline && new Date(ebDeadline) >= new Date();
  const displayFee = ebActive ? ebFee : event.fee;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 'done' ? router.replace('/(tabs)/home') : router.back()} style={styles.backBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.h1}>{step === 'form' ? 'Register' : step === 'pay' ? 'Payment' : 'Complete'}</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {step === 'form' && (
            <>
              <View style={styles.eventCard}>
                <Text style={styles.eventEyebrow}>{event.category.toUpperCase()}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{event.city} · {event.start_date}</Text>
              </View>

              <Text style={styles.label}>Full Name</Text>
              <TextInput value={form.full_name} onChangeText={(t) => setForm({ ...form, full_name: t })} placeholder="Your name" placeholderTextColor={theme.textMuted} style={styles.input} testID="reg-name" />
              <Text style={styles.label}>Contact Number</Text>
              <TextInput value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="+91 98765 43210" keyboardType="phone-pad" placeholderTextColor={theme.textMuted} style={styles.input} testID="reg-phone" />
              <Text style={styles.label}>City</Text>
              <TextInput value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} placeholder="Mumbai" placeholderTextColor={theme.textMuted} style={styles.input} testID="reg-city" />

              <View style={styles.priceCard}>
                <LinearGradient colors={['rgba(212,175,55,0.15)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.priceEyebrow}>{ebActive ? 'EARLY BIRD PRICE' : 'REGISTRATION FEE'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 6 }}>
                  {ebActive && <Text style={styles.priceOld}>₹{Math.round(event.fee / 100)}</Text>}
                  <Text style={styles.priceBig}>₹{Math.round(displayFee / 100)}</Text>
                </View>
                {ebActive && <Text style={styles.priceSave}>Save ₹{Math.round((event.fee - ebFee) / 100)} — ends {ebDeadline}</Text>}
              </View>

              <GoldButton title={`Continue to Pay ₹${Math.round(displayFee / 100)}`} onPress={submit} loading={loading} testID="continue-pay" />
            </>
          )}

          {step === 'pay' && createdApp && (
            <>
              <View style={styles.payCard}>
                <LinearGradient colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.eyebrowGold}>AMOUNT DUE</Text>
                <Text style={styles.payAmt}>₹{Math.round(createdApp.fee / 100)}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>for {createdApp.full_name}</Text>
              </View>
              <View style={styles.methodCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="card" size={20} color={theme.gold} />
                  <Text style={styles.methodTitle}>Razorpay Secure</Text>
                </View>
                <Text style={styles.methodSub}>UPI · Cards · Netbanking · Wallets</Text>
              </View>
              <Text style={styles.mockNote}>TEST MODE — Razorpay keys not configured. Tap below to complete the demo payment.</Text>
              <GoldButton title="Complete Payment" onPress={completePayment} loading={loading} testID="complete-pay" />
            </>
          )}

          {step === 'done' && createdApp && (
            <View style={styles.doneWrap}>
              <View style={styles.tickCircle}>
                <Ionicons name="checkmark" size={48} color="#000" />
              </View>
              <Text style={styles.doneTitle}>Registration Complete!</Text>
              <Text style={styles.doneSub}>You are now part of the Alee Club journey.</Text>

              <View style={styles.regNumCard}>
                <Text style={styles.regLabel}>YOUR REGISTRATION NUMBER</Text>
                <Text style={styles.regNum}>ALEE-{String(createdApp.id).slice(0, 8).toUpperCase()}</Text>
              </View>

              <GoldButton title="Track My Journey" onPress={() => router.replace(`/track/${createdApp.id}`)} style={{ marginTop: 24 }} testID="goto-track" />
              <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={{ marginTop: 14 }}>
                <Text style={styles.backHome}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia' },
  eventCard: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.05)', marginBottom: 22 },
  eventEyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 2.5, fontWeight: '700' },
  eventTitle: { color: theme.white, fontSize: 18, fontFamily: 'Georgia', marginTop: 4 },
  eventMeta: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  label: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, color: theme.white, fontSize: 15, marginBottom: 6 },
  priceCard: { borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.borderGold, marginVertical: 18, overflow: 'hidden' },
  priceEyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 2.5, fontWeight: '700' },
  priceOld: { color: theme.textMuted, fontSize: 16, textDecorationLine: 'line-through', paddingBottom: 6 },
  priceBig: { color: theme.white, fontSize: 38, fontFamily: 'Georgia', lineHeight: 42 },
  priceSave: { color: theme.gold, fontSize: 12, fontWeight: '600', marginTop: 8 },
  payCard: { borderRadius: 22, padding: 24, borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', overflow: 'hidden', marginBottom: 18 },
  eyebrowGold: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  payAmt: { color: theme.white, fontSize: 60, fontFamily: 'Georgia', marginVertical: 6 },
  methodCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.06)', marginBottom: 12 },
  methodTitle: { color: theme.white, fontSize: 14, fontWeight: '600' },
  methodSub: { color: theme.textSecondary, fontSize: 12, marginTop: 4, marginLeft: 30 },
  mockNote: { color: theme.gold, fontSize: 12, textAlign: 'center', marginVertical: 12, paddingHorizontal: 10, lineHeight: 18 },
  doneWrap: { alignItems: 'center', paddingTop: 30 },
  tickCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center', shadowColor: theme.gold, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12 },
  doneTitle: { color: theme.white, fontSize: 28, fontFamily: 'Georgia', marginTop: 22, textAlign: 'center' },
  doneSub: { color: theme.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
  regNumCard: { marginTop: 28, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.06)', alignItems: 'center', alignSelf: 'stretch' },
  regLabel: { color: theme.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  regNum: { color: theme.white, fontSize: 26, fontFamily: 'Georgia', letterSpacing: 3, marginTop: 8 },
  backHome: { color: theme.gold, fontSize: 13, letterSpacing: 1, fontWeight: '600' },
});
