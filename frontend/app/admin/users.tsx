import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';
import { exportToCsv } from '../../src/utils/csv';

const ROLES = ['all', 'participant', 'judge', 'admin'] as const;

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', role: 'participant', verified: false, city: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load users');
    }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = useMemo(() => {
    let out = users;
    if (role !== 'all') out = out.filter((u) => u.role === role);
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter((u) => (u.name || '').toLowerCase().includes(s)
        || (u.email || '').toLowerCase().includes(s)
        || (u.phone || '').includes(s));
    }
    return out;
  }, [users, role, search]);

  const totals = useMemo(() => ({
    all: users.length,
    participants: users.filter(u => u.role === 'participant').length,
    judges: users.filter(u => u.role === 'judge').length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users]);

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      name: u.name || '',
      role: u.role || 'participant',
      verified: !!u.verified,
      city: u.city || '',
      phone: u.phone || '',
    });
  };

  const saveUser = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${editing.id}`, form);
      setEditing(null);
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.response?.data?.detail || 'Could not update user');
    } finally { setSaving(false); }
  };

  const deleteUser = (u: any) => {
    const doDelete = async () => {
      try {
        await api.delete(`/admin/users/${u.id}`);
        setEditing(null);
        await load();
      } catch (e: any) {
        Alert.alert('Delete failed', e?.response?.data?.detail || 'Could not delete');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (confirm(`Delete ${u.name || u.email}? Paid applications are preserved.`)) doDelete();
    } else {
      Alert.alert('Delete user?', `${u.name || u.email}\nPaid applications are preserved.`, [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const onExport = () => {
    const rows = filtered.map((u) => ({
      Name: u.name,
      Email: u.email,
      Phone: u.phone,
      City: u.city,
      Role: u.role,
      Verified: u.verified ? 'YES' : 'NO',
      Applications: u.application_count || 0,
      Paid: u.paid_count || 0,
      ReferralCode: u.referral_code || '',
      CreatedAt: u.created_at,
    }));
    exportToCsv(`alee_users_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ADMIN · STUDENTS</Text>
            <Text style={styles.h1}>Users</Text>
          </View>
          <TouchableOpacity onPress={onExport} style={styles.iconBtn} testID="export-users">
            <Ionicons name="download-outline" size={18} color={theme.gold} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Total" value={totals.all} />
          <Stat label="Participants" value={totals.participants} />
          <Stat label="Judges" value={totals.judges} />
          <Stat label="Admins" value={totals.admins} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name / email / phone"
            placeholderTextColor={theme.textMuted}
            style={styles.searchInput}
            testID="users-search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.chip, active && styles.chipActive]} testID={`role-${r}`}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{r.toUpperCase()}</Text>
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
          <View style={styles.empty}><Ionicons name="people-outline" size={48} color={theme.textMuted} /><Text style={styles.emptyTxt}>No users match.</Text></View>
        ) : filtered.map((u) => (
          <TouchableOpacity key={u.id} style={styles.card} onPress={() => router.push(`/admin/user/${u.id}`)} testID={`user-${u.id}`}>
            {u.profile_photo ? (
              <Image source={{ uri: u.profile_photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}><Ionicons name="person" size={20} color={theme.gold} /></View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{u.name || 'Unnamed'}</Text>
                {u.verified ? <Ionicons name="checkmark-circle" size={14} color={theme.success} /> : null}
              </View>
              <Text style={styles.meta} numberOfLines={1}>{u.email}</Text>
              <Text style={styles.metaSm} numberOfLines={1}>{u.phone || '—'} · {u.city || '—'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, u.role === 'admin' && styles.adminBadge, u.role === 'judge' && styles.judgeBadge]}>
                  <Text style={[styles.roleTxt, u.role === 'admin' && styles.adminTxt, u.role === 'judge' && styles.judgeTxt]}>{(u.role || 'participant').toUpperCase()}</Text>
                </View>
                <Text style={styles.statTxt}>{u.application_count || 0} apps · {u.paid_count || 0} paid</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => openEdit(u)} style={styles.editBtn} testID={`edit-user-${u.id}`}>
              <Ionicons name="pencil" size={14} color={theme.gold} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditing(null)}><Ionicons name="close" size={22} color={theme.white} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.applicant}>{editing?.email}</Text>
              <Text style={styles.applicantMeta}>Joined {editing?.created_at ? new Date(editing.created_at).toLocaleDateString() : '-'}</Text>

              <Text style={styles.label}>Full Name</Text>
              <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholderTextColor={theme.textMuted} style={styles.input} />

              <Text style={styles.label}>Phone</Text>
              <TextInput value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholderTextColor={theme.textMuted} style={styles.input} keyboardType="phone-pad" />

              <Text style={styles.label}>City</Text>
              <TextInput value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} placeholderTextColor={theme.textMuted} style={styles.input} />

              <Text style={styles.label}>Role</Text>
              <View style={styles.roleGrid}>
                {['participant', 'judge', 'admin'].map((r) => (
                  <TouchableOpacity key={r} onPress={() => setForm({ ...form, role: r })} style={[styles.roleOpt, form.role === r && styles.roleOptActive]} testID={`opt-role-${r}`}>
                    <Text style={[styles.roleOptTxt, form.role === r && styles.roleOptTxtActive]}>{r.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => setForm({ ...form, verified: !form.verified })} style={styles.checkRow} testID="toggle-verified">
                <View style={[styles.checkbox, form.verified && styles.checkboxOn]}>
                  {form.verified ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
                </View>
                <Text style={styles.checkTxt}>Verified user</Text>
              </TouchableOpacity>

              <GoldButton title="Save Changes" onPress={saveUser} loading={saving} style={{ marginTop: 20 }} testID="save-user-btn" />
              <TouchableOpacity onPress={() => deleteUser(editing)} style={styles.deleteBtn} testID="delete-user-btn">
                <Ionicons name="trash" size={16} color={theme.danger} />
                <Text style={styles.deleteTxt}>Delete user</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  statBox: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg },
  statVal: { color: theme.white, fontSize: 18, fontFamily: 'Georgia' },
  statLabel: { color: theme.textMuted, fontSize: 9, letterSpacing: 1.2, fontWeight: '600', marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  searchInput: { flex: 1, color: theme.white, fontSize: 13 },
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  chipActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.1)' },
  chipTxt: { color: theme.textSecondary, fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  chipTxtActive: { color: theme.gold, fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212,175,55,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: theme.white, fontSize: 15, fontFamily: 'Georgia', flexShrink: 1 },
  meta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  metaSm: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  adminBadge: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  judgeBadge: { borderColor: '#9b87f5', backgroundColor: 'rgba(155,135,245,0.12)' },
  roleTxt: { color: theme.textSecondary, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  adminTxt: { color: theme.gold },
  judgeTxt: { color: '#b9a8fa' },
  statTxt: { color: theme.textMuted, fontSize: 10 },
  editBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTxt: { color: theme.textMuted, fontSize: 14 },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', borderWidth: 1, borderColor: theme.border },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomColor: theme.border, borderBottomWidth: 1 },
  modalTitle: { color: theme.white, fontSize: 22, fontFamily: 'Georgia' },
  applicant: { color: theme.white, fontSize: 16, fontFamily: 'Georgia' },
  applicantMeta: { color: theme.textMuted, fontSize: 11, marginTop: 4, marginBottom: 16 },
  label: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.white, fontSize: 14 },
  roleGrid: { flexDirection: 'row', gap: 8 },
  roleOpt: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  roleOptActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  roleOptTxt: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  roleOptTxtActive: { color: theme.gold, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: theme.gold, borderColor: theme.gold },
  checkTxt: { color: theme.white, fontSize: 14 },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.danger },
  deleteTxt: { color: theme.danger, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
