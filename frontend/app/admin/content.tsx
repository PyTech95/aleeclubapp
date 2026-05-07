import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

export default function ContentManager() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // form state for sambita & reality
  const [sambitaUrl, setSambitaUrl] = useState('');
  const [sambitaPhoto, setSambitaPhoto] = useState('');
  const [realityUrl, setRealityUrl] = useState('');

  // new star form
  const [newStar, setNewStar] = useState({ name: '', year: '', img: '', video_url: '' });

  const load = async () => {
    const { data } = await api.get('/settings');
    setSettings(data);
    setSambitaUrl(data.sambita_video_url || '');
    setSambitaPhoto(data.sambita_photo || '');
    setRealityUrl(data.reality_show_url || '');
  };
  useEffect(() => { load(); }, []);

  const saveTopFields = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        sambita_video_url: sambitaUrl,
        sambita_photo: sambitaPhoto,
        reality_show_url: realityUrl,
      });
      Alert.alert('Saved', 'Content updated successfully.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const clearSambita = async () => {
    setSambitaUrl(''); setSambitaPhoto('');
    await api.put('/settings', { sambita_video_url: '', sambita_photo: '' });
    await load();
  };

  const clearReality = async () => {
    setRealityUrl('');
    await api.put('/settings', { reality_show_url: '' });
    await load();
  };

  const addStar = async () => {
    if (!newStar.name || !newStar.img) { Alert.alert('Required', 'Photo URL and Name are required'); return; }
    await api.post('/settings/star-achievements/add', newStar);
    setNewStar({ name: '', year: '', img: '', video_url: '' });
    await load();
  };

  const deleteStar = async (idx: number) => {
    const doDelete = async () => { await api.delete(`/settings/star-achievements/${idx}`); await load(); };
    if (Platform.OS === 'web') { if (confirm('Delete this achievement?')) doDelete(); return; }
    Alert.alert('Delete?', 'Remove this star achievement?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
  };

  if (!settings) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ADMIN</Text>
            <Text style={styles.h1}>Content & Videos</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">

          {/* Sambita Ma'am */}
          <Text style={styles.section}>Sambita Ma'am — Founder Video</Text>
          <Text style={styles.label}>Video URL (YouTube link)</Text>
          <TextInput
            value={sambitaUrl}
            onChangeText={setSambitaUrl}
            placeholder="https://youtu.be/..."
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            testID="sambita-url"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Photo URL (cover image)</Text>
          <TextInput
            value={sambitaPhoto}
            onChangeText={setSambitaPhoto}
            placeholder="https://.../sambita.jpg"
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            testID="sambita-photo"
            autoCapitalize="none"
          />
          {sambitaPhoto ? <Image source={{ uri: sambitaPhoto }} style={styles.preview} /> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <GoldButton title="Clear" variant="secondary" small onPress={clearSambita} style={{ flex: 1 }} testID="clear-sambita" />
            <GoldButton title="Save" small onPress={saveTopFields} loading={saving} style={{ flex: 2 }} testID="save-sambita" />
          </View>

          <View style={styles.divider} />

          {/* Reality Show */}
          <Text style={styles.section}>Reality Show YouTube Link</Text>
          <Text style={styles.label}>YouTube URL</Text>
          <TextInput
            value={realityUrl}
            onChangeText={setRealityUrl}
            placeholder="https://youtube.com/playlist?list=..."
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            testID="reality-url"
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <GoldButton title="Clear" variant="secondary" small onPress={clearReality} style={{ flex: 1 }} testID="clear-reality" />
            <GoldButton title="Save" small onPress={saveTopFields} loading={saving} style={{ flex: 2 }} testID="save-reality" />
          </View>

          <View style={styles.divider} />

          {/* Star Achievements */}
          <Text style={styles.section}>Star Achievements ({settings.star_achievements?.length || 0})</Text>
          <Text style={styles.subSection}>Add a new star</Text>
          <Text style={styles.label}>Photo URL</Text>
          <TextInput value={newStar.img} onChangeText={(t) => setNewStar({ ...newStar, img: t })} placeholder="https://.../winner.jpg" placeholderTextColor={theme.textMuted} style={styles.input} testID="new-star-img" autoCapitalize="none" />
          <Text style={styles.label}>Name</Text>
          <TextInput value={newStar.name} onChangeText={(t) => setNewStar({ ...newStar, name: t })} placeholder="Mishty Gadhwal" placeholderTextColor={theme.textMuted} style={styles.input} testID="new-star-name" />
          <Text style={styles.label}>Year / Title</Text>
          <TextInput value={newStar.year} onChangeText={(t) => setNewStar({ ...newStar, year: t })} placeholder="Miss Teen India 2025" placeholderTextColor={theme.textMuted} style={styles.input} testID="new-star-year" />
          <Text style={styles.label}>Video URL (optional)</Text>
          <TextInput value={newStar.video_url} onChangeText={(t) => setNewStar({ ...newStar, video_url: t })} placeholder="https://youtu.be/..." placeholderTextColor={theme.textMuted} style={styles.input} testID="new-star-video" autoCapitalize="none" />
          <GoldButton title="+ Add Star Achievement" onPress={addStar} small testID="add-star-btn" style={{ marginTop: 6 }} />

          <Text style={[styles.subSection, { marginTop: 20 }]}>Existing achievements</Text>
          {(settings.star_achievements || []).map((s: any, i: number) => (
            <View key={i} style={styles.starRow}>
              {s.img ? <Image source={{ uri: s.img }} style={styles.starImg} /> : <View style={[styles.starImg, { backgroundColor: '#222' }]} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.starName}>{s.name}</Text>
                <Text style={styles.starYear}>{s.year}</Text>
                {s.video_url ? <Text style={styles.starUrl} numberOfLines={1}>🎬 {s.video_url}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteStar(i)} style={styles.delBtn} testID={`del-star-${i}`}>
                <Ionicons name="trash" size={14} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 28, fontFamily: 'Georgia', marginTop: 2 },
  section: { color: theme.white, fontSize: 20, fontFamily: 'Georgia', marginTop: 6, marginBottom: 12 },
  subSection: { color: theme.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginTop: 6, marginBottom: 8 },
  label: { color: theme.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', marginTop: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.white, fontSize: 13, marginBottom: 4 },
  preview: { width: '100%', height: 140, borderRadius: 12, marginVertical: 8, backgroundColor: '#111' },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 22 },
  starRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 8 },
  starImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#111' },
  starName: { color: theme.white, fontSize: 14, fontFamily: 'Georgia' },
  starYear: { color: theme.gold, fontSize: 11, marginTop: 2 },
  starUrl: { color: theme.textMuted, fontSize: 10, marginTop: 3 },
  delBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.danger },
});
