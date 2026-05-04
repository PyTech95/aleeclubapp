import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

export default function Payment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appd, setAppd] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/applications/${id}`);
      setAppd(data);
    })();
  }, [id]);

  const createOrder = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/payments/create-order', { application_id: id });
      setOrder(data);
    } catch (e: any) {
      Alert.alert('Payment error', e?.response?.data?.detail || 'Failed to create order');
    } finally { setLoading(false); }
  };

  const completeMock = async () => {
    setLoading(true);
    try {
      await api.post('/payments/verify', { application_id: id, mock: true });
      Alert.alert('Payment successful', 'Your application is now confirmed.', [
        { text: 'View Status', onPress: () => router.replace(`/application/${id}`) },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Verification failed');
    } finally { setLoading(false); }
  };

  if (!appd) return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.gold} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.h1}>Payment</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.card}>
          <LinearGradient colors={['rgba(212,175,55,0.15)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>ENTRY FEE</Text>
          <Text style={styles.amount}>₹{Math.round(appd.fee / 100)}</Text>
          <Text style={styles.subtitle}>{appd.event_title}</Text>
          <Text style={styles.applicant}>for {appd.full_name}</Text>
        </View>

        <View style={styles.summary}>
          <SumRow label="Event fee" val={`₹${Math.round(appd.fee / 100)}`} />
          <SumRow label="GST & charges" val="₹0" />
          <View style={styles.divider} />
          <SumRow label="Total" val={`₹${Math.round(appd.fee / 100)}`} bold />
        </View>

        <View style={styles.methodCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="card" size={20} color={theme.gold} />
            <Text style={styles.methodTitle}>Razorpay Secure</Text>
          </View>
          <Text style={styles.methodSub}>UPI · Cards · Netbanking · Wallets</Text>
        </View>

        {appd.payment_status === 'paid' ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={28} color={theme.success} />
            <Text style={styles.successTitle}>Payment complete</Text>
            <GoldButton title="View Application" onPress={() => router.replace(`/application/${id}`)} style={{ marginTop: 12 }} />
          </View>
        ) : !order ? (
          <GoldButton title="Proceed to Pay" onPress={createOrder} loading={loading} testID="proceed-pay" />
        ) : (
          <>
            {order.mock && (
              <Text style={styles.mockNote}>
                TEST MODE — Razorpay keys not configured. Tap below to simulate a successful payment.
              </Text>
            )}
            <GoldButton title="Complete Payment" onPress={completeMock} loading={loading} testID="complete-pay" />
          </>
        )}

        <Text style={styles.legal}>Transactions are secured with 256-bit encryption.</Text>
      </ScrollView>
    </View>
  );
}

function SumRow({ label, val, bold }: any) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, bold && { color: theme.white, fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.sumVal, bold && { fontSize: 18 }]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia' },
  card: { borderRadius: 22, padding: 24, borderWidth: 1, borderColor: theme.borderGold, overflow: 'hidden', alignItems: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  amount: { color: theme.white, fontSize: 64, fontFamily: 'Georgia', marginVertical: 6 },
  subtitle: { color: theme.white, fontSize: 16, fontFamily: 'Georgia', textAlign: 'center' },
  applicant: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  summary: { marginTop: 24, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16, backgroundColor: theme.cardBg },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  sumLabel: { color: theme.textSecondary, fontSize: 14 },
  sumVal: { color: theme.white, fontSize: 14 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 8 },
  methodCard: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.06)' },
  methodTitle: { color: theme.white, fontSize: 14, fontWeight: '600' },
  methodSub: { color: theme.textSecondary, fontSize: 12, marginTop: 4, marginLeft: 30 },
  successCard: { alignItems: 'center', gap: 8, padding: 24, marginTop: 20, borderWidth: 1, borderColor: theme.success, backgroundColor: `${theme.success}10`, borderRadius: 16 },
  successTitle: { color: theme.success, fontSize: 16, fontWeight: '700' },
  mockNote: { color: theme.gold, fontSize: 12, textAlign: 'center', marginVertical: 12, paddingHorizontal: 20, lineHeight: 18 },
  legal: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 20 },
});
