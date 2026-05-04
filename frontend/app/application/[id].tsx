import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import StatusTimeline from '../../src/components/StatusTimeline';
import GoldButton from '../../src/components/GoldButton';

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appd, setAppd] = useState<any>(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/applications/${id}`);
      setAppd(data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, [id]));

  if (!appd) return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.gold} />
    </View>
  );

  const canPay = appd.fee > 0 && appd.payment_status !== 'paid';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>LIVE TRACKING</Text>
            <Text style={styles.h1} numberOfLines={1}>{appd.event_title}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusCard}>
          <LinearGradient
            colors={['rgba(212,175,55,0.12)', 'rgba(212,175,55,0.02)']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.statusEyebrow}>CURRENT STATUS</Text>
          <Text style={styles.statusBig}>{String(appd.status).replace('_', ' ').toUpperCase()}</Text>
          {appd.feedback ? <Text style={styles.feedback}>{appd.feedback}</Text> : null}
        </View>

        {canPay && (
          <View style={styles.payBanner}>
            <Ionicons name="alert-circle" size={18} color={theme.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Complete payment to confirm</Text>
              <Text style={styles.paySub}>Fee ₹{Math.round(appd.fee / 100)}</Text>
            </View>
            <GoldButton small title="Pay Now" onPress={() => router.push(`/payment/${appd.id}`)} testID="pay-btn" />
          </View>
        )}

        <View style={{ marginTop: 24, marginHorizontal: 20 }}>
          <Text style={styles.secTitle}>Journey Timeline</Text>
          <View style={{ marginTop: 10 }}>
            <StatusTimeline status={appd.status} timeline={appd.timeline} />
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.secTitle}>Application Details</Text>
          <Row label="Full Name" val={appd.full_name} />
          <Row label="Age / City" val={`${appd.age} · ${appd.city}`} />
          <Row label="Phone" val={appd.phone} />
          {appd.bio ? <Row label="Bio" val={appd.bio} /> : null}
          <Row label="Payment" val={appd.payment_status.toUpperCase()} />
        </View>

        {appd.photos?.length > 0 && (
          <View style={{ marginTop: 24, marginHorizontal: 20 }}>
            <Text style={styles.secTitle}>Uploaded Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 12 }}>
              {appd.photos.map((p: string, i: number) => (
                <Image key={i} source={{ uri: p }} style={styles.photo} />
              ))}
            </ScrollView>
          </View>
        )}

        {(appd.status === 'selected' || appd.status === 'shortlisted') && (
          <View style={{ marginHorizontal: 20, marginTop: 28 }}>
            <GoldButton title="View Certificate" onPress={() => router.push(`/certificate/${appd.id}`)} testID="view-cert" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, val }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowVal}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 22, fontFamily: 'Georgia', marginTop: 2 },
  scroll: { paddingBottom: 60 },
  statusCard: { marginHorizontal: 20, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.borderGold, overflow: 'hidden' },
  statusEyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  statusBig: { color: theme.white, fontSize: 30, fontFamily: 'Georgia', marginTop: 6 },
  feedback: { color: theme.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 19 },
  payBanner: { flexDirection: 'row', gap: 10, alignItems: 'center', margin: 20, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  payTitle: { color: theme.white, fontSize: 14, fontWeight: '600' },
  paySub: { color: theme.textSecondary, fontSize: 12 },
  secTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },
  detailsCard: { marginHorizontal: 20, marginTop: 24, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 16, backgroundColor: theme.cardBg },
  row: { flexDirection: 'row', marginTop: 12 },
  rowLabel: { color: theme.textMuted, fontSize: 11, letterSpacing: 1.5, fontWeight: '600', width: 100, textTransform: 'uppercase' },
  rowVal: { color: theme.white, fontSize: 13, flex: 1 },
  photo: { width: 120, height: 160, borderRadius: 12, backgroundColor: '#111' },
});
