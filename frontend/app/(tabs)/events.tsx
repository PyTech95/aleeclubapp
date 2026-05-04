import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'miss-teen', label: 'Miss Teen' },
  { id: 'mr-india', label: 'Mr India' },
  { id: 'kids', label: 'Kids' },
  { id: 'mrs', label: 'Mrs' },
];

export default function Events() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState(params.category || '');
  const [city, setCity] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const q: any = {};
    if (category) q.category = category;
    if (city) q.city = city;
    try {
      const { data } = await api.get('/events', { params: q });
      setEvents(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [category, city]));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>DISCOVER</Text>
          <Text style={styles.h1}>Events & Auditions</Text>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              placeholder="Search by city..."
              placeholderTextColor={theme.textMuted}
              value={city}
              onChangeText={setCity}
              style={styles.searchInput}
              testID="city-search"
            />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <TouchableOpacity
                key={c.id || 'all'}
                onPress={() => setCategory(c.id)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`chip-${c.id || 'all'}`}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        {events.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyTxt}>No events match your filters.</Text>
          </View>
        )}
        {events.map((e) => (
          <TouchableOpacity
            key={e.id}
            style={styles.card}
            onPress={() => router.push(`/event/${e.id}`)}
            testID={`list-event-${e.id}`}
          >
            <Image source={{ uri: e.banner_image }} style={styles.cardImg} />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.4)', 'rgba(5,5,5,0.95)']} style={StyleSheet.absoluteFill} />
            <View style={styles.cardContent}>
              <View style={styles.tagRow}>
                <View style={styles.tag}><Text style={styles.tagTxt}>{e.category.toUpperCase()}</Text></View>
                {e.fee === 0 && <View style={styles.tagFree}><Text style={styles.tagTxt}>FREE</Text></View>}
              </View>
              <Text style={styles.cardTitle}>{e.title}</Text>
              <Text style={styles.cardSub} numberOfLines={2}>{e.subtitle || e.description}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.meta}>
                  <Ionicons name="location" size={12} color={theme.gold} />
                  <Text style={styles.metaTxt}>{e.city}</Text>
                </View>
                <View style={styles.meta}>
                  <Ionicons name="calendar" size={12} color={theme.gold} />
                  <Text style={styles.metaTxt}>{e.start_date}</Text>
                </View>
                {e.fee > 0 && (
                  <View style={styles.meta}>
                    <Ionicons name="pricetag" size={12} color={theme.gold} />
                    <Text style={styles.metaTxt}>₹{Math.round(e.fee / 100)}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 12 },
  eyebrow: { color: theme.gold, fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  h1: { color: theme.white, fontSize: 34, fontFamily: 'Georgia', marginTop: 4 },
  searchRow: { paddingHorizontal: 24, marginTop: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, color: theme.white, fontSize: 14 },
  chips: { paddingHorizontal: 24, gap: 8, paddingVertical: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  chipActive: { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  chipTxt: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },
  chipTxtActive: { color: theme.gold, fontWeight: '700' },
  card: { height: 260, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.cardBg, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  cardImg: { position: 'absolute', width: '100%', height: '100%' },
  cardContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.12)' },
  tagFree: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.gold },
  tagTxt: { color: theme.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  cardTitle: { color: theme.white, fontSize: 24, fontFamily: 'Georgia', marginBottom: 4 },
  cardSub: { color: theme.textSecondary, fontSize: 13, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { color: theme.white, fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTxt: { color: theme.textMuted, fontSize: 14 },
});
