import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import { exportToCsv } from '../../src/utils/csv';

const FILTERS = [
  { id: 'all', label: 'All Registered' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending Payment' },
];

export default function Candidates() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState((params.filter as string) || 'all');
  const [search, setSearch] = useState('');
  const [apps, setApps] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/applications');
      setApps(data || []);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = useMemo(() => {
    let out = apps;
    if (filter === 'paid') out = out.filter((a) => a.payment_status === 'paid');
    if (filter === 'pending') out = out.filter((a) => a.payment_status !== 'paid' && a.payment_status !== 'free');
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter((a) => (a.full_name || '').toLowerCase().includes(s) || (a.phone || '').includes(s) || (a.city || '').toLowerCase().includes(s));
    }
    return out;
  }, [apps, filter, search]);

  const totalPaid = apps.filter((a) => a.payment_status === 'paid').reduce((s, a) => s + (a.fee || 0), 0);

  const onExport = () => {
    const rows = filtered.map((a) => ({
      Name: a.full_name,
      Phone: a.phone,
      City: a.city,
      Age: a.age,
      Gender: a.gender,
      Event: a.event_title,
      Status: a.status,
      Payment: a.payment_status,
      FeeINR: Math.round((a.fee || 0) / 100),
      AppliedAt: a.created_at,
    }));
    exportToCsv(`alee_candidates_${filter}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
            <Text style={styles.h1}>Candidates</Text>
          </View>
          <TouchableOpacity onPress={onExport} style={styles.iconBtn} testID="export-candidates">
            <Ionicons name="download-outline" size={18} color={theme.gold} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Total" value={apps.length} />
          <Stat label="Paid" value={apps.filter((a) => a.payment_status === 'paid').length} />
          <Stat label="Revenue" value={`₹${Math.round(totalPaid / 100).toLocaleString('en-IN')}`} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name / phone / city"
            placeholderTextColor={theme.textMuted}
            style={styles.searchInput}
            testID="cand-search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)} style={[styles.chip, active && styles.chipActive]} testID={`fchip-${f.id}`}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}><Ionicons name="people-outline" size={48} color={theme.textMuted} /><Text style={styles.emptyTxt}>No candidates match.</Text></View>
        ) : filtered.map((a) => (
          <TouchableOpacity key={a.id} style={styles.card} onPress={() => router.push(`/admin/applications`)} testID={`cand-${a.id}`}>
            <View style={styles.avatar}><Ionicons name="person" size={22} color={theme.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.full_name}</Text>
              <Text style={styles.meta}>{a.phone} · {a.city} · Age {a.age}</Text>
              <Text style={styles.event} numberOfLines={1}>{a.event_title}</Text>
              <View style={styles.row}>
                <View style={[styles.badge, { borderColor: a.payment_status === 'paid' ? theme.success : theme.gold }]}>
                  <Text style={[styles.badgeTxt, { color: a.payment_status === 'paid' ? theme.success : theme.gold }]}>
                    {a.payment_status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.feeTxt}>₹{Math.round((a.fee || 0) / 100)}</Text>
                <Text style={styles.dateTxt}>{new Date(a.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.gold} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  statBox: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg },
  statVal: { color: theme.white, fontSize: 18, fontFamily: 'Georgia' },
  statLabel: { color: theme.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', marginTop: 3 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  searchInput: { flex: 1, color: theme.white, fontSize: 13 },
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  chipActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.1)' },
  chipTxt: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  chipTxtActive: { color: theme.gold, fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(212,175,55,0.12)', alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.white, fontSize: 15, fontFamily: 'Georgia' },
  meta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  event: { color: theme.gold, fontSize: 11, marginTop: 4, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeTxt: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  feeTxt: { color: theme.white, fontSize: 12, fontWeight: '600' },
  dateTxt: { color: theme.textMuted, fontSize: 10 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTxt: { color: theme.textMuted, fontSize: 14 },
});
