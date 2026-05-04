import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

const STEPS = ['Personal', 'About You', 'Portfolio', 'Review'];

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<any>({
    full_name: '',
    age: '',
    gender: '',
    city: '',
    phone: '',
    height_cm: '',
    bio: '',
    achievements: '',
    photos: [] as string[],
    id_document: '',
  });

  useEffect(() => {
    api.get(`/events/${id}`).then((r) => setEvent(r.data));
  }, [id]);

  useEffect(() => {
    if (user) setForm((f: any) => ({
      ...f,
      full_name: f.full_name || user.name,
      phone: f.phone || user.phone || '',
      city: f.city || user.city || '',
      age: f.age || (user.age ? String(user.age) : ''),
      height_cm: f.height_cm || (user.height_cm ? String(user.height_cm) : ''),
      bio: f.bio || user.bio || '',
      achievements: f.achievements || user.achievements || '',
    }));
  }, [user]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true });
    if (!res.canceled && res.assets[0]) {
      setForm({ ...form, photos: [...form.photos, `data:image/jpeg;base64,${res.assets[0].base64}`] });
    }
  };
  const pickId = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true });
    if (!res.canceled && res.assets[0]) {
      setForm({ ...form, id_document: `data:image/jpeg;base64,${res.assets[0].base64}` });
    }
  };

  const next = () => {
    if (step === 0) {
      if (!form.full_name || !form.age || !form.phone || !form.city) { Alert.alert('Fill all personal details'); return; }
    }
    if (step === 1) {
      if (!form.bio) { Alert.alert('Add a short bio'); return; }
    }
    if (step === 2) {
      if (form.photos.length === 0) { Alert.alert('Upload at least 1 portfolio photo'); return; }
    }
    setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const submit = async (asDraft = false) => {
    setLoading(true);
    try {
      const payload = {
        event_id: id,
        full_name: form.full_name,
        age: parseInt(form.age) || 0,
        gender: form.gender || 'any',
        city: form.city,
        phone: form.phone,
        height_cm: form.height_cm ? parseInt(form.height_cm) : undefined,
        bio: form.bio,
        achievements: form.achievements,
        photos: form.photos,
        videos: [],
        id_document: form.id_document || undefined,
        is_draft: asDraft,
      };
      const { data } = await api.post('/applications', payload);
      if (asDraft) {
        Alert.alert('Draft saved', 'You can complete later.');
        router.replace('/(tabs)/dashboard');
      } else if (event?.fee > 0 && data.payment_status !== 'paid') {
        router.replace(`/payment/${data.id}`);
      } else {
        router.replace(`/application/${data.id}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Submission failed');
    } finally { setLoading(false); }
  };

  if (!event) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>STEP {step + 1} OF {STEPS.length}</Text>
            <Text style={styles.title}>{STEPS[step]}</Text>
          </View>
        </View>
        <View style={styles.progress}>
          {STEPS.map((_, i) => <View key={i} style={[styles.progSeg, i <= step && styles.progSegDone]} />)}
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Field label="Full Name" val={form.full_name} onChange={(t: string) => setForm({ ...form, full_name: t })} testID="f-name" />
              <Field label="Age" val={form.age} onChange={(t: string) => setForm({ ...form, age: t })} kb="numeric" testID="f-age" />
              <Field label="Gender (male/female/other)" val={form.gender} onChange={(t: string) => setForm({ ...form, gender: t })} testID="f-gender" />
              <Field label="Phone" val={form.phone} onChange={(t: string) => setForm({ ...form, phone: t })} kb="phone-pad" testID="f-phone" />
              <Field label="City" val={form.city} onChange={(t: string) => setForm({ ...form, city: t })} testID="f-city" />
              <Field label="Height (cm) — optional" val={form.height_cm} onChange={(t: string) => setForm({ ...form, height_cm: t })} kb="numeric" testID="f-height" />
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Bio (2–3 lines)" val={form.bio} onChange={(t: string) => setForm({ ...form, bio: t })} multiline testID="f-bio" />
              <Field label="Achievements" val={form.achievements} onChange={(t: string) => setForm({ ...form, achievements: t })} multiline testID="f-ach" />
            </>
          )}
          {step === 2 && (
            <>
              <Text style={styles.sectionTitle}>Portfolio Photos</Text>
              <Text style={styles.sectionSub}>Upload 1–6 photos that best represent you.</Text>
              <View style={styles.grid}>
                {form.photos.map((p: string, i: number) => (
                  <View key={i} style={styles.photo}>
                    <Image source={{ uri: p }} style={StyleSheet.absoluteFill} />
                    <TouchableOpacity style={styles.rm} onPress={() => setForm({ ...form, photos: form.photos.filter((_: any, j: number) => j !== i) })}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {form.photos.length < 6 && (
                  <TouchableOpacity style={[styles.photo, styles.photoAdd]} onPress={pickPhoto} testID="add-photo">
                    <Ionicons name="add" size={24} color={theme.gold} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ID Document (optional)</Text>
              <Text style={styles.sectionSub}>Aadhar/Passport/ID for verification.</Text>
              <TouchableOpacity style={styles.idBox} onPress={pickId} testID="add-id">
                {form.id_document ? (
                  <Image source={{ uri: form.id_document }} style={styles.idImg} />
                ) : (
                  <>
                    <Ionicons name="document-attach" size={28} color={theme.gold} />
                    <Text style={styles.idTxt}>Tap to upload ID</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          {step === 3 && (
            <>
              <Text style={styles.sectionTitle}>Review & Submit</Text>
              <View style={styles.reviewCard}>
                <ReviewRow label="Event" val={event.title} />
                <ReviewRow label="Name" val={form.full_name} />
                <ReviewRow label="Age / City" val={`${form.age} · ${form.city}`} />
                <ReviewRow label="Phone" val={form.phone} />
                <ReviewRow label="Bio" val={form.bio} />
                <ReviewRow label="Photos" val={`${form.photos.length} uploaded`} />
                {event.fee > 0 && <ReviewRow label="Fee" val={`₹${Math.round(event.fee / 100)}`} />}
              </View>
              <Text style={styles.legal}>
                By submitting, you agree to Alee Club Terms & Privacy. You'll be notified at each stage of your journey.
              </Text>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <GoldButton title="Back" variant="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
            )}
            {step < STEPS.length - 1 ? (
              <GoldButton title="Continue" onPress={next} style={{ flex: 1 }} testID="next-btn" />
            ) : (
              <GoldButton title={event.fee > 0 ? 'Submit & Pay' : 'Submit Application'} onPress={() => submit(false)} loading={loading} style={{ flex: 1 }} testID="submit-btn" />
            )}
          </View>
          {step < STEPS.length - 1 && (
            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 14 }} onPress={() => submit(true)}>
              <Text style={styles.draftLink}>Save as draft</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, val, onChange, kb, multiline, testID }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={val}
        onChangeText={onChange}
        keyboardType={kb || 'default'}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
        placeholderTextColor={theme.textMuted}
        testID={testID}
      />
    </View>
  );
}
function ReviewRow({ label, val }: any) {
  return (
    <View style={styles.rvRow}>
      <Text style={styles.rvLabel}>{label}</Text>
      <Text style={styles.rvVal}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  title: { color: theme.white, fontSize: 24, fontFamily: 'Georgia', marginTop: 2 },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, marginTop: 14 },
  progSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  progSegDone: { backgroundColor: theme.gold },
  scroll: { padding: 24, paddingBottom: 60 },
  label: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, color: theme.white, fontSize: 14 },
  sectionTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },
  sectionSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: theme.border },
  photoAdd: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderColor: theme.borderGold },
  rm: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  idBox: { height: 110, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.04)', overflow: 'hidden' },
  idImg: { width: '100%', height: '100%' },
  idTxt: { color: theme.gold, fontSize: 12, marginTop: 6, letterSpacing: 1 },
  reviewCard: { borderWidth: 1, borderColor: theme.borderGold, borderRadius: 16, padding: 16, backgroundColor: 'rgba(212,175,55,0.04)', marginTop: 10 },
  rvRow: { flexDirection: 'row', marginBottom: 10 },
  rvLabel: { color: theme.textMuted, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', width: 80, textTransform: 'uppercase' },
  rvVal: { color: theme.white, fontSize: 13, flex: 1 },
  legal: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  draftLink: { color: theme.gold, fontSize: 12, letterSpacing: 1 },
});
