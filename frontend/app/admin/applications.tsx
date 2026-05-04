import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

const STATUSES = ['applied', 'under_review', 'shortlisted', 'selected', 'rejected'];
const FILTERS = ['all', ...STATUSES];

export default function AdminApps() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('under_review');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const { data } = await api.get('/applications', { params });
      setApps(data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, [filter]));

  const updateStatus = async () => {
    setSaving(true);
    try {
      await api.put(`/applications/${editing.id}/status`, { status: newStatus, feedback });
      setEditing(null);
      setFeedback('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>REVIEW</Text>
            <Text style={styles.h1}>Applications</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]} testID={`fchip-${f}`}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{f.replace('_', ' ').toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {apps.length === 0 && (
          <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 60 }}>No applications.</Text>
        )}
        {apps.map((a) => (
          <TouchableOpacity key={a.id} style={styles.card} onPress={() => { setEditing(a); setNewStatus(a.status); setFeedback(a.feedback || ''); }} testID={`admin-app-${a.id}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{a.full_name}</Text>
              <Text style={styles.cardSub}>{a.event_title} · {a.city} · Age {a.age}</Text>
              <View style={styles.row}>
                <View style={[styles.statusBadge, { borderColor: theme.gold }]}>
                  <Text style={[styles.statusTxt, { color: theme.gold }]}>{a.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.meta}>₹{Math.round((a.fee || 0) / 100)} · {a.payment_status}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.gold} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setEditing(null)}><Ionicons name="close" size={22} color={theme.white} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.applicant}>{editing?.full_name}</Text>
              <Text style={styles.applicantEvent}>{editing?.event_title}</Text>

              <Text style={styles.label}>New Status</Text>
              <View style={styles.statusGrid}>
                {STATUSES.map((s) => (
                  <TouchableOpacity key={s} onPress={() => setNewStatus(s)} style={[styles.statusOpt, newStatus === s && styles.statusOptActive]} testID={`status-${s}`}>
                    <Text style={[styles.statusOptTxt, newStatus === s && styles.statusOptTxtActive]}>{s.replace('_', ' ').toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Feedback (optional)</Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                multiline
                placeholder="Share feedback..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                testID="feedback-input"
              />

              <GoldButton title="Update Status" onPress={updateStatus} loading={saving} style={{ marginTop: 10 }} testID="update-status-btn" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia', marginTop: 2 },
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  chipActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.1)' },
  chipTxt: { color: theme.textSecondary, fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  chipTxtActive: { color: theme.gold, fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 10 },
  cardTitle: { color: theme.white, fontSize: 16, fontFamily: 'Georgia' },
  cardSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusTxt: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  meta: { color: theme.textMuted, fontSize: 11 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomColor: theme.border, borderBottomWidth: 1 },
  modalTitle: { color: theme.white, fontSize: 22, fontFamily: 'Georgia' },
  applicant: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },
  applicantEvent: { color: theme.gold, fontSize: 12, letterSpacing: 1, marginTop: 2, marginBottom: 20 },
  label: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', marginTop: 10 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusOpt: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  statusOptActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.15)' },
  statusOptTxt: { color: theme.textSecondary, fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  statusOptTxtActive: { color: theme.gold, fontWeight: '700' },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.white, fontSize: 13 },
});
