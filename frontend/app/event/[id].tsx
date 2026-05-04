import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import GoldButton from '../../src/components/GoldButton';
import { useAuth } from '../../src/context/AuthContext';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    api.get(`/events/${id}`).then((r) => setEvent(r.data)).catch(() => setEvent(null));
  }, [id]);

  if (!event) return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.gold} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.hero}>
          <Image source={{ uri: event.banner_image }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(5,5,5,0.2)', 'rgba(5,5,5,0.7)', '#050505']} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.white} />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>{event.category.toUpperCase()}</Text>
            <Text style={styles.title}>{event.title}</Text>
            {event.subtitle ? <Text style={styles.subtitle}>{event.subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <MetaCard icon="location" label="Venue" value={`${event.venue}\n${event.city}`} />
            <MetaCard icon="calendar" label="Dates" value={`${event.start_date}\n→ ${event.end_date}`} />
          </View>
          <View style={styles.metaRow}>
            <MetaCard icon="time" label="Apply by" value={event.application_deadline} />
            <MetaCard icon="pricetag" label="Entry Fee" value={event.fee > 0 ? `₹${Math.round(event.fee / 100)}` : 'Free'} />
          </View>

          <Section title="About the Event">
            <Text style={styles.body1}>{event.description}</Text>
          </Section>

          <Section title="Eligibility">
            <Text style={styles.body1}>{event.eligibility || `Age ${event.min_age}–${event.max_age} · Gender: ${event.gender}`}</Text>
          </Section>

          {event.prizes ? (
            <Section title="Prizes">
              <Text style={styles.body1}>{event.prizes}</Text>
            </Section>
          ) : null}

          <View style={{ marginTop: 28 }}>
            {user ? (
              <GoldButton
                title={event.status === 'open' ? 'Apply Now' : 'Applications Closed'}
                onPress={() => router.push(`/apply/${event.id}`)}
                disabled={event.status !== 'open'}
                testID="apply-btn"
              />
            ) : (
              <GoldButton title="Sign in to Apply" onPress={() => router.push('/auth/login')} />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={styles.secTitle}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function MetaCard({ icon, label, value }: any) {
  return (
    <View style={styles.metaCard}>
      <Ionicons name={icon} size={16} color={theme.gold} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 440 },
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroContent: { position: 'absolute', left: 24, right: 24, bottom: 20 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  title: { color: theme.white, fontSize: 36, lineHeight: 40, fontFamily: 'Georgia', marginTop: 6 },
  subtitle: { color: theme.textSecondary, fontSize: 14, marginTop: 6 },
  body: { padding: 24 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  metaCard: { flex: 1, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', gap: 4 },
  metaLabel: { color: theme.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', marginTop: 4 },
  metaVal: { color: theme.white, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  secTitle: { color: theme.white, fontSize: 22, fontFamily: 'Georgia' },
  body1: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
  ebCard: { marginTop: 14, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  ebExpired: { borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  ebHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ebLabel: { color: theme.gold, fontSize: 10, letterSpacing: 2.5, fontWeight: '700' },
  ebRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ebOld: { color: theme.textMuted, fontSize: 15, textDecorationLine: 'line-through' },
  ebNew: { color: theme.gold, fontSize: 34, fontFamily: 'Georgia', lineHeight: 38, marginTop: 2 },
  ebRight: { alignItems: 'flex-end' },
  ebCountdown: { color: theme.white, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  ebDeadline: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
  ebSave: { color: theme.gold, fontSize: 12, fontWeight: '600', marginTop: 6 },
});
