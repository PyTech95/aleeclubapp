import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Linking, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme';
import { logoB64 } from '../../src/logoImage';
import GoldButton from '../../src/components/GoldButton';

// Sambita featured highlight (using uploaded artifact as her photo)
const SAMBITA_PHOTO = 'https://customer-assets.emergentagent.com/job_glamour-audition/artifacts/yo98546z_hom-abt.jpg';
const SAMBITA_VIDEO_URL = 'https://www.youtube.com/results?search_query=alee+club+sambita';

const MORE_VIDEOS = [
  { title: 'Pageant Highlights 2025', thumb: 'https://images.unsplash.com/photo-1515364229803-3eb8c44ff147?w=600' },
  { title: 'Behind the Crown', thumb: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=600' },
  { title: 'Walk like a Star', thumb: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600' },
];

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [myApp, setMyApp] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const load = async () => {
    try {
      const [{ data: events }, { data: apps }] = await Promise.all([
        api.get('/events'),
        api.get('/applications/mine').catch(() => ({ data: [] })),
      ]);
      setEvent(events[0] || null);
      const real = (apps || []).find((a: any) => !a.is_draft && a.event_id === events[0]?.id);
      setMyApp(real || null);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const openVideo = (url: string) => {
    if (Platform.OS === 'web') {
      // open in new tab
      try { (globalThis as any).window.open(url, '_blank'); } catch {}
    } else Linking.openURL(url);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Image source={{ uri: logoB64 }} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity onPress={async () => { await logout(); router.replace('/'); }} style={styles.iconBtn} testID="header-logout">
            <Ionicons name="log-out-outline" size={18} color={theme.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.gold} />}
      >
        <Text style={styles.greeting}>{user ? `Welcome, ${user.name?.split(' ')[0] || 'Star'}` : 'Welcome'}</Text>
        <Text style={styles.subGreeting}>Your stage awaits.</Text>

        {/* Sambita feature video */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>FEATURED · WINNER STORY</Text>
          <Text style={styles.secTitle}>Sambita's Journey</Text>
          <TouchableOpacity activeOpacity={0.92} style={styles.videoCard} onPress={() => openVideo(SAMBITA_VIDEO_URL)} testID="sambita-video">
            <Image source={{ uri: SAMBITA_PHOTO }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
            <View style={styles.playWrap}>
              <View style={styles.playBtn}>
                <Ionicons name="play" size={28} color="#000" />
              </View>
            </View>
            <View style={styles.videoFooter}>
              <Text style={styles.videoTitle}>Crowning Moment — Miss Teen India</Text>
              <Text style={styles.videoMeta}>Watch how Sambita rose to the spotlight</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn} onPress={() => setMoreOpen(true)} testID="more-videos-btn">
            <Ionicons name="play-circle-outline" size={16} color={theme.gold} />
            <Text style={styles.moreBtnTxt}>More Videos</Text>
          </TouchableOpacity>
        </View>

        {/* 1 Event */}
        {event && (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>HAPPENING NOW</Text>
            <View style={styles.eventCard}>
              <Image source={{ uri: event.banner_image }} style={styles.eventImg} />
              <LinearGradient colors={['transparent', 'rgba(5,5,5,0.4)', 'rgba(5,5,5,0.95)']} style={StyleSheet.absoluteFill} />
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventSub}>{event.subtitle}</Text>
                <View style={styles.eventMetaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="location" size={11} color={theme.gold} />
                    <Text style={styles.metaTxt}>{event.city}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar" size={11} color={theme.gold} />
                    <Text style={styles.metaTxt}>{event.start_date}</Text>
                  </View>
                </View>
                {event.early_bird_fee > 0 && event.early_bird_deadline && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceOld}>₹{Math.round(event.fee / 100)}</Text>
                    <Text style={styles.priceNew}>₹{Math.round(event.early_bird_fee / 100)}</Text>
                    <Text style={styles.priceTag}>EARLY BIRD</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Register / Track buttons */}
        <View style={styles.ctaSection}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <GoldButton
                title={myApp ? 'Re-Register' : 'Register'}
                onPress={() => event && router.push(`/apply/${event.id}`)}
                disabled={!event}
                testID="register-btn"
              />
            </View>
            <View style={{ flex: 1 }}>
              <GoldButton
                title="Track Journey"
                variant="secondary"
                onPress={() => myApp ? router.push(`/track/${myApp.id}`) : router.push('/auth/login')}
                disabled={!myApp}
                testID="track-btn"
              />
            </View>
          </View>
          {!myApp && (
            <Text style={styles.hint}>Register first to unlock Track Journey.</Text>
          )}
        </View>
      </ScrollView>

      {/* More Videos modal */}
      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>More Videos</Text>
              <TouchableOpacity onPress={() => setMoreOpen(false)}><Ionicons name="close" size={22} color={theme.white} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {MORE_VIDEOS.map((v, i) => (
                <TouchableOpacity key={i} style={styles.vidRow} onPress={() => openVideo(SAMBITA_VIDEO_URL)}>
                  <Image source={{ uri: v.thumb }} style={styles.vidThumb} />
                  <View style={styles.vidPlay}><Ionicons name="play" size={14} color="#000" /></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.vidTitle}>{v.title}</Text>
                    <Text style={styles.vidMeta}>Tap to watch</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 },
  logo: { width: 110, height: 50 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  greeting: { color: theme.white, fontSize: 28, fontFamily: 'Georgia', paddingHorizontal: 24, marginTop: 18 },
  subGreeting: { color: theme.textSecondary, fontSize: 13, paddingHorizontal: 24, marginTop: 4 },
  section: { paddingHorizontal: 24, marginTop: 28 },
  eyebrow: { color: theme.gold, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  secTitle: { color: theme.white, fontSize: 24, fontFamily: 'Georgia', marginBottom: 12 },
  videoCard: { height: 240, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.borderGold },
  playWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center', shadowColor: theme.gold, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  videoFooter: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  videoTitle: { color: theme.white, fontSize: 16, fontFamily: 'Georgia' },
  videoMeta: { color: theme.gold, fontSize: 11, marginTop: 3, letterSpacing: 1 },
  moreBtn: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, marginTop: 14 },
  moreBtnTxt: { color: theme.gold, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  eventCard: { height: 280, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border },
  eventImg: { position: 'absolute', width: '100%', height: '100%' },
  eventContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20 },
  eventTitle: { color: theme.white, fontSize: 26, fontFamily: 'Georgia' },
  eventSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  eventMetaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  metaTxt: { color: theme.white, fontSize: 11, fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  priceOld: { color: theme.textMuted, fontSize: 14, textDecorationLine: 'line-through' },
  priceNew: { color: theme.gold, fontSize: 22, fontFamily: 'Georgia' },
  priceTag: { color: theme.gold, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', borderWidth: 1, borderColor: theme.borderGold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  ctaSection: { paddingHorizontal: 24, marginTop: 28 },
  hint: { color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', borderTopWidth: 1, borderColor: theme.border },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomColor: theme.border, borderBottomWidth: 1 },
  modalTitle: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },
  vidRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 14, marginBottom: 10, padding: 8, borderWidth: 1, borderColor: theme.border },
  vidThumb: { width: 100, height: 70, borderRadius: 10, backgroundColor: '#111' },
  vidPlay: { position: 'absolute', left: 8, top: 8, width: 100, height: 70, alignItems: 'center', justifyContent: 'center' },
  vidTitle: { color: theme.white, fontSize: 14, fontFamily: 'Georgia' },
  vidMeta: { color: theme.gold, fontSize: 11, marginTop: 4, letterSpacing: 1 },
});
