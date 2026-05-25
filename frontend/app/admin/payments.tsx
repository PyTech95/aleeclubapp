import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import { exportToCsv } from '../../src/utils/csv';

const STATUS_FILTERS = ['all', 'paid', 'created'] as const;

export default function AdminPayments() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ count: 0, paid_count: 0, paid_paise: 0, created_paise: 0 });
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status_q = filter;
      const { data } = await api.get('/admin/payments', { params });
      setItems(data.items || []);
      setTotals(data.totals || {});
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, [filter]));

  const onExport = () => {
    const rows = items.map((p) => ({
      OrderId: p.order_id,
      PaymentId: p.payment_id || '',
      Applicant: p.applicant_name,
      Event: p.event_title,
      Email: p.user_email,
      Phone: p.user_phone,
      AmountINR: Math.round((p.amount || 0) / 100),
      Status: p.status,
      Mock: p.mock ? 'YES' : 'NO',
      CreatedAt: p.created_at,
      PaidAt: p.paid_at || '',
    }));
    exportToCsv(`alee_payments_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ADMIN</Text>
            <Text style={styles.h1}>Payments</Text>
          </View>
          <TouchableOpacity onPress={onExport} style={styles.iconBtn} testID="export-payments">
            <Ionicons name="download-outline" size={18} color={theme.gold} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        <View style={styles.heroCard}>
          <LinearGradient colors={['rgba(212,175,55,0.2)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
          <Text style={styles.heroEyebrow}>COLLECTED REVENUE</Text>
          <Text style={styles.heroAmt}>₹{Math.round((totals.paid_paise || 0) / 100).toLocaleString('en-IN')}</Text>
          <Text style={styles.heroNote}>{totals.paid_count || 0} successful · {totals.count || 0} total transactions</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]} testID={`pay-${f}`}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{f.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ padding: 20, paddingTop: 0 }}>
          {items.length === 0 ? (
            <View style={styles.empty}><Ionicons name="card-outline" size={48} color={theme.textMuted} /><Text style={styles.emptyTxt}>No payments yet.</Text></View>
          ) : items.map((p) => (
            <View key={p.id || p.order_id} style={styles.card}>
              <View style={[styles.dot, { backgroundColor: p.status === 'paid' ? theme.success : theme.gold }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appName} numberOfLines={1}>{p.applicant_name}</Text>
                <Text style={styles.evtTitle} numberOfLines={1}>{p.event_title}</Text>
                <Text style={styles.orderId} numberOfLines={1}>{p.order_id}</Text>
                <View style={styles.rowMeta}>
                  <View style={[styles.statusPill, { borderColor: p.status === 'paid' ? theme.success : theme.gold }]}>
                    <Text style={[styles.statusPillTxt, { color: p.status === 'paid' ? theme.success : theme.gold }]}>{(p.status || 'created').toUpperCase()}</Text>
                  </View>
                  {p.mock ? <Text style={styles.mockTag}>MOCK</Text> : null}
                  <Text style={styles.dateTxt}>{new Date(p.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
              <Text style={styles.amt}>₹{Math.round((p.amount || 0) / 100)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia', marginTop: 2 },
  heroCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: theme.borderGold, overflow: 'hidden' },
  heroEyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  heroAmt: { color: theme.white, fontSize: 40, fontFamily: 'Georgia', marginTop: 6 },
  heroNote: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  chipActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.1)' },
  chipTxt: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
  chipTxtActive: { color: theme.gold, fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  appName: { color: theme.white, fontSize: 15, fontFamily: 'Georgia' },
  evtTitle: { color: theme.gold, fontSize: 11, marginTop: 2, fontWeight: '600' },
  orderId: { color: theme.textMuted, fontSize: 10, marginTop: 4 },
  rowMeta: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusPillTxt: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  mockTag: { color: theme.textMuted, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  dateTxt: { color: theme.textMuted, fontSize: 10 },
  amt: { color: theme.white, fontSize: 18, fontFamily: 'Georgia' },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTxt: { color: theme.textMuted, fontSize: 14 },
});
