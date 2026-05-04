import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';

const STATUS_COLORS: any = {
  applied: theme.gold,
  under_review: '#60A5FA',
  shortlisted: '#A78BFA',
  selected: theme.success,
  rejected: theme.danger,
  draft: theme.textMuted,
};

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'apps' | 'notif' | 'payments' | 'certs'>('apps');

  const load = async () => {
    try {
      const [a, n, c, p] = await Promise.all([
        api.get('/applications/mine'),
        api.get('/notifications'),
        api.get('/certificates/mine'),
        api.get('/payments/mine'),
      ]);
      setApps(a.data); setNotifs(n.data); setCerts(c.data); setPayments(p.data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const upcoming = apps.filter((a) => a.status !== 'rejected' && a.status !== 'draft').length;
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
          <Text style={styles.h1}>Dashboard</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat label="Active" value={upcoming} icon="flame" />
          <Stat label="Certificates" value={certs.length} icon="ribbon" />
          <Stat label="Alerts" value={unread} icon="notifications" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[
            { id: 'apps', label: 'My Applications' },
            { id: 'notif', label: `Alerts${unread ? ` (${unread})` : ''}` },
            { id: 'payments', label: 'Payments' },
            { id: 'certs', label: 'Certificates' },
          ].map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id as any)} style={[styles.tab, tab === t.id && styles.tabActive]} testID={`tab-${t.id}`}>
              <Text style={[styles.tabTxt, tab === t.id && styles.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        {tab === 'apps' && (
          <>
            {apps.length === 0 && <Empty icon="document-text-outline" msg="No applications yet." cta="Browse events" onPress={() => router.push('/(tabs)/events')} />}
            {apps.map((a) => (
              <TouchableOpacity key={a.id} style={styles.appCard} onPress={() => router.push(`/application/${a.id}`)} testID={`my-app-${a.id}`}>
                <View style={styles.appHead}>
                  <Text style={styles.appEvent} numberOfLines={1}>{a.event_title}</Text>
                  <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[a.status] || theme.border, backgroundColor: `${STATUS_COLORS[a.status] || theme.border}22` }]}>
                    <Text style={[styles.statusTxt, { color: STATUS_COLORS[a.status] || theme.white }]}>{a.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.appDate}>Applied {new Date(a.created_at).toLocaleDateString()}</Text>
                <View style={styles.progressRow}>
                  {['applied', 'under_review', 'shortlisted', 'selected'].map((s, i) => {
                    const order = ['applied', 'under_review', 'shortlisted', 'selected'];
                    const done = order.indexOf(a.status) >= i && a.status !== 'rejected';
                    return <View key={s} style={[styles.progBar, done && styles.progBarDone]} />;
                  })}
                </View>
                <View style={styles.appFooter}>
                  <Text style={styles.appFooterTxt}>Tap to track journey</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.gold} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === 'notif' && (
          <>
            {notifs.length === 0 && <Empty icon="notifications-outline" msg="You're all caught up." />}
            {notifs.map((n) => (
              <View key={n.id} style={styles.notifCard}>
                <View style={[styles.notifDot, !n.read && styles.notifDotUnread]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                  <Text style={styles.notifDate}>{new Date(n.created_at).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'payments' && (
          <>
            {payments.length === 0 && <Empty icon="card-outline" msg="No payments yet." />}
            {payments.map((p) => (
              <View key={p.id} style={styles.payCard}>
                <View>
                  <Text style={styles.payAmt}>₹{Math.round(p.amount / 100)}</Text>
                  <Text style={styles.payOrder}>Order: {p.order_id?.slice(0, 16)}...</Text>
                  <Text style={styles.payDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.payStatus, p.status === 'paid' ? styles.payPaid : styles.payPending]}>
                  <Text style={[styles.payStatusTxt, { color: p.status === 'paid' ? theme.success : theme.gold }]}>
                    {p.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'certs' && (
          <>
            {certs.length === 0 && <Empty icon="ribbon-outline" msg="Certificates unlock when shortlisted or selected." />}
            {certs.map((c) => (
              <TouchableOpacity key={c.application_id} style={styles.certCard} onPress={() => router.push(`/certificate/${c.application_id}`)} testID={`cert-${c.application_id}`}>
                <Ionicons name="ribbon" size={28} color={theme.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.certTitle}>{c.event_title}</Text>
                  <Text style={styles.certName}>{c.name} · {c.status.toUpperCase()}</Text>
                  <Text style={styles.certVid}>ID: {c.verification_id}</Text>
                </View>
                <Ionicons name="download" size={18} color={theme.gold} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, icon }: any) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={theme.gold} />
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Empty({ icon, msg, cta, onPress }: any) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={52} color={theme.textMuted} />
      <Text style={styles.emptyTxt}>{msg}</Text>
      {cta && <TouchableOpacity onPress={onPress} style={styles.emptyCta}><Text style={styles.emptyCtaTxt}>{cta}</Text></TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 12 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 34, fontFamily: 'Georgia', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginTop: 18 },
  stat: { flex: 1, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', gap: 6 },
  statVal: { color: theme.white, fontSize: 24, fontFamily: 'Georgia' },
  statLabel: { color: theme.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
  tabs: { paddingHorizontal: 24, paddingVertical: 16, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  tabActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.1)' },
  tabTxt: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },
  tabTxtActive: { color: theme.gold, fontWeight: '700' },
  appCard: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 16, marginBottom: 12 },
  appHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  appEvent: { color: theme.white, fontSize: 16, fontFamily: 'Georgia', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusTxt: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  appDate: { color: theme.textMuted, fontSize: 11, marginBottom: 12 },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  progBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  progBarDone: { backgroundColor: theme.gold },
  appFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  appFooterTxt: { color: theme.gold, fontSize: 11, fontWeight: '500' },
  notifCard: { flexDirection: 'row', gap: 12, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 14, marginBottom: 10 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textMuted, marginTop: 6 },
  notifDotUnread: { backgroundColor: theme.gold },
  notifTitle: { color: theme.white, fontSize: 14, fontWeight: '600' },
  notifBody: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  notifDate: { color: theme.textMuted, fontSize: 10, marginTop: 6 },
  payCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16, marginBottom: 10 },
  payAmt: { color: theme.white, fontSize: 22, fontFamily: 'Georgia' },
  payOrder: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  payDate: { color: theme.textMuted, fontSize: 10, marginTop: 4 },
  payStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  payPaid: { borderColor: theme.success, backgroundColor: `${theme.success}22` },
  payPending: { borderColor: theme.gold, backgroundColor: `${theme.gold}15` },
  payStatusTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  certCard: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.borderGold, borderRadius: 16, padding: 16, marginBottom: 10 },
  certTitle: { color: theme.white, fontSize: 15, fontFamily: 'Georgia' },
  certName: { color: theme.gold, fontSize: 11, marginTop: 2, letterSpacing: 1, fontWeight: '600' },
  certVid: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTxt: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
  emptyCta: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: theme.gold, borderRadius: 999, marginTop: 8 },
  emptyCtaTxt: { color: theme.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
});
