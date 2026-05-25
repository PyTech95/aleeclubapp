import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/api';
import { theme } from '../../../src/theme';

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await api.get(`/admin/users/${id}`);
        setData(d);
      } catch {
        // noop
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.gold} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: theme.textMuted }}>User not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: theme.gold }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const u = data.user;
  const apps = data.applications || [];
  const pays = data.payments || [];
  const certs = data.certificates || [];

  const callPhone = () => { if (u.phone) Linking.openURL(`tel:${u.phone}`); };
  const sendEmail = () => { if (u.email) Linking.openURL(`mailto:${u.email}`); };
  const whatsApp = () => { if (u.phone) Linking.openURL(`https://wa.me/${(u.phone || '').replace(/[^0-9]/g, '')}`); };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.h1}>Student Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <LinearGradient colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.02)']} style={StyleSheet.absoluteFill} />
          {u.profile_photo ? (
            <Image source={{ uri: u.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: 'rgba(212,175,55,0.15)', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={42} color={theme.gold} />
            </View>
          )}
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{u.name || 'Unnamed'}</Text>
            {u.verified ? <Ionicons name="checkmark-circle" size={18} color={theme.success} /> : null}
          </View>
          <View style={[styles.rolePill, u.role === 'admin' && { borderColor: theme.gold, backgroundColor: 'rgba(212,175,55,0.12)' }]}>
            <Text style={[styles.rolePillTxt, u.role === 'admin' && { color: theme.gold }]}>{(u.role || 'participant').toUpperCase()}</Text>
          </View>
          <Text style={styles.userEmail}>{u.email}</Text>
          <Text style={styles.userMeta}>{u.phone || '—'} · {u.city || '—'} {u.age ? `· Age ${u.age}` : ''}</Text>
          {u.referral_code ? <Text style={styles.referral}>Referral: {u.referral_code}</Text> : null}

          <View style={styles.actionsRow}>
            {u.phone ? (
              <TouchableOpacity onPress={callPhone} style={styles.contactBtn} testID="call-btn">
                <Ionicons name="call" size={16} color={theme.gold} />
                <Text style={styles.contactTxt}>Call</Text>
              </TouchableOpacity>
            ) : null}
            {u.phone ? (
              <TouchableOpacity onPress={whatsApp} style={styles.contactBtn} testID="wa-btn">
                <Ionicons name="logo-whatsapp" size={16} color={theme.gold} />
                <Text style={styles.contactTxt}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={sendEmail} style={styles.contactBtn} testID="email-btn">
              <Ionicons name="mail" size={16} color={theme.gold} />
              <Text style={styles.contactTxt}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Applications" value={apps.length} />
          <Stat label="Payments" value={pays.filter((p: any) => p.status === 'paid').length} />
          <Stat label="Spent" value={`₹${Math.round(pays.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount || 0), 0) / 100).toLocaleString('en-IN')}`} />
        </View>

        {/* Bio / portfolio */}
        {u.bio ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>Bio</Text>
            <Text style={styles.bio}>{u.bio}</Text>
          </View>
        ) : null}

        {u.achievements ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>Achievements</Text>
            <Text style={styles.bio}>{u.achievements}</Text>
          </View>
        ) : null}

        {/* Portfolio photos */}
        {(u.portfolio_photos || []).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>Portfolio ({u.portfolio_photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {u.portfolio_photos.map((p: string, i: number) => (
                <Image key={i} source={{ uri: p }} style={styles.portfolioImg} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Applications */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Applications</Text>
          {apps.length === 0 ? (
            <Text style={styles.empty}>No applications yet.</Text>
          ) : apps.map((a: any) => (
            <View key={a.id} style={styles.appCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appTitle}>{a.event_title}</Text>
                <Text style={styles.appMeta}>{a.city || u.city} · Age {a.age || u.age || '-'}</Text>
                <View style={styles.appBadges}>
                  <View style={[styles.statusPill, { borderColor: theme.gold }]}>
                    <Text style={[styles.statusPillTxt, { color: theme.gold }]}>{(a.status || 'applied').replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: a.payment_status === 'paid' ? theme.success : theme.border }]}>
                    <Text style={[styles.statusPillTxt, { color: a.payment_status === 'paid' ? theme.success : theme.textSecondary }]}>{(a.payment_status || 'pending').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.feeTxt}>₹{Math.round((a.fee || 0) / 100)}</Text>
                </View>
                {a.feedback ? <Text style={styles.feedback}>“{a.feedback}”</Text> : null}
              </View>
            </View>
          ))}
        </View>

        {/* Payments */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Payment History</Text>
          {pays.length === 0 ? (
            <Text style={styles.empty}>No payments.</Text>
          ) : pays.map((p: any) => (
            <View key={p.id || p.order_id} style={styles.payRow}>
              <View style={[styles.dot, { backgroundColor: p.status === 'paid' ? theme.success : theme.gold }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.payTitle}>{p.order_id}</Text>
                <Text style={styles.payMeta}>{(p.status || 'created').toUpperCase()} · {new Date(p.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.payAmt}>₹{Math.round((p.amount || 0) / 100)}</Text>
            </View>
          ))}
        </View>

        {/* Certificates */}
        {certs.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>Certificates</Text>
            {certs.map((c: any, i: number) => (
              <View key={i} style={styles.certRow}>
                <Ionicons name="ribbon" size={20} color={theme.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.certTitle}>{c.event_title || c.title || 'Certificate'}</Text>
                  <Text style={styles.certMeta}>{c.issued_at ? new Date(c.issued_at).toLocaleDateString() : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Account</Text>
          <Row k="User ID" v={u.id} />
          <Row k="Joined" v={u.created_at ? new Date(u.created_at).toLocaleString() : '-'} />
          <Row k="Auth provider" v={u.auth_provider || 'email/phone'} />
          {u.social_instagram ? <Row k="Instagram" v={u.social_instagram} /> : null}
          {u.social_youtube ? <Row k="YouTube" v={u.social_youtube} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ k, v }: any) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={styles.kvV} numberOfLines={1}>{String(v)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  h1: { color: theme.white, fontSize: 24, fontFamily: 'Georgia' },
  heroCard: { marginHorizontal: 20, marginBottom: 16, padding: 22, borderRadius: 22, borderWidth: 1, borderColor: theme.borderGold, overflow: 'hidden', alignItems: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12, borderWidth: 2, borderColor: theme.gold },
  nameRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 },
  userName: { color: theme.white, fontSize: 24, fontFamily: 'Georgia' },
  rolePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: theme.border, marginTop: 6 },
  rolePillTxt: { color: theme.textSecondary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  userEmail: { color: theme.textSecondary, fontSize: 12, marginTop: 8 },
  userMeta: { color: theme.textMuted, fontSize: 11, marginTop: 4 },
  referral: { color: theme.gold, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.08)' },
  contactTxt: { color: theme.gold, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  statBox: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, alignItems: 'center' },
  statVal: { color: theme.white, fontSize: 20, fontFamily: 'Georgia' },
  statLabel: { color: theme.textMuted, fontSize: 9, letterSpacing: 1.2, fontWeight: '600', marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  secTitle: { color: theme.white, fontSize: 18, fontFamily: 'Georgia', marginBottom: 10 },
  bio: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  portfolioImg: { width: 110, height: 140, borderRadius: 12, backgroundColor: '#111' },
  empty: { color: theme.textMuted, fontSize: 12 },
  appCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 10 },
  appTitle: { color: theme.gold, fontSize: 14, fontWeight: '600' },
  appMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  appBadges: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusPillTxt: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  feeTxt: { color: theme.white, fontSize: 12, fontWeight: '600' },
  feedback: { color: theme.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 8 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  payTitle: { color: theme.white, fontSize: 12 },
  payMeta: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  payAmt: { color: theme.white, fontSize: 15, fontFamily: 'Georgia' },
  certRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.borderGold, backgroundColor: 'rgba(212,175,55,0.05)', marginBottom: 8 },
  certTitle: { color: theme.white, fontSize: 13, fontFamily: 'Georgia' },
  certMeta: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  kvK: { color: theme.textMuted, fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  kvV: { color: theme.white, fontSize: 12, maxWidth: '60%' },
});
