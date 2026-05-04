import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const hero = events[0];
  const rest = events.slice(1);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        {hero ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/event/${hero.id}`)} testID="hero-event">
            <View style={styles.hero}>
              <Image source={{ uri: hero.banner_image }} style={styles.heroImg} />
              <LinearGradient
                colors={['transparent', 'rgba(5,5,5,0.4)', '#050505']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <SafeAreaView style={styles.heroContent} edges={['top']}>
                <View style={styles.headerRow}>
                  <Text style={styles.brand}>ALEE CLUB</Text>
                  <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(tabs)/dashboard')} testID="bell-btn">
                    <Ionicons name="notifications-outline" size={20} color={theme.white} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.heroEyebrow}>FEATURED · {hero.category.toUpperCase()}</Text>
                <Text style={styles.heroTitle}>{hero.title}</Text>
                <Text style={styles.heroSub}>{hero.subtitle}</Text>
                <View style={styles.heroMeta}>
                  <View style={styles.metaPill}>
                    <Ionicons name="location" size={12} color={theme.gold} />
                    <Text style={styles.metaTxt}>{hero.city}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar" size={12} color={theme.gold} />
                    <Text style={styles.metaTxt}>{hero.start_date}</Text>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </TouchableOpacity>
        ) : (
          <SafeAreaView edges={['top']}><View style={{ height: 80 }} /></SafeAreaView>
        )}

        <View style={styles.section}>
          <Text style={styles.greeting}>
            {user ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome'}
          </Text>
          <Text style={styles.subGreeting}>Curated pageants & auditions for you.</Text>
        </View>

        {/* Categories */}
        <View style={styles.catsRow}>
          {[
            { id: 'miss-teen', label: 'Miss Teen', icon: 'star' },
            { id: 'mr-india', label: 'Mr India', icon: 'ribbon' },
            { id: 'kids', label: 'Kids', icon: 'happy' },
            { id: 'mrs', label: 'Mrs', icon: 'flower' },
          ].map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.catBtn}
              onPress={() => router.push({ pathname: '/(tabs)/events', params: { category: c.id } })}
              testID={`cat-${c.id}`}
            >
              <View style={styles.catIcon}>
                <Ionicons name={c.icon as any} size={20} color={theme.gold} />
              </View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rest of events */}
        <View style={styles.section}>
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Upcoming Shows</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.secAction}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {rest.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.card}
                onPress={() => router.push(`/event/${e.id}`)}
                testID={`event-card-${e.id}`}
              >
                <Image source={{ uri: e.banner_image }} style={styles.cardImg} />
                <LinearGradient colors={['transparent', 'rgba(5,5,5,0.95)']} style={styles.cardGrad} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardCat}>{e.category.toUpperCase()}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{e.title}</Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="location" size={11} color={theme.gold} />
                    <Text style={styles.cardMetaTxt}>{e.city}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Winners showcase */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Hall of Fame</Text>
          <Text style={styles.secSub}>Stars who began their journey with us</Text>
          <View style={styles.hallRow}>
            {[
              'https://customer-assets.emergentagent.com/job_glamour-audition/artifacts/yo98546z_hom-abt.jpg',
              'https://images.unsplash.com/photo-1575354196644-9de51010f481?w=400',
              'https://images.unsplash.com/photo-1673830719127-db64dcf68c4f?w=400',
            ].map((u, i) => (
              <View key={i} style={styles.hallCard}>
                <Image source={{ uri: u }} style={styles.hallImg} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.hallTxt}>Winner{'\n'}2025</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 560, width: '100%', backgroundColor: '#111' },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroContent: { flex: 1, paddingHorizontal: 24, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  brand: { color: theme.gold, fontSize: 13, letterSpacing: 6, fontWeight: '700' },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 8 },
  heroTitle: { color: theme.white, fontSize: 40, lineHeight: 42, fontFamily: 'Georgia', fontWeight: '400' },
  heroSub: { color: theme.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 16 },
  heroMeta: { flexDirection: 'row', gap: 8 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  metaTxt: { color: theme.white, fontSize: 11, fontWeight: '500' },
  section: { paddingHorizontal: 24, marginTop: 28 },
  greeting: { color: theme.white, fontSize: 28, fontFamily: 'Georgia' },
  subGreeting: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  catsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 24 },
  catBtn: { alignItems: 'center', gap: 8, flex: 1 },
  catIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.08)', borderWidth: 1, borderColor: theme.borderGold, alignItems: 'center', justifyContent: 'center' },
  catLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '500' },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  secTitle: { color: theme.white, fontSize: 24, fontFamily: 'Georgia' },
  secSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 12 },
  secAction: { color: theme.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  card: { width: width * 0.7, height: 360, borderRadius: 20, overflow: 'hidden', marginRight: 14, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border },
  cardImg: { width: '100%', height: '100%', position: 'absolute' },
  cardGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  cardContent: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  cardCat: { color: theme.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  cardTitle: { color: theme.white, fontSize: 22, fontFamily: 'Georgia', lineHeight: 26 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' },
  cardMetaTxt: { color: theme.textSecondary, fontSize: 12 },
  hallRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  hallCard: { flex: 1, aspectRatio: 0.75, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.borderGold },
  hallImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  hallTxt: { position: 'absolute', bottom: 10, left: 10, color: theme.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
