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

// Sambita Ma'am — Founder/Motivator (NOT a participant)
const SAMBITA_PHOTO = 'https://customer-assets.emergentagent.com/job_glamour-audition/artifacts/yo98546z_hom-abt.jpg';
const SAMBITA_VIDEO_URL = 'https://www.youtube.com/results?search_query=ramp+guru+sambita+bose+alee+club';
const REALITY_SHOW_URL = 'https://www.youtube.com/results?search_query=alee+club+miss+mr+teen+india+reality+show';

// Star Achievements — Wall of Fame from aleeclub.net
const STAR_ACHIEVEMENTS = [
  { img: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/2661121768210797.jpeg', name: 'Mishty & Raghav', year: 'Miss & Mr Teen India 2025' },
  { img: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/6259601768210547.png', name: 'Fiona Wilfy Vas', year: 'Miss Teen India 2024' },
  { img: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/4611851768210747.png', name: 'Anshul Rawat', year: 'Mr Teen India 2024' },
  { img: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/6405521768210224.jpg', name: 'Mahee Sood', year: 'Miss Teen India 2023' },
  { img: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/8368101768210471.jpg', name: 'Aarab Sharma', year: 'Mr Teen India 2023' },
  { img: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/1601141768210146.jpg', name: 'Rifkah & Dheeren', year: 'Teen India 2022' },
];

const MORE_VIDEOS = [
  { title: 'Pageant Highlights 2025', thumb: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/2661121768210797.jpeg' },
  { title: 'Behind the Crown', thumb: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/6259601768210547.png' },
  { title: 'Walk like a Star', thumb: 'https://www.aleeclub.net/assets/upload-a/alee-events/walloffame/4611851768210747.png' },
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

        {/* Sambita Ma'am — Founder & Motivator */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>FOUNDER · RAMP GURU</Text>
          <Text style={styles.secTitle}>Sambita Bose Ma'am</Text>
          <TouchableOpacity activeOpacity={0.92} style={styles.videoCard} onPress={() => openVideo(SAMBITA_VIDEO_URL)} testID="sambita-video">
            <Image source={{ uri: SAMBITA_PHOTO }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)']} style={StyleSheet.absoluteFill} />
            <View style={styles.playWrap}>
              <View style={styles.playBtn}>
                <Ionicons name="play" size={28} color="#000" />
              </View>
            </View>
            <View style={styles.videoFooter}>
              <View style={styles.founderBadge}>
                <Ionicons name="star" size={10} color={theme.gold} />
                <Text style={styles.founderBadgeTxt}>FOUNDER · OWNER · MOTIVATOR</Text>
              </View>
              <Text style={styles.videoTitle}>Conceptualized by Ramp Guru Sambita Bose</Text>
              <Text style={styles.videoMeta}>Watch the visionary behind Alee Club Miss & Mr Teen India</Text>
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

        {/* Watch Reality Show */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>ON YOUTUBE</Text>
          <Text style={styles.secTitle}>Watch Reality Show</Text>
          <TouchableOpacity activeOpacity={0.92} style={styles.realityCard} onPress={() => openVideo(REALITY_SHOW_URL)} testID="reality-show-btn">
            <LinearGradient colors={['#FF0000', '#CC0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.ytIconWrap}>
              <Ionicons name="logo-youtube" size={40} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.realityTitle}>Miss & Mr Teen India — Reality Show</Text>
              <Text style={styles.realitySub}>Tap to watch on YouTube</Text>
            </View>
            <Ionicons name="open-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Star Achievements */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>HALL OF FAME</Text>
          <Text style={styles.secTitle}>Star Achievements</Text>
          <Text style={styles.starsSub}>Past winners and runners-up of Alee Club Miss & Mr Teen India</Text>
          <View style={styles.starsGrid}>
            {STAR_ACHIEVEMENTS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.starCard} activeOpacity={0.85} onPress={() => openVideo(REALITY_SHOW_URL)}>
                <Image source={{ uri: s.img }} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />
                <View style={styles.starContent}>
                  <Text style={styles.starName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.starYear} numberOfLines={1}>{s.year}</Text>
                </View>
                <View style={styles.starPlay}>
                  <Ionicons name="play" size={10} color="#000" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  founderBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.18)', marginBottom: 6 },
  founderBadgeTxt: { color: theme.gold, fontSize: 8, letterSpacing: 1.5, fontWeight: '800' },
  realityCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, gap: 14, overflow: 'hidden' },
  ytIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  realityTitle: { color: '#fff', fontSize: 16, fontFamily: 'Georgia' },
  realitySub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 },
  starsSub: { color: theme.textSecondary, fontSize: 13, marginBottom: 14, marginTop: -4 },
  starsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  starCard: { width: '47%', aspectRatio: 0.78, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.borderGold },
  starContent: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  starName: { color: theme.white, fontSize: 13, fontFamily: 'Georgia' },
  starYear: { color: theme.gold, fontSize: 9, letterSpacing: 1, marginTop: 2, fontWeight: '700' },
  starPlay: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center' },
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
