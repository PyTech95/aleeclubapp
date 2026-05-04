import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform, Linking, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';

const FULL_REG_URL = 'https://www.aleeclub.net/miss-mr-teen-india-form.php';

export default function TrackJourney() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appd, setAppd] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [iframeOpen, setIframeOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/applications/${id}`);
      setAppd(data);
      if (data.event_id) {
        const ev = await api.get(`/events/${data.event_id}`);
        setEvent(ev.data);
      }
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, [id]));

  const openFullForm = () => {
    if (Platform.OS === 'web') setIframeOpen(true);
    else Linking.openURL(FULL_REG_URL);
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/phone/start', { phone: appd.phone });
      setOtpHint(`Test OTP: ${data.test_code || '123456'}`);
      setOtpSent(true);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/phone/verify', { phone: appd.phone, code: otp });
      setOtpVerified(true);
      setOtpOpen(false);
      Alert.alert('Verified ✓', 'Phone number verified successfully.');
    } catch (e: any) {
      Alert.alert('Invalid OTP', e?.response?.data?.detail || 'Use 123456 for test mode.');
    } finally { setLoading(false); }
  };

  if (!appd) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const regNum = `ALEE-${String(appd.id).slice(0, 8).toUpperCase()}`;
  const entryCode = `EC-${String(appd.id).slice(-6).toUpperCase()}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
            <Text style={styles.h1}>Track Progress</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Step 1 — Registration done */}
        <Step
          icon="checkmark-circle"
          done
          title="Registration Done"
          sub={`for ${appd.full_name}`}
        >
          <View style={styles.regCard}>
            <Text style={styles.regLabel}>REGISTRATION NUMBER</Text>
            <Text style={styles.regNum}>{regNum}</Text>
          </View>
        </Step>

        <Arrow done />

        {/* Step 2 — Entry code */}
        <Step
          icon="qr-code"
          done
          title="Your Entry Code"
          sub="Show this at the venue"
        >
          <View style={styles.entryBox}>
            <LinearGradient colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.entryLabel}>ENTRY CODE</Text>
            <Text style={styles.entryCode}>{entryCode}</Text>
          </View>
        </Step>

        <Arrow done />

        {/* Step 3 — Oration / Event details */}
        <Step
          icon="calendar"
          done
          title="Audition Details"
          sub="Save the date and venue"
        >
          {event && (
            <View style={styles.detailCard}>
              <DetailRow icon="location" label="City" value={event.city} />
              <DetailRow icon="business" label="Venue" value={event.venue} />
              <DetailRow icon="calendar" label="Date" value={event.start_date} />
              <DetailRow icon="time" label="Reporting Time" value="10:00 AM IST" />
            </View>
          )}
        </Step>

        <Arrow active />

        {/* Step 4 — Mark presence (full form) */}
        <Step
          icon="document-text"
          active
          title="Mark Your Presence"
          sub="Complete the full registration form"
        >
          <GoldButton
            title="Complete Full Form"
            onPress={openFullForm}
            small
            style={{ marginTop: 6, alignSelf: 'flex-start' }}
            testID="open-full-form"
          />
          <Text style={styles.tinyNote}>Opens aleeclub.net registration form in popup.</Text>
        </Step>

        <Arrow />

        {/* Step 5 — Phone verification */}
        <Step
          icon="phone-portrait"
          done={otpVerified}
          title="Verify Phone Number"
          sub={otpVerified ? `${appd.phone} verified ✓` : `Verify ${appd.phone}`}
        >
          {!otpVerified ? (
            <GoldButton
              title="Verify with OTP"
              onPress={() => { setOtpOpen(true); sendOtp(); }}
              small
              variant="secondary"
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
              testID="open-otp"
            />
          ) : (
            <View style={styles.verifiedPill}>
              <Ionicons name="shield-checkmark" size={14} color={theme.success} />
              <Text style={styles.verifiedTxt}>Phone Verified</Text>
            </View>
          )}
        </Step>
      </ScrollView>

      {/* Full form modal (web iframe / native browser) */}
      <Modal visible={iframeOpen} animationType="slide" onRequestClose={() => setIframeOpen(false)}>
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <SafeAreaView edges={['top']}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Complete Registration</Text>
              <TouchableOpacity onPress={() => setIframeOpen(false)} testID="close-iframe">
                <Ionicons name="close" size={26} color={theme.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          {Platform.OS === 'web' ? (
            // @ts-ignore
            <iframe
              src={FULL_REG_URL}
              style={{ flex: 1, border: 0, width: '100%', height: '100%' }}
              title="aleeclub-form"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>Tap below to open the form in your browser.</Text>
              <GoldButton title="Open in Browser" onPress={() => Linking.openURL(FULL_REG_URL)} />
            </View>
          )}
        </View>
      </Modal>

      {/* OTP modal */}
      <Modal visible={otpOpen} transparent animationType="fade" onRequestClose={() => setOtpOpen(false)}>
        <View style={styles.otpWrap}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>Verify your phone</Text>
            <Text style={styles.otpSub}>{appd.phone}</Text>
            <Text style={styles.label}>Enter 6-digit OTP</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={theme.textMuted}
              style={styles.otpInput}
              testID="otp-input-track"
            />
            {otpHint ? <Text style={styles.otpHint}>{otpHint}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <GoldButton title="Cancel" variant="secondary" onPress={() => setOtpOpen(false)} style={{ flex: 1 }} small />
              <GoldButton title="Verify" onPress={verifyOtp} loading={loading} style={{ flex: 1 }} small testID="verify-otp-track" />
            </View>
            {!otpSent && (
              <TouchableOpacity onPress={sendOtp} style={{ marginTop: 12, alignSelf: 'center' }}>
                <Text style={styles.resend}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Step({ icon, done, active, title, sub, children }: any) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
        {done ? <Ionicons name="checkmark" size={16} color="#000" /> : <Ionicons name={icon} size={14} color={active ? theme.gold : theme.textMuted} />}
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepTitle, !done && !active && { color: theme.textSecondary }]}>{title}</Text>
        <Text style={styles.stepSub}>{sub}</Text>
        {children}
      </View>
    </View>
  );
}

function Arrow({ done, active }: any) {
  return (
    <View style={styles.arrowWrap}>
      <Ionicons name="arrow-down" size={20} color={done ? theme.gold : active ? theme.gold : theme.textMuted} />
    </View>
  );
}

function DetailRow({ icon, label, value }: any) {
  return (
    <View style={styles.detRow}>
      <View style={styles.detIcon}><Ionicons name={icon} size={12} color={theme.gold} /></View>
      <Text style={styles.detLabel}>{label}</Text>
      <Text style={styles.detVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 26, fontFamily: 'Georgia', marginTop: 2 },

  stepRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 14 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: theme.gold, borderColor: theme.gold },
  stepDotActive: { borderColor: theme.gold, borderWidth: 2 },
  stepBody: { flex: 1, gap: 6 },
  stepTitle: { color: theme.white, fontSize: 17, fontFamily: 'Georgia' },
  stepSub: { color: theme.textSecondary, fontSize: 12, marginBottom: 8 },
  arrowWrap: { alignItems: 'center', marginVertical: 6, marginLeft: 24 - 16, width: 32 },

  regCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.06)' },
  regLabel: { color: theme.gold, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  regNum: { color: theme.white, fontSize: 22, fontFamily: 'Georgia', letterSpacing: 2, marginTop: 4 },

  entryBox: { padding: 18, borderRadius: 16, borderWidth: 2, borderColor: theme.gold, alignItems: 'center', overflow: 'hidden', marginVertical: 6 },
  entryLabel: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  entryCode: { color: theme.white, fontSize: 32, fontFamily: 'Georgia', letterSpacing: 4, marginTop: 4 },

  detailCard: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg },
  detRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  detIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(212,175,55,0.12)', alignItems: 'center', justifyContent: 'center' },
  detLabel: { color: theme.textMuted, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', width: 90, textTransform: 'uppercase' },
  detVal: { color: theme.white, fontSize: 13, flex: 1 },

  tinyNote: { color: theme.textMuted, fontSize: 11, marginTop: 8 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.success, backgroundColor: `${theme.success}10` },
  verifiedTxt: { color: theme.success, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },

  otpWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  otpModal: { backgroundColor: theme.bg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: theme.borderGold },
  otpTitle: { color: theme.white, fontSize: 24, fontFamily: 'Georgia' },
  otpSub: { color: theme.gold, fontSize: 13, letterSpacing: 1, marginTop: 4, marginBottom: 20 },
  label: { color: theme.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  otpInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, color: theme.white, fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  otpHint: { color: theme.gold, fontSize: 12, marginTop: 8, textAlign: 'center', letterSpacing: 1 },
  resend: { color: theme.gold, fontSize: 13, letterSpacing: 1, fontWeight: '600' },
});
