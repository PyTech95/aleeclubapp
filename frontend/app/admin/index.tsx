import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';

export default function AdminHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/analytics');
      setStats(data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ADMIN CONSOLE</Text>
            <Text style={styles.h1}>Overview</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.iconBtn} testID="admin-logout">
            <Ionicons name="log-out-outline" size={20} color={theme.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        <View style={styles.heroCard}>
          <LinearGradient colors={['rgba(212,175,55,0.2)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
          <Text style={styles.heroEyebrow}>TOTAL REVENUE</Text>
          <Text style={styles.heroAmt}>₹{Math.round((stats.revenue_paise || 0) / 100).toLocaleString('en-IN')}</Text>
          <Text style={styles.heroNote}>Across all paid applications</Text>
        </View>

        <View style={styles.grid}>
          <StatBox label="Users" value={stats.users} icon="people" />
          <StatBox label="Events" value={stats.events} icon="calendar" />
          <StatBox label="Applications" value={stats.applications} icon="document-text" />
          <StatBox label="Selected" value={stats.by_status?.selected || 0} icon="ribbon" />
        </View>

        <Text style={styles.secTitle}>Application Funnel</Text>
        <View style={styles.funnel}>
          {['applied', 'under_review', 'shortlisted', 'selected', 'rejected'].map((s) => (
            <View key={s} style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>{s.replace('_', ' ').toUpperCase()}</Text>
              <View style={styles.funnelBarBg}>
                <View style={[styles.funnelBar, { width: `${Math.min(100, ((stats.by_status?.[s] || 0) / Math.max(1, stats.applications || 1)) * 100)}%` }]} />
              </View>
              <Text style={styles.funnelVal}>{stats.by_status?.[s] || 0}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.secTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <ActionCard icon="calendar" title="Manage Events" onPress={() => router.push('/admin/events')} testID="admin-events-btn" />
          <ActionCard icon="document-text" title="Applications" onPress={() => router.push('/admin/applications')} testID="admin-apps-btn" />
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, icon }: any) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={18} color={theme.gold} />
      <Text style={styles.statVal}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, title, onPress, testID }: any) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} testID={testID}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={theme.gold} />
      </View>
      <Text style={styles.actionTxt}>{title}</Text>
      <Ionicons name="arrow-forward" size={16} color={theme.gold} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 24 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 34, fontFamily: 'Georgia', marginTop: 4 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroCard: { marginHorizontal: 24, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.borderGold, overflow: 'hidden' },
  heroEyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  heroAmt: { color: theme.white, fontSize: 44, fontFamily: 'Georgia', marginTop: 6 },
  heroNote: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 24, paddingBottom: 0 },
  statBox: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, gap: 6 },
  statVal: { color: theme.white, fontSize: 28, fontFamily: 'Georgia' },
  statLabel: { color: theme.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
  secTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia', paddingHorizontal: 24, marginTop: 24 },
  funnel: { padding: 24, gap: 10 },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funnelLabel: { color: theme.textSecondary, fontSize: 10, letterSpacing: 1.5, width: 100, fontWeight: '600' },
  funnelBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  funnelBar: { height: '100%', backgroundColor: theme.gold },
  funnelVal: { color: theme.white, fontSize: 13, fontFamily: 'Georgia', width: 30, textAlign: 'right' },
  actions: { padding: 24, paddingTop: 10, gap: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.12)' },
  actionTxt: { flex: 1, color: theme.white, fontSize: 15, fontFamily: 'Georgia' },
});
