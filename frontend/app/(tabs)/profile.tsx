import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [aiScore, setAiScore] = useState<any>(null);
  const [scoring, setScoring] = useState(false);

  useFocusEffect(useCallback(() => {
    refresh();
  }, []));

  const startEdit = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      age: user?.age?.toString() || '',
      height_cm: user?.height_cm?.toString() || '',
      city: user?.city || '',
      category: user?.category || '',
      bio: user?.bio || '',
      achievements: user?.achievements || '',
      social_instagram: user?.social_instagram || '',
      social_youtube: user?.social_youtube || '',
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.age) payload.age = parseInt(payload.age);
      else delete payload.age;
      if (payload.height_cm) payload.height_cm = parseInt(payload.height_cm);
      else delete payload.height_cm;
      await api.put('/users/me', payload);
      await refresh();
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const pickImage = async (field: 'profile_photo' | 'cover_photo') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'We need access to your photos.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'profile_photo' ? [1, 1] : [16, 9],
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      const b64 = `data:image/jpeg;base64,${res.assets[0].base64}`;
      try {
        await api.put('/users/me', { [field]: b64 });
        await refresh();
      } catch {}
    }
  };

  const addPortfolioPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true, allowsMultipleSelection: false,
    });
    if (!res.canceled && res.assets[0]) {
      const b64 = `data:image/jpeg;base64,${res.assets[0].base64}`;
      const current = user?.portfolio_photos || [];
      await api.put('/users/me', { portfolio_photos: [...current, b64] });
      await refresh();
    }
  };

  const removePortfolioPhoto = async (idx: number) => {
    const current = [...(user?.portfolio_photos || [])];
    current.splice(idx, 1);
    await api.put('/users/me', { portfolio_photos: current });
    await refresh();
  };

  const runAIScore = async () => {
    setScoring(true);
    try {
      const { data } = await api.post('/ai/score-profile', { include_profile: true });
      setAiScore(data);
    } catch (e: any) {
      Alert.alert('AI Score', e?.response?.data?.detail || 'Scoring failed');
    } finally { setScoring(false); }
  };

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Cover */}
        <View style={styles.cover}>
          {user.cover_photo ? (
            <Image source={{ uri: user.cover_photo }} style={StyleSheet.absoluteFill} />
          ) : (
            <Image source={{ uri: 'https://images.unsplash.com/photo-1761437855598-011cf89b2ad4?w=1200' }} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(5,5,5,0.2)', 'rgba(5,5,5,0.9)']} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={styles.coverTop}>
            <TouchableOpacity onPress={() => pickImage('cover_photo')} style={styles.coverBtn} testID="edit-cover">
              <Ionicons name="image" size={14} color={theme.white} />
              <Text style={styles.coverBtnTxt}>Cover</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.coverBtn} testID="logout-btn">
              <Ionicons name="log-out-outline" size={14} color={theme.white} />
              <Text style={styles.coverBtnTxt}>Sign out</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={() => pickImage('profile_photo')} testID="edit-avatar">
            {user.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={42} color={theme.gold} />
              </View>
            )}
            <View style={styles.avatarEdit}><Ionicons name="camera" size={12} color="#000" /></View>
          </TouchableOpacity>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>{user.email}</Text>
          {user.city ? <Text style={styles.meta}>{user.city}{user.category ? ` · ${user.category}` : ''}</Text> : null}
          {user.role === 'admin' && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
              <Ionicons name="shield-checkmark" size={14} color={theme.gold} />
              <Text style={styles.adminBtnTxt}>Admin Panel</Text>
            </TouchableOpacity>
          )}
        </View>

        {!editing ? (
          <View style={styles.body}>
            <TouchableOpacity style={styles.editBtn} onPress={startEdit} testID="edit-profile-btn">
              <Ionicons name="pencil" size={14} color={theme.gold} />
              <Text style={styles.editTxt}>Edit Profile</Text>
            </TouchableOpacity>

            {/* AI score card */}
            <View style={styles.aiCard}>
              <View style={styles.aiHead}>
                <Ionicons name="sparkles" size={18} color={theme.gold} />
                <Text style={styles.aiTitle}>AI Profile Score</Text>
              </View>
              {aiScore?.score != null ? (
                <>
                  <Text style={styles.aiScoreBig}>{aiScore.score}<Text style={styles.aiScoreOf}>/100</Text></Text>
                  {aiScore.strengths ? <Text style={styles.aiLine}><Text style={styles.aiLabel}>✦ </Text>{aiScore.strengths}</Text> : null}
                  {aiScore.improve ? <Text style={styles.aiLine}><Text style={styles.aiLabel}>△ </Text>{aiScore.improve}</Text> : null}
                  {aiScore.recommended?.length ? (
                    <Text style={styles.aiLine}><Text style={styles.aiLabel}>→ </Text>Try: {aiScore.recommended.join(', ')}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.aiSub}>Get an AI-powered talent score with suggestions.</Text>
              )}
              <GoldButton title={aiScore ? "Re-score my profile" : "Score my profile"} onPress={runAIScore} loading={scoring} small style={{ marginTop: 12 }} testID="ai-score-btn" />
            </View>

            {/* About */}
            <Section title="About">
              {user.bio ? <Text style={styles.body1}>{user.bio}</Text> : <Text style={styles.mutedLine}>No bio yet. Tap Edit Profile to add one.</Text>}
            </Section>

            {/* Stats */}
            <Section title="Details">
              <View style={styles.detailGrid}>
                <Detail label="Age" val={user.age?.toString() || '—'} />
                <Detail label="Height" val={user.height_cm ? `${user.height_cm} cm` : '—'} />
                <Detail label="City" val={user.city || '—'} />
                <Detail label="Category" val={user.category || '—'} />
              </View>
            </Section>

            <Section title="Achievements">
              {user.achievements ? <Text style={styles.body1}>{user.achievements}</Text> : <Text style={styles.mutedLine}>Add your milestones.</Text>}
            </Section>

            {/* Portfolio */}
            <Section title="Portfolio" action={
              <TouchableOpacity onPress={addPortfolioPhoto} testID="add-photo-btn"><Text style={styles.actionLink}>+ Add photo</Text></TouchableOpacity>
            }>
              <View style={styles.portfolioGrid}>
                {(user.portfolio_photos || []).map((p: string, i: number) => (
                  <View key={i} style={styles.portItem}>
                    <Image source={{ uri: p }} style={StyleSheet.absoluteFill} />
                    <TouchableOpacity style={styles.portDelete} onPress={() => removePortfolioPhoto(i)}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {(user.portfolio_photos || []).length === 0 && <Text style={styles.mutedLine}>Add photos to build your portfolio.</Text>}
              </View>
            </Section>

            {/* Socials */}
            {(user.social_instagram || user.social_youtube) ? (
              <Section title="Socials">
                {user.social_instagram ? <Text style={styles.body1}>Instagram: {user.social_instagram}</Text> : null}
                {user.social_youtube ? <Text style={styles.body1}>YouTube: {user.social_youtube}</Text> : null}
              </Section>
            ) : null}
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.secTitle}>Edit Profile</Text>
            {[
              { key: 'name', label: 'Full Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'age', label: 'Age', kb: 'numeric' },
              { key: 'height_cm', label: 'Height (cm)', kb: 'numeric' },
              { key: 'city', label: 'City' },
              { key: 'category', label: 'Category (e.g., miss-teen)' },
              { key: 'bio', label: 'Bio', multiline: true },
              { key: 'achievements', label: 'Achievements', multiline: true },
              { key: 'social_instagram', label: 'Instagram' },
              { key: 'social_youtube', label: 'YouTube' },
            ].map((f: any) => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={[styles.input, f.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
                  value={form[f.key]}
                  onChangeText={(t) => setForm({ ...form, [f.key]: t })}
                  placeholderTextColor={theme.textMuted}
                  keyboardType={f.kb || 'default'}
                  multiline={f.multiline}
                  testID={`edit-${f.key}`}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GoldButton title="Save" onPress={saveProfile} loading={saving} style={{ flex: 1 }} testID="save-profile" />
              <GoldButton title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children, action }: any) {
  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.secTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}
function Detail({ label, val }: any) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailVal}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 220, width: '100%', backgroundColor: '#111' },
  coverTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  coverBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: theme.border },
  coverBtnTxt: { color: theme.white, fontSize: 11, fontWeight: '500' },
  avatarWrap: { alignItems: 'center', marginTop: -60 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: theme.gold, backgroundColor: '#111' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarEdit: { position: 'absolute', bottom: 4, right: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.white, fontSize: 24, fontFamily: 'Georgia', marginTop: 10 },
  meta: { color: theme.textSecondary, fontSize: 12, marginTop: 3 },
  adminBtn: { flexDirection: 'row', gap: 6, marginTop: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  adminBtnTxt: { color: theme.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  body: { padding: 24 },
  editBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, marginTop: 16 },
  editTxt: { color: theme.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  aiCard: { marginTop: 24, borderWidth: 1, borderColor: theme.borderGold, borderRadius: 18, padding: 18, backgroundColor: 'rgba(212,175,55,0.05)' },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTitle: { color: theme.gold, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  aiScoreBig: { color: theme.white, fontSize: 48, fontFamily: 'Georgia', marginTop: 6 },
  aiScoreOf: { color: theme.textMuted, fontSize: 20 },
  aiSub: { color: theme.textSecondary, fontSize: 13, marginTop: 6 },
  aiLine: { color: theme.white, fontSize: 13, lineHeight: 19, marginTop: 4 },
  aiLabel: { color: theme.gold, fontWeight: '700' },
  secTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },
  body1: { color: theme.textSecondary, fontSize: 14, lineHeight: 21 },
  mutedLine: { color: theme.textMuted, fontSize: 13 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detail: { flex: 1, minWidth: '45%', padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)' },
  detailLabel: { color: theme.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
  detailVal: { color: theme.white, fontSize: 16, marginTop: 4, fontFamily: 'Georgia' },
  actionLink: { color: theme.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portItem: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: theme.border },
  portDelete: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  label: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.white, fontSize: 14 },
});
