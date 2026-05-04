import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

const EMPTY = {
  title: '', subtitle: '', description: '', category: 'miss-teen', city: '', venue: '',
  min_age: '13', max_age: '30', gender: 'any', fee: '1200',
  early_bird_fee: '900', early_bird_deadline: '',
  start_date: '', end_date: '', application_deadline: '',
  banner_image: '', eligibility: '', prizes: '', status: 'open',
};

export default function AdminEvents() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const openNew = () => { setForm(EMPTY); setEditing({ new: true }); };
  const openEdit = (e: any) => {
    setForm({
      ...e,
      min_age: String(e.min_age), max_age: String(e.max_age), fee: String(Math.round(e.fee / 100)),
      early_bird_fee: String(Math.round((e.early_bird_fee || 0) / 100)),
      early_bird_deadline: e.early_bird_deadline || '',
    });
    setEditing(e);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        min_age: parseInt(form.min_age) || 13,
        max_age: parseInt(form.max_age) || 30,
        fee: (parseInt(form.fee) || 0) * 100,
        early_bird_fee: (parseInt(form.early_bird_fee) || 0) * 100,
      };
      if (editing?.new) {
        await api.post('/events', payload);
      } else {
        await api.put(`/events/${editing.id}`, payload);
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!confirm('Delete this event?')) return;
      await api.delete(`/events/${id}`);
      await load();
    } else {
      Alert.alert('Delete event?', 'This cannot be undone.', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/events/${id}`); await load(); } },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>MANAGE</Text>
            <Text style={styles.h1}>Events</Text>
          </View>
          <TouchableOpacity onPress={openNew} style={styles.addBtn} testID="add-event-btn">
            <Ionicons name="add" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {events.map((e) => (
          <View key={e.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{e.title}</Text>
              <Text style={styles.cardSub}>{e.city} · {e.start_date} · ₹{Math.round(e.fee / 100)}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeTxt}>{e.status.toUpperCase()}</Text></View>
                <View style={styles.badge}><Text style={styles.badgeTxt}>{e.category}</Text></View>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => openEdit(e)} style={styles.iconAct} testID={`edit-${e.id}`}>
                <Ionicons name="pencil" size={14} color={theme.gold} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(e.id)} style={[styles.iconAct, { borderColor: theme.danger }]} testID={`del-${e.id}`}>
                <Ionicons name="trash" size={14} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalWrap}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{editing?.new ? 'New Event' : 'Edit Event'}</Text>
              <TouchableOpacity onPress={() => setEditing(null)}><Ionicons name="close" size={22} color={theme.white} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {[
                ['title', 'Title'], ['subtitle', 'Subtitle'], ['description', 'Description', true],
                ['category', 'Category (miss-teen/mr-india/kids/mrs)'], ['city', 'City'], ['venue', 'Venue'],
                ['min_age', 'Min age', false, 'numeric'], ['max_age', 'Max age', false, 'numeric'],
                ['gender', 'Gender (male/female/any)'], ['fee', 'Regular Fee (INR)', false, 'numeric'],
                ['early_bird_fee', 'Early Bird Fee (INR)', false, 'numeric'],
                ['early_bird_deadline', 'Early Bird Deadline (YYYY-MM-DD)'],
                ['start_date', 'Start date (YYYY-MM-DD)'], ['end_date', 'End date (YYYY-MM-DD)'],
                ['application_deadline', 'Deadline (YYYY-MM-DD)'],
                ['banner_image', 'Banner image URL'],
                ['eligibility', 'Eligibility'], ['prizes', 'Prizes', true],
                ['status', 'Status (upcoming/open/closed/completed)'],
              ].map(([k, label, multi, kb]: any) => (
                <View key={k} style={{ marginBottom: 12 }}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    value={form[k]}
                    onChangeText={(t) => setForm({ ...form, [k]: t })}
                    multiline={!!multi}
                    keyboardType={kb || 'default'}
                    style={[styles.input, multi && { minHeight: 80, textAlignVertical: 'top' }]}
                    placeholderTextColor={theme.textMuted}
                    testID={`field-${k}`}
                  />
                </View>
              ))}
              <GoldButton title="Save Event" onPress={save} loading={saving} testID="save-event-btn" />
            </ScrollView>
          </KeyboardAvoidingView>
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
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 10 },
  cardTitle: { color: theme.white, fontSize: 15, fontFamily: 'Georgia' },
  cardSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold },
  badgeTxt: { color: theme.gold, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  iconAct: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', borderWidth: 1, borderColor: theme.border },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomColor: theme.border, borderBottomWidth: 1 },
  modalTitle: { color: theme.white, fontSize: 22, fontFamily: 'Georgia' },
  label: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.white, fontSize: 13 },
});
